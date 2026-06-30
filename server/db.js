// server/db.js — SQLite database layer
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/aquaverite.db';
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ═══════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════
db.exec(`
  CREATE TABLE IF NOT EXISTS enquiries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid        TEXT    NOT NULL UNIQUE,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),

    -- Contact
    full_name   TEXT    NOT NULL,
    email       TEXT    NOT NULL,
    phone       TEXT,
    whatsapp    TEXT,

    -- Wedding details
    wedding_date      TEXT,
    guest_count       TEXT,
    venue_name        TEXT,
    venue_city        TEXT,

    -- Order preferences
    bottle_size       TEXT,
    cap_finish        TEXT,
    engraving_text    TEXT,
    engraving_style   TEXT,
    packaging         TEXT,

    -- Open fields
    vision_notes      TEXT,
    mood_board_file   TEXT,

    -- CRM
    status      TEXT    NOT NULL DEFAULT 'new',
    -- 'new' | 'contacted' | 'design_sent' | 'approved' | 'in_production' | 'delivered' | 'closed'
    priority    TEXT    NOT NULL DEFAULT 'normal',
    -- 'low' | 'normal' | 'high' | 'vip'
    source      TEXT    DEFAULT 'website',
    assigned_to TEXT,
    notes       TEXT,

    -- Email tracking
    welcome_sent_at   TEXT,
    followup_sent_at  TEXT,

    -- Pricing
    quoted_price      REAL,
    quoted_at         TEXT,
    currency          TEXT DEFAULT 'INR'
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    email       TEXT    NOT NULL UNIQUE,
    full_name   TEXT,
    subscribed  INTEGER DEFAULT 1,
    source      TEXT
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    username    TEXT    NOT NULL UNIQUE,
    password_hash TEXT  NOT NULL,
    role        TEXT    DEFAULT 'admin'
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    enquiry_id  INTEGER REFERENCES enquiries(id),
    action      TEXT    NOT NULL,
    actor       TEXT,
    detail      TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_enquiries_status   ON enquiries(status);
  CREATE INDEX IF NOT EXISTS idx_enquiries_created  ON enquiries(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_enquiries_email    ON enquiries(email);
`);

// ═══════════════════════════════════════════
// ENQUIRY QUERIES
// ═══════════════════════════════════════════
const queries = {
  insertEnquiry: db.prepare(`
    INSERT INTO enquiries
      (uuid, full_name, email, phone, whatsapp, wedding_date, guest_count,
       venue_name, venue_city, bottle_size, cap_finish, engraving_text,
       engraving_style, packaging, vision_notes, mood_board_file, source)
    VALUES
      (@uuid, @full_name, @email, @phone, @whatsapp, @wedding_date, @guest_count,
       @venue_name, @venue_city, @bottle_size, @cap_finish, @engraving_text,
       @engraving_style, @packaging, @vision_notes, @mood_board_file, @source)
  `),

  getEnquiries: db.prepare(`
    SELECT * FROM enquiries ORDER BY created_at DESC LIMIT ? OFFSET ?
  `),

  getEnquiryByUUID: db.prepare(`SELECT * FROM enquiries WHERE uuid = ?`),
  getEnquiryByID:   db.prepare(`SELECT * FROM enquiries WHERE id = ?`),

  updateStatus: db.prepare(`
    UPDATE enquiries SET status = ?, updated_at = datetime('now') WHERE uuid = ?
  `),

  updateNotes: db.prepare(`
    UPDATE enquiries SET notes = ?, updated_at = datetime('now') WHERE uuid = ?
  `),

  updateQuote: db.prepare(`
    UPDATE enquiries SET quoted_price = ?, quoted_at = datetime('now'), updated_at = datetime('now') WHERE uuid = ?
  `),

  markWelcomeSent: db.prepare(`
    UPDATE enquiries SET welcome_sent_at = datetime('now') WHERE uuid = ?
  `),

  countByStatus: db.prepare(`
    SELECT status, COUNT(*) as count FROM enquiries GROUP BY status
  `),

  recentEnquiries: db.prepare(`
    SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 10
  `),

  searchEnquiries: db.prepare(`
    SELECT * FROM enquiries
    WHERE full_name LIKE ? OR email LIKE ? OR engraving_text LIKE ?
    ORDER BY created_at DESC LIMIT 50
  `),

  logActivity: db.prepare(`
    INSERT INTO activity_log (enquiry_id, action, actor, detail)
    VALUES (?, ?, ?, ?)
  `),

  getActivity: db.prepare(`
    SELECT * FROM activity_log WHERE enquiry_id = ? ORDER BY created_at DESC
  `),

  upsertContact: db.prepare(`
    INSERT INTO contacts (email, full_name, source)
    VALUES (@email, @full_name, @source)
    ON CONFLICT(email) DO UPDATE SET full_name = excluded.full_name
  `),

  getAdminByUsername: db.prepare(`SELECT * FROM admin_users WHERE username = ?`),

  insertAdmin: db.prepare(`
    INSERT OR IGNORE INTO admin_users (username, password_hash, role)
    VALUES (?, ?, ?)
  `),
};

module.exports = { db, queries };
