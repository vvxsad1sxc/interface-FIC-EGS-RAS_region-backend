// IGS Station Data Types
export interface IGSReceiver {
  Name?: string;
  SatelliteSystem?: string;
  SerialNumber?: string;
  FirmwareVersion?: string;
  ElevCutoff?: string;
  DateInstalled?: string;
}

export interface IGSAntenna {
  Name?: string;
  Radome?: string;
  SerialNumber?: string;
  ARP?: string;
  MarkerUp?: string;
  MarkerNorth?: string;
  MarkerEast?: string;
  DateInstalled?: string;
}

export interface IGSClock {
  Type?: string;
  InputFrequency?: string;
  EffectiveDates?: string;
}

export interface IGSStation {
  X?: number;
  Y?: number;
  Z?: number;
  Latitude?: string;
  Longitude?: string;
  Height?: string;
  Receiver?: IGSReceiver;
  Antenna?: IGSAntenna;
  Clock?: IGSClock;
}

// Archive Access Types
export interface ArchiveDownload {
  success: boolean; 
  download_url?: string;
  file_count: number;
  archive_name: string; 
  stations: string[];
  period: string;
  structure: string;
}

export interface ArchiveFile {
  id: string;
  filename: string;
  date: string;
  path: string;
  fullness: number; 
  staid_info: {
    staid: number;
    staname: string;
  };
}

export interface ArchiveError {
  error: string;
}

// export type ArchiveFiles = Record<string, ArchiveFile | ArchiveError>;
export interface ArchiveFiles {
  [key: string]: ArchiveFile[] | ArchiveError;
}