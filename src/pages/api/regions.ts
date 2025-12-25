export default function handler(req, res) {
    const regions = [
        { id: 1, name: 'Московский регион', description: 'Описание московского региона' },
        { id: 2, name: 'Северо-Западный регион', description: 'Описание северо-западного региона' },
        // Добавьте другие регионы
    ];
    res.status(200).json(regions);
} 
