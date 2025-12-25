// routes/view-fullness.js
import express from 'express';
import { getFileFullness } from '../utils/db-viewer.js'; // Используем исправленный файл

const router = express.Router();

router.post('/view-fullness', async (req, res) => {
  try {
    const { stations, year, dayStart, dayEnd } = req.body;

    // Валидация
    if (!stations || !year || !dayStart || !dayEnd) {
      return res.status(400).json({
        error: 'Необходимы параметры: stations, year, dayStart, dayEnd'
      });
    }

    if (!Array.isArray(stations) || stations.length === 0) {
      return res.status(400).json({
        error: 'Stations должен быть непустым массивом'
      });
    }

    console.log(`🔍 Запрос полноты: ${stations.join(', ')}, ${year}, дни ${dayStart}-${dayEnd}`);

    // Получаем данные о полноте из БД
    const result = await getFileFullness(
      stations.map(s => s.toUpperCase()), // Приводим к верхнему регистру
      parseInt(year), 
      parseInt(dayStart), 
      parseInt(dayEnd)
    );

    console.log(`✅ Данные получены: ${result.foundCount} из ${result.totalExpected} записей`);

    // Отправляем данные в том же формате, в котором их вернула функция
    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ View fullness error:', error.message);
    console.error(error.stack);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера',
      details: 'Ошибка при получении данных из базы данных'
    });
  }
});

export default router;