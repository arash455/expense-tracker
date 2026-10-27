const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM expenses) AS expenses,
       (SELECT COALESCE(SUM(amount), 0) FROM expenses) AS total_amount`
  );
  res.json(rows[0]);
});

// GET /api/admin/users  ->  every user with how much they've recorded
router.get('/users', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
            COUNT(e.id) AS expense_count,
            COALESCE(SUM(e.amount), 0) AS total_spent
     FROM users u
     LEFT JOIN expenses e ON e.user_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at DESC`
  );
  res.json({ users: rows });
});

// GET /api/admin/expenses  ->  latest 50 expenses from all users
router.get('/expenses', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT e.id, e.amount, e.category, e.description, e.spent_on,
            u.name AS user_name, u.email AS user_email
     FROM expenses e
     JOIN users u ON u.id = e.user_id
     ORDER BY e.created_at DESC
     LIMIT 50`
  );
  res.json({ expenses: rows });
});

// PATCH /api/admin/users/:id  { role: 'user' | 'admin' }
router.patch('/users/:id', async (req, res) => {
  const id = Number(req.params.id) || 0;
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "user" or "admin"' });
  }
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot change your own role' });
  }

  const { rowCount } = await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
  if (!rowCount) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true });
});

// DELETE /api/admin/users/:id  (also deletes their expenses)
router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id) || 0;
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account here' });
  }

  const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
  if (!rowCount) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true });
});

module.exports = router;
