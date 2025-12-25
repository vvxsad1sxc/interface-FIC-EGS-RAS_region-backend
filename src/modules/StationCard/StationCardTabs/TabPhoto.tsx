import './TabPhoto.scss'
import { useEffect, useState } from 'react';
import { Station } from '@constants/constants';
import iconSlideLeft from '@assets/icon-slide-left.png'
import iconSlideRight from '@assets/icon-slide-right.png'

type ModuleRecord = Record<string, { default: string }>;

const mobj = import.meta.glob('@assets/receivers/mobj/*.{jpg,JPG,png,svg}', { eager: true }) as ModuleRecord;
const mobk = import.meta.glob('@assets/receivers/mobk/*.{jpg,JPG,png,svg}', { eager: true }) as ModuleRecord;
const yssk = import.meta.glob('@assets/receivers/yssk/*.{jpg,JPG,png,svg}', { eager: true }) as ModuleRecord;

type StationPhotos = {
  [key: string]: string[];
};

const stationPhotos: StationPhotos = {
  mobj: Object.values(mobj).map((mod: ModuleRecord[string]) => mod.default),
  mobk: Object.values(mobk).map((mod: ModuleRecord[string]) => mod.default),
  yssk: Object.values(yssk).map((mod: ModuleRecord[string]) => mod.default),
};

function TabPhoto({ station }: {station: Station}) {
  const photos: string[] = stationPhotos[station.Name.toLowerCase()] || [];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setCurrent(0);
  }, [station]);

  if (photos.length === 0) return <div className='cards__station--warning cards__station__photo'>Пока нет фото для этой станции</div>;

  const prev = () => setCurrent((current - 1 + photos.length) % photos.length);
  const next = () => setCurrent((current + 1) % photos.length);

  return (
    <>
      <div className='cards__station__slider cards__station__photo'>
        {photos.length !== 1 && <img src={iconSlideLeft} className='cards__station__button' onClick={prev} alt='' width='30' height='30' />}
        <img loading='lazy' className='cards__station__photo' src={photos[current]} alt={`Фото ${current + 1}`} style={{ maxWidth: '75%'}}/>
        {photos.length !== 1 && <img src={iconSlideRight} className='cards__station__button' onClick={next} alt='' width='30' height='30'/>}
      </div>
      {photos.length !== 1 && <div className='cards__station__counter' >{current + 1} / {photos.length}</div>}
    </>
  );
}

export default TabPhoto;