import { Link, useLocation, useNavigate } from 'react-router-dom'
import './Header.scss'
import logo320 from '@assets/logo/header-logo-320.svg'
import logo575 from '@assets/logo/header-logo-575.svg'
import logo767 from '@assets/logo/header-logo-767.svg'
import logo992 from '@assets/logo/header-logo-992.svg'
import logo1600 from '@assets/logo/header-logo-1600.svg'
import LinkOrganization from '@/components/LinkOrganization/LinkOrganization'
import { useAuth } from '@/contexts/AuthContext'

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const isSpecialPage = location.pathname.startsWith('/region/') || location.pathname === '/download';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className='header'>
      <div className='header__container'>
        <div className='header__logo-container'>
          <a className='header__logo-link' href="http://www.gsras.ru">
            <picture className='header__picture'>
              <source srcSet={logo320} media='(max-width: 320px)' />
              <source srcSet={logo575} media='(max-width: 575px)' />
              <source srcSet={logo767} media='(max-width: 767px)' />
              <source srcSet={logo992} media='(max-width: 992px)' />
              <img 
                src={logo1600} 
                alt='ФИЦ ЕГС РАН' 
                className='header__logo' 
              />
            </picture>
          </a>
        </div>
        
        <LinkOrganization classNamePart='header-organization' />
        
        <div className='header__nav-container'>
          <nav className='header__nav'>
            {isSpecialPage ? (
              // Единый тулбар для regionpage и downloadpage
              <>
                <Link to='/region/central' className='header__link'> Северо-Осетинский регион</Link>
                <Link to='/download' className='header__link'> Выгрузка данных</Link>
              </>
            ) : (
              // Стандартная навигация для остальных страниц
              <>
                <Link to='/Information' className='header__link'> Информация</Link>
                <Link to='/Stations' className='header__link'> Станции</Link>
                <Link to='/Access' className='header__link'>Доступ к данным</Link>
              </>
            )}
          </nav>
          
          {/* Блок авторизации */}
          <div className='header__auth'>
            {user ? (
              <div className='header__user-menu'>
                <span className='header__user-info'>
                  {user.name} ({user.role_name})
                </span>
                {isAdmin && (
                  <Link to='/admin' className='header__admin-link'>
                    Админ-панель
                  </Link>
                )}
                <button 
                  onClick={handleLogout}
                  className='header__logout-btn'
                >
                  Выйти
                </button>
              </div>
            ) : (
              <>
                <Link to='/login' className='header__auth-link'> Вход</Link>
                <span className='header__auth-slash'>/</span>
                <Link to='/registration' className='header__auth-link'> Регистрация</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;