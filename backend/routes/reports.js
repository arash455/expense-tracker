const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();
router.use(requireAuth);

// GET /api/reports  ->  totals, spending by category, spending per month
router.get('/', async (req, res) => {
  const userId = req.user.id;

  const totals = await pool.query(
    `SELECT
       COALESCE(SUM(amount), 0) AS total,
       COUNT(*) AS count,
       COALESCE(SUM(amount) FILTER (
         WHERE spent_on >= date_trunc('month', CURRENT_DATE)
       ), 0) AS this_month
     FROM expenses
     WHERE user_id = $1`,
    [userId]
  );

  const byCategory = await pool.query(
    `SELECT category, SUM(amount) AS total, COUNT(*) AS count
     FROM expenses
     WHERE user_id = $1
     GROUP BY category
     ORDER BY total DESC`,
    [userId]
  );

  const byMonth = await pool.query(
    `SELECT to_char(date_trunc('month', spent_on), 'YYYY-MM') AS month,
            SUM(amount) AS total, COUNT(*) AS count
     FROM expenses
     WHERE user_id = $1
       AND spent_on >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
     GROUP BY 1
     ORDER BY 1 DESC`,
    [userId]
  );

  res.json({
    total: totals.rows[0].total,
    count: totals.rows[0].count,
    thisMonth: totals.rows[0].this_month,
    byCategory: byCategory.rows,
    byMonth: byMonth.rows,
  });
});

module.exports = router;
