import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.scss';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  const API_BASE = 'http://localhost:3001/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const [usersRes, pendingRes, rolesRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/users`, config),
        axios.get(`${API_BASE}/admin/users/pending`, config),
        axios.get(`${API_BASE}/admin/roles`, config)
      ]);

      setUsers(usersRes.data.users);
      setPendingUsers(pendingRes.data.users);
      setRoles(rolesRes.data.roles);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Ошибка при загрузке данных');
      setLoading(false);
    }
  };

  const updateUser = async (userId, updates) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE}/admin/users/${userId}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchData();
      alert('Пользователь успешно обновлен');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Ошибка при обновлении пользователя');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchData();
      alert('Пользователь успешно удален');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Ошибка при удалении пользователя');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { class: 'status-pending', text: 'Ожидает' },
      'active': { class: 'status-active', text: 'Активен' },
      'blocked': { class: 'status-blocked', text: 'Заблокирован' }
    };
    const statusInfo = statusMap[status] || { class: 'status-unknown', text: status };
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  if (loading) {
    return <div className="admin-panel loading">Загрузка...</div>;
  }

  return (
    <div className="admin-panel">
      <h1>Панель администратора</h1>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          Все пользователи ({users.length})
        </button>
        <button 
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Ожидающие подтверждения ({pendingUsers.length})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'all' && (
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя</th>
                  <th>Email</th>
                  <th>Организация</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Дата регистрации</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.organization}</td>
                    <td>
                      <select 
                        value={user.role_id} 
                        onChange={(e) => updateUser(user.id, { role_id: parseInt(e.target.value) })}
                      >
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select 
                        value={user.status} 
                        onChange={(e) => updateUser(user.id, { status: e.target.value })}
                      >
                        <option value="pending">Ожидает</option>
                        <option value="active">Активен</option>
                        <option value="blocked">Заблокирован</option>
                      </select>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <button 
                        className="btn-delete"
                        onClick={() => deleteUser(user.id)}
                        disabled={user.role_name === 'admin'}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="pending-users">
            {pendingUsers.length === 0 ? (
              <p>Нет пользователей, ожидающих подтверждения</p>
            ) : (
              <div className="users-grid">
                {pendingUsers.map(user => (
                  <div key={user.id} className="user-card">
                    <h3>{user.name}</h3>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Организация:</strong> {user.organization}</p>
                    <p><strong>Дата регистрации:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                    <div className="user-actions">
                      <button 
                        className="btn-approve"
                        onClick={() => updateUser(user.id, { status: 'active', role_id: 2 })}
                      >
                        Подтвердить
                      </button>
                      <button 
                        className="btn-reject"
                        onClick={() => updateUser(user.id, { status: 'blocked' })}
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;