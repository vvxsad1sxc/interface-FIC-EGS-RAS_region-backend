// utils/db-viewer.js
import { Client } from 'ssh2';
import net from 'net';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const SERVER2_HOST = process.env.SERVER2_HOST || '172.20.1.177';
const SERVER2_USER = process.env.SERVER2_USER || 'skleminos';
const SERVER2_PASSWORD = process.env.SERVER2_PASSWORD;

// Параметры для подключения к БД gnss на сервере
const DB_CONFIG = {
  host: 'localhost', // На сервере, куда делаем SSH
  port: 5432,
  database: 'gnss',
  user: 'gps_user', 
  password: process.env.SERVER2_PASSWORD || 'Sfb13n0vc!' // Используем SSH пароль
};

/**
 * Создание SSH туннеля к БД
 */
function createSSHTunnel(localPort = 54321) {
  return new Promise((resolve, reject) => {
    const sshClient = new Client();
    const server = net.createServer();
    
    sshClient.on('ready', () => {
      console.log('✅ SSH подключение установлено');
      
      server.on('connection', (localSocket) => {
        sshClient.forwardOut(
          '127.0.0.1',
          0,
          DB_CONFIG.host,
          DB_CONFIG.port,
          (err, sshStream) => {
            if (err) {
              console.error('Ошибка forwardOut:', err.message);
              localSocket.end();
              return;
            }
            
            // Прокидываем данные
            localSocket.pipe(sshStream).pipe(localSocket);
            
            localSocket.on('error', () => {});
            sshStream.on('error', () => {});
          }
        );
      });
      
      server.listen(localPort, '127.0.0.1', () => {
        console.log(`🔌 Локальный туннель создан на порту ${localPort}`);
        resolve({
          sshClient,
          server,
          localPort
        });
      });
      
      server.on('error', reject);
    });
    
    sshClient.on('error', reject);
    
    sshClient.connect({
      host: SERVER2_HOST,
      username: SERVER2_USER,
      password: SERVER2_PASSWORD,
      readyTimeout: 30000
    });
  });
}

/**
 * Подключение к БД через SSH туннель
 */
async function connectToDatabase() {
  let tunnel = null;
  
  try {
    console.log('🔄 Создание SSH туннеля...');
    tunnel = await createSSHTunnel();
    
    const pool = new Pool({
      host: '127.0.0.1',
      port: tunnel.localPort,
      database: DB_CONFIG.database,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      max: 1, // Одно соединение
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
    
    // Тестируем подключение
    const client = await pool.connect();
    
    try {
      // Проверяем подключение
      const result = await client.query('SELECT current_database(), current_user');
      console.log(`✅ Подключено к БД: ${result.rows[0].current_database}, пользователь: ${result.rows[0].current_user}`);
      
      // Проверяем таблицу files
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'files'
        )
      `);
      
      console.log(`📊 Таблица 'files' существует: ${tableCheck.rows[0].exists}`);
      
      if (tableCheck.rows[0].exists) {
        // Посмотрим структуру таблицы
        const columns = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'files'
        `);
        console.log('📋 Столбцы таблицы files:', columns.rows.map(c => `${c.column_name} (${c.data_type})`));
        
        // Посчитаем записи
        const count = await client.query('SELECT COUNT(*) FROM files');
        console.log(`📊 Всего записей в таблице: ${count.rows[0].count}`);
      }
      
    } finally {
      client.release();
    }
    
    return {
      pool,
      close: async () => {
        await pool.end();
        tunnel.server.close();
        tunnel.sshClient.end();
        console.log('✅ Соединения закрыты');
      }
    };
    
  } catch (error) {
    if (tunnel) {
      tunnel.server.close();
      tunnel.sshClient.end();
    }
    console.error('❌ Ошибка подключения:', error.message);
    throw error;
  }
}

/**
 * Формирует имя файла для поиска
 * Формат из БД: station + day + '0.' + year + 'd.Z'
 * Пример: vlkz2950.10d.Z (станция=vlkz, день=295, год=2010)
 */
function buildFileName(station, year, dayOfYear) {
  // Приводим станцию к нижнему регистру
  const stationLower = station.toLowerCase();
  // Берем последние 2 цифры года
  const year2 = String(year).slice(-2);
  // Дополняем день года до 3 символов
  const dayStr = String(dayOfYear).padStart(3, '0');
  // Формат: station + day + '0.' + year2 + 'd.Z'
  return `${stationLower}${dayStr}0.${year2}d.Z`;
}

/**
 * Получение данных о полноте файлов
 */
export async function getFileFullness(stations, year, dayStart, dayEnd) {
  const { pool, close } = await connectToDatabase();
  
  try {
    // Создаем массив имен файлов для поиска
    const fileNames = [];
    const fileMap = {}; // Для быстрого поиска
    
    for (let day = dayStart; day <= dayEnd; day++) {
      stations.forEach(station => {
        const fileName = buildFileName(station, year, day);
        fileNames.push(fileName);
        fileMap[fileName] = { station, day };
      });
    }
    
    console.log(`🔍 Ищем ${fileNames.length} файлов в БД`);
    
    // Для отладки выводим примеры генерируемых имен файлов
    console.log('📝 Примеры генерируемых имен файлов:');
    console.log(fileNames.slice(0, 5));
    
    // Проверяем, есть ли записи
    const client = await pool.connect();
    
    try {
      // Узнаем какие станции есть в БД
      const stationsInDB = await client.query(`
        SELECT DISTINCT LEFT(filename, 4) as station_code 
        FROM files 
        WHERE filename LIKE '%.${String(year).slice(-2)}d.Z'
        LIMIT 10
      `);
      console.log('📍 Станции в БД для указанного года:', stationsInDB.rows);
      
      // Проверим диапазон дней для конкретных станций
      stations.forEach(async (station) => {
        const stationSamples = await client.query(`
          SELECT filename 
          FROM files 
          WHERE filename LIKE '${station}%'
          LIMIT 3
        `);
        if (stationSamples.rows.length > 0) {
          console.log(`📅 Примеры файлов для станции ${station}:`, stationSamples.rows);
        }
      });
      
      // Проверим, есть ли записи для наших файлов
      const testQuery = await client.query(`
        SELECT filename FROM files WHERE filename = ANY($1) LIMIT 5
      `, [fileNames.slice(0, 5)]);
      
      console.log(`📝 Найдено совпадений (первые 5 файлов):`, testQuery.rows.map(r => r.filename));
      
      // Основной запрос
      const query = `
        SELECT 
          filename,
          fullness 
        FROM files 
        WHERE filename = ANY($1)
        ORDER BY filename
      `;
      
      const result = await client.query(query, [fileNames]);
      
      console.log(`📊 Всего найдено записей: ${result.rows.length}`);
      
      // Если ничего не найдено, проверим структуру данных
      if (result.rows.length === 0) {
        console.log('⚠️ Записи не найдены. Проверяем данные...');
        
        // Посмотрим какие файлы вообще есть в БД
        const sampleFiles = await client.query(`
          SELECT filename, fullness FROM files LIMIT 10
        `);
        
        console.log('📋 Примеры файлов в БД:', sampleFiles.rows);
        
        // Проверим формат имен файлов
        const filePatterns = await client.query(`
          SELECT DISTINCT filename FROM files 
          WHERE filename LIKE $1 OR filename LIKE $2
          LIMIT 5
        `, [`%${String(year).slice(-2)}d.Z`, `%${String(year-1).slice(-2)}d.Z`]);
        
        console.log('🎯 Примеры форматов имен для текущего и предыдущего года:', filePatterns.rows);
        
        // Проверим, есть ли файлы с похожими именами
        if (stations.length > 0) {
          const similarFiles = await client.query(`
            SELECT filename, fullness 
            FROM files 
            WHERE filename LIKE '${stations[0]}%' 
              AND filename LIKE '%.${String(year).slice(-2)}d.Z'
            LIMIT 5
          `);
          
          console.log(`🔎 Похожие файлы для станции ${stations[0]}:`, similarFiles.rows);
        }
      }
      
      // Структурируем данные
      const data = {};
      
      // Инициализируем структуру
      for (let day = dayStart; day <= dayEnd; day++) {
        data[day] = {};
        stations.forEach(station => {
          data[day][station] = null; // null = данные отсутствуют
        });
      }
      
      // Заполняем данными из БД
      result.rows.forEach(row => {
        const { filename, fullness } = row;
        
        // Ищем в нашей карте
        const fileInfo = fileMap[filename];
        if (fileInfo) {
          const { station, day } = fileInfo;
          if (day >= dayStart && day <= dayEnd && stations.includes(station)) {
            data[day][station] = fullness;
          }
        }
      });
      
      return {
        success: true,
        stations,
        year,
        dayRange: { start: dayStart, end: dayEnd },
        data,
        foundCount: result.rows.length,
        totalExpected: fileNames.length
      };
      
    } finally {
      client.release();
    }
    
  } finally {
    await close();
  }
}