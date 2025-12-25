import express from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  findFilesOnServer2,
  copyFilesToLocal,
  createZipArchive,
  cleanupTmp,
  getDayOfYear,
} from '../services/fileService.js';

const router = express.Router();

router.post('/download', async (req, res) => {
  const { stations, startDate, endDate, userId } = req.body;

  if (!stations?.length || !startDate || !endDate || !userId) {
    return res.status(400).json({ error: 'Недостаточно данных' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start) || isNaN(end) || start > end) {
    return res.status(400).json({ error: 'Неверный диапазон дат' });
  }

  const year = start.getFullYear();
  if (end.getFullYear() !== year) {
    return res.status(400).json({ error: 'Диапазон должен быть в пределах одного года' });
  }

  const dayStart = getDayOfYear(start);
  const dayEnd = getDayOfYear(end);

  console.log(`Поиск файлов: станции=${stations.join(',')}, год=${year}, дни=${dayStart}-${dayEnd}`);

  // 🔑 ПРОВЕРКА КОНФИГУРАЦИИ С ПАРОЛЕМ
  const requiredEnvVars = ['SERVER2_HOST', 'SERVER2_USER', 'SERVER2_PASSWORD'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    return res.status(500).json({ 
      error: `SSH конфигурация не настроена. Отсутствуют: ${missingVars.join(', ')}` 
    });
  }

  // Временная папка (используем текущую директорию вместо /tmp для Windows)
  const tmpId = uuidv4();
  const tmpDir = path.join(process.cwd(), 'temp', 'downloads', tmpId);

  try {
    // Поиск файлов
    const allRemoteFiles = [];
    for (const station of stations) {
      console.log(`Поиск файлов для станции: ${station}`);
      const files = await findFilesOnServer2(station.toLowerCase(), year, dayStart, dayEnd);
      allRemoteFiles.push(...files);
    }

    if (allRemoteFiles.length === 0) {
      return res.status(404).json({ error: 'Файлы не найдены для выбранных критериев' });
    }

    console.log(`Найдено файлов: ${allRemoteFiles.length}`);

    // Копируем файлы локально
    const localFiles = await copyFilesToLocal(allRemoteFiles, tmpDir);
    console.log(`Скопировано файлов: ${localFiles.length}`);

    // Создаем ZIP архив
    const archiveName = `data_${year}_${dayStart}-${dayEnd}_${stations.join('-')}.zip`;
    const archivePath = path.join(tmpDir, archiveName);

    await createZipArchive(localFiles, archivePath);
    console.log(`Создан архив: ${archivePath}`);

    // Устанавливаем заголовки для скачивания
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Cache-Control', 'no-cache');

    // Отправка файла
    res.download(archivePath, archiveName, async (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Ошибка при скачивании' });
        }
      }
      // Удаляем временные файлы после отправки
      console.log('Загрузка завершена, очищаем временные файлы...');
      await cleanupTmp(tmpDir);
    });

  } catch (err) {
    console.error('Server error:', err);
    // Пытаемся очистить временные файлы даже при ошибке
    await cleanupTmp(tmpDir).catch(cleanupErr => {
      console.error('Cleanup error:', cleanupErr);
    });
    
    const errorMessage = err.message.includes('password') 
      ? 'Ошибка аутентификации SSH. Проверьте пароль.' 
      : 'Внутренняя ошибка сервера: ' + err.message;
    
    res.status(500).json({ error: errorMessage });
  }
});

// 🔍 Дополнительный endpoint для проверки подключения
router.get('/test-connection', async (req, res) => {
  try {
    const requiredEnvVars = ['SERVER2_HOST', 'SERVER2_USER', 'SERVER2_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Отсутствуют переменные: ${missingVars.join(', ')}`
      });
    }

    // Простая проверка подключения - ищем файлы за последний день
    const today = new Date();
    const year = today.getFullYear();
    const day = getDayOfYear(today);
    
    const testFiles = await findFilesOnServer2('vlkz', year, day, day);
    
    res.json({
      success: true,
      message: `Подключение успешно. Найдено файлов: ${testFiles.length}`,
      host: process.env.SERVER2_HOST,
      user: process.env.SERVER2_USER
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка подключения: ' + error.message
    });
  }
});

// 📋 Endpoint для получения конфигурации (без пароля)
router.get('/config', (req, res) => {
  res.json({
    host: process.env.SERVER2_HOST,
    user: process.env.SERVER2_USER,
    root: process.env.SERVER2_ROOT,
    hasPassword: !!process.env.SERVER2_PASSWORD
  });
});

export default router;