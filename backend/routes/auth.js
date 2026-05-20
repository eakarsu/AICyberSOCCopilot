const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// Fallback users used if the `users` table is empty / not yet seeded.
const FALLBACK_USERS = [
  { id: 1, email: 'admin@socops.io',   password: 'admin123',   name: 'SOC Admin',   role: 'admin'   },
  { id: 2, email: 'analyst@socops.io', password: 'analyst123', name: 'SOC Analyst', role: 'analyst' },
  { id: 3, email: 'viewer@socops.io',  password: 'viewer123',  name: 'SOC Viewer',  role: 'viewer'  },
];

async function findUser(email, password) {
  try {
    const r = await pool.query(
      `SELECT id, email, password, name, role FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (r.rows.length) {
      const u = r.rows[0];
      if (u.password === password) return u;
      return null;
    }
  } catch (e) {
    // table may not exist yet
  }
  return FALLBACK_USERS.find((u) => u.email === email && u.password === password) || null;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }
  const user = await findUser(email, password);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
