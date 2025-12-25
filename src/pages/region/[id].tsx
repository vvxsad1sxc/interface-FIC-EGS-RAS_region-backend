 
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import RegionMap from '../../components/RegionMap';
import StationInfo from '../../components/StationInfo';

const RegionPage = () => {
    const router = useRouter();
    const { id } = router.query;
    const [region, setRegion] = useState(null);
    const [stations, setStations] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);

    useEffect(() => {
        if (id) {
            fetchRegionData();
            fetchStations();
        }
    }, [id]);

    const fetchRegionData = async () => {
        try {
            const response = await fetch(`/api/regions/${id}`);
            const data = await response.json();
            setRegion(data);
        } catch (error) {
            console.error('Error fetching region:', error);
        }
    };

    const fetchStations = async () => {
        try {
            const response = await fetch(`/api/stations?region_id=${id}`);
            const data = await response.json();
            setStations(data);
        } catch (error) {
            console.error('Error fetching stations:', error);
        }
    };

    if (!region) {
        return <div>Loading...</div>;
    }

    return (
        <Layout>
            <div className="region-page">
                <div className="region-content">
                    <div className="map-section">
                        <RegionMap 
                            stations={stations}
                            onStationSelect={setSelectedStation}
                        />
                    </div>
                    <div className="info-section">
                        <StationInfo 
                            station={selectedStation}
                            region={region}
                        />
                    </div>
                </div>
            </div>
            <style jsx>{`
                .region-page {
                    margin-left: 250px;
                    padding: 20px;
                }
                .region-content {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    height: calc(100vh - 80px);
                }
                .map-section {
                    background: white;
                    border-radius: 8px;
                    padding: 15px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .info-section {
                    background: white;
                    border-radius: 8px;
                    padding: 15px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow-y: auto;
                }
            `}</style>
        </Layout>
    );
};

export default RegionPage;