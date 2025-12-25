// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import downloadRoutes from './routes/download.js'; 
import { initializeDatabase } from './models/database.js';
import viewFullnessRouter from './routes/view-fullness.js';
import { getEmailService } from './services/emailService.js';

// === Загрузка .env ===
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== 'production';

// === Middleware ===
app.use(
  cors({
    origin: isDev ? 'http://localhost:5173' : process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// === Роуты ===
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', downloadRoutes); 
app.use('/api', viewFullnessRouter);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    uptime: process.uptime(),
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: isDev ? err.message : undefined,
  });
});

// === Graceful Shutdown ===
const server = app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log(`Режим: ${isDev ? 'development' : 'production'}`);
  console.log(`Админ: admin@system.com / admin123`);
});

const shutdown = async (signal) => {
  console.log(`\n${signal} получен. Останавливаем сервер...`);
  server.close(async () => {
    console.log('HTTP сервер закрыт.');
    try {
      // Закрываем соединения с БД, если нужно
      // await sequelize.close();
      console.log('Ресурсы освобождены.');
    } catch (err) {
      console.error('Ошибка при закрытии:', err);
    } finally {
      process.exit(0);
    }
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// === Инициализация ===
const startServer = async () => {
  try {
    // 1. База данных
    console.log('Инициализация базы данных...');
    await initializeDatabase();
    console.log('База данных готова.');

    // 2. Email сервис (не критично)
    console.log('Проверка email-сервиса...');
    try {
      const emailService = await getEmailService();
      if (emailService) {
        console.log('Email-сервис активен');
      }
    } catch (emailErr) {
      console.warn('Email-сервис отключён (восстановление пароля без писем):', emailErr.message);
    }

    // 3. Проверка SSH подключения
    console.log('Проверка SSH конфигурации...');
    const requiredEnvVars = ['SERVER2_HOST', 'SERVER2_USER', 'SERVER2_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn('Предупреждение: Отсутствуют SSH переменные:', missingVars.join(', '));
      console.warn('Функция скачивания файлов будет недоступна');
    } else {
      console.log('SSH конфигурация загружена');
      console.log(`Хост: ${process.env.SERVER2_HOST}`);
      console.log(`Пользователь: ${process.env.SERVER2_USER}`);
      console.log(`Ключ: ${process.env.SERVER2_KEY}`);
      
      // Проверка существования SSH ключа
      const fs = await import('fs');
      if (!fs.existsSync(process.env.SERVER2_KEY)) {
        console.warn('Предупреждение: SSH ключ не найден по указанному пути');
      } else {
        console.log('SSH ключ найден');
      }
    }

    // 4. Готово!
    console.log('Все сервисы инициализированы.');
  } catch (err) {
    console.error('Критическая ошибка при запуске:', err);
    process.exit(1);
  }
};

// Запуск
startServer();