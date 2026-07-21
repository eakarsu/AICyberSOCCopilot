'use strict';

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  max: Math.max(1, Math.min(Number(process.env.DB_POOL_MAX) || 10, 30)),
});
pool.on('error', (error) => console.error('Idle database client failed:', error.message));

module.exports = pool;
