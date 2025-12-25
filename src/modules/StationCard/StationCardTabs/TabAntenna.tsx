import { Station } from '@constants/constants.ts';

function TabAntenna({ station }: { station: Station }) {
  if (station.Antenna) {
    return (
      <>
        <h4 className='cards__station__subtitle'>Антенна</h4>
        {station.Antenna.Name && <p className='cards__station__description'><strong>Название:</strong> {station.Antenna.Name}</p>}
        {station.Antenna.Radome && <p className='cards__station__description'><strong>Обтекатель (Radome):</strong> {station.Antenna.Radome}</p>}
        {station.Antenna.SerialNumber && <p className='cards__station__description'><strong>Серийный номер:</strong> {station.Antenna.SerialNumber}</p>}
        {station.Antenna.ARP && <p className='cards__station__description'><strong>ARP:</strong> {station.Antenna.ARP}</p>}
        {station.Antenna.MarkerUp && <p className='cards__station__description'><strong>Marker up:</strong> {station.Antenna.MarkerUp}</p>}
        {station.Antenna.MarkerNorth && <p className='cards__station__description'><strong>Marker north:</strong> {station.Antenna.MarkerNorth}</p>}
        {station.Antenna.MarkerEast && <p className='cards__station__description'><strong>Marker east:</strong> {station.Antenna.MarkerEast}</p>}
        {station.Antenna.DateInstalled && <p className='cards__station__description'><strong>Дата установки:</strong> {station.Antenna.DateInstalled.split('T')[0]}</p>}
      </>
    );
  } else {
    return <div className='cards__station__description cards__station--warning'>Информация об антенне отсутствует</div>;
  }
}
  
export default TabAntenna;