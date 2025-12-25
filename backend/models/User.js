import { pool } from './database.js';

export class UserModel {
  static async create(userData) {
    const { name, email, organization, password } = userData;
    const result = await pool.query(
      `INSERT INTO Users (name, email, organization, password, role_id, status) 
       VALUES ($1, $2, $3, $4, 1, 'pending') 
       RETURNING id, name, email, organization, role_id, status, created_at`,
      [name, email, organization, password]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query(
      `SELECT u.*, r.name as role_name 
       FROM Users u 
       LEFT JOIN Roles r ON u.role_id = r.id 
       WHERE u.email = $1`,
      [email]
    );
    return result.rows[0] || null;
  }

  static async findByName(name) {
    const result = await pool.query(
      `SELECT u.*, r.name as role_name 
       FROM Users u 
       LEFT JOIN Roles r ON u.role_id = r.id 
       WHERE u.name = $1`,
      [name]
    );
    return result.rows[0] || null;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT u.*, r.name as role_name, 
              approver.name as approver_name
       FROM Users u 
       LEFT JOIN Roles r ON u.role_id = r.id 
       LEFT JOIN Users approver ON u.approved_by = approver.id
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByLogin(login) {
    const result = await pool.query(
      `SELECT u.*, r.name as role_name 
       FROM Users u 
       LEFT JOIN Roles r ON u.role_id = r.id 
       WHERE u.email = $1 OR u.name = $1`,
      [login]
    );
    return result.rows[0] || null;
  }

  static async findAll() {
    const result = await pool.query(
      `SELECT u.*, r.name as role_name, 
              approver.name as approver_name
       FROM Users u 
       LEFT JOIN Roles r ON u.role_id = r.id 
       LEFT JOIN Users approver ON u.approved_by = approver.id
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  }

  static async update(id, updates) {
    const { role_id, status, approved_by } = updates;
    
    let query = `UPDATE Users SET updated_at = CURRENT_TIMESTAMP`;
    const values = [];
    let paramCount = 1;

    if (role_id !== undefined) {
      query += `, role_id = $${paramCount}`;
      values.push(role_id);
      paramCount++;
    }

    if (status !== undefined) {
      query += `, status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    if (approved_by !== undefined) {
      query += `, approved_by = $${paramCount}, approved_at = CURRENT_TIMESTAMP`;
      values.push(approved_by);
      paramCount++;
    }

    query += ` WHERE id = $${paramCount} RETURNING *`;
    values.push(id);

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async getPendingUsers() {
    const result = await pool.query(
      `SELECT u.*, r.name as role_name 
       FROM Users u 
       LEFT JOIN Roles r ON u.role_id = r.id 
       WHERE u.status = 'pending' 
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  }

  static async delete(id) {
    const result = await pool.query('DELETE FROM Users WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
}

export class RoleModel {
  static async findAll() {
    const result = await pool.query('SELECT * FROM Roles ORDER BY id');
    return result.rows;
  }
}