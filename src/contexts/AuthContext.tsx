import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import axios from 'axios';

interface User {
  id: number;
  name: string;
  email: string;
  organization: string;
  role_id: number;
  role_name: string;
  status: 'pending' | 'active';
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { login: string; password: string }) => Promise<{ success: boolean; message?: string; user?: User }>;
  register: (userData: {
    name: string;
    email: string;
    organization: string;
    password: string;
    confirmPassword: string;
  }) => Promise<{ success: boolean; message?: string; token?: string; user?: User }>;
  logout: () => void;
  isAdmin: boolean;
  isActive: boolean;
  checkEmailExists: (email: string) => Promise<boolean>;
  checkUsernameExists: (username: string) => Promise<boolean>;
  loginAfterRegister?: (token: string, user: User) => void;
  // Новые функции для восстановления пароля
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  verifyResetToken: (token: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // === Проверка авторизации при загрузке ===
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          // Устанавливаем токен в axios через authService или напрямую
          const profile = await authService.getProfile();
          const freshUser = profile.user;

          if (freshUser.status === 'active') {
            setUser(freshUser);
          } else {
            logout();
          }
        } catch (error) {
          console.error('Token invalid:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // === Проверка email ===
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const exists = await authService.checkEmailExists(email);
      return exists;
    } catch {
      return false;
    }
  };

  // === Проверка username ===
  const checkUsernameExists = async (username: string): Promise<boolean> => {
    try {
      const exists = await authService.checkUsernameExists(username);
      return exists;
    } catch {
      return false;
    }
  };

  // === Логин ===
  const login = async (credentials: { login: string; password: string }) => {
    try {
      const result = await authService.login(credentials);

      if (result.success && result.user && result.token) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        setUser(result.user);
        return { success: true, user: result.user };
      }

      return { success: false, message: result.message || 'Неверные учетные данные' };
    } catch (error: any) {
      console.error('Login error in AuthContext:', error);
      return { 
        success: false, 
        message: error.message || error.response?.data?.message || 'Ошибка входа' 
      };
    }
  };

  // === Регистрация ===
  const register = async (userData: {
    name: string;
    email: string;
    organization: string;
    password: string;
    confirmPassword: string;
  }) => {
    try {
      const result = await authService.register(userData);

      if (result.success && result.user) {
        // Автовход только если active
        if (result.user.status === 'active' && result.token) {
          localStorage.setItem('token', result.token);
          localStorage.setItem('user', JSON.stringify(result.user));
          setUser(result.user);
          return { success: true, user: result.user, token: result.token };
        }
        // pending — просто успех
        return { success: true, user: result.user, message: result.message };
      }

      return { success: false, message: result.message || 'Ошибка регистрации' };
    } catch (error: any) {
      console.error('Register error in AuthContext:', error);
      return { 
        success: false, 
        message: error.message || error.response?.data?.message || 'Ошибка регистрации' 
      };
    }
  };

  // === Автовход после регистрации ===
  const loginAfterRegister = (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  // === Восстановление пароля - запрос ссылки ===
  const forgotPassword = async (email: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await authService.forgotPassword(email);
      
      if (result.success) {
        return { success: true, message: result.message || 'Инструкции отправлены на ваш email' };
      }
      
      return { success: false, message: result.message || 'Ошибка при отправке запроса' };
    } catch (error: any) {
      console.error('Forgot password error in AuthContext:', error);
      return { 
        success: false, 
        message: error.message || error.response?.data?.message || 'Ошибка соединения с сервером' 
      };
    }
  };

  // === Восстановление пароля - проверка токена ===
  const verifyResetToken = async (token: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await authService.verifyResetToken(token);
      
      if (result.success) {
        return { success: true, message: result.message || 'Токен действителен' };
      }
      
      return { success: false, message: result.message || 'Неверный или устаревший токен' };
    } catch (error: any) {
      console.error('Verify reset token error in AuthContext:', error);
      return { 
        success: false, 
        message: error.message || error.response?.data?.message || 'Ошибка проверки токена' 
      };
    }
  };

  // === Восстановление пароля - установка нового пароля ===
  const resetPassword = async (token: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await authService.resetPassword(token, newPassword);
      
      if (result.success) {
        return { success: true, message: result.message || 'Пароль успешно изменен' };
      }
      
      return { success: false, message: result.message || 'Ошибка при смене пароля' };
    } catch (error: any) {
      console.error('Reset password error in AuthContext:', error);
      return { 
        success: false, 
        message: error.message || error.response?.data?.message || 'Ошибка соединения с сервером' 
      };
    }
  };

  // === Выход ===
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAdmin: user?.role_name === 'admin',
    isActive: user?.status === 'active',
    checkEmailExists,
    checkUsernameExists,
    loginAfterRegister,
    // Новые функции
    forgotPassword,
    resetPassword,
    verifyResetToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};