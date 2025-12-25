import './ArchiveAccess.scss'
import { ArchiveDownload } from '@/types/types.ts'

function ArchiveDownloadInfo(downloadInfo: ArchiveDownload) {
  return (
    <div className='stations__description__container'>
      <p className='stations__description'>Архив успешно создан</p>
      <p className='stations__description'>Имя файла: {downloadInfo.archive_name}</p>
      <p className='stations__description'>Количество файлов: {downloadInfo.file_count}</p>
      <p className='stations__description'>Структура архива: {downloadInfo.structure}</p>
      {downloadInfo.download_url && (
        <a 
          href={downloadInfo.download_url} 
          target='_blank'
          rel='noopener noreferrer'
          className='download-link'
        >
          Скачать архив
        </a>
      )}
    </div>
  );
};

export default ArchiveDownloadInfo;