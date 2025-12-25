import './StationCard.scss'
// import TabAntenna from './StationCardTabs/TabAntenna.tsx'
import TabOverview from'./StationCardTabs/TabOverview.tsx'
import TabPhoto from'./StationCardTabs/TabPhoto.tsx'
// import TabReceiver from './StationCardTabs/TabReceiver.tsx'
import { Station } from '@constants/constants.ts'


type StationCardProps = {
  station: Station;
  onClose?: () => void;
}

function StationCard({ station, onClose }: StationCardProps) {  
  const content_overview = <TabOverview station={station} />;
  // const content_antenna = <TabAntenna station={station} />;
  // const content_receiver = <TabReceiver station={station} />;
  const content_photo = <TabPhoto station={station} />;
  
  const passportHref = new URL(`../../constants/passports/${station.Name.toLowerCase()}.txt`, import.meta.url).href;
  
  return (
    <div className='cards__station'>
      <div className='cards__station-container'>
        <button
          type='button'
          aria-label='Закрыть паспорт'
          className='cards__station__close'
          onClick={() => onClose && onClose()}
        >
          ×
        </button>
        <div className='cards__station__titles'>
          <h3 className='cards__station__title'><strong>{station.Name.toUpperCase()}</strong></h3>
          <a href={passportHref} className='cards__station__link' download={`${station.Name.toLowerCase()}Passport.txt`}>
            {(passportHref.split('/')[passportHref.split('/').length - 1] === 'undefined') ? '' : 'паспорт станции'}
          </a>
        </div>
        <div className='cards__station-content'>
          {content_overview}
          {content_photo}
        </div>
      </div>
    </div>
  );
}

export default StationCard;