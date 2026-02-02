import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import './DownloadPage.scss';

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

  const stations = ['vlkz', 'ard2', 'latz', 'laz2', 'ardn', 'kamt', 'prtn'];

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

  const handleBackClick = () => navigate('/Stations');

  const handleStationToggle = (station: string) => {
    setSelectedStations(prev =>
      prev.includes(station) ? prev.filter(s => s !== station) : [...prev, station]
    );
  };

  const handleSelectAll = () => {
    setSelectedStations(stations.length === selectedStations.length ? [] : stations);
  };

  const formatToDisplay = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const formatToISO = (input: string): string | null => {
    const match = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match) return null;
    const [_, d, m, y] = match;
    const day = parseInt(d);
    const month = parseInt(m);
    const year = parseInt(y);
    
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    
    const date = new Date(year, month - 1, day);
    if (date.getDate() !== day || date.getMonth() + 1 !== month || date.getFullYear() !== year) {
      return null;
    }
    
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  const getDayOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  const getYear = (date: Date): number => {
    return date.getFullYear();
  };

  const handleCalendarSelect = (date: Date, type: 'start' | 'end') => {
    const formattedDate = formatToDisplay(date);
    if (type === 'start') {
      setStartDate(formattedDate);
      setShowStartCalendar(false);
      setCurrentYear(date.getFullYear());
      
      if (endDate) {
        const endISO = formatToISO(endDate);
        if (endISO) {
          const endDateObj = new Date(endISO);
          if (date > endDateObj) {
            setEndDate('');
            setFullnessData([]);
            setShowFullnessTable(false);
          }
        }
      }
    } else {
      setEndDate(formattedDate);
      setShowEndCalendar(false);
    }
  };

  const handleViewFullness = async () => {
    if (selectedStations.length === 0) {
      alert('Выберите хотя бы одну станцию');
      return;
    }
    
    if (!startDate || !endDate) {
      alert('Укажите начальную и конечную даты');
      return;
    }

    const startISO = formatToISO(startDate);
    const endISO = formatToISO(endDate);
    
    if (!startISO || !endISO) {
      alert('Неверный формат даты. Используйте: ДД.ММ.ГГГГ');
      return;
    }

    const startDateObj = new Date(startISO);
    const endDateObj = new Date(endISO);
    
    if (startDateObj > endDateObj) {
      alert('Начальная дата не может быть больше конечной');
      return;
    }

    if (startDateObj.getFullYear() !== endDateObj.getFullYear()) {
      alert('Даты должны быть в пределах одного года');
      return;
    }

    const year = getYear(startDateObj);
    const dayStart = getDayOfYear(startDateObj);
    const dayEnd = getDayOfYear(endDateObj);

    const payload = {
      stations: selectedStations,
      year: year,
      dayStart: dayStart,
      dayEnd: dayEnd,
      userId: user?.id || '',
    };

    setIsViewLoading(true);
    setShowFullnessTable(false);

    try {
      const response = await fetch('http://localhost:3001/api/view-fullness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Ошибка сервера';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || `HTTP error! status: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Не удалось загрузить данные о полноте');
      }

      const transformedData: FullnessData[] = [];
      
      if (result.data && result.stations && result.dayRange) {
        const { data, stations: resultStations, dayRange } = result;
        
        for (let day = dayRange.start; day <= dayRange.end; day++) {
          const dayData = data[day] || {};
          
          resultStations.forEach((station: string) => {
            let fullnessValue = dayData[station];
            
            if (fullnessValue === null || fullnessValue === undefined || fullnessValue === '') {
              fullnessValue = 0;
            } else if (typeof fullnessValue === 'string') {
              fullnessValue = parseFloat(fullnessValue);
              if (isNaN(fullnessValue)) fullnessValue = 0;
            }
            
            if (fullnessValue > 1) {
              fullnessValue = fullnessValue / 100;
            }
            
            transformedData.push({
              station: station,
              date: day.toString(),
              fullness: fullnessValue
            });
          });
        }
      }
      
      setFullnessData(transformedData);
      setShowFullnessTable(true);
      
    } catch (err: any) {
      console.error('View fullness error:', err);
      alert(err.message || 'Не удалось загрузить данные о полноте');
    } finally {
      setIsViewLoading(false);
    }
  };

  const prepareTableData = () => {
    if (!fullnessData.length) return { stations: [], dates: [], data: {} };

    const uniqueStations = Array.from(new Set(fullnessData.map(item => item.station))).sort();
    const uniqueDates = Array.from(new Set(fullnessData.map(item => item.date))).sort((a, b) => parseInt(a) - parseInt(b));
    
    const tableData: { [key: string]: { [key: string]: number } } = {};
    
    uniqueStations.forEach(station => {
      tableData[station] = {};
      uniqueDates.forEach(date => {
        const record = fullnessData.find(item => item.station === station && item.date === date);
        tableData[station][date] = record ? record.fullness : 0;
      });
    });

    return { stations: uniqueStations, dates: uniqueDates, data: tableData };
  };

  const formatDayOfYear = (dayOfYear: string): string => {
    const dayNum = parseInt(dayOfYear);
    const date = new Date(currentYear, 0, dayNum);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
  };

  const handleDownload = async () => {
    if (selectedStations.length === 0) {
      alert('Выберите хотя бы одну станцию');
      return;
    }
    
    if (!startDate || !endDate) {
      alert('Укажите начальную и конечную даты');
      return;
    }

    const startISO = formatToISO(startDate);
    const endISO = formatToISO(endDate);
    
    if (!startISO || !endISO) {
      alert('Неверный формат даты. Используйте: ДД.ММ.ГГГГ');
      return;
    }

    const startDateObj = new Date(startISO);
    const endDateObj = new Date(endISO);
    
    if (startDateObj > endDateObj) {
      alert('Начальная дата не может быть больше конечной');
      return;
    }

    if (startDateObj.getFullYear() !== endDateObj.getFullYear()) {
      alert('Даты должны быть в пределах одного года');
      return;
    }

    const payload = {
      stations: selectedStations,
      startDate: startISO,
      endDate: endISO,
      userId: user?.id || '',
    };

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Ошибка сервера';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || `HTTP error! status: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/zip')) {
        const blob = await response.blob();
        
        if (blob.size === 0) {
          throw new Error('Получен пустой архив');
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const contentDisposition = response.headers.get('content-disposition');
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
        const result = await response.json();
        if (result.success === false) {
          throw new Error(result.error || 'Неизвестная ошибка');
        } else {
          alert('Операция выполнена успешно, но файл не был сгенерирован');
        }
      } else {
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

  const Calendar: React.FC<{
    selectedDate: string;
    onSelect: (date: Date) => void;
    onClose: () => void;
  }> = ({ selectedDate, onSelect, onClose }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const selectedDateObj = selectedDate ? (() => {
      const [day, month, year] = selectedDate.split('.').map(Number);
      return new Date(year, month - 1, day);
    })() : null;

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentYear, currentMonth, i));
    }

    const prevMonth = () => {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const nextMonth = () => {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    };

    const isToday = (date: Date) => {
      const today = new Date();
      return date.toDateString() === today.toDateString();
    };

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
            
            {Array.from({ length: (firstDayOfMonth + 6) % 7 }, (_, i) => (
              <div key={`empty-${i}`} className="calendar-day empty"></div>
            ))}
            
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

  const tableData = prepareTableData();

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
                  onBlur={(e) => {
                    const iso = formatToISO(e.target.value);
                    if (!iso && e.target.value) {
                      alert('Неверный формат даты. Используйте: ДД.ММ.ГГГГ');
                      setStartDate('');
                    }
                  }}
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
                  onBlur={(e) => {
                    const iso = formatToISO(e.target.value);
                    if (!iso && e.target.value) {
                      alert('Неверный формат даты. Используйте: ДД.ММ.ГГГГ');
                      setEndDate('');
                    }
                  }}
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
            disabled={isLoading || isViewLoading || !selectedStations.length || !startDate || !endDate}
          >
            {isLoading ? 'Скачивание...' : 'Скачать архив'}
          </button>
          <button 
            className="action-button view" 
            onClick={handleViewFullness}
            disabled={isViewLoading || !selectedStations.length || !startDate || !endDate}
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

        {showFullnessTable && (
          <div className="fullness-table">
            <h3>Полнота данных</h3>
            <div className="table-info">
              <p>Год: {currentYear}</p>
              <p>Период: {startDate} - {endDate}</p>
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
                      {tableData.dates.map(date => {
                        const fullness = tableData.data[station][date];
                        return (
                          <td 
                            key={`${station}-${date}`}
                            title={`${station.toUpperCase()}, ${formatDayOfYear(date)}: ${(fullness * 100).toFixed(1)}%`}
                          >
                            {fullness > 0 ? `${(fullness * 100).toFixed(1)}%` : '0%'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default DownloadPage;
