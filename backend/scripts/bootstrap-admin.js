'use strict';

const pool = require('../config/database');
const { hashPassword } = require('../services/passwords');

async function main() {
  const explicitlyAllowed = process.env.ALLOW_BOOTSTRAP_ADMIN === '1'
    || process.env.BOOTSTRAP_ACKNOWLEDGEMENT === 'create-initial-admin';
  if (!explicitlyAllowed) throw new Error('Explicit bootstrap acknowledgement is required');

  const tenantId = process.env.BOOTSTRAP_TENANT_ID || process.env.TENANT_ID;
  const email = String(process.env.BOOTSTRAP_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.BOOTSTRAP_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_NAME || process.env.BOOTSTRAP_ADMIN_NAME || 'Bootstrap Admin';
  if (!tenantId || !email || !password) {
    throw new Error('Bootstrap tenant, email, and password are required');
  }

  const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
  if (existingEmail.rows[0]) {
    console.log('Bootstrap administrator already exists; credentials and role were not changed');
    return;
  }
  const tenantUsers = await pool.query('SELECT id FROM users WHERE tenant_id = $1 LIMIT 1', [tenantId]);
  if (tenantUsers.rows[0]) throw new Error('Tenant already has users; bootstrap will not add another administrator');

  await pool.query(
    'INSERT INTO users(email,name,role,tenant_id,password_hash) VALUES($1,$2,$3,$4,$5)',
    [email, name, 'admin', tenantId, hashPassword(password)]
  );
  console.log('Bootstrap administrator created');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
