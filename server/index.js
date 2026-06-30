// server/index.js — Aqua Vérité Backend
require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const compression = require('compression');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const { v4: uuidv4 } = require('uuid');
const validator  = require('validator');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');

const { db, queries } = require('./db');
const { sendMail, buildWelcomeEmail, buildAdminNotificationEmail, buildDesignProofEmail } = require('./mailer');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';

// ═══════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════
app.use(helmet({ contentSecurityPolicy: false })); // disable CSP to allow inline scripts in dev
app.use(cors({ origin: process.env.BASE_URL || '*' }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─── Rate limiting ───────────────────────────
const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: { error: 'Too many enquiries submitted. Please try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api/', apiLimiter);

// ─── File uploads (mood board) ───────────────
const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_UPLOAD_MB) || 10) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// ─── Static files ─────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// ═══════════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════
function authRequired(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorised' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

// ── POST /api/enquiry — Submit a new commission enquiry ──
app.post('/api/enquiry', enquiryLimiter, upload.single('mood_board'), async (req, res) => {
  try {
    const b = req.body;

    // Validate required fields
    if (!b.full_name || !b.email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }
    if (!validator.isEmail(b.email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    const sanitize = (v) => v ? validator.escape(String(v).trim().slice(0, 500)) : null;

    const uuid = uuidv4();
    const enquiry = {
      uuid,
      full_name:      sanitize(b.full_name),
      email:          validator.normalizeEmail(b.email) || b.email,
      phone:          sanitize(b.phone),
      whatsapp:       sanitize(b.whatsapp),
      wedding_date:   sanitize(b.wedding_date),
      guest_count:    sanitize(b.guest_count),
      venue_name:     sanitize(b.venue_name),
      venue_city:     sanitize(b.venue_city),
      bottle_size:    sanitize(b.bottle_size),
      cap_finish:     sanitize(b.cap_finish),
      engraving_text: sanitize(b.engraving_text),
      engraving_style:sanitize(b.engraving_style),
      packaging:      sanitize(b.packaging),
      vision_notes:   sanitize(b.vision_notes),
      mood_board_file:req.file ? req.file.filename : null,
      source:         'website',
    };

    // Save to DB
    queries.insertEnquiry.run(enquiry);
    const saved = queries.getEnquiryByUUID.get(uuid);

    // Upsert contact
    queries.upsertContact.run({ email: enquiry.email, full_name: enquiry.full_name, source: 'website' });

    // Log activity
    queries.logActivity.run(saved.id, 'enquiry_received', 'system', 'New enquiry submitted via website');

    // Send emails (non-blocking)
    Promise.allSettled([
      // Welcome to client
      sendMail({ to: enquiry.email, ...buildWelcomeEmail({ ...enquiry, uuid }) }).then(() => {
        queries.markWelcomeSent.run(uuid);
        queries.logActivity.run(saved.id, 'email_welcome_sent', 'system', `Welcome email sent to ${enquiry.email}`);
      }),
      // Notification to brand
      process.env.BRAND_EMAIL ? sendMail({
        to: process.env.BRAND_EMAIL,
        ...buildAdminNotificationEmail({ ...enquiry, uuid }),
      }).then(() => {
        queries.logActivity.run(saved.id, 'email_admin_sent', 'system', 'Admin notification sent');
      }) : Promise.resolve(),
    ]).then(results => {
      results.forEach(r => { if (r.status === 'rejected') console.error('[EMAIL]', r.reason?.message); });
    });

    res.status(201).json({
      success: true,
      reference: `AV-${uuid.slice(0, 8).toUpperCase()}`,
      message: 'Your enquiry has been received. We will be in touch within 24 hours.',
    });

  } catch (err) {
    console.error('[POST /api/enquiry]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again or contact us directly.' });
  }
});

// ── GET /api/enquiry/:ref — Client status check ──────────
app.get('/api/enquiry/:ref', async (req, res) => {
  try {
    const ref = req.params.ref.replace('AV-', '').toLowerCase();
    // Try UUID prefix match
    const all = db.prepare(`SELECT uuid, full_name, status, created_at, bottle_size, engraving_text
      FROM enquiries WHERE uuid LIKE ? LIMIT 1`).get(ref + '%');
    if (!all) return res.status(404).json({ error: 'Enquiry not found.' });
    res.json({
      reference: `AV-${all.uuid.slice(0,8).toUpperCase()}`,
      name: all.full_name,
      status: all.status,
      submitted: all.created_at,
      bottle_size: all.bottle_size,
      engraving: all.engraving_text,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════
// ADMIN AUTH
// ═══════════════════════════════════════════════
app.post('/api/admin/login', rateLimit({ windowMs: 15*60*1000, max: 10 }), async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const admin = queries.getAdminByUsername.get(username);
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: admin.id, username: admin.username, role: admin.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, username: admin.username, role: admin.role });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════
// ADMIN API (protected)
// ═══════════════════════════════════════════════

// ── GET /api/admin/dashboard ─────────────────
app.get('/api/admin/dashboard', authRequired, (req, res) => {
  const statusCounts = queries.countByStatus.all();
  const recent = queries.recentEnquiries.all();
  const total = db.prepare('SELECT COUNT(*) as c FROM enquiries').get().c;
  const thisMonth = db.prepare(`SELECT COUNT(*) as c FROM enquiries WHERE created_at >= date('now','start of month')`).get().c;
  res.json({ statusCounts, recent, total, thisMonth });
});

// ── GET /api/admin/enquiries ─────────────────
app.get('/api/admin/enquiries', authRequired, (req, res) => {
  const page  = Math.max(0, parseInt(req.query.page  || 0));
  const limit = Math.min(100, parseInt(req.query.limit || 20));
  const search = req.query.q;
  let rows;
  if (search) {
    const q = `%${search}%`;
    rows = queries.searchEnquiries.all(q, q, q);
  } else {
    rows = queries.getEnquiries.all(limit, page * limit);
  }
  const total = db.prepare('SELECT COUNT(*) as c FROM enquiries').get().c;
  res.json({ enquiries: rows, total, page, limit });
});

// ── GET /api/admin/enquiry/:uuid ─────────────
app.get('/api/admin/enquiry/:uuid', authRequired, (req, res) => {
  const enquiry = queries.getEnquiryByUUID.get(req.params.uuid);
  if (!enquiry) return res.status(404).json({ error: 'Not found' });
  const activity = queries.getActivity.all(enquiry.id);
  res.json({ enquiry, activity });
});

// ── PATCH /api/admin/enquiry/:uuid ───────────
app.patch('/api/admin/enquiry/:uuid', authRequired, (req, res) => {
  const { status, notes, quoted_price } = req.body;
  const uuid = req.params.uuid;
  const enquiry = queries.getEnquiryByUUID.get(uuid);
  if (!enquiry) return res.status(404).json({ error: 'Not found' });

  if (status)       { queries.updateStatus.run(status, uuid); queries.logActivity.run(enquiry.id, 'status_changed', req.admin.username, `Status → ${status}`); }
  if (notes !== undefined)   { queries.updateNotes.run(notes, uuid);  queries.logActivity.run(enquiry.id, 'notes_updated',  req.admin.username, 'Notes updated'); }
  if (quoted_price) { queries.updateQuote.run(quoted_price, uuid);   queries.logActivity.run(enquiry.id, 'quote_set',      req.admin.username, `Quote: ${quoted_price}`); }

  res.json({ success: true });
});

// ── POST /api/admin/enquiry/:uuid/send-proof ──
app.post('/api/admin/enquiry/:uuid/send-proof', authRequired, async (req, res) => {
  const enquiry = queries.getEnquiryByUUID.get(req.params.uuid);
  if (!enquiry) return res.status(404).json({ error: 'Not found' });
  const { proof_url } = req.body;
  try {
    await sendMail({ to: enquiry.email, ...buildDesignProofEmail(enquiry, proof_url) });
    queries.logActivity.run(enquiry.id, 'design_proof_sent', req.admin.username, `Proof email sent to ${enquiry.email}`);
    queries.updateStatus.run('design_sent', enquiry.uuid);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Email failed: ' + err.message });
  }
});

// ── GET /api/admin/export — CSV export ────────
app.get('/api/admin/export', authRequired, (req, res) => {
  const rows = db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC').all();
  const cols = ['id','uuid','created_at','full_name','email','phone','wedding_date','guest_count',
                'venue_city','bottle_size','cap_finish','engraving_text','status','quoted_price'];
  const csv  = [cols.join(','), ...rows.map(r =>
    cols.map(c => JSON.stringify(r[c] ?? '')).join(',')
  )].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="aquaverite-enquiries.csv"');
  res.send(csv);
});

// ─── Admin panel SPA ─────────────────────────
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// ─── Health check ─────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), version: '1.0.0' });
});

// ─── 404 → serve frontend ────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── Error handler ────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ═══════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════╗`);
  console.log(`║   Aqua Vérité Server · Port ${PORT}   ║`);
  console.log(`╚════════════════════════════════════╝\n`);
  console.log(`  Frontend  → http://localhost:${PORT}`);
  console.log(`  Admin     → http://localhost:${PORT}/admin`);
  console.log(`  Health    → http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
