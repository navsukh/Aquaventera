// db/seed.js — Create default admin account
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDb, initDb } = require('./database');

async function seed() {
  await initDb();
  const db = getDb();
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to create a default admin. Aborting.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const existing = (await db.query('SELECT id FROM admins WHERE email = $1', [email])).rows[0];
  if (existing) {
    console.log('Admin already exists:', email);
    process.exit(0);
  }

  await db.query('INSERT INTO admins (email, password, name) VALUES ($1, $2, $3)', [email, hash, 'Aqua Vèntèra Admin']);
  console.log('Admin created:', email);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
