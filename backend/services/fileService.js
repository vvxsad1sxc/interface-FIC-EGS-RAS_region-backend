import fs from 'fs';
import path from 'path';
import { Client } from 'ssh2';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// === Конфигурация ===
dotenv.config();

const SERVER2_HOST = process.env.SERVER2_HOST || '172.20.1.177';
const SERVER2_USER = process.env.SERVER2_USER || 'skleminos';
const SERVER2_PASSWORD = process.env.SERVER2_PASSWORD; // ОБЯЗАТЕЛЬНО указать в .env
const SERVER2_ROOT = process.env.SERVER2_ROOT || '/mnt/disk/gpsdata/Region/KavNet';

/**
 * Установка SSH соединения с паролем
 */
async function createSSHConnection() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn
      .on('ready', () => {
        console.log('✅ SSH подключение установлено');
        resolve(conn);
      })
      .on('error', (err) => {
        console.error('❌ Ошибка SSH подключения:', err.message);
        reject(err);
      })
      .on('close', () => {
        console.log('🔌 SSH соединение закрыто');
      })
      .connect({
        host: SERVER2_HOST,
        username: SERVER2_USER,
        password: SERVER2_PASSWORD,
        readyTimeout: 30000,
        algorithms: {
          kex: [
            'ecdh-sha2-nistp256',
            'ecdh-sha2-nistp384', 
            'ecdh-sha2-nistp521',
            'diffie-hellman-group14-sha256'
          ]
        }
      });
  });
}

/**
 * Формирует имя файла: vlkz203.25d.Z
 */
function buildFileName(station, year, dayOfYear) {
  const year2 = String(year).slice(-2);
   const dayStr = String(dayOfYear).padStart(3, '0');
  return `${station}${dayStr}0.${year2}d.Z`;
}

/**
 * Путь на сервере-2: /home/skleminos/2025/203/vlkz203.25d.Z
 */
function buildRemotePath(root, year, dayOfYear, fileName) {
  const dayStr = String(dayOfYear).padStart(3, '0');
  return path.posix.join(root, String(year), dayStr, fileName);
}

/**
 * Поиск файлов на сервере-2
 */
async function findFilesOnServer2(station, year, dayStart, dayEnd) {
  const conn = await createSSHConnection();
  
  return new Promise((resolve, reject) => {
    const remotePaths = [];

    conn.sftp((err, sftp) => {
      if (err) {
        conn.end();
        return reject(err);
      }

      const checkNext = async (day) => {
        if (day > dayEnd) {
          conn.end();
          return resolve(remotePaths);
        }

        try {
          const fileName = buildFileName(station, year, day);
          const remoteFile = buildRemotePath(SERVER2_ROOT, year, day, fileName);

          // Проверка существования файла
          await new Promise((res, rej) => {
            sftp.stat(remoteFile, (err) => {
              if (!err) {
                console.log(`✅ Найден файл: ${remoteFile}`);
                remotePaths.push(remoteFile);
              }
              res();
            });
          });

          checkNext(day + 1);
        } catch (error) {
          conn.end();
          reject(error);
        }
      };

      checkNext(dayStart);
    });
  });
}

/**
 * Копирование файлов с сервера-2
 */
async function copyFilesToLocal(remotePaths, localDir) {
  if (remotePaths.length === 0) {
    throw new Error('Нет файлов для копирования');
  }

  const conn = await createSSHConnection();
  const localPaths = [];

  return new Promise((resolve, reject) => {
    conn.sftp(async (err, sftp) => {
      if (err) {
        conn.end();
        return reject(err);
      }

      try {
        await fs.promises.mkdir(localDir, { recursive: true });
        console.log(`📁 Создана локальная папка: ${localDir}`);

        for (const remote of remotePaths) {
          const fileName = path.basename(remote);
          const localFile = path.join(localDir, fileName);
          
          console.log(`📥 Копируем: ${fileName}`);
          
          await new Promise((res, rej) => {
            sftp.fastGet(remote, localFile, (err) => {
              if (err) {
                console.error(`❌ Ошибка копирования ${fileName}:`, err.message);
                rej(err);
              } else {
                console.log(`✅ Скопирован: ${fileName}`);
                localPaths.push(localFile);
                res();
              }
            });
          });
        }

        conn.end();
        console.log(`📊 Скопировано файлов: ${localPaths.length}`);
        resolve(localPaths);
      } catch (err) {
        conn.end();
        reject(err);
      }
    });
  });
}

/**
 * Создание ZIP архива
 */
async function createZipArchive(localFiles, archivePath) {
  if (localFiles.length === 0) {
    throw new Error('Нет файлов для архивации');
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`📦 ZIP создан: ${archivePath} (${archive.pointer()} байт)`);
      resolve(archivePath);
    });
    
    archive.on('error', reject);
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('⚠️ Предупреждение архива:', err.message);
      } else {
        reject(err);
      }
    });
    
    archive.pipe(output);

    localFiles.forEach(file => {
      const fileName = path.basename(file);
      archive.file(file, { name: fileName });
      console.log(`🗜️ Добавлен в архив: ${fileName}`);
    });

    archive.finalize();
  });
}

/**
 * Удаление временной папки
 */
async function cleanupTmp(dir) {
  try {
    await fs.promises.rm(dir, { recursive: true, force: true });
    console.log(`🧹 Очищена временная папка: ${dir}`);
  } catch (err) {
    console.error('❌ Ошибка очистки:', err.message);
  }
}

/**
 * День года (1–366)
 */
function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Основная функция для скачивания и архивации
 */
async function downloadAndArchiveFiles(station, year, dayStart, dayEnd, outputZipPath) {
  try {
    console.log(`🔍 Поиск файлов: ${station}, ${year}, дни ${dayStart}-${dayEnd}`);
    
    // 1. Поиск файлов на сервере
    const remoteFiles = await findFilesOnServer2(station, year, dayStart, dayEnd);
    
    if (remoteFiles.length === 0) {
      throw new Error('Файлы не найдены на сервере');
    }

    // 2. Создание временной папки
    const tmpDir = path.join(process.cwd(), 'tmp', uuidv4());
    
    // 3. Копирование файлов
    const localFiles = await copyFilesToLocal(remoteFiles, tmpDir);
    
    // 4. Создание ZIP
    const zipPath = await createZipArchive(localFiles, outputZipPath);
    
    // 5. Очистка временных файлов
    await cleanupTmp(tmpDir);
    
    console.log('🎉 Процесс завершен успешно!');
    return zipPath;
    
  } catch (error) {
    console.error('💥 Ошибка в основном процессе:', error.message);
    throw error;
  }
}

export {
  findFilesOnServer2,
  copyFilesToLocal,
  createZipArchive,
  cleanupTmp,
  getDayOfYear,
  downloadAndArchiveFiles

};
