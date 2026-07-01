const { Pool } = require('pg');

function getConnectionConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }

  return {
    host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
    user: process.env.PGUSER || process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.PGDATABASE || process.env.DB_NAME || 'aquaventera',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}

let pool;
let initPromise;
let initError = null;

function getDb() {
  if (!pool) {
    pool = new Pool(getConnectionConfig());
    pool.on('error', (err) => {
      console.error('[Postgres pool error]', err);
    });
  }
  return pool;
}

async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = getDb();

    try {
      await db.query('SELECT 1');
    } catch (dbErr) {
      console.warn('[DB] PostgreSQL unavailable at startup; continuing without schema initialization.', dbErr.message);
      return db;
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id BIGSERIAL PRIMARY KEY,
        ref TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        wedding_date TEXT,
        guest_count TEXT,
        bottle_size TEXT,
        engraving_text TEXT,
        cap_finish TEXT DEFAULT 'Gold',
        vision TEXT,
        script_choice TEXT,
        palette TEXT,
        packaging TEXT,
        custom_message TEXT,
        status TEXT DEFAULT 'new' CHECK (status IN ('new','in_review','quoted','confirmed','fulfilled','cancelled')),
        priority INTEGER DEFAULT 0,
        notes TEXT,
        quoted_price REAL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS uploads (
        id BIGSERIAL PRIMARY KEY,
        enquiry_id BIGINT REFERENCES enquiries(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        original_name TEXT,
        mime_type TEXT,
        size_bytes INTEGER,
        storage_url TEXT,
        uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admins (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT DEFAULT 'Admin',
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id BIGSERIAL PRIMARY KEY,
        enquiry_id BIGINT REFERENCES enquiries(id) ON DELETE SET NULL,
        admin_id BIGINT REFERENCES admins(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        detail TEXT,
        ip TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS email_log (
        id BIGSERIAL PRIMARY KEY,
        enquiry_id BIGINT REFERENCES enquiries(id) ON DELETE SET NULL,
        to_email TEXT,
        subject TEXT,
        status TEXT DEFAULT 'sent',
        error TEXT,
        sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_enq_status ON enquiries(status);
      CREATE INDEX IF NOT EXISTS idx_enq_created ON enquiries(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_enq_email ON enquiries(email);
    `);

    const { rows: enquiryColumnsRows } = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'enquiries'
    `);
    const enquiryColumns = new Set(enquiryColumnsRows.map((row) => row.column_name));
    const enquiryAdditions = [
      ['script_choice', 'TEXT'],
      ['palette', 'TEXT'],
      ['packaging', 'TEXT'],
      ['custom_message', 'TEXT']
    ];

    for (const [name, type] of enquiryAdditions) {
      if (!enquiryColumns.has(name)) {
        await db.query(`ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS ${name} ${type}`);
      }
    }

    const { rows: uploadColumnsRows } = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'uploads'
    `);
    const uploadColumns = new Set(uploadColumnsRows.map((row) => row.column_name));
    const uploadAdditions = [
      ['original_name', 'TEXT'],
      ['mime_type', 'TEXT'],
      ['size_bytes', 'INTEGER'],
      ['storage_url', 'TEXT']
    ];

    for (const [name, type] of uploadAdditions) {
      if (!uploadColumns.has(name)) {
        await db.query(`ALTER TABLE uploads ADD COLUMN IF NOT EXISTS ${name} ${type}`);
      }
    }

    return db;
  })();

  return initPromise;
}

async function transaction(callback) {
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    const result = await callback({
      query: (text, params = []) => client.query(text, params)
    });
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getDb, initDb, transaction };
