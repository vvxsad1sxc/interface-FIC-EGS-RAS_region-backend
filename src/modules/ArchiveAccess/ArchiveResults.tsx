import './ArchiveAccess.scss'
import {ArchiveFiles} from '@/types/types.ts'

function ArchiveResults({stations}: {stations: ArchiveFiles[]}) {
  // return (
  //   <div className='stations__description__container'>
  //     <p className='stations__description'>Результаты запроса:</p>
  //     <div>
  //       {Object.entries(stations).map(([station, data]) => (
  //         <div key={station}>
  //           <p className='stations__description'>Станция: {station.toUpperCase()}</p>
  //           {Array.isArray(data) ? (
              
  //           ) : (
  //             <p className='stations__description'>{data.error}</p>
  //           )}
  //         </div>
          // <div key={station}>
          //   <p className='stations__description'>Станция: {station.toUpperCase()}</p>
          //   {Array.isArray(stations) ? (
          //     data.length > 0 ? (
          //       <ul>
          //         {data.map((file, index) => (
          //           <li key={index}>
          //             <p className='stations__description'>Файл: {file.filename}</p>
          //             <p className='stations__description'>Дата: {file.date}</p>
          //             <p className='stations__description'>Путь: {file.path}</p>
          //           </li>
          //         ))}
          //       </ul>
          //     ) : (
          //       <p className='stations__description'>Нет данных за выбранный период</p>
          //     )
          //   ) : (
          //     <p className='stations__description'>{data.error}</p>
          //   )}
          // </div>
  //       ))}
  //     </div>
  //   </div>
  // );

  return (
    <div className='stations__description__container'>
      <p className='stations__description'>Результаты запроса:</p>
      <div>
        {Object.entries(stations).map(([station, data]) => (
          <div key={station}>
            <p className='stations__description'>
              Станция: {station.toUpperCase()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArchiveResults;