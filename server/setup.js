// server/setup.js — First-time setup: create admin user
require('dotenv').config();
const bcrypt  = require('bcryptjs');
const readline = require('readline');
const { queries } = require('./db');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

async function setup() {
  console.log('\n🔧  Aqua Vérité — First-Time Setup\n');

  const username = await ask('Admin username [admin]: ') || 'admin';
  const password = await ask('Admin password: ');
  if (!password || password.length < 8) {
    console.error('Password must be at least 8 characters.'); process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  queries.insertAdmin.run(username, hash, 'superadmin');

  console.log(`\n✅  Admin user "${username}" created.`);
  console.log(`    Login at: ${process.env.BASE_URL || 'http://localhost:3000'}/admin\n`);
  rl.close();
}

setup().catch(err => { console.error(err); process.exit(1); });
