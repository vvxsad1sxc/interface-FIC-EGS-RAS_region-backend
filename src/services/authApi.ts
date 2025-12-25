// src/services/authApi.ts
import api from './api';

export const authApi = {
  // Проверка существования email
  checkEmail: async (email: string): Promise<{ exists: boolean }> => {
    const response = await api.post('/auth/check-email', { email });
    return response.data;
  },

  // Проверка существования имени пользователя
  checkUsername: async (username: string): Promise<{ exists: boolean }> => {
    const response = await api.post('/auth/check-username', { username });
    return response.data;
  },

  // Регистрация пользователя
  register: async (userData: {
    name: string;
    email: string;
    organization: string;
    password: string;
  }): Promise<{ success: boolean; message?: string }> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
};