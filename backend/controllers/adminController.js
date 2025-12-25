import { UserModel, RoleModel } from '../models/User.js';

export class AdminController {
  static async getAllUsers(req, res) {
    try {
      const users = await UserModel.findAll();
      res.json({
        users: users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          organization: user.organization,
          role_id: user.role_id,
          role_name: user.role_name,
          status: user.status,
          created_at: user.created_at,
          approved_at: user.approved_at,
          approver_name: user.approver_name
        }))
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Ошибка при получении списка пользователей' });
    }
  }

  static async getPendingUsers(req, res) {
    try {
      const users = await UserModel.getPendingUsers();
      res.json({
        users: users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          organization: user.organization,
          role_id: user.role_id,
          role_name: user.role_name,
          created_at: user.created_at
        }))
      });
    } catch (error) {
      console.error('Get pending users error:', error);
      res.status(500).json({ message: 'Ошибка при получении списка ожидающих пользователей' });
    }
  }

  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { role_id, status } = req.body;
      const adminId = req.user.id;

      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      const updates = {};
      if (role_id !== undefined) updates.role_id = role_id;
      if (status !== undefined) updates.status = status;
      
      if (status === 'active') {
        updates.approved_by = adminId;
      }

      const updatedUser = await UserModel.update(id, updates);
      
      res.json({
        message: 'Пользователь успешно обновлен',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role_id: updatedUser.role_id,
          status: updatedUser.status
        }
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Ошибка при обновлении пользователя' });
    }
  }

  static async getRoles(req, res) {
    try {
      const roles = await RoleModel.findAll();
      res.json({ roles });
    } catch (error) {
      console.error('Get roles error:', error);
      res.status(500).json({ message: 'Ошибка при получении списка ролей' });
    }
  }

  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      if (user.role_name === 'admin') {
        return res.status(400).json({ message: 'Нельзя удалить администратора' });
      }

      const deleted = await UserModel.delete(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      res.json({ message: 'Пользователь успешно удален' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Ошибка при удалении пользователя' });
    }
  }
}