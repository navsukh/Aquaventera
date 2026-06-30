// db/seed.js — Create default admin account
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDb } = require('./database');

async function seed() {
  const db = getDb();
  const email = process.env.ADMIN_EMAIL || 'admin@aquaverite.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const hash = await bcrypt.hash(password, 12);

  const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(email);
  if (existing) {
    console.log('Admin already exists:', email);
    return;
  }

  db.prepare('INSERT INTO admins (email, password, name) VALUES (?, ?, ?)').run(email, hash, 'Aqua Verite Admin');
  console.log('Admin created:', email);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
