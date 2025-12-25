import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Токен отсутствует' });
    }

    const token = authHeader.replace('Bearer ', '');

    // ОБЯЗАТЕЛЬНЫЙ СЕКРЕТ
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET не задан в .env');
      return res.status(500).json({ message: 'Ошибка сервера' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ 
        message: 'Аккаунт не активирован. Ожидайте подтверждения.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Неверный токен' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Токен истёк' });
    }
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Ошибка авторизации' });
  }
};

export const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Требуется авторизация' });
    }

    
    if (req.user.role_id !== 3) {
      return res.status(403).json({ message: 'Требуется роль администратора' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({ message: 'Ошибка проверки прав' });
  }
};