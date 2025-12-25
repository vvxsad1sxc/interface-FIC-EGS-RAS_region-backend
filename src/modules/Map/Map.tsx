import './Map.scss'
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css';
import type L from 'leaflet';
import russianBorder from '@constants/russian.json';
import { position, activeStations, Station } from '@constants/constants.ts';
import StationCard from '@modules/StationCard/StationCard';
import { customGreenMarkerIcon } from '@components/CustomMarker/CustomMarker.tsx';
import { getDataIGS } from '@services/dataService.ts';
import { IGSStation } from '../../types/types.ts';
import MapInfo from './MapInfo.tsx';

type IGSData = Record<string, IGSStation>;
type StationsByCoords = Record<string, Station[]>;

// Сшивает Россию по 180 меридиану
function fixGeoJSONCoordinates(geojson: any) {
  function fixCoords(coords: any[]): any[] {
    return coords.map((c) => {
      if (Array.isArray(c[0])) {
        return fixCoords(c);
      } else {
        let [lng, lat] = c;
        if (lng < 0) lng += 360; // Переносим отрицательные долготы
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

function Map() {
  const [stations, setStations] = useState<Station[]>([]);
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

  useEffect(() => {
    const dataIGS = () => {
      const jsonIGS: IGSData = getDataIGS() as unknown as IGSData;

      const filteredStations = activeStations.map(station => {
        if (station.Name) {
          const stationName: string = station.Name.toUpperCase() + '00RUS';
          const igsData = jsonIGS[stationName];
          if (igsData) {
            return {
              ...station,
              ...igsData
            };
          }
          return station;
        } else {
          throw new Error('Station name not found');
        }
      });
      setStations(filteredStations);
    }

    dataIGS();
  }, []);

  const stationsByCoords: StationsByCoords = stations.reduce((acc, station) => {
    const key = station.Latitude + ',' + station.Longitude;
    if (!acc[key]) acc[key] = [];
    acc[key].push(station);
    return acc;
  }, {} as StationsByCoords);

  const handleClick = (station: Station): void => {
    if (selectedStation && selectedStation.Name === station.Name) {
      setSelectedStation(null);
    } else {
      setSelectedStation(station);
    }
  };

  return (
    <section className='cards'>
      <div className='cards__container'>
        <h2 className='cards__title'>Сеть станций ФИЦ ЕГС РАН</h2>
        <div className='cards__map-container'>
          <div className='cards__map'>
            <MapContainer center={position} zoom={2} style={{ height: '100%', width: '100%' }} attributionControl={false}>
              <MapRefSetter onMap={(map) => { mapRef.current = map; }} />
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
              />
              <GeoJSON
                data={fixGeoJSONCoordinates(russianBorder as any)} // фиксируем границы
                style={{ color: 'gray', weight: 1.25, fill: true }}
              />
              {Object.entries(stationsByCoords).map(([coordsStr, stationsGroup]) => {
                const coords = coordsStr.split(',').map(Number);
                return (
                  <Marker
                    key={coordsStr}
                    position={[coords[0], coords[1]] as [number, number]}
                    icon={customGreenMarkerIcon}
                    ref={(marker) => { markersRef.current[coordsStr] = marker as unknown as L.Marker | null; }}
                    eventHandlers={{
                      click: () => {
                        setSelectedStation(stationsGroup[0]);
                      }
                    }}
                  >
                    <Tooltip permanent direction='top' offset={[-2, -7]} className='cards__map-label'>
                      {stationsGroup[0]?.Name?.toUpperCase()}
                    </Tooltip>
                    <Popup className='cards__map-popup'>
                      {stationsGroup.map((station: Station) => (
                        <div key={station.Name}>
                          <h3 className='cards__map-popup__title' onClick={() => setSelectedStation(station)}><strong>{station.Name.toUpperCase()}</strong></h3>
                          <p className='cards__map-popup__description'><strong>Местоположение</strong>: {station.Region}</p>
                          <p className='cards__map-popup__description'><strong>Координаты:</strong> {station.Latitude + ', ' + station.Longitude}</p>
                          {station.Receiver && <p className='cards__map-popup__description'><strong>Приемник:</strong> {station.Receiver.Name}</p>}
                          {station.Receiver && <p className='cards__map-popup__description'><strong>Спутниковая система:</strong> {station.Receiver.SatelliteSystem}</p>}
                        </div>
                      ))}
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
          <div className='cards__map-info'>
            <ul className='cards__map-info-list'>
              {stations.map(station => {
                return (
                  <li
                    className='cards__map-info-item'
                    key={station.Name}
                    onClick={() => {
                      handleClick(station);
                      const key = station.Latitude + ',' + station.Longitude;
                      const marker = markersRef.current[key];
                      if (marker) {
                        marker.openPopup();
                      }
                      if (mapRef.current) {
                        mapRef.current.setView([Number(station.Latitude), Number(station.Longitude)] as L.LatLngExpression, Math.max(mapRef.current.getZoom(), 5));
                      }
                    }}
                  >
                    <span className='cards__map-info-item-title'>{station.Name.toUpperCase()}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          {!selectedStation && <MapInfo />}
          {selectedStation && (
            <StationCard
              station={selectedStation}
              onClose={() => setSelectedStation(null)}
            />
          )}
        </div>
      </div>
    </section>
  )
}

export default Map;
