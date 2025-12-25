import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import './DownloadPage.scss';

// Интерфейс для данных о полноте
interface FullnessData {
  station: string;
  date: string; 
  fullness: number; 
}

const DownloadPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [fullnessData, setFullnessData] = useState<FullnessData[]>([]);
  const [showFullnessTable, setShowFullnessTable] = useState(false);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.status !== 'active') {
      alert('Ваш аккаунт не подтвержден.');
      navigate('/');
    }
  }, [user, navigate]);

  const stations = ['vlkz', 'ard2', 'latz', 'laz2', 'ardn', 'kamt', 'prtn'];

  const handleBackClick = () => navigate('/Stations');
  const handleStationToggle = (station: string) => {
    setSelectedStations(prev =>
      prev.includes(station) ? prev.filter(s => s !== station) : [...prev, station]
    );
  };
  const handleSelectAll = () => {
    setSelectedStations(stations.length === selectedStations.length ? [] : stations);
  };

  // Функция для преобразования даты в формат ДД.ММ.ГГГГ
  const formatToDisplay = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Функция для преобразования строки ДД.ММ.ГГГГ в ISO
  const formatToISO = (input: string): string | null => {
    const match = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match) return null;
    const [_, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  // Функция для преобразования даты в день года (1-366)
  const getDayOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  // Функция для получения года из даты
  const getYear = (date: Date): number => {
    return date.getFullYear();
  };

  // Обработчик выбора даты из календаря
  const handleCalendarSelect = (date: Date, type: 'start' | 'end') => {
    const formattedDate = formatToDisplay(date);
    if (type === 'start') {
      setStartDate(formattedDate);
      setShowStartCalendar(false);
      setCurrentYear(date.getFullYear());
    } else {
      setEndDate(formattedDate);
      setShowEndCalendar(false);
    }
  };

  // Функция для просмотра полноты данных (ИСПРАВЛЕНА)
  const handleViewFullness = async () => {
    if (selectedStations.length === 0) return alert('Выберите хотя бы одну станцию');
    if (!startDate || !endDate) return alert('Укажите временной период');

    const startISO = formatToISO(startDate);
    const endISO = formatToISO(endDate);
    if (!startISO || !endISO) return alert('Неверный формат даты. Используйте: ДД.ММ.ГГГГ');

    // Преобразуем даты в дни года
    const startDateObj = new Date(startISO);
    const endDateObj = new Date(endISO);
    const year = getYear(startDateObj);
    const dayStart = getDayOfYear(startDateObj);
    const dayEnd = getDayOfYear(endDateObj);

    // Проверяем, что даты в пределах одного года
    if (startDateObj.getFullYear() !== endDateObj.getFullYear()) {
      return alert('Выберите даты в пределах одного года');
    }

    const payload = {
      stations: selectedStations,
      year: year,
      dayStart: dayStart,
      dayEnd: dayEnd,
      userId: user.id,
    };

    setIsViewLoading(true);
    setShowFullnessTable(false);

    try {
      const resp = await fetch('http://localhost:3001/api/view-fullness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        let errorMessage = 'Ошибка сервера';
        try {
          const errorText = await resp.text();
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
        } catch {
          errorMessage = `HTTP error! status: ${resp.status}`;
        }
        throw new Error(errorMessage);
      }

      const result = await resp.json();
      
      // Преобразуем данные из формата бэкенда в формат фронтенда
      const transformedData: FullnessData[] = [];
      
      if (result.success && result.data) {
        const { data, stations: resultStations, dayRange } = result;
        
        console.log('Полученные данные с сервера:', {
          resultStations,
          dayRange,
          sampleData: data[dayRange.start]
        });
        
        // Проходим по всем дням
        for (let day = dayRange.start; day <= dayRange.end; day++) {
          const dayData = data[day];
          if (dayData) {
            // Проходим по всем станциям
            resultStations.forEach((station: string) => {
              const fullnessValue = dayData[station];
              if (fullnessValue !== null && fullnessValue !== undefined) {
                // Преобразуем строку "100.0" в число от 0.0 до 1.0 (делим на 100)
                const fullnessNumber = parseFloat(fullnessValue) / 100;
                
                transformedData.push({
                  station: station,
                  date: day.toString(), // день года как строка
                  fullness: fullnessNumber // число от 0.0 до 1.0
                });
              } else {
                // Если данных нет, добавляем 0
                transformedData.push({
                  station: station,
                  date: day.toString(),
                  fullness: 0
                });
              }
            });
          } else {
            // Если нет данных для дня, добавляем нули для всех станций
            resultStations.forEach((station: string) => {
              transformedData.push({
                station: station,
                date: day.toString(),
                fullness: 0
              });
            });
          }
        }
      }
      
      console.log('Трансформированные данные:', transformedData);
      setFullnessData(transformedData);
      setShowFullnessTable(true);
      
    } catch (err: any) {
      console.error('View fullness error:', err);
      
      // Более конкретные сообщения об ошибках
      if (err.message.includes('stream.setNoDelay') || err.message.includes('stream')) {
        alert('Ошибка в конфигурации сервера API. Пожалуйста, сообщите администратору о проблеме с потоком данных.');
      } else {
        alert(err.message || 'Не удалось загрузить данные о полноте');
      }
    } finally {
      setIsViewLoading(false);
    }
  };

  // Функция для подготовки данных к отображению в таблице
  const prepareTableData = () => {
    if (!fullnessData.length) return { stations: [], dates: [], data: {} };

    // Получаем уникальные станции и даты (дни года)
    const stations = Array.from(new Set(fullnessData.map(item => item.station))).sort();
    const dates = Array.from(new Set(fullnessData.map(item => item.date))).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Создаем структуру данных для таблицы
    const tableData: { [key: string]: { [key: string]: number } } = {};
    
    stations.forEach(station => {
      tableData[station] = {};
      dates.forEach(date => {
        const record = fullnessData.find(item => item.station === station && item.date === date);
        // Уже преобразовано в число от 0.0 до 1.0
        tableData[station][date] = record ? record.fullness : 0;
      });
    });

    return { stations, dates, data: tableData };
  };

  // Функция для форматирования дня года в читаемую дату
  const formatDayOfYear = (dayOfYear: string) => {
    const dayNum = parseInt(dayOfYear);
    const date = new Date(currentYear, 0); // 1 января текущего года
    date.setDate(dayNum); // Устанавливаем день года
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
  };

  const tableData = prepareTableData();

  // Компонент календаря
  const Calendar: React.FC<{
    selectedDate: string;
    onSelect: (date: Date) => void;
    onClose: () => void;
  }> = ({ selectedDate, onSelect, onClose }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // Парсим выбранную дату если она есть
    const selectedDateObj = selectedDate ? (() => {
      const [day, month, year] = selectedDate.split('.').map(Number);
      return new Date(year, month - 1, day);
    })() : null;

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    
    // Создаем массив дней месяца
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentYear, currentMonth, i));
    }

    // Переход к предыдущему месяцу
    const prevMonth = () => {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    };

    // Переход к следующему месяцу
    const nextMonth = () => {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    };

    // Проверяем, является ли день сегодняшним днем
    const isToday = (date: Date) => {
      const today = new Date();
      return date.toDateString() === today.toDateString();
    };

    // Проверяем, является ли день выбранным
    const isSelected = (date: Date) => {
      return selectedDateObj && date.toDateString() === selectedDateObj.toDateString();
    };

    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    return (
      <div className="calendar-overlay" onClick={onClose}>
        <div className="calendar" onClick={(e) => e.stopPropagation()}>
          <div className="calendar-header">
            <button className="calendar-nav" onClick={prevMonth}>&lt;</button>
            <span className="calendar-title">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button className="calendar-nav" onClick={nextMonth}>&gt;</button>
          </div>
          
          <div className="calendar-grid">
            {dayNames.map(day => (
              <div key={day} className="calendar-day-header">{day}</div>
            ))}
            
            {/* Пустые ячейки для дней предыдущего месяца */}
            {Array.from({ length: (firstDayOfMonth + 6) % 7 }, (_, i) => (
              <div key={`empty-${i}`} className="calendar-day empty"></div>
            ))}
            
            {/* Дни текущего месяца */}
            {days.map(date => (
              <div
                key={date.getDate()}
                className={`calendar-day ${
                  isToday(date) ? 'today' : ''
                } ${
                  isSelected(date) ? 'selected' : ''
                }`}
                onClick={() => onSelect(date)}
              >
                {date.getDate()}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const handleDownload = async () => {
    if (selectedStations.length === 0) return alert('Выберите хотя бы одну станцию');
    if (!startDate || !endDate) return alert('Укажите временной период');

    const startISO = formatToISO(startDate);
    const endISO = formatToISO(endDate);
    if (!startISO || !endISO) return alert('Неверный формат даты. Используйте: ДД.ММ.ГГГГ');

    const payload = {
      stations: selectedStations,
      startDate: startISO,
      endDate: endISO,
      userId: user.id,
    };

    setIsLoading(true);

    try {
      const resp = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp) {
        throw new Error('Нет ответа от сервера');
      }

      if (!resp.ok) {
        let errorMessage = 'Ошибка сервера';
        try {
          const errorText = await resp.text();
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
        } catch {
          errorMessage = `HTTP error! status: ${resp.status}`;
        }
        throw new Error(errorMessage);
      }

      const contentType = resp.headers.get('content-type');
      
      if (contentType && contentType.includes('application/zip')) {
        const blob = await resp.blob();
        
        if (blob.size === 0) {
          throw new Error('Получен пустой архив');
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const contentDisposition = resp.headers.get('content-disposition');
        let filename = 'data.zip';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert('Файл успешно скачан!');
        
      } else if (contentType && contentType.includes('application/json')) {
        const result = await resp.json();
        if (result.success === false) {
          throw new Error(result.error || 'Неизвестная ошибка');
        } else {
          alert('Операция выполнена успешно, но файл не был сгенерирован');
        }
      } else {
        const text = await resp.text();
        if (text) {
          console.warn('Неожиданный ответ от сервера:', text);
        }
        throw new Error('Неожиданный формат ответа от сервера');
      }

    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.message || 'Не удалось скачать данные');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedStations([]);
    setStartDate('');
    setEndDate('');
    setFullnessData([]);
    setShowFullnessTable(false);
  };

  if (!user || user.status !== 'active') {
    return (
      <div className="download-page">
        <div className="access-denied">
          <h2>Доступ запрещен</h2>
          <p>Требуется авторизация и подтвержденный аккаунт.</p>
        </div>
      </div>
    );
  }

  return (
    <section className='download-page'>
      <div className="download-page__back">
        <button onClick={handleBackClick} className="back-button">← Назад к станциям</button>
      </div>
      <div className="download-page__header">
        <h1>Выгрузка данных</h1>
        <p>Выберите станции и временной период</p>
        <div className="user-info">
          <small>Вы вошли как: {user.name} ({user.email})</small>
        </div>
      </div>
      <div className="download-page__content">
        <div className="stations-selection">
          <h3>Список станций</h3>
          <div className="stations-list">
            {stations.map(station => (
              <label key={station} className="station-checkbox">
                <input
                  type="checkbox"
                  checked={selectedStations.includes(station)}
                  onChange={() => handleStationToggle(station)}
                  disabled={isLoading || isViewLoading}
                />
                <span className="checkmark">○</span>
                {station.toUpperCase()}
              </label>
            ))}
          </div>
          <button 
            className="select-all-button" 
            onClick={handleSelectAll}
            disabled={isLoading || isViewLoading}
          >
            {stations.length === selectedStations.length ? '○ Снять все' : '○ Выбрать все'}
          </button>
        </div>

        <div className="time-selection">
          <h3>Временной запрос</h3>
          <div className="date-inputs">
            <div className="date-input">
              <label>Начальная дата</label>
              <div className="date-input-wrapper">
                <input
                  type="text"
                  placeholder="ДД.ММ.ГГГГ"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isLoading || isViewLoading}
                />
                <button 
                  className="calendar-button"
                  onClick={() => setShowStartCalendar(!showStartCalendar)}
                  disabled={isLoading || isViewLoading}
                  type="button"
                >
                  📅
                </button>
              </div>
              {showStartCalendar && (
                <Calendar
                  selectedDate={startDate}
                  onSelect={(date) => handleCalendarSelect(date, 'start')}
                  onClose={() => setShowStartCalendar(false)}
                />
              )}
            </div>
            <div className="date-input">
              <label>Конечная дата</label>
              <div className="date-input-wrapper">
                <input
                  type="text"
                  placeholder="ДД.ММ.ГГГГ"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isLoading || isViewLoading}
                />
                <button 
                  className="calendar-button"
                  onClick={() => setShowEndCalendar(!showEndCalendar)}
                  disabled={isLoading || isViewLoading}
                  type="button"
                >
                  📅
                </button>
              </div>
              {showEndCalendar && (
                <Calendar
                  selectedDate={endDate}
                  onSelect={(date) => handleCalendarSelect(date, 'end')}
                  onClose={() => setShowEndCalendar(false)}
                />
              )}
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button 
            className="action-button download" 
            onClick={handleDownload}
            disabled={isLoading || isViewLoading}
          >
            {isLoading ? 'Скачивание...' : 'Скачать архив'}
          </button>
          <button 
            className="action-button view" 
            onClick={handleViewFullness}
            disabled={isLoading || isViewLoading}
          >
            {isViewLoading ? 'Загрузка...' : 'Просмотреть полноту'}
          </button>
          <button 
            className="action-button clear" 
            onClick={handleClear}
            disabled={isLoading || isViewLoading}
          >
            Очистить
          </button>
        </div>

        {/* Таблица полноты данных */}
        {showFullnessTable && (
          <div className="fullness-table">
            <h3>Полнота данных (Fullness)</h3>
            <div className="table-info">
              <p>Показаны данные за выбранный период</p>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Станция</th>
                    {tableData.dates.map(date => (
                      <th key={date} title={`День года: ${date}`}>
                        {formatDayOfYear(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.stations.map(station => (
                    <tr key={station}>
                      <td className="station-name">{station.toUpperCase()}</td>
                      {tableData.dates.map(date => (
                        <td 
                          key={`${station}-${date}`}
                          
                          title={`Станция: ${station}, День: ${date}, Fullness: ${(tableData.data[station][date] * 100).toFixed(1)}%`}
                        >
                          {tableData.data[station][date] > 0 ? 
                            (tableData.data[station][date] * 100).toFixed(2) + '%' : 
                            'N/A'
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-legend">
          
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default DownloadPage;