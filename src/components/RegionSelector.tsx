import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './RegionSelector.scss';

const RegionSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const regions = [
    { 
      id: 'central', 
      name: 'Северо-Осетинский регион',
      stations: ['vlkz', 'ard2', 'latz', 'ardn','laz2','kamt','prtn']
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRegionClick = (regionId: string) => {
    setIsOpen(false);
    navigate(`/region/${regionId}`);
  };

  return (
    <div className="region-selector" ref={dropdownRef}>
      <button 
        className="region-selector__toggle"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span>Выберите регион</span>
        <span className={`arrow ${isOpen ? 'arrow--open' : ''}`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="region-selector__dropdown">
          {regions.map(region => (
            <button
              key={region.id}
              className="region-selector__item"
              onClick={() => handleRegionClick(region.id)}
              type="button"
            >
              <div className="region-selector__name">{region.name}</div>
              <div className="region-selector__stations">{region.stations.join(', ')}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RegionSelector;