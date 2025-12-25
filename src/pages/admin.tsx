import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const AdminPanel = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const updateUserRole = async (userId, newRoleId) => {
        try {
            await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role_id: newRoleId }),
            });
            fetchUsers(); // Обновляем список
        } catch (error) {
            console.error('Error updating user:', error);
        }
    };

    return (
        <Layout>
            <div className="admin-panel">
                <h1>Админ панель</h1>
                <div className="users-list">
                    {users.map(user => (
                        <div key={user.id} className="user-card">
                            <div className="user-info">
                                <h3>{user.name}</h3>
                                <p>{user.email}</p>
                                <p>Текущая роль: {user.role_id === 1 ? 'Пользователь' : user.role_id === 2 ? 'Загрузка' : 'Админ'}</p>
                            </div>
                            <div className="user-actions">
                                <button 
                                    onClick={() => updateUserRole(user.id, 2)}
                                    disabled={user.role_id === 2}
                                >
                                    Дать права загрузки
                                </button>
                                <button 
                                    onClick={() => updateUserRole(user.id, 3)}
                                    disabled={user.role_id === 3}
                                >
                                    Сделать админом
                                </button>
                                <button 
                                    onClick={() => updateUserRole(user.id, 1)}
                                    disabled={user.role_id === 1}
                                >
                                    Забрать права
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <style jsx>{`
                .admin-panel {
                    padding: 20px;
                }
                .users-list {
                    display: grid;
                    gap: 15px;
                    margin-top: 20px;
                }
                .user-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .user-actions {
                    display: flex;
                    gap: 10px;
                }
                .user-actions button {
                    padding: 8px 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    background: #007bff;
                    color: white;
                }
                .user-actions button:disabled {
                    background: #6c757d;
                    cursor: not-allowed;
                }
            `}</style>
        </Layout>
    );
};

export default AdminPanel; 
