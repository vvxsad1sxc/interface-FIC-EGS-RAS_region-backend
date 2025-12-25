import './ArchiveAccess.scss'

function ArchiveError({ error }: { error: string }) {
  return (
    <div className='stations__description__container'>
      <p className='stations__description'>{error}</p>
    </div>
  );
}

export default ArchiveError;