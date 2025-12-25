// models/PasswordResetToken.js
import { pool } from './database.js';
import crypto from 'crypto';

export class PasswordResetTokenModel {
  // Создание токена восстановления
  static async create(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час
    
    const result = await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [userId, token, expiresAt]
    );
    
    return result.rows[0];
  }

  // Поиск токена по значению
  static async findByToken(token) {
    const result = await pool.query(
      `SELECT prt.*, u.email, u.name 
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()`,
      [token]
    );
    return result.rows[0] || null;
  }

  // Пометить токен как использованный
  static async markAsUsed(token) {
    const result = await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE token = $1',
      [token]
    );
    return result.rowCount > 0;
  }

  // Проверить активные токены для пользователя
  static async hasActiveToken(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM password_reset_tokens 
       WHERE user_id = $1 AND used = false AND expires_at > NOW()`,
      [userId]
    );
    return parseInt(result.rows[0].count) > 0;
  }

  // Очистка просроченных токенов
  static async cleanupExpiredTokens() {
    const result = await pool.query(
      'DELETE FROM password_reset_tokens WHERE expires_at <= NOW() OR used = true RETURNING *'
    );
    console.log(`Очищено ${result.rowCount} просроченных токенов`);
    return result.rowCount;
  }
}