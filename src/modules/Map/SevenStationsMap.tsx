import './Map.scss'
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css';
import type L from 'leaflet';
import russianBorder from '@constants/russian.json';
import StationCard from '@modules/StationCard/StationCard';
import { customGreenMarkerIcon } from '@components/CustomMarker/CustomMarker.tsx';
import MapInfo from './MapInfo.tsx';

// Типы для станций
export interface Station {
  code: string;
  name: string;
  coordinates: string;
  latitude: number;
  longitude: number;
}

// Пропсы для компонента
interface SevenStationsMapProps {
  stations: Station[];
  center?: [number, number];
  zoom?: number;
}

// Сшивает Россию по 180 меридиану
function fixGeoJSONCoordinates(geojson: any) {
  function fixCoords(coords: any[]): any[] {
    return coords.map((c) => {
      if (Array.isArray(c[0])) {
        return fixCoords(c);
      } else {
        let [lng, lat] = c;
        if (lng < 0) lng += 360;
        return [lng, lat];
      }
    });
  }

  const fixed = JSON.parse(JSON.stringify(geojson));
  fixed.features.forEach((feature: any) => {
    feature.geometry.coordinates = fixCoords(feature.geometry.coordinates);
  });
  return fixed;
}

function SevenStationsMap({ stations, center, zoom = 9 }: SevenStationsMapProps) {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker | null>>({});

  function MapRefSetter({ onMap }: { onMap: (map: L.Map) => void }) {
    const map = useMap();
    useEffect(() => {
      onMap(map as unknown as L.Map);
    }, [map, onMap]);
    return null;
  }

  // Функция для вычисления центра карты на основе станций
  const calculateCenter = (stations: Station[]): [number, number] => {
    if (stations.length === 0) return [20.2, 70.3]; // Центр Северной Осетии по умолчанию
    
    const avgLat = stations.reduce((sum, station) => sum + station.latitude, 0) / stations.length;
    const avgLng = stations.reduce((sum, station) => sum + station.longitude, 0) / stations.length;
    
    return [avgLat, avgLng];
  };

  const mapCenter = center || calculateCenter(stations);

  const handleClick = (station: Station): void => {
    if (selectedStation && selectedStation.code === station.code) {
      setSelectedStation(null);
    } else {
      setSelectedStation(station);
    }
  };

  return (
    <section className='cards'>
      <div className='cards__container'>
        <h2 className='cards__title'>Станции Северо-Осетинского региона</h2>
        <div className='cards__map-container'>
          <div className='cards__map'>
            <MapContainer 
              center={mapCenter} 
              zoom={zoom} 
              style={{ height: '100%', width: '100%' }} 
              attributionControl={false}
            >
              <MapRefSetter onMap={(map) => { mapRef.current = map; }} />
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
              />
              <GeoJSON
                data={fixGeoJSONCoordinates(russianBorder as any)}
                style={{ color: 'gray', weight: 1.25, fill: true }}
              />
              {stations.map((station) => (
                <Marker
                  key={station.code}
                  position={[station.latitude, station.longitude]}
                  icon={customGreenMarkerIcon}
                  ref={(marker) => { markersRef.current[station.code] = marker as unknown as L.Marker | null; }}
                  eventHandlers={{
                    click: () => {
                      setSelectedStation(station);
                    }
                  }}
                >
                  <Tooltip permanent direction='top' offset={[-2, -7]} className='cards__map-label'>
                    {station.code.toUpperCase()}
                  </Tooltip>
                  <Popup className='cards__map-popup'>
                    <div>
                      <h3 className='cards__map-popup__title'>
                        <strong>{station.code.toUpperCase()}</strong>
                      </h3>
                      <p className='cards__map-popup__description'>
                        <strong>Местоположение</strong>: {station.name}
                      </p>
                      <p className='cards__map-popup__description'>
                        <strong>Координаты:</strong> {station.coordinates}
                      </p>
                      <p className='cards__map-popup__description'>
                        <strong>Статус:</strong> Активна
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <div className='cards__map-info'>
            <ul className='cards__map-info-list'>
              {stations.map(station => {
                return (
                  <li
                    className='cards__map-info-item'
                    key={station.code}
                    onClick={() => {
                      handleClick(station);
                      const marker = markersRef.current[station.code];
                      if (marker) {
                        marker.openPopup();
                      }
                      if (mapRef.current) {
                        mapRef.current.setView(
                          [station.latitude, station.longitude],
                          Math.max(mapRef.current.getZoom(), 10)
                        );
                      }
                    }}
                  >
                    <span className='cards__map-info-item-title'>{station.code.toUpperCase()}</span>
                    <span className='cards__map-info-item-subtitle'>{station.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          {!selectedStation && <MapInfo />}
          {selectedStation && (
            <div className="station-card-overlay">
              <StationCard
                station={{
                  Name: selectedStation.code,
                  Region: selectedStation.name,
                  Latitude: selectedStation.latitude.toString(),
                  Longitude: selectedStation.longitude.toString()
                }}
                onClose={() => setSelectedStation(null)}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default SevenStationsMap;