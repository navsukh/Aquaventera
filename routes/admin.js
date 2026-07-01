// routes/admin.js — Admin API (all routes require JWT)
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getDb }        = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');
const { sendDesignProofEmail } = require('../services/email');

const SECRET  = () => process.env.JWT_SECRET;
const EXPIRES = () => process.env.JWT_EXPIRES_IN || '8h';

function secureCookie(req) {
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

// ── POST /api/admin/login ─────────────────────────────────
router.post('/login', loginLimiter, validateCsrf, async (req, res) => {
  const { email, username, password } = req.body || {};
  const loginId = (email || username || '').toString().trim().toLowerCase();
  if (!loginId || !password)
    return res.status(400).json({ error: 'Email/username and password required' });

  const db    = getDb();
  const admin = (await db.query('SELECT * FROM admins WHERE email = $1', [loginId])).rows[0];

  if (!admin)
    return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid)
    return res.status(401).json({ error: 'Invalid credentials' });

  await db.query("UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [admin.id]);

  const token = jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name },
    SECRET(), { expiresIn: EXPIRES() }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: secureCookie(req),
    sameSite: 'Strict',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/'
  };
  res.cookie('auth_token', token, cookieOptions);

  return res.json({
    username: admin.email,
    name: admin.name,
    email: admin.email
  });
});

// ── POST /api/admin/logout ────────────────────────────────
router.post('/logout', validateCsrf, (req, res) => {
  res.clearCookie('auth_token', { path: '/' });
  return res.json({ success: true });
});

// ── GET /api/admin/dashboard ──────────────────────────────
router.get('/dashboard', requireAdmin, async (req, res) => {
  const db    = getDb();
  const stats = (await db.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='new' THEN 1 ELSE 0 END) as new_count,
      SUM(CASE WHEN status='in_review' THEN 1 ELSE 0 END) as in_review_count,
      SUM(CASE WHEN status='quoted' THEN 1 ELSE 0 END) as quoted_count,
      SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) as confirmed_count,
      SUM(CASE WHEN status='fulfilled' THEN 1 ELSE 0 END) as fulfilled_count,
      SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled_count,
      SUM(CASE WHEN created_at::date = CURRENT_DATE THEN 1 ELSE 0 END) as today_count,
      SUM(CASE WHEN created_at::date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 ELSE 0 END) as week_count
    FROM enquiries
  `)).rows[0];

  const recent = (await db.query(`
    SELECT id, ref, name, email, wedding_date, bottle_size, status, created_at
    FROM enquiries ORDER BY created_at DESC LIMIT 10
  `)).rows;

  const bySize = (await db.query(`
    SELECT bottle_size, COUNT(*) as count FROM enquiries
    WHERE bottle_size IS NOT NULL
    GROUP BY bottle_size ORDER BY count DESC
  `)).rows;

  return res.json({
    stats,
    recent,
    bySize,
    adminEmail: req.admin.email,
    adminName: req.admin.name
  });
});

// ── GET /api/admin/enquiries ──────────────────────────────
router.get('/enquiries', requireAdmin, async (req, res) => {
  const db = getDb();
  const { status = 'all', search = '', page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where  = 'WHERE 1=1';
  const params = [];

  if (status !== 'all') {
    where += ' AND status = $' + (params.length + 1); params.push(status);
  }
  if (search.trim()) {
    where += ' AND (name ILIKE $' + (params.length + 1) + ' OR email ILIKE $' + (params.length + 2) + ' OR ref ILIKE $' + (params.length + 3) + ')';
    const q = `%${search.trim()}%`;
    params.push(q, q, q);
  }

  const totalResult = await db.query(`SELECT COUNT(*) as n FROM enquiries ${where}`, params);
  const total = Number(totalResult.rows[0].n);

  const rows = (await db.query(`
    SELECT id, ref, name, email, phone, wedding_date, guest_count,
           bottle_size, engraving_text, cap_finish, status, priority,
           quoted_price, created_at
    FROM enquiries ${where}
    ORDER BY priority DESC, created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, [...params, Number(limit), offset])).rows;

  return res.json({ total, page: Number(page), limit: Number(limit), rows });
});

// ── GET /api/admin/export ───────────────────────────────
router.get('/export', requireAdmin, async (req, res) => {
  const db = getDb();
  const rows = (await db.query(`
    SELECT ref, name, email, phone, wedding_date, guest_count,
           bottle_size, engraving_text, cap_finish, status, quoted_price, created_at
    FROM enquiries
    ORDER BY created_at DESC
  `)).rows;

  const headers = ['Ref','Name','Email','Phone','Wedding Date','Guests','Bottle Size','Engraving','Cap Finish','Status','Quote','Created At'];
  const csv = [headers.join(',')].concat(rows.map(row => {
    return [
      row.ref,
      row.name,
      row.email,
      row.phone || '',
      row.wedding_date || '',
      row.guest_count || '',
      row.bottle_size || '',
      row.engraving_text ? row.engraving_text.replace(/"/g, '""') : '',
      row.cap_finish || '',
      row.status || '',
      row.quoted_price != null ? String(row.quoted_price) : '',
      row.created_at || ''
    ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
  })).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="aquaverite-enquiries-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

// ── GET /api/admin/enquiries/:id ─────────────────────────
router.get('/enquiries/:id', requireAdmin, async (req, res) => {
  const db      = getDb();
  const enquiry = (await db.query('SELECT * FROM enquiries WHERE id = $1', [req.params.id])).rows[0];
  if (!enquiry) return res.status(404).json({ error: 'Not found' });

  const files = (await db.query('SELECT * FROM uploads WHERE enquiry_id = $1', [enquiry.id])).rows;
  const normalizedFiles = files.map((file) => ({
    ...file,
    url: file.storage_url || `/uploads/${encodeURIComponent(file.filename)}`
  }));
  const log    = (await db.query(
    'SELECT * FROM activity_log WHERE enquiry_id = $1 ORDER BY created_at DESC LIMIT 20',
    [enquiry.id]
  )).rows;
  const emails = (await db.query(
    'SELECT * FROM email_log WHERE enquiry_id = $1 ORDER BY sent_at DESC',
    [enquiry.id]
  )).rows;

  return res.json({ ...enquiry, files: normalizedFiles, log, emails });
});

function isValidProofUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const uri = new URL(value.trim());
    return uri.protocol === 'http:' || uri.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

// ── POST /api/admin/enquiry/:uuid/send-proof ──────────────
router.post('/enquiry/:uuid/send-proof', requireAdmin, validateCsrf, async (req, res) => {
  const proofUrl = (req.body && req.body.proof_url || '').toString().trim();
  if (!isValidProofUrl(proofUrl)) {
    return res.status(400).json({ error: 'Proof URL must be a valid http:// or https:// URL' });
  }

  const db = getDb();
  const lookupValue = req.params.uuid;
  const enquiry = (await db.query(`
    SELECT * FROM enquiries
    WHERE ($1 ~ '^[0-9]+$' AND id = $1::bigint)
       OR ref = $1
  `, [lookupValue])).rows[0];
  if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

  try {
    const referral = enquiry.ref || `AV-${String(enquiry.id).padStart(4, '0')}`;
    await sendDesignProofEmail({
      name: enquiry.name,
      email: enquiry.email,
      ref: referral,
      uuid: enquiry.id,
      proofUrl
    });

    await db.query(
      `INSERT INTO activity_log (enquiry_id, admin_id, action, detail, ip)
       VALUES ($1, $2, $3, $4, $5)`,
      [enquiry.id, req.admin.id, 'proof_sent', 'Proof sent to client', req.ip]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('[Proof email error]', err.message);
    return res.status(500).json({ error: 'Failed to send proof email' });
  }
});

// ── PATCH /api/admin/enquiries/:id ───────────────────────
router.patch('/enquiries/:id', requireAdmin, validateCsrf, async (req, res) => {
  const db      = getDb();
  const { status, notes, quoted_price, priority } = req.body || {};
  const values = [];
  const updates = [];

  if (status !== undefined) {
    updates.push('status = $' + (values.length + 1));
    values.push(status);
  }
  if (notes !== undefined) {
    updates.push('notes = $' + (values.length + 1));
    values.push(notes);
  }
  if (quoted_price !== undefined) {
    updates.push('quoted_price = $' + (values.length + 1));
    values.push(quoted_price || null);
  }
  if (priority !== undefined) {
    updates.push('priority = $' + (values.length + 1));
    values.push(priority);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.id);

  await db.query(`UPDATE enquiries SET ${updates.join(', ')} WHERE id = $${values.length}`, values);

  await db.query(
    `INSERT INTO activity_log (enquiry_id, admin_id, action, detail, ip)
     VALUES ($1, $2, $3, $4, $5)`,
    [req.params.id, req.admin.id, 'status_updated', `Status set to: ${status || 'unchanged'}`, req.ip]
  );

  return res.json({ success: true });
});

// ── DELETE /api/admin/enquiries/:id ──────────────────────
router.delete('/enquiries/:id', requireAdmin, validateCsrf, async (req, res) => {
  await getDb().query('DELETE FROM enquiries WHERE id = $1', [req.params.id]);
  return res.json({ success: true });
});

// ── GET /api/admin/activity ───────────────────────────────
router.get('/activity', requireAdmin, async (req, res) => {
  const rows = (await getDb().query(`
    SELECT a.*, e.ref, e.name as enquiry_name
    FROM activity_log a
    LEFT JOIN enquiries e ON e.id = a.enquiry_id
    ORDER BY a.created_at DESC LIMIT 60
  `)).rows;
  return res.json(rows);
});

// ── POST /api/admin/change-password ──────────────────────
router.post('/change-password', requireAdmin, validateCsrf, async (req, res) => {
  const { current, newPassword } = req.body || {};
  if (!current || !newPassword || newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters' });

  const db    = getDb();
  const admin = (await db.query('SELECT * FROM admins WHERE id = $1', [req.admin.id])).rows[0];
  const valid = await bcrypt.compare(current, admin.password);
  if (!valid) return res.status(401).json({ error: 'Current password incorrect' });

  const hash = await bcrypt.hash(newPassword, 12);
  await db.query('UPDATE admins SET password = $1 WHERE id = $2', [hash, req.admin.id]);
  return res.json({ success: true });
});

module.exports = router;
