const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();
router.use(requireAuth);

// GET /api/expenses?month=2026-10   (month is optional)
router.get('/', async (req, res) => {
  const { month } = req.query;
  const params = [req.user.id];
  let where = 'user_id = $1';

  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Month must look like YYYY-MM' });
    }
    params.push(`${month}-01`);
    where += ` AND spent_on >= $2::date AND spent_on < ($2::date + INTERVAL '1 month')`;
  }

  const { rows } = await pool.query(
    `SELECT id, amount, category, description, spent_on
     FROM expenses
     WHERE ${where}
     ORDER BY spent_on DESC, id DESC`,
    params
  );
  res.json({ expenses: rows });
});

// POST /api/expenses  { amount, category, description, spent_on }
router.post('/', async (req, res) => {
  const amount = Number(req.body.amount);
  const category = String(req.body.category || '').trim();
  const description = String(req.body.description || '').trim();
  const spentOn = String(req.body.spent_on || '').trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }
  if (!category || category.length > 50) {
    return res.status(400).json({ error: 'Please choose a category' });
  }
  if (description.length > 200) {
    return res.status(400).json({ error: 'Description is too long (max 200 characters)' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) {
    return res.status(400).json({ error: 'Please choose a valid date' });
  }

  const { rows } = await pool.query(
    `INSERT INTO expenses (user_id, amount, category, description, spent_on)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, amount, category, description, spent_on`,
    [req.user.id, amount.toFixed(2), category, description, spentOn]
  );
  res.status(201).json({ expense: rows[0] });
});

// DELETE /api/expenses/:id  (users can only delete their own expenses)
router.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM expenses WHERE id = $1 AND user_id = $2',
    [Number(req.params.id) || 0, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Expense not found' });
  res.json({ ok: true });
});

module.exports = router;
