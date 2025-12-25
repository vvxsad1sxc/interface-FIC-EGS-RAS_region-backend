export interface User {
    id: number;
    name: string;
    email: string;
    organization: string;
    role_id: number;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
    email: string;
    organization: string;
    password: string;
}