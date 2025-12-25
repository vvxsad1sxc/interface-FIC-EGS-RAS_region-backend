import React, { useState } from 'react';
import Map from '@modules/Map/Map';
import RegionSelector from '@/components/RegionSelector';
import './StationsPage.scss';

function StationsPage() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  return (
    <section className='stations-page'>
      <div className="stations-page__header">
        <h1>Сеть станций ФИЦ ЕГС РАН</h1>
        <p>Выберите регион для просмотра станций</p>
        
        <div className="stations-page__selector">
          <RegionSelector onRegionSelect={setSelectedRegion} />
        </div>

        {selectedRegion && (
          <div className="stations-page__region-info">
            <h3>🔍 Северо-Осетинский регион</h3>
            <div className="stations-list">
              <strong>Станции:</strong>
              <div className="stations-codes">
                <span className="station-code">vlkz</span>
                <span className="station-code">ard2</span>
                <span className="station-code">latz</span>
                <span className="station-code">prtn</span>
                <span className="station-code">ardn</span>
                <span className="station-code">laz2</span>
                <span className="station-code">kamt</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="stations-page__map">
        <Map selectedRegion={selectedRegion} />
      </div>
    </section>
  );
}

export default StationsPage;