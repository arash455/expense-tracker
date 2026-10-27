const jwt = require('jsonwebtoken');
const { pool } = require('./db');

// Checks the "Authorization: Bearer <token>" header and loads the user.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }

  // Look the user up so deleted users / role changes take effect immediately
  const { rows } = await pool.query(
    'SELECT id, name, email, role FROM users WHERE id = $1',
    [payload.id]
  );
  if (!rows[0]) return res.status(401).json({ error: 'Account no longer exists' });

  req.user = rows[0];
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}

module.exports = { requireAuth, requireAdmin };
