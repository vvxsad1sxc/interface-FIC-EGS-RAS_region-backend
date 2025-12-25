// src/pages/Login.tsx
import Button from '@components/Button/Button.tsx';
import './Login.scss';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useState } from 'react';

interface LoginProps {
  login: string;
  password: string;
}

function Login() {
  const { register, handleSubmit, formState } = useForm<LoginProps>();
  const { login: loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loginError = formState.errors.login;
  const passwordError = formState.errors.password;

  // Сохраняем страницу, с которой пользователь пришел
  const from = (location.state as { from?: string })?.from || '/';

  const onSubmit = async (data: LoginProps) => {
    setIsLoading(true);
    setServerError('');

    console.log('Попытка входа:', data);

    try {
      const result = await loginUser(data);

      console.log('Ответ от loginUser:', result);

      if (result && result.success) {
        const userRole = result.user?.role;
        console.log('Успешный вход, роль пользователя:', userRole);

        if (userRole === 'admin') {
          navigate('/admin'); // редирект для админа
        } else {
          navigate(from, { replace: true }); // редирект на предыдущую страницу
        }
      } else {
        const msg = result?.message || 'Неверный логин или пароль';
        console.error('Ошибка входа:', msg);
        setServerError(msg);
      }
    } catch (error: any) {
      console.error('ФРОНТЕНД ОШИБКА:', error);
      const errorMessage = error.message || 'Ошибка соединения с сервером';
      setServerError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  return (
    <section className='login'>
      <div className='login__container'>
        <h2 className='login__title'>Вход</h2>

        {serverError && (
          <div className='login__server-error'>{serverError}</div>
        )}

        <form id='login__form' className='login__form' onSubmit={handleSubmit(onSubmit)}>
          <input
            {...register('login', {
              required: 'Логин обязателен',
            })}
            type='text'
            className='login__form-input'
            placeholder='Логин (email или имя пользователя)'
            disabled={isLoading}
          />
          {loginError && <p className='login__form-error'>{loginError.message}</p>}

          <input
            {...register('password', {
              required: 'Пароль обязателен',
              minLength: { value: 8, message: 'Минимум 8 символов' },
            })}
            type='password'
            className='login__form-input'
            placeholder='Пароль'
            disabled={isLoading}
          />
          {passwordError && <p className='login__form-error'>{passwordError.message}</p>}
        </form>

        <Button
          form='login__form'
          type='submit'
          aim='login'
          content={isLoading ? 'Вход...' : 'Войти'}
          disabled={isLoading}
        />

        <div className='login__links'>
          <p>
            Нет аккаунта? <Link to="/registration" className='login__link'>Зарегистрироваться</Link>
          </p>
          <p>
            <button 
              type="button" 
              onClick={handleForgotPassword}
              className='login__link login__link--forgot'
            >
              Забыли пароль?
            </button>
          </p>
        </div>

        
      </div>
    </section>
  );
}

export default Login;