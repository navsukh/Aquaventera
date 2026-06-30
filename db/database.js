const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/aquaverite.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let _db;
function getDb() {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      ref           TEXT    NOT NULL UNIQUE,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL,
      phone         TEXT,
      wedding_date  TEXT,
      guest_count   TEXT,
      bottle_size   TEXT,
      engraving_text TEXT,
      cap_finish    TEXT    DEFAULT 'Gold',
      vision        TEXT,
      script_choice TEXT,
      palette       TEXT,
      packaging     TEXT,
      custom_message TEXT,
      status        TEXT    DEFAULT 'new'
        CHECK(status IN ('new','in_review','quoted','confirmed','fulfilled','cancelled')),
      priority      INTEGER DEFAULT 0,
      notes         TEXT,
      quoted_price  REAL,
      created_at    TEXT    DEFAULT (datetime('now')),
      updated_at    TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      enquiry_id    INTEGER REFERENCES enquiries(id) ON DELETE CASCADE,
      filename      TEXT NOT NULL,
      original_name TEXT,
      mime_type     TEXT,
      size_bytes    INTEGER,
      uploaded_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admins (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE,
      password      TEXT NOT NULL,
      name          TEXT DEFAULT 'Admin',
      last_login    TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      enquiry_id    INTEGER REFERENCES enquiries(id) ON DELETE SET NULL,
      admin_id      INTEGER REFERENCES admins(id) ON DELETE SET NULL,
      action        TEXT NOT NULL,
      detail        TEXT,
      ip            TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      enquiry_id    INTEGER REFERENCES enquiries(id) ON DELETE SET NULL,
      to_email      TEXT,
      subject       TEXT,
      status        TEXT DEFAULT 'sent',
      error         TEXT,
      sent_at       TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_enq_status  ON enquiries(status);
    CREATE INDEX IF NOT EXISTS idx_enq_created ON enquiries(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_enq_email   ON enquiries(email);
  `);

  const columns = new Set(db.prepare('PRAGMA table_info(enquiries)').all().map(col => col.name));
  const additions = [
    ['script_choice', 'TEXT'],
    ['palette', 'TEXT'],
    ['packaging', 'TEXT'],
    ['custom_message', 'TEXT']
  ];
  additions.forEach(([name, type]) => {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE enquiries ADD COLUMN ${name} ${type}`);
    }
  });
}

module.exports = { getDb };
