export interface Region {
    id: number;
    name: string;
    description: string;
}

export interface Station {
    id: number;
    name: string;
    full_name: string;
    region_id: number;
    latitude?: number;
    longitude?: number;
} 
