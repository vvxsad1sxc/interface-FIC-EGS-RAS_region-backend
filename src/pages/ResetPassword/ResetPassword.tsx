// src/pages/ResetPassword.tsx
import Button from '@components/Button/Button.tsx';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './ResetPassword.scss';
import {
  checkPasswordChangeLimit,
  recordPasswordChange,
  formatPasswordChangeWait,
} from '@/utils/rateLimiter';

function ResetPassword() {
  const { resetPassword, verifyResetToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordChangeLimitTime, setPasswordChangeLimitTime] = useState(0);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(true);

  // Верификация токена и получение email при загрузке
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setVerifyingToken(false);
        return;
      }

      try {
        const result = await verifyResetToken(token);
        if (result && result.success) {
          setTokenVerified(true);
          // Если сервер вернул email, используем его
          if (result.email) {
            setFormData(prev => ({ ...prev, email: result.email }));
            // Проверяем лимит смены пароля
            const limitTime = checkPasswordChangeLimit(result.email);
            setPasswordChangeLimitTime(limitTime);
          }
        } else {
          setError(result?.message || 'Неверная или устаревшая ссылка для сброса пароля');
        }
      } catch (err: any) {
        setError(err.message || 'Ошибка проверки токена');
      } finally {
        setVerifyingToken(false);
      }
    };

    verifyToken();
  }, [token, verifyResetToken]);

  // Таймер обратного отсчета для ограничения смены пароля
  useEffect(() => {
    if (passwordChangeLimitTime <= 0) return;

    const timer = setInterval(() => {
      setPasswordChangeLimitTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [passwordChangeLimitTime]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Проверяем лимит при вводе email
    if (name === 'email' && value) {
      const limitTime = checkPasswordChangeLimit(value);
      setPasswordChangeLimitTime(limitTime);
    }
  };

  const isPasswordChangeLimited = passwordChangeLimitTime > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('Неверная или устаревшая ссылка для сброса пароля');
      return;
    }

    // Проверка лимита смены пароля (1 раз в день)
    if (formData.email) {
      const limitTime = checkPasswordChangeLimit(formData.email);
      if (limitTime > 0) {
        setPasswordChangeLimitTime(limitTime);
        setError(`Вы уже меняли пароль сегодня. Повторная смена возможна через ${formatPasswordChangeWait(limitTime)}`);
        return;
      }
    }

    if (!formData.password || !formData.confirmPassword) {
      setError('Все поля обязательны для заполнения');
      return;
    }

    if (formData.password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await resetPassword(token, formData.password);

      if (result && result.success) {
        // Записываем успешную смену пароля для ограничения
        if (formData.email) {
          recordPasswordChange(formData.email);
        }

        setSuccess('Пароль успешно изменен');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(result?.message || 'Произошла ошибка при смене пароля');
      }
    } catch (error: any) {
      console.error('Ошибка сброса пароля:', error);
      setError(error.message || 'Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  // Состояние загрузки при верификации токена
  if (verifyingToken) {
    return (
      <section className='login'>
        <div className='login__container'>
          <h2 className='login__title'>Проверка ссылки...</h2>
          <div className='login__loading'>Пожалуйста, подождите</div>
        </div>
      </section>
    );
  }

  if (!token || (!tokenVerified && error)) {
    return (
      <section className='login'>
        <div className='login__container'>
          <h2 className='login__title'>Ошибка</h2>
          <div className='login__server-error'>
            {error || 'Неверная или устаревшая ссылка для сброса пароля'}
          </div>
          <Button
            type='button'
            aim='primary'
            content='Вернуться к входу'
            onClick={() => navigate('/login')}
          />
        </div>
      </section>
    );
  }

  return (
    <section className='login'>
      <div className='login__container'>
        <h2 className='login__title'>Смена пароля</h2>

        {success && (
          <div className='login__success'>
            {success}
            <p>Вы будете перенаправлены на страницу входа...</p>
          </div>
        )}

        {!success && (
          <>
            {isPasswordChangeLimited && (
              <div className='login__lockout-warning'>
                <span className='login__lockout-icon'>⏳</span>
                Вы уже меняли пароль сегодня.
                <br />
                Повторная смена возможна через: <strong>{formatPasswordChangeWait(passwordChangeLimitTime)}</strong>
              </div>
            )}

            {error && !isPasswordChangeLimited && (
              <div className='login__server-error'>{error}</div>
            )}

            <form className='login__form' onSubmit={handleSubmit}>
              {/* Email для проверки ограничения */}
              <input
                type='email'
                name='email'
                className='login__form-input'
                placeholder='Ваш email'
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading || isPasswordChangeLimited}
                required
              />
              <p className='login__form-hint'>
                Введите email для проверки ограничения смены пароля
              </p>

              <input
                type='password'
                name='password'
                className='login__form-input'
                placeholder='Новый пароль'
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading || isPasswordChangeLimited}
                required
                minLength={8}
              />

              <input
                type='password'
                name='confirmPassword'
                className='login__form-input'
                placeholder='Повторите новый пароль'
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading || isPasswordChangeLimited}
                required
                minLength={8}
              />
            </form>

            <div className='login__buttons'>
              <Button
                type='button'
                aim='primary'
                content={
                  isLoading
                    ? 'Смена пароля...'
                    : isPasswordChangeLimited
                    ? 'Ограничено'
                    : 'Сменить пароль'
                }
                onClick={handleSubmit}
                disabled={isLoading || isPasswordChangeLimited}
              />

              <Button
                type='button'
                aim='secondary'
                content='Отмена'
                onClick={() => navigate('/login')}
                disabled={isLoading}
              />
            </div>

            <div className='login__password-limit-info'>
              <p>Смена пароля разрешена не чаще 1 раза в 24 часа.</p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default ResetPassword;
