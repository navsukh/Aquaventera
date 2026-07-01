// server/setup.js — First-time setup: create admin user
require('dotenv').config();
const bcrypt  = require('bcryptjs');
const readline = require('readline');
const { getDb, initDb } = require('../db/database');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function setup() {
  console.log('\n🔧  Aqua Vèntèra — First-Time Setup\n');

  const email = (await ask('Admin email [admin@example.com]: ')) || 'admin@example.com';
  const password = await ask('Admin password: ');
  if (!password || password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const db = getDb();
  await initDb();
  const existing = (await db.query('SELECT id FROM admins WHERE email = $1', [email])).rows[0];

  if (existing) {
    const hash = await bcrypt.hash(password, 12);
    await db.query('UPDATE admins SET password = $1, name = $2 WHERE id = $3', [hash, 'Aqua Vèntèra Admin', existing.id]);
    console.log(`\n✅  Admin user "${email}" updated.`);
  } else {
    const hash = await bcrypt.hash(password, 12);
    await db.query('INSERT INTO admins (email, password, name) VALUES ($1, $2, $3)', [email, hash, 'Aqua Vèntèra Admin']);
    console.log(`\n✅  Admin user "${email}" created.`);
  }

  console.log(`    Login at: ${process.env.BASE_URL || 'http://localhost:3000'}/admin\n`);
  rl.close();
}

setup().catch((err) => {
  console.error(err);
  process.exit(1);
});
