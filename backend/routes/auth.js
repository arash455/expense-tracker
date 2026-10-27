const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();

function createToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register  { name, email, password }
router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows[0]) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const role = email === (process.env.ADMIN_EMAIL || '').toLowerCase() ? 'admin' : 'user';

  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role`,
    [name, email, passwordHash, role]
  );

  res.status(201).json({ token: createToken(rows[0]), user: rows[0] });
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }

  const { id, name, role } = user;
  res.json({ token: createToken(user), user: { id, name, email, role } });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
