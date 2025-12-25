export default function handler(req, res) {
    const { region_id } = req.query;
    
    const stations = {
        '1': [
            { id: 1, name: 'vlkz', full_name: 'Волоколамская станция', region_id: 1 },
            { id: 2, name: 'ard2', full_name: 'Архангельская станция 2', region_id: 1 },
            { id: 3, name: 'latz', full_name: 'Латышская станция', region_id: 1 },
            { id: 4, name: 'prtn', full_name: 'Партизанская станция', region_id: 1 }
        ]
        // Добавьте станции для других регионов
    };
    
    res.status(200).json(stations[region_id] || []);
} 
