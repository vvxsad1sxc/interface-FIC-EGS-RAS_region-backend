import React from 'react';

interface Station {
    id: number;
    name: string;
    full_name: string;
    region_id: number;
    latitude?: number;
    longitude?: number;
}

interface RegionMapProps {
    stations: Station[];
    onStationSelect: (station: Station) => void;
}

const RegionMap: React.FC<RegionMapProps> = ({ stations, onStationSelect }) => {
    return (
        <div className="region-map">
            <h3>Карта региона</h3>
            <svg width="100%" height="400" viewBox="0 0 400 300">
                <rect width="400" height="300" fill="#e8f4f8" stroke="#007bff" strokeWidth="2"/>
                
                {stations.map((station, index) => (
                    <g key={station.id}>
                        <circle 
                            cx={100 + (index % 4) * 80}
                            cy={80 + Math.floor(index / 4) * 80}
                            r="8"
                            fill="#007bff"
                            className="station-point"
                            onClick={() => onStationSelect(station)}
                        />
                        <text 
                            x={100 + (index % 4) * 80}
                            y={80 + Math.floor(index / 4) * 80 - 10}
                            textAnchor="middle"
                            fontSize="12"
                        >
                            {station.name}
                        </text>
                    </g>
                ))}
            </svg>
            <style jsx>{`
                .station-point {
                    cursor: pointer;
                    transition: r 0.3s ease;
                }
                .station-point:hover {
                    r: 12;
                    fill: #0056b3;
                }
            `}</style>
        </div>
    );
};

export default RegionMap; 
