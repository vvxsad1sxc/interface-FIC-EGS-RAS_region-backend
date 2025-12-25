import { Station } from '@constants/constants.ts';

function TabOverview({ station }: {station: Station}) {
  return (
    <>
      <p className='cards__station__description'><strong>Местоположение</strong>: {station.Region}</p>
      {station.Latitude && station.Longitude && <p className='cards__station__description'><strong>Координаты (шир., дол.):</strong> {station.Latitude}, {station.Longitude}</p>}
      {station.Antenna && station.Antenna.DateInstalled && <p className='cards__station__description'><strong>Дата установки:</strong> {station.Antenna.DateInstalled.split('T')[0]}</p>}
      {station.Receiver && station.Receiver.Name && <p className='cards__station__description'><strong>Приемник:</strong> {station.Receiver.Name}</p>}
      {station.Receiver && station.Receiver.SatelliteSystem && <p className='cards__station__description'><strong>Спутниковая система:</strong> {station.Receiver.SatelliteSystem}</p>}
    </>
  );
}
  
export default TabOverview;