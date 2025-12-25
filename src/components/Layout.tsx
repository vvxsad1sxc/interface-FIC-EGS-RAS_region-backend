import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import RegionScrollbar from './RegionScrollbar';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const router = useRouter();
    const [user, setUser] = React.useState<any>(null);

    React.useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        router.push('/');
    };

    return (
        <div className="layout">
            <RegionScrollbar />
            
            <nav className="navbar">
                <div className="nav-brand">
                    <h2>FIC EGS RAS</h2>
                </div>
                <div className="nav-links">
                    <Link href="/" className="nav-link">
                        Главная
                    </Link>
                    {user ? (
                        <>
                            <Link href="/data-export" className="nav-link">
                                Выгрузка данных
                            </Link>
                            {user.role_id === 3 && (
                                <Link href="/admin" className="nav-link">
                                    Админ панель
                                </Link>
                            )}
                            <button onClick={handleLogout} className="nav-link logout-btn">
                                Выйти
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className="nav-link">
                                Войти
                            </Link>
                            <Link href="/register" className="nav-link">
                                Регистрация
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            <main className="main-content">
                {children}
            </main>

            <style jsx>{`
                .layout {
                    min-height: 100vh;
                }
                .navbar {
                    position: fixed;
                    top: 0;
                    left: 250px;
                    right: 0;
                    background: #343a40;
                    color: white;
                    padding: 0 20px;
                    height: 60px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    z-index: 1000;
                }
                .nav-brand h2 {
                    margin: 0;
                    color: white;
                }
                .nav-links {
                    display: flex;
                    gap: 20px;
                    align-items: center;
                }
                .nav-link {
                    color: white;
                    text-decoration: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    transition: background-color 0.3s;
                }
                .nav-link:hover {
                    background-color: #495057;
                }
                .logout-btn {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 16px;
                }
                .main-content {
                    margin-left: 250px;
                    margin-top: 60px;
                    padding: 20px;
                }
            `}</style>
        </div>
    );
};

export default Layout;