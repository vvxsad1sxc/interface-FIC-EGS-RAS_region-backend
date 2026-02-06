/* Registration.tsx */
import Button from '@components/Button/Button.tsx';
import './Registration.scss';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  checkRateLimitStatus,
  recordFailedAttempt,
  resetRateLimit,
  getRemainingAttempts,
  formatTimeRemaining,
  MAX_ATTEMPTS_BEFORE_LOCK,
} from '@/utils/rateLimiter';

interface RegistrationProps {
  name: string;
  email: string;
  organization: string;
  password: string;
  confirmPassword: string;
}

const RATE_LIMIT_KEY = 'registration';

/* -------------------------- Валидация силы пароля -------------------------- */
const validatePasswordStrength = (password: string) => {
  if (!password) return 'Пароль обязателен';
  if (password.length < 8) return 'Минимум 8 символов';
  if (!/[A-Z]/.test(password)) return 'Нужна хотя бы одна заглавная буква';
  if (!/[a-z]/.test(password)) return 'Нужна хотя бы одна строчная буква';
  if (!/\d/.test(password)) return 'Нужна хотя бы одна цифра';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    return 'Нужен хотя бы один спецсимвол';
  return true;
};

/* ------------------------------- Компонент ------------------------------- */
export default function Registration() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError,
    clearErrors,
    trigger,
    getValues,
  } = useForm<RegistrationProps>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      organization: '',
      password: '',
      confirmPassword: '',
    },
  });

  const { register: registerUser, checkEmailExists, checkUsernameExists, loginAfterRegister } = useAuth();
  const navigate = useNavigate();

  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Rate limiting states
  const [lockoutTime, setLockoutTime] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(MAX_ATTEMPTS_BEFORE_LOCK);

  const emailCheckTimeout = useRef<NodeJS.Timeout>();
  const usernameCheckTimeout = useRef<NodeJS.Timeout>();

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  // Проверка статуса блокировки при загрузке
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

  /* ------------------- Валидация совпадения ------------------- */
  const validatePasswordMatch = (value: string) => {
    const pwd = getValues('password');
    if (!value) return 'Подтверждение пароля обязательно';
    if (!pwd) return true;
    if (pwd !== value) return 'Пароли не совпадают';
    return true;
  };

  /* ----------------------- Дебаунс email ----------------------- */
  useEffect(() => {
    const sub = watch((v, { name }) => {
      if (name !== 'email' || !v.email) return;
      clearTimeout(emailCheckTimeout.current);
      emailCheckTimeout.current = setTimeout(async () => {
        if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v.email!)) {
          const exists = await checkEmailExists(v.email!);
          exists
            ? setError('email', { message: 'Почта уже занята' })
            : clearErrors('email');
        }
      }, 800);
    });
    return () => sub.unsubscribe();
  }, [watch, setError, clearErrors, checkEmailExists]);

  /* ----------------------- Дебаунс username ----------------------- */
  useEffect(() => {
    const sub = watch((v, { name }) => {
      if (name !== 'name' || !v.name || v.name.length < 2) return;
      clearTimeout(usernameCheckTimeout.current);
      usernameCheckTimeout.current = setTimeout(async () => {
        if (/^[a-zA-Z0-9_]+$/.test(v.name!)) {
          const exists = await checkUsernameExists(v.name!);
          exists
            ? setError('name', { message: 'Имя пользователя занято' })
            : clearErrors('name');
        }
      }, 800);
    });
    return () => sub.unsubscribe();
  }, [watch, setError, clearErrors, checkUsernameExists]);

  /* ----------------------- Очистка таймаутов ----------------------- */
  useEffect(() => {
    return () => {
      clearTimeout(emailCheckTimeout.current);
      clearTimeout(usernameCheckTimeout.current);
    };
  }, []);

  /* ------------------------------- submit ------------------------------- */
  const onSubmit = async (data: RegistrationProps) => {
    // Проверить блокировку перед отправкой
    if (isLocked) {
      setServerError(`Слишком много попыток. Подождите ${formatTimeRemaining(lockoutTime)}`);
      return;
    }

    setIsLoading(true);
    setServerError('');

    try {
      const result = await registerUser({
        name: data.name.trim(),
        email: data.email.trim(),
        organization: data.organization.trim(),
        password: data.password,
        confirmPassword: data.confirmPassword,
      });

      if (result.success) {
        // Успешная регистрация - сбросить счетчик
        resetRateLimit(RATE_LIMIT_KEY);

        if (result.token && result.user) {
          // Автовход
          await loginAfterRegister?.(result.token, result.user);
          alert('Регистрация успешна! Добро пожаловать.');
          navigate('/dashboard');
        } else {
          // Ожидание активации
          alert('Регистрация успешна! Ожидайте подтверждения администратора.');
          navigate('/');
        }
      } else {
        // Неудачная попытка - записать
        const lockTime = recordFailedAttempt(RATE_LIMIT_KEY);
        updateLockoutStatus();

        if (lockTime > 0) {
          setServerError(
            `Превышен лимит попыток. Регистрация заблокирована на ${formatTimeRemaining(lockTime)}`
          );
        } else {
          const attemptsLeft = getRemainingAttempts(RATE_LIMIT_KEY);
          const msg = result.message || 'Ошибка регистрации';
          setServerError(
            attemptsLeft > 0
              ? `${msg}. Осталось попыток: ${attemptsLeft}`
              : msg
          );
        }
      }
    } catch (err: any) {
      // Записать неудачную попытку
      const lockTime = recordFailedAttempt(RATE_LIMIT_KEY);
      updateLockoutStatus();

      if (lockTime > 0) {
        setServerError(
          `Превышен лимит попыток. Регистрация заблокирована на ${formatTimeRemaining(lockTime)}`
        );
      } else {
        const attemptsLeft = getRemainingAttempts(RATE_LIMIT_KEY);
        const msg = err.message || 'Произошла ошибка при регистрации';
        setServerError(
          attemptsLeft > 0
            ? `${msg}. Осталось попыток: ${attemptsLeft}`
            : msg
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="reg">
      <div className="reg__container">
        <h2 className="reg__title">Регистрация</h2>

        {isLocked && (
          <div className="reg__lockout-warning">
            <span className="reg__lockout-icon">⏳</span>
            Слишком много неудачных попыток регистрации.
            <br />
            Повторите через: <strong>{formatTimeRemaining(lockoutTime)}</strong>
          </div>
        )}

        {serverError && !isLocked && <div className="reg__server-error">{serverError}</div>}

        {!isLocked && remainingAttempts < MAX_ATTEMPTS_BEFORE_LOCK && remainingAttempts > 0 && (
          <div className="reg__attempts-warning">
            Осталось попыток: {remainingAttempts} из {MAX_ATTEMPTS_BEFORE_LOCK}
          </div>
        )}

        <form id="reg__form" className="reg__form" onSubmit={handleSubmit(onSubmit)}>
          {/* Имя */}
          <input
            {...register('name', {
              required: 'Имя пользователя обязательно',
              minLength: { value: 2, message: 'Минимум 2 символа' },
              maxLength: { value: 100, message: 'Максимум 100 символов' },
              pattern: {
                value: /^[a-zA-Z0-9_]+$/,
                message: 'Только буквы, цифры и подчеркивание',
              },
            })}
            type="text"
            className="reg__form-input"
            placeholder="Имя пользователя"
            disabled={isLoading || isLocked}
          />
          {errors.name && <p className="reg__form-error">{errors.name.message}</p>}

          {/* Почта */}
          <input
            {...register('email', {
              required: 'Почта обязательна',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Некорректный email',
              },
            })}
            type="email"
            className="reg__form-input"
            placeholder="Почта"
            disabled={isLoading || isLocked}
          />
          {errors.email && <p className="reg__form-error">{errors.email.message}</p>}

          {/* Организация */}
          <input
            {...register('organization', {
              required: 'Организация обязательна',
              minLength: { value: 2, message: 'Минимум 2 символа' },
            })}
            type="text"
            className="reg__form-input"
            placeholder="Организация"
            disabled={isLoading || isLocked}
          />
          {errors.organization && <p className="reg__form-error">{errors.organization.message}</p>}

          {/* Пароль */}
          <input
            {...register('password', {
              required: 'Пароль обязателен',
              validate: validatePasswordStrength,
            })}
            type="password"
            className="reg__form-input"
            placeholder="Пароль"
            disabled={isLoading || isLocked}
          />
          {errors.password && <p className="reg__form-error">{errors.password.message}</p>}

          <div className="reg__password-requirements">
  <p>Пароль должен содержать:</p>
  <ul>
    <li className={password.length >= 8 ? 'valid' : ''}>Минимум 8 символов</li>
    <li className={/[A-Z]/.test(password) ? 'valid' : ''}>Заглавную букву</li>
    <li className={/[a-z]/.test(password) ? 'valid' : ''}>Строчную букву</li>
    <li className={/\d/.test(password) ? 'valid' : ''}>Цифру</li>
    <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'valid' : ''}>
      Спецсимвол
    </li>
  </ul>
</div>

          {/* Подтверждение пароля */}
          <input
            {...register('confirmPassword', {
              required: 'Подтверждение пароля обязательно',
              validate: validatePasswordMatch,
            })}
            type="password"
            className="reg__form-input"
            placeholder="Подтверждение пароля"
            disabled={isLoading || isLocked}
          />
          {errors.confirmPassword && (
            <p className="reg__form-error">{errors.confirmPassword.message}</p>
          )}

          {/* UX-подсказка */}
          {password && confirmPassword && (
            <div
              className={
                password === confirmPassword
                  ? 'reg__password-match'
                  : 'reg__password-mismatch'
              }
            >
              {password === confirmPassword ? 'Пароли совпадают' : 'Пароли не совпадают'}
            </div>
          )}
        </form>

        <Button
          form="reg__form"
          type="submit"
          aim="reg"
          content={isLoading ? 'Регистрация...' : isLocked ? 'Заблокировано' : 'Зарегистрироваться'}
          disabled={isLoading || isLocked}
        />

        <div className="reg__links">
          <p>
            Уже есть аккаунт? <Link to="/login" className="reg__link">Войти</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
