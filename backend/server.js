require('dotenv').config({ quiet: true });

const path = require('path');
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET environment variable. See .env.example');
  process.exit(1);
}

const app = express();

// Allow the frontend (e.g. your Netlify site) to call this API.
// FRONTEND_URL can hold several comma-separated URLs. Empty = allow any origin.
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : '*' }));

app.use(express.json());

// API routes
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));

// Also serve the frontend folder, so locally you can just open http://localhost:3000
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler (Express 5 forwards errors from async routes here automatically)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: 'That record already exists' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Could not connect to the database:', err.message);
    process.exit(1);
  });
