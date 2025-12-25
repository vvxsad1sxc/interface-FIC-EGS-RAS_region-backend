import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_system',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('Создание таблицы Roles...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS Roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        permissions JSONB DEFAULT '[]'
      );
    `);

    console.log('Создание таблицы Users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        organization VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        role_id INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_by INTEGER,
        approved_at TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES Roles(id),
        FOREIGN KEY (approved_by) REFERENCES Users(id)
      );
    `);

    console.log('Вставка/обновление ролей...');
    await client.query(`
      INSERT INTO Roles (id, name, description, permissions) 
      VALUES 
        (1, 'user', 'Обычный пользователь', '["read_own_data"]'),
        (2, 'verified', 'Подтвержденный пользователь', '["read_own_data", "export_data", "view_stations"]'),
        (3, 'admin', 'Администратор', '["read_own_data", "export_data", "view_stations", "manage_users", "manage_exports", "system_admin"]')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        permissions = EXCLUDED.permissions;
    `);

    const hashedPassword = await bcrypt.hash('Admin123!@#', 10);
    console.log('Хэш пароля админа:', hashedPassword);

    console.log('Создание/обновление админа...');
    await client.query(`
      INSERT INTO Users (name, email, organization, password, role_id, status)
      VALUES ('admin', 'admin@system.com', 'System', $1, 3, 'active')
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        role_id = EXCLUDED.role_id,
        status = EXCLUDED.status,
        organization = EXCLUDED.organization;
    `, [hashedPassword]);

    console.log('Админ готов: admin@system.com / admin123');
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error; // ← Важно! Чтобы server.js не запустился
  } finally {
    client.release();
  }
};

export { pool, initializeDatabase };