const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'ai-cyber-soc-copilot-secret-key-2026';

// Permission matrix: which roles can perform which HTTP methods.
// - admin:   full
// - analyst: read + write (no delete by default)
// - viewer:  read-only
const ROLE_METHODS = {
  admin:   new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  analyst: new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  viewer:  new Set(['GET']),
};

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Generic write-guard. Enforces role on POST/PUT/PATCH/DELETE.
function rbacEnforce(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  const role = req.user.role || 'viewer';
  const allowed = ROLE_METHODS[role] || ROLE_METHODS.viewer;
  if (!allowed.has(req.method)) {
    return res.status(403).json({ error: `Role '${role}' is not permitted to ${req.method}` });
  }
  next();
}

// Hard role gate (e.g. only admin can manage webhooks/users).
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires one of: ${roles.join(', ')}` });
    }
    next();
  };
}

module.exports = { authenticateToken, rbacEnforce, requireRole, JWT_SECRET };
