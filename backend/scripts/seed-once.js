'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const pool = require('../config/database');

async function main() {
  const usersTable = (await pool.query("SELECT to_regclass('users')::text AS name")).rows[0]?.name;
  if (usersTable) {
    const count = Number((await pool.query('SELECT COUNT(*) AS count FROM users')).rows[0]?.count || 0);
    if (count > 0) {
      console.log('Demo users already exist; skipping duplicate root seed');
      return;
    }
  }
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Set ALLOW_DEMO_SEED=true for this destructive demo operation');
  }
  const result = spawnSync(process.execPath, ['seed/seed.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Demo seed exited with status ${result.status}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
