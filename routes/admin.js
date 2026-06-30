// routes/admin.js — Admin API (all routes require JWT)
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getDb }        = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const SECRET  = () => process.env.JWT_SECRET || 'dev_secret_change_me';
const EXPIRES = () => process.env.JWT_EXPIRES_IN || '8h';
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

// ── POST /api/admin/login ─────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  const db    = getDb();
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?')
                  .get(email.toLowerCase().trim());

  if (!admin)
    return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid)
    return res.status(401).json({ error: 'Invalid credentials' });

  db.prepare("UPDATE admins SET last_login = datetime('now') WHERE id = ?")
    .run(admin.id);

  const token = jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name },
    SECRET(), { expiresIn: EXPIRES() }
  );

  // Store in session too (for server-side check if needed)
  if (req.session) req.session.adminToken = token;

  return res.json({ token, name: admin.name, email: admin.email });
});

// ── POST /api/admin/logout ────────────────────────────────
router.post('/logout', (req, res) => {
  if (req.session) req.session.destroy(() => {});
  return res.json({ success: true });
});

// ── GET /api/admin/dashboard ──────────────────────────────
router.get('/dashboard', requireAdmin, (req, res) => {
  const db    = getDb();
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='new'        THEN 1 ELSE 0 END) as new_count,
      SUM(CASE WHEN status='in_review'  THEN 1 ELSE 0 END) as in_review_count,
      SUM(CASE WHEN status='quoted'     THEN 1 ELSE 0 END) as quoted_count,
      SUM(CASE WHEN status='confirmed'  THEN 1 ELSE 0 END) as confirmed_count,
      SUM(CASE WHEN status='fulfilled'  THEN 1 ELSE 0 END) as fulfilled_count,
      SUM(CASE WHEN status='cancelled'  THEN 1 ELSE 0 END) as cancelled_count,
      SUM(CASE WHEN date(created_at) = date('now')          THEN 1 ELSE 0 END) as today_count,
      SUM(CASE WHEN date(created_at) >= date('now','-7 days') THEN 1 ELSE 0 END) as week_count
    FROM enquiries
  `).get();

  const recent = db.prepare(`
    SELECT id, ref, name, email, wedding_date, bottle_size, status, created_at
    FROM enquiries ORDER BY created_at DESC LIMIT 10
  `).all();

  const bySize = db.prepare(`
    SELECT bottle_size, COUNT(*) as count FROM enquiries
    WHERE bottle_size IS NOT NULL
    GROUP BY bottle_size ORDER BY count DESC
  `).all();

  return res.json({ stats, recent, bySize });
});

// ── GET /api/admin/enquiries ──────────────────────────────
router.get('/enquiries', requireAdmin, (req, res) => {
  const db = getDb();
  const { status = 'all', search = '', page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where  = 'WHERE 1=1';
  const params = [];

  if (status !== 'all') {
    where += ' AND status = ?'; params.push(status);
  }
  if (search.trim()) {
    where += ' AND (name LIKE ? OR email LIKE ? OR ref LIKE ?)';
    const q = `%${search.trim()}%`;
    params.push(q, q, q);
  }

  const total = db.prepare(`SELECT COUNT(*) as n FROM enquiries ${where}`)
                  .get(...params).n;

  const rows = db.prepare(`
    SELECT id, ref, name, email, phone, wedding_date, guest_count,
           bottle_size, engraving_text, cap_finish, status, priority,
           quoted_price, created_at
    FROM enquiries ${where}
    ORDER BY priority DESC, created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  return res.json({ total, page: Number(page), limit: Number(limit), rows });
});

// ── GET /api/admin/enquiries/:id ─────────────────────────
router.get('/enquiries/:id', requireAdmin, (req, res) => {
  const db      = getDb();
  const enquiry = db.prepare('SELECT * FROM enquiries WHERE id = ?')
                    .get(req.params.id);
  if (!enquiry) return res.status(404).json({ error: 'Not found' });

  const files  = db.prepare('SELECT * FROM uploads WHERE enquiry_id = ?').all(enquiry.id);
  const log    = db.prepare(
    'SELECT * FROM activity_log WHERE enquiry_id = ? ORDER BY created_at DESC LIMIT 20'
  ).all(enquiry.id);
  const emails = db.prepare(
    'SELECT * FROM email_log WHERE enquiry_id = ? ORDER BY sent_at DESC'
  ).all(enquiry.id);

  return res.json({ ...enquiry, files, log, emails });
});

// ── PATCH /api/admin/enquiries/:id ───────────────────────
router.patch('/enquiries/:id', requireAdmin, (req, res) => {
  const db      = getDb();
  const allowed = {};
  const { status, notes, quoted_price, priority } = req.body || {};

  if (status        !== undefined) allowed.status        = status;
  if (notes         !== undefined) allowed.notes         = notes;
  if (quoted_price  !== undefined) allowed.quoted_price  = quoted_price || null;
  if (priority      !== undefined) allowed.priority      = priority;
  allowed.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const sets = Object.keys(allowed).map(k => `${k} = ?`).join(', ');
  const vals = [...Object.values(allowed), req.params.id];

  db.prepare(`UPDATE enquiries SET ${sets} WHERE id = ?`).run(...vals);

  db.prepare(
    `INSERT INTO activity_log (enquiry_id, admin_id, action, detail, ip)
     VALUES (?,?,?,?,?)`
  ).run(req.params.id, req.admin.id,
        'status_updated', `Status set to: ${status || 'unchanged'}`, req.ip);

  return res.json({ success: true });
});

// ── DELETE /api/admin/enquiries/:id ──────────────────────
router.delete('/enquiries/:id', requireAdmin, (req, res) => {
  getDb().prepare('DELETE FROM enquiries WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

// ── GET /api/admin/activity ───────────────────────────────
router.get('/activity', requireAdmin, (req, res) => {
  const rows = getDb().prepare(`
    SELECT a.*, e.ref, e.name as enquiry_name
    FROM activity_log a
    LEFT JOIN enquiries e ON e.id = a.enquiry_id
    ORDER BY a.created_at DESC LIMIT 60
  `).all();
  return res.json(rows);
});

// ── POST /api/admin/change-password ──────────────────────
router.post('/change-password', requireAdmin, async (req, res) => {
  const { current, newPassword } = req.body || {};
  if (!current || !newPassword || newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters' });

  const db    = getDb();
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
  const valid = await bcrypt.compare(current, admin.password);
  if (!valid) return res.status(401).json({ error: 'Current password incorrect' });

  const hash = await bcrypt.hash(newPassword, 12);
  db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hash, req.admin.id);
  return res.json({ success: true });
});

module.exports = router;
