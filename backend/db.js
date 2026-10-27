const fs = require('fs');
const path = require('path');
const { Pool, types } = require('pg');

// Return DATE columns as plain 'YYYY-MM-DD' strings (avoids timezone shifts)
types.setTypeParser(1082, (value) => value);
// Return NUMERIC columns (amounts) as JS numbers instead of strings
types.setTypeParser(1700, (value) => parseFloat(value));
// Return COUNT(*) results as numbers
types.setTypeParser(20, (value) => parseInt(value, 10));

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable. See .env.example');
  process.exit(1);
}

// For Neon / Render the connection string includes ?sslmode=require, which enables SSL.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);

  // Promote the configured admin account (if it already exists)
  if (process.env.ADMIN_EMAIL) {
    await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [
      process.env.ADMIN_EMAIL.toLowerCase(),
    ]);
  }
}

module.exports = { pool, initDb };
