import { IGSStation } from '../types/types'

export interface Station extends IGSStation {
  Name: string;
  Region: string;
};

export const position: [number, number] = [68.524, 105.3188];

export const allStationNames: string[] = [
  'arti',
  'artu',
  'bilb',
  'bili',
  'irkm',
  'irkt',
  'lovj',
  'mag0',
  'magj',
  'mobj',
  'mobk',
  'mobn',
  'nril',
  'petp',
  'petr',
  'pets',
  'tixi',
  'tixj',
  'yaka',
  'yakt',
  'yakz',
  'yssk',
];

export const activeStations: Array<Station> = [
  { Name: 'artu', Region: 'Арти, Россия' },
  { Name: 'arti', Region: 'Арти, Россия', Latitude: '56.430', Longitude: '58.560' },
  { Name: 'irkm', Region: 'Иркутск, Россия' },
  { Name: 'irkt', Region: 'Иркутск, Россия', Latitude: '52.219', Longitude: '104.316' },
  { Name: 'mag0', Region: 'Магадан, Россия' },
  { Name: 'mobn', Region: 'Обнинск, Россия' },
  { Name: 'mobk', Region: 'Обнинск, Россия' },
  { Name: 'mobj', Region: 'Обнинск, Россия' },
  { Name: 'nril', Region: 'Норильск, Россия' },
  { Name: 'pets', Region: 'Петропавловск-Камчатский, Россия' },
  { Name: 'tixi', Region: 'Тикси, Россия' },
  { Name: 'tixj', Region: 'Тикси, Россия', Latitude: '71.634', Longitude: '128.866' },
  { Name: 'yakt', Region: 'Якутск, Россия' },
  { Name: 'yssk', Region: 'Южно-Сахалинск, Россия' },
];
