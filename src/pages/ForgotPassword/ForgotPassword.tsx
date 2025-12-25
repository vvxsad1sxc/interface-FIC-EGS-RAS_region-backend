// src/pages/ForgotPassword.tsx
import Button from '@components/Button/Button.tsx';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import './ForgotPassword.scss'; // Используем те же стили

function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Введите email');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Введите корректный email');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await forgotPassword(email);
      
      if (result && result.success) {
        setSuccess('Инструкции по восстановлению пароля отправлены на ваш email');
        setEmail('');
      } else {
        setError(result?.message || 'Произошла ошибка при восстановлении пароля');
      }
    } catch (error: any) {
      console.error('Ошибка восстановления пароля:', error);
      setError(error.message || 'Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className='login'>
      <div className='login__container'>
        <h2 className='login__title'>Восстановление пароля</h2>

        {success && (
          <div className='login__success'>
            {success}
            <div className='login__success-actions'>
              <Button
                type='button'
                aim='primary'
                content='Вернуться к входу'
                onClick={() => navigate('/login')}
              />
            </div>
          </div>
        )}

        {!success && (
          <>
            {error && (
              <div className='login__server-error'>{error}</div>
            )}

            <form className='login__form' onSubmit={handleSubmit}>
              <div className='login__form-group'>
                <input
                  type='email'
                  className='login__form-input'
                  placeholder='Введите ваш email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <p className='login__form-hint'>
                  На указанный email будет отправлено письмо с кодом для смены пароля
                </p>
              </div>
            </form>

            <div className='login__buttons'>
              <Button
                type='button'
                aim='primary'
                content={isLoading ? 'Отправка...' : 'Восстановить пароль'}
                onClick={handleSubmit}
                disabled={isLoading || !email.trim()}
              />
              
              <Button
                type='button'
                aim='secondary'
                content='Назад к входу'
                onClick={() => navigate('/login')}
                disabled={isLoading}
              />
            </div>
          </>
        )}

        <div className='login__links'>
          <p>
            Вспомнили пароль? <Link to="/login" className='login__link'>Войти</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export default ForgotPassword;