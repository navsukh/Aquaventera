require('dotenv').config();

const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const morgan      = require('morgan');
const compression = require('compression');
const session     = require('express-session');
const path        = require('path');
const rateLimit   = require('express-rate-limit');

const enquiryRouter = require('./routes/enquiry');
const adminRouter   = require('./routes/admin');
const { getDb }     = require('./db/database');
const bcrypt = require('bcryptjs');

const app  = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.set('trust proxy', 1);

// ── Security — CSP relaxed for inline scripts (admin dashboard + main site)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      scriptSrcElem: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'",
                   "https://fonts.googleapis.com",
                   "https://fonts.gstatic.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com"],
      imgSrc:     ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.BASE_URL || true,
  credentials: true
}));

app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_session_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge:   8 * 60 * 60 * 1000
  }
}));

// ── Body parsers (must come BEFORE routes) ────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use((req, res, next) => {
  if (req.path === '/admin' || req.path.startsWith('/admin/') || req.path.startsWith('/api/admin')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

// ── Global rate limiter ───────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max:      parseInt(process.env.RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests. Please slow down.' }
}));

// ── Static files ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// Uploads — protected
app.get('/uploads/:filename', require('./middleware/auth').requireAdmin, (req, res) => {
  const safeBase = path.resolve(__dirname, 'data/uploads');
  const safeFile = path.resolve(safeBase, req.params.filename);
  if (!safeFile.startsWith(safeBase)) return res.status(400).end();
  res.sendFile(safeFile);
});
app.use('/uploads',
  require('./middleware/auth').requireAdmin,
  express.static(path.join(__dirname, 'data/uploads'))
);

// ── API Routes ────────────────────────────────────────────
app.use('/api/enquiry', enquiryRouter);
app.use('/api/admin',   adminRouter);

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const db = getDb();
  const n  = db.prepare('SELECT COUNT(*) as n FROM enquiries').get().n;
  res.json({ status: 'ok', version: '1.0.0', enquiries: n,
             time: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});

// ── Admin SPA ─────────────────────────────────────────────
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, 'views/admin.html')));
app.get('/admin/*', (req, res) =>
  res.sendFile(path.join(__dirname, 'views/admin.html')));

// ── Main site ─────────────────────────────────────────────
app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, 'public/index.html')));

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ── Error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ error: 'File too large' });
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error' : err.message
  });
});

async function ensureAdminAccount() {
  const db = getDb();
  const email = process.env.ADMIN_EMAIL || 'admin@aquaverite.com';
  const password = process.env.ADMIN_PASSWORD || 'ReplaceWithStrongRandomPassword!';
  const hash = await bcrypt.hash(password, 12);
  const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(email);

  if (!existing) {
    db.prepare('INSERT INTO admins (email, password, name) VALUES (?, ?, ?)')
      .run(email, hash, 'Aqua Vérité Admin');
    console.log('  ✓ Default admin account created');
    return;
  }

  db.prepare('UPDATE admins SET password = ?, name = ? WHERE id = ?')
    .run(hash, 'Aqua Vérité Admin', existing.id);
  console.log('  ✓ Admin password ensured');
}

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log('\n  ╔═══════════════════════════════════╗');
  console.log('  ║      Aqua Vérité Server           ║');
  console.log('  ╠═══════════════════════════════════╣');
  console.log('  ║  Port  : ' + PORT);
  console.log('  ║  Env   : ' + (process.env.NODE_ENV || 'development'));
  console.log('  ║  Site  : http://localhost:' + PORT);
  console.log('  ║  Admin : http://localhost:' + PORT + '/admin');
  console.log('  ║  Health: http://localhost:' + PORT + '/api/health');
  console.log('  ╚═══════════════════════════════════╝\n');
  getDb();
  await ensureAdminAccount();
  console.log('  ✓ Database initialised\n');
});

module.exports = app;
