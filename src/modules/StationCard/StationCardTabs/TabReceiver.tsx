import { Station } from '@constants/constants.ts';

function TabReceiver({ station }: { station: Station }) {
  if(station.Receiver) {
    return (
      <>
        <h4 className='cards__station__subtitle'>Приемник</h4>
        {station.Receiver.Name && <p className='cards__station__description'><strong>Название:</strong> {station.Receiver.Name}</p>}
        {station.Receiver.SatelliteSystem && <p className='cards__station__description'><strong>Спутниковая система:</strong> {station.Receiver.SatelliteSystem}</p>}
        {station.Receiver.SerialNumber && <p className='cards__station__description'><strong>Серийный номер:</strong> {station.Receiver.SerialNumber}</p>}
        {station.Receiver.FirmwareVersion && <p className='cards__station__description'><strong>Версия прошивки:</strong> {station.Receiver.FirmwareVersion}</p>}
        {station.Receiver.ElevCutoff && <p className='cards__station__description'><strong>Отсечка высоты (Elev cutoff):</strong> {station.Receiver.ElevCutoff}</p>}
        {station.Receiver.DateInstalled && <p className='cards__station__description'><strong>Дата установки:</strong> {station.Receiver.DateInstalled.split('T')[0]}</p>} 
      </>
    );
  } else {
    return <div className='cards__station__description cards__station--warning'>Информация о приемнике отсутствует</div>;
  }
}
  
export default TabReceiver;