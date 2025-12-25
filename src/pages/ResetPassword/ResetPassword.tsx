// src/pages/ResetPassword.tsx
import Button from '@components/Button/Button.tsx';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import './ResetPassword.scss';

function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError('Неверная или устаревшая ссылка для сброса пароля');
      return;
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

  if (!token) {
    return (
      <section className='login'>
        <div className='login__container'>
          <h2 className='login__title'>Ошибка</h2>
          <div className='login__server-error'>
            Неверная или устаревшая ссылка для сброса пароля
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
            {error && (
              <div className='login__server-error'>{error}</div>
            )}

            <form className='login__form' onSubmit={handleSubmit}>
              <input
                type='password'
                name='password'
                className='login__form-input'
                placeholder='Новый пароль'
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
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
                disabled={isLoading}
                required
                minLength={8}
              />
            </form>

            <div className='login__buttons'>
              <Button
                type='button'
                aim='primary'
                content={isLoading ? 'Смена пароля...' : 'Сменить пароль'}
                onClick={handleSubmit}
                disabled={isLoading}
              />
              
              <Button
                type='button'
                aim='secondary'
                content='Отмена'
                onClick={() => navigate('/login')}
                disabled={isLoading}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default ResetPassword;