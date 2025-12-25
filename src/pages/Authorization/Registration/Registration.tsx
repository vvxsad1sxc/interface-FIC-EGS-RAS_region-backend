/* Registration.tsx */
import Button from '@components/Button/Button.tsx';
import './Registration.scss';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

interface RegistrationProps {
  name: string;
  email: string;
  organization: string;
  password: string;
  confirmPassword: string;
}

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

  const emailCheckTimeout = useRef<NodeJS.Timeout>();
  const usernameCheckTimeout = useRef<NodeJS.Timeout>();

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

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
    setIsLoading(true);
    setServerError('');

    try {
      const result = await registerUser({
        name: data.name.trim(),
        email: data.email.trim(),
        organization: data.organization.trim(),
        password: data.password,
        confirmPassword: data.confirmPassword, // Передаём
      });

      if (result.success) {
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
        setServerError(result.message || 'Ошибка регистрации');
      }
    } catch (err: any) {
      setServerError(err.message || 'Произошла ошибка при регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="reg">
      <div className="reg__container">
        <h2 className="reg__title">Регистрация</h2>

        {serverError && <div className="reg__server-error">{serverError}</div>}

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
            disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
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
          content={isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
          disabled={isLoading}
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