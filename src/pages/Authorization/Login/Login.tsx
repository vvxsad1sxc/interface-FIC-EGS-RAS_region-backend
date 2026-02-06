import Button from '@components/Button/Button.tsx'
import './Login.scss'
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import {
  checkRateLimitStatus,
  recordFailedAttempt,
  resetRateLimit,
  getRemainingAttempts,
  formatTimeRemaining,
  MAX_ATTEMPTS_BEFORE_LOCK,
} from '@/utils/rateLimiter';

interface LoginProps {
  login: string;
  password: string;
}

const RATE_LIMIT_KEY = 'login';

function Login() {
  const { register, handleSubmit, formState } = useForm<LoginProps>();
  const { login: loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Rate limiting states
  const [lockoutTime, setLockoutTime] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(MAX_ATTEMPTS_BEFORE_LOCK);

  const loginError = formState.errors.login;
  const passwordError = formState.errors.password;

  // Сохраняем страницу, с которой пользователь пришел
  const from = (location.state as { from?: string })?.from || '/';

  // Проверка статуса блокировки при загрузке и обновление таймера
  const updateLockoutStatus = useCallback(() => {
    const timeRemaining = checkRateLimitStatus(RATE_LIMIT_KEY);
    setLockoutTime(timeRemaining);
    setRemainingAttempts(getRemainingAttempts(RATE_LIMIT_KEY));
  }, []);

  useEffect(() => {
    updateLockoutStatus();
  }, [updateLockoutStatus]);

  // Таймер обратного отсчета при блокировке
  useEffect(() => {
    if (lockoutTime <= 0) return;

    const timer = setInterval(() => {
      setLockoutTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          updateLockoutStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutTime, updateLockoutStatus]);

  const isLocked = lockoutTime > 0;

  const onSubmit = async (data: LoginProps) => {
    // Проверить блокировку перед отправкой
    if (isLocked) {
      setServerError(`Слишком много попыток. Подождите ${formatTimeRemaining(lockoutTime)}`);
      return;
    }

    setIsLoading(true);
    setServerError('');

    console.log('Попытка входа:', data);

    try {
      const result = await loginUser(data);

      console.log('Ответ от loginUser:', result);

      if (result && result.success) {
        // Успешный вход - сбросить счетчик
        resetRateLimit(RATE_LIMIT_KEY);

        const userRole = result.user?.role;
        console.log('Успешный вход, роль пользователя:', userRole);

        if (userRole === 'admin') {
          navigate('/admin'); // редирект для админа
        } else {
          navigate(from, { replace: true }); // редирект на предыдущую страницу
        }
      } else {
        // Неудачная попытка - записать
        const lockTime = recordFailedAttempt(RATE_LIMIT_KEY);
        updateLockoutStatus();

        if (lockTime > 0) {
          setServerError(
            `Превышен лимит попыток. Доступ заблокирован на ${formatTimeRemaining(lockTime)}`
          );
        } else {
          const msg = result?.message || 'Неверный логин или пароль';
          const attemptsLeft = getRemainingAttempts(RATE_LIMIT_KEY);
          setServerError(
            attemptsLeft > 0
              ? `${msg}. Осталось попыток: ${attemptsLeft}`
              : msg
          );
        }
      }
    } catch (error: any) {
      console.error('ФРОНТЕНД ОШИБКА:', error);

      // Записать неудачную попытку только если это ошибка авторизации
      const lockTime = recordFailedAttempt(RATE_LIMIT_KEY);
      updateLockoutStatus();

      if (lockTime > 0) {
        setServerError(
          `Превышен лимит попыток. Доступ заблокирован на ${formatTimeRemaining(lockTime)}`
        );
      } else {
        const errorMessage = error.message || 'Ошибка соединения с сервером';
        const attemptsLeft = getRemainingAttempts(RATE_LIMIT_KEY);
        setServerError(
          attemptsLeft > 0
            ? `${errorMessage}. Осталось попыток: ${attemptsLeft}`
            : errorMessage
        );
      }
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

        {isLocked && (
          <div className='login__lockout-warning'>
            <span className='login__lockout-icon'>⏳</span>
            Слишком много неудачных попыток входа.
            <br />
            Повторите через: <strong>{formatTimeRemaining(lockoutTime)}</strong>
          </div>
        )}

        {serverError && !isLocked && (
          <div className='login__server-error'>{serverError}</div>
        )}

        {!isLocked && remainingAttempts < MAX_ATTEMPTS_BEFORE_LOCK && remainingAttempts > 0 && (
          <div className='login__attempts-warning'>
            Осталось попыток: {remainingAttempts} из {MAX_ATTEMPTS_BEFORE_LOCK}
          </div>
        )}

        <form id='login__form' className='login__form' onSubmit={handleSubmit(onSubmit)}>
          <input
            {...register('login', {
              required: 'Логин обязателен',
            })}
            type='text'
            className='login__form-input'
            placeholder='Логин (email или имя пользователя)'
            disabled={isLoading || isLocked}
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
            disabled={isLoading || isLocked}
          />
          {passwordError && <p className='login__form-error'>{passwordError.message}</p>}
        </form>

        <Button
          form='login__form'
          type='submit'
          aim='login'
          content={isLoading ? 'Вход...' : isLocked ? 'Заблокировано' : 'Войти'}
          disabled={isLoading || isLocked}
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
