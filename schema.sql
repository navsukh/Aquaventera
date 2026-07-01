-- PostgreSQL schema for Aqua Vèntèra
-- Generated from the existing application data model

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
  cap_finish TEXT NOT NULL DEFAULT 'Gold',
  vision TEXT,
  script_choice TEXT,
  palette TEXT,
  packaging TEXT,
  custom_message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_review','quoted','confirmed','fulfilled','cancelled')),
  priority INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  quoted_price NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploads (
  id BIGSERIAL PRIMARY KEY,
  enquiry_id BIGINT NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  storage_url TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Admin',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_log (
  id BIGSERIAL PRIMARY KEY,
  enquiry_id BIGINT REFERENCES enquiries(id) ON DELETE SET NULL,
  admin_id BIGINT REFERENCES admins(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_log (
  id BIGSERIAL PRIMARY KEY,
  enquiry_id BIGINT REFERENCES enquiries(id) ON DELETE SET NULL,
  to_email TEXT,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_email ON enquiries(email);
CREATE INDEX IF NOT EXISTS idx_uploads_enquiry_id ON uploads(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_enquiry_id ON activity_log(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_admin_id ON activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_email_log_enquiry_id ON email_log(enquiry_id);
