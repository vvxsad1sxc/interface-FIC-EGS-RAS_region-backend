import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SevenStationsMap from '@modules/Map/SevenStationsMap';
import './RegionPage.scss';


const stationCoordinates = {
  vlkz: { latitude: 43.0300, longitude: 44.6833 }, // Владикавказ
  ard2: { latitude: 43.1667, longitude: 44.2833 }, // Ардон
  latz: { latitude: 42.8333, longitude: 44.3000 }, // Лац
  ardn: { latitude: 43.1667, longitude: 44.2833 }, // Ардон (дубликат)
  laz2: { latitude: 42.8333, longitude: 44.3000 }, // Лац (дубликат)
  kamt: { latitude: 42.9500, longitude: 43.7833 }, // Камата
  prtn: { latitude: 43.7500, longitude: 44.2833 }  // Притеречный
};

const RegionPage: React.FC = () => {
  const { regionId } = useParams<{ regionId: string }>();
  const navigate = useNavigate();

  const regionData = {
    central: {
      name: 'Северо-Осетинский регион',
      stations: [
        { code: 'vlkz', name: 'Владикавказ', coordinates: '44°41´, 43°03´' },
        { code: 'ard2', name: 'Ардон', coordinates: '44°17´, 43°10´' },
        { code: 'latz', name: 'Лац', coordinates: '44°18´, 42°50´' },
        { code: 'ardn', name: 'Ардон', coordinates: '44°17´, 43°10´' },
        { code: 'laz2', name: 'Лац', coordinates: '44°18´, 42°50´' },
        { code: 'kamt', name: 'Камата', coordinates: '43°47′, 42°57′' },
        { code: 'prtn', name: 'Притеречный', coordinates: '44°17´, 43°45´' }
      ],
      description: 'Северо-Осетинский регион включает в себя станции, расположенные в южной части России.'
    }
  };

  const region = regionData[regionId as keyof typeof regionData];

  // Преобразуем станции для карты с правильными координатами
  const mapStations = region ? region.stations.map(station => ({
    ...station,
    latitude: stationCoordinates[station.code as keyof typeof stationCoordinates]?.latitude || 0,
    longitude: stationCoordinates[station.code as keyof typeof stationCoordinates]?.longitude || 0
  })) : [];

  // Центр для карты (Северная Осетия)
  const mapCenter: [number, number] = [43.1, 44.3];

  const handleBackClick = () => {
    navigate('/Stations');
  };

  if (!region) {
    return (
      <div className="region-page">
        <div className="region-page__not-found">
          <h1>Регион не найден</h1>
          <button onClick={handleBackClick} className="back-button">← Назад к станциям</button>
        </div>
      </div>
    );
  }

  return (
    <section className='region-page'>
      <div className="region-page__back">
        <button onClick={handleBackClick} className="back-button">← Назад к станциям</button>
      </div>
      
      <div className="region-page__content">
        <div className="region-page__info">
          <div className="region-info">
            <h1>{region.name}</h1>
            <p className="region-description">{region.description}</p>
            
            <h2>Станции региона</h2>
            <div className="stations-list">
              {mapStations.map(station => (
                <div key={station.code} className="station-card">
                  <h3 className="station-code">{station.code.toUpperCase()}</h3>
                  <p className="station-name">{station.name}</p>
                  <p className="station-coordinates">
                    Широта: {station.latitude.toFixed(4)}°, 
                    Долгота: {station.longitude.toFixed(4)}°
                  </p>
                  <span className="station-status">Статус: Активна</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="region-page__map">
          <SevenStationsMap 
            stations={mapStations}
            center={mapCenter}
            zoom={9}
          />
        </div>
      </div>
    </section>
  );
};

export default RegionPage;