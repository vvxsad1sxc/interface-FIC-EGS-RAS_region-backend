// services/authService.ts
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';
const TIMEOUT = 15000;

const api = axios.create({
  baseURL: API_BASE,
  timeout: TIMEOUT,
  validateStatus: (status) => status < 500,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    // УСПЕШНЫЕ ответы проходят без изменений
    return res;
  },
  (error) => {
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(new Error('Превышено время ожидания. Попробуйте позже.'));
      }
      if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
        return Promise.reject(new Error('Нет подключения к интернету. Проверьте сеть.'));
      }
      return Promise.reject(new Error('Ошибка сети. Попробуйте позже.'));
    }

    // Ошибки авторизации (кроме эндпоинта логина)
    if (error.response.status === 401 && !error.config.url.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('Сессия истекла. Войдите снова.'));
    }

    const message = error.response.data?.message || error.message;
    return Promise.reject(new Error(message));
  }
);

interface CheckResponse { exists: boolean; }
interface AuthSuccess {
  success: true;
  message?: string;
  token?: string;
  user: {
    id: number;
    name: string;
    email: string;
    organization: string;
    role_id: number;
    role_name: string;
    status: 'pending' | 'active';
    created_at: string;
  };
}
interface AuthError { success: false; message: string; }
type AuthResponse = AuthSuccess | AuthError;
interface ProfileResponse { user: AuthSuccess['user']; }

// Интерфейсы для восстановления пароля
interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

interface VerifyTokenResponse {
  success: boolean;
  message: string;
  email?: string;
}

interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export const authService = {
  checkEmailExists: async (email: string): Promise<boolean> => {
    try {
      const { data } = await api.post<CheckResponse>('/auth/check-email', { email });
      return data.exists;
    } catch (error: any) {
      console.warn('Email check failed:', error.message);
      return false;
    }
  },

  checkUsernameExists: async (username: string): Promise<boolean> => {
    try {
      const { data } = await api.post<CheckResponse>('/auth/check-username', { username });
      return data.exists;
    } catch (error: any) {
      console.warn('Username check failed:', error.message);
      return false;
    }
  },

  register: async (userData: any): Promise<AuthResponse> => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', userData);
      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  login: async (cred: any): Promise<AuthResponse> => {
    console.log('Попытка входа:', cred);

    try {
      const { data } = await api.post<AuthResponse>('/auth/login', cred);
      console.log('Ответ сервера:', data);

      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('Токен сохранён:', data.token);
      } else {
        console.error('Вход не удался:', data);
      }
      return data;
    } catch (error: any) {
      console.error('ОШИБКА ВХОДА:', error.response?.data || error.message);
      throw error;
    }
  },

  getProfile: async (): Promise<ProfileResponse> => {
    const { data } = await api.get<ProfileResponse>('/auth/profile');
    return data;
  },

  refreshProfile: async (): Promise<ProfileResponse> => {
    const { data } = await api.get<ProfileResponse>('/auth/profile');
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // === Восстановление пароля ===

  // Запрос на восстановление пароля
  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    try {
      console.log('Отправка запроса на восстановление пароля для:', email);
      
      const { data } = await api.post<ForgotPasswordResponse>('/auth/forgot-password', { email });
      console.log('Ответ от forgot-password:', data);
      
      return data;
    } catch (error: any) {
      console.error('ОШИБКА ВОССТАНОВЛЕНИЯ ПАРОЛЯ:', error.response?.data || error.message);
      throw error;
    }
  },

  // Проверка токена восстановления
  verifyResetToken: async (token: string): Promise<VerifyTokenResponse> => {
    try {
      console.log('Проверка токена восстановления:', token.substring(0, 10) + '...');
      
      const { data } = await api.get<VerifyTokenResponse>(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
      console.log('Ответ от verify-reset-token:', data);
      
      return data;
    } catch (error: any) {
      console.error('ОШИБКА ПРОВЕРКИ ТОКЕНА:', error.response?.data || error.message);
      throw error;
    }
  },

  // Установка нового пароля
  resetPassword: async (token: string, newPassword: string): Promise<ResetPasswordResponse> => {
    try {
      console.log('Сброс пароля с токеном:', token.substring(0, 10) + '...');
      
      const { data } = await api.post<ResetPasswordResponse>('/auth/reset-password', { 
        token, 
        newPassword 
      });
      console.log('Ответ от reset-password:', data);
      
      return data;
    } catch (error: any) {
      console.error('ОШИБКА СБРОСА ПАРОЛЯ:', error.response?.data || error.message);
      throw error;
    }
  },
};