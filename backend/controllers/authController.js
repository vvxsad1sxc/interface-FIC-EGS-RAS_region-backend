import { UserModel } from '../models/User.js';
import { PasswordResetTokenModel } from '../models/PasswordResetToken.js';
import { getEmailService } from '../services/emailService.js';
import { pool } from '../models/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const validatePasswordStrength = (password) => {
  if (!password) return 'Пароль обязателен';
  if (password.length < 8) return 'Пароль должен содержать минимум 8 символов';
  if (!/[A-Z]/.test(password)) return 'Пароль должен содержать заглавную букву';
  if (!/[a-z]/.test(password)) return 'Пароль должен содержать строчную букву';
  if (!/\d/.test(password)) return 'Пароль должен содержать цифру';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    return 'Пароль должен содержать спецсимвол';
  return true;
};

export class AuthController {
  static async register(req, res) {
    try {
      const { name, email, organization, password, confirmPassword } = req.body;

      // === Валидация ===
      if (!name || name.trim().length < 2 || !/^[a-zA-Z0-9_]+$/.test(name)) {
        return res.status(400).json({ success: false, message: 'Имя: минимум 2 символа, только латиница, цифры, _' });
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Некорректный email' });
      }

      if (!organization || organization.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Организация: минимум 2 символа' });
      }

      if (!password) {
        return res.status(400).json({ success: false, message: 'Пароль обязателен' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Пароли не совпадают' });
      }

      const pwdErr = validatePasswordStrength(password);
      if (pwdErr !== true) {
        return res.status(400).json({ success: false, message: pwdErr });
      }

      // === Уникальность ===
      const [existingByEmail, existingByName] = await Promise.all([
        UserModel.findByEmail(email.trim().toLowerCase()),
        UserModel.findByName(name.trim()),
      ]);

      if (existingByEmail) {
        return res.status(400).json({ success: false, message: 'Пользователь с такой почтой уже существует' });
      }
      if (existingByName) {
        return res.status(400).json({ success: false, message: 'Пользователь с таким именем уже существует' });
      }

      // === Создание ===
      const hashed = await bcrypt.hash(password, 12);
      const user = await UserModel.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        organization: organization.trim(),
        password: hashed,
        status: 'pending',
        role_id: 2, // обычный пользователь
      });

      // === JWT (только если active) ===
      let token = null;
      if (user.status === 'active') {
        token = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET || 'fallback_secret',
          { expiresIn: '24h' }
        );
      }

      // === Ответ (полный user, как в login и getProfile) ===
      res.status(201).json({
        success: true,
        message: 'Регистрация успешна. Ожидайте подтверждения администратора.',
        token, // null если pending
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          organization: user.organization,
          role_id: user.role_id,
          role_name: user.role_name || 'user',
          status: user.status,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, message: 'Ошибка при регистрации' });
    }
  }

  static async login(req, res) {
    try {
      const { login, password } = req.body;
      const user = await UserModel.findByLogin(login);

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ success: false, message: 'Неверный логин или пароль' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ success: false, message: 'Аккаунт не активирован. Ожидайте подтверждения.' });
      }

      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Успешный вход',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          organization: user.organization,
          role_id: user.role_id,
          role_name: user.role_name,
          status: user.status,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Ошибка входа' });
    }
  }
    static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email обязателен'
        });
      }

      console.log(`📧 Запрос на восстановление пароля для: ${email}`);

      // Ищем пользователя по email
      const user = await UserModel.findByEmail(email.trim().toLowerCase());
      if (!user) {
        console.log('❌ Пользователь не найден');
        // Для безопасности не сообщаем, что пользователь не найден
        return res.json({
          success: true,
          message: 'Если email зарегистрирован, инструкции будут отправлены'
        });
      }

      console.log(`✅ Пользователь найден: ${user.name} (ID: ${user.id})`);

      // Проверяем статус пользователя
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Аккаунт не активирован. Обратитесь к администратору.'
        });
      }

      // Проверяем, есть ли уже активный токен
      const hasActiveToken = await PasswordResetTokenModel.hasActiveToken(user.id);
      if (hasActiveToken) {
        console.log('⚠️ У пользователя уже есть активный токен');
        return res.status(429).json({
          success: false,
          message: 'Запрос на восстановление уже отправлен. Проверьте вашу почту или попробуйте позже.'
        });
      }

      // Создаем токен восстановления
      const resetToken = await PasswordResetTokenModel.create(user.id);
      console.log(`✅ Токен создан: ${resetToken.token.substring(0, 10)}...`);

      // Формируем ссылку для сброса пароля
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken.token}`;

      // Отправляем email
      try {
        console.log(`📤 Отправка email пользователю ${user.email}...`);
        const emailService = await getEmailService(); // ← ИСПРАВЛЕНО
  const emailResult = await emailService.sendPasswordResetEmail(
    user.email,
    user.name,
    resetLink
  );

        console.log(`✅ Email отправлен пользователю ${user.email}`);

        return res.json({
          success: true,
          message: 'Инструкции по восстановлению пароля отправлены на ваш email',
          // В development возвращаем информацию для тестирования
          ...(process.env.NODE_ENV === 'development' && {
            debug_info: {
              preview_url: emailResult.previewUrl,
              reset_link: resetLink,
              user_id: user.id
            }
          })
        });

      } catch (emailError) {
        console.error('❌ Ошибка отправки email:', emailError);
        
        // Если не удалось отправить email, удаляем токен
        await PasswordResetTokenModel.markAsUsed(resetToken.token);
        console.log('🗑️ Токен удален из-за ошибки отправки email');

        return res.status(500).json({
          success: false,
          message: 'Не удалось отправить email. Попробуйте позже.'
        });
      }

    } catch (error) {
      console.error('💥 Ошибка восстановления пароля:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка сервера при обработке запроса'
      });
    }
  }

  // Проверка токена восстановления
  static async verifyResetToken(req, res) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Токен обязателен'
        });
      }

      console.log(`🔍 Проверка токена: ${token.substring(0, 10)}...`);

      const resetToken = await PasswordResetTokenModel.findByToken(token);
      
      if (!resetToken) {
        console.log('❌ Токен не найден или недействителен');
        return res.status(400).json({
          success: false,
          message: 'Неверная или устаревшая ссылка для сброса пароля'
        });
      }

      console.log(`✅ Токен действителен для пользователя: ${resetToken.name}`);

      res.json({
        success: true,
        message: 'Токен действителен',
        email: resetToken.email
      });

    } catch (error) {
      console.error('💥 Ошибка проверки токена:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка сервера при проверке токена'
      });
    }
  }

  // Сброс пароля
  static async resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Токен и новый пароль обязательны'
      });
    }

    console.log(`Запрос на сброс пароля с токеном: ${token.substring(0, 10)}...`);

    // Валидация пароля
    const pwdErr = validatePasswordStrength(newPassword);
    if (pwdErr !== true) {
      return res.status(400).json({
        success: false,
        message: pwdErr
      });
    }

    // Проверяем токен
    const resetToken = await PasswordResetTokenModel.findByToken(token);
    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Неверная или устаревшая ссылка для сброса пароля'
      });
    }

    console.log(`Токен подтвержден для пользователя ID: ${resetToken.user_id}`);

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    

    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, resetToken.user_id]
    );

    // Помечаем токен как использованный
    await PasswordResetTokenModel.markAsUsed(token);

    console.log(`Пароль успешно изменен для пользователя ID: ${resetToken.user_id}`);

    res.json({
      success: true,
      message: 'Пароль успешно изменен'
    });

  } catch (error) {
    console.error('Ошибка сброса пароля:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при сбросе пароля'
    });
  }
}

  // Очистка просроченных токенов (для админов/cron)
  static async cleanupTokens(req, res) {
    try {
      console.log('🧹 Очистка просроченных токенов...');
      const deletedCount = await PasswordResetTokenModel.cleanupExpiredTokens();
      
      res.json({
        success: true,
        message: `Просроченные токены очищены (удалено: ${deletedCount})`
      });
    } catch (error) {
      console.error('💥 Ошибка очистки токенов:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при очистке токенов'
      });
    }
  }


  static async getProfile(req, res) {
    try {
      const user = await UserModel.findById(req.user?.id);
      if (!user) return res.status(404).json({ success: false, message: 'Пользователь не найден' });

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          organization: user.organization,
          role_id: user.role_id,
          role_name: user.role_name,
          status: user.status,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ success: false, message: 'Ошибка профиля' });
    }
  }
}