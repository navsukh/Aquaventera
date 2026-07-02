require('dotenv').config();

// Ensure required secrets are set at startup
if (!process.env.JWT_SECRET) {
  console.error('FATAL: Missing required environment variables.');
  console.error('JWT_SECRET must be set.');
  process.exit(1);
}

// In production require BASE_URL to be explicitly set; used for CORS whitelist
if (process.env.NODE_ENV === 'production' && !process.env.BASE_URL) {
  console.error('FATAL: NODE_ENV=production requires BASE_URL to be set.');
  process.exit(1);
}

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const compression  = require('compression');
const cookieParser = require('cookie-parser');
const path         = require('path');
const rateLimit    = require('express-rate-limit');

const enquiryRouter = require('./routes/enquiry');
const adminRouter   = require('./routes/admin');
const { getDb, initDb } = require('./db/database');

const bcrypt = require('bcryptjs');

const app  = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

app.disable('x-powered-by');
app.set('trust proxy', 1);

// ── Security — CSP relaxed for inline scripts (admin dashboard + main site)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrc:  ["'self'", "'sha256-2428bc30d43d09289377ea0a9c4c0a7843c15aa69463bae3ddca99c65fdcf21'"],
      scriptSrcElem: ["'self'"],
      scriptSrcAttr: ["'self'"],
      styleSrc: [
  "'self'",
  "'unsafe-inline'",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com"
],
      fontSrc:    ["'self'", "https://fonts.gstatic.com"],
      imgSrc:     ["'self'", "data:", "blob:", "https://*.supabase.co", "https://*.supabase.in"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://*.supabase.in"],
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

// Configure CORS: only allow explicit BASE_URL in production; in dev allow all but without credentials
const BASE_URL = process.env.BASE_URL;
if (BASE_URL) {
  app.use(cors({
    origin: function (origin, callback) {
      // allow requests with no origin (curl, native mobile)
      if (!origin) return callback(null, true);
      if (origin === BASE_URL) return callback(null, true);
      return callback(null, false);
    },
    credentials: true
  }));
} else {
  // Development: be permissive for convenience but do NOT allow credentials with wildcard
  app.use(cors({ origin: true, credentials: false }));
}

app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cookieParser());

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

// Convert CORS origin rejection into a 403 when the origin is not allowed.
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Not allowed by CORS' });
  }
  next(err);
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
app.get('/uploads/:filename', require('./middleware/auth').requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const row = (await db.query('SELECT storage_url, original_name, mime_type FROM uploads WHERE filename = $1', [req.params.filename])).rows[0];
    const storageUrl = row?.storage_url || (/^https?:\/\//i.test(req.params.filename) ? req.params.filename : null);

    if (!storageUrl) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.set('Content-Disposition', `inline; filename="${encodeURIComponent(row?.original_name || req.params.filename)}"`);
    return res.redirect(storageUrl);
  } catch (err) {
    console.error('[Upload proxy error]', err);
    return res.status(500).json({ error: 'Unable to fetch file' });
  }
});

// ── API Routes ────────────────────────────────────────────
app.use('/api/enquiry', enquiryRouter);
app.use('/api/admin',   adminRouter);

// ── Health check ──────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT COUNT(*) as n FROM enquiries');
    const n = Number(result.rows[0].n);
    const response = {
      status: 'ok',
      version: '1.0.0',
      enquiries: n,
      time: new Date().toISOString()
    };
    if (process.env.NODE_ENV !== 'production') {
      response.env = process.env.NODE_ENV || 'development';
    }
    res.json(response);
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      version: '1.0.0',
      error: 'Database unavailable',
      time: new Date().toISOString()
    });
  }
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

  console.error('[Error]', err);
  const payload = {
    error: process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message || 'Internal server error'
  };
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.stack = err.stack;
  }
  res.status(err.status || 500).json(payload);
});

async function ensureAdminAccount() {
  const db = getDb();
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  try {
    const existing = email ? (await db.query('SELECT id FROM admins WHERE email = $1', [email])).rows[0] : null;

    if (!existing) {
      if (!email || !password) {
        console.warn('ADMIN_EMAIL and ADMIN_PASSWORD not set; skipping default admin creation.');
        return;
      }
      const hash = await bcrypt.hash(password, 12);
      await db.query('INSERT INTO admins (email, password, name) VALUES ($1, $2, $3)', [email, hash, 'Aqua Vèntèra Admin']);
      console.log('  ✓ Default admin account created');
      return;
    }

    if (password) {
      const hash = await bcrypt.hash(password, 12);
      await db.query('UPDATE admins SET password = $1, name = $2 WHERE id = $3', [hash, 'Aqua Vèntèra Admin', existing.id]);
      console.log('  ✓ Admin password ensured');
    } else {
      console.log('  ✓ Admin exists; no ADMIN_PASSWORD provided so password not updated');
    }
  } catch (err) {
    console.warn('[DB] Admin bootstrap skipped because the database is unavailable.', err.message);
  }
}

// ── Start ─────────────────────────────────────────────────
async function startServer() {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.warn(`[Startup] Port ${PORT} is already in use; reusing existing server instance.`);
        resolve(null);
        return;
      }
      reject(err);
    };

    const server = app.listen(PORT, async () => {
      console.log('\n  ╔═══════════════════════════════════╗');
      console.log('  ║      Aqua Vèntèra Server           ║');
      console.log('  ╠═══════════════════════════════════╣');
      console.log('  ║  Port  : ' + PORT);
      console.log('  ║  Env   : ' + (process.env.NODE_ENV || 'development'));
      console.log('  ║  Site  : http://localhost:' + PORT);
      console.log('  ║  Admin : http://localhost:' + PORT + '/admin');
      console.log('  ║  Health: http://localhost:' + PORT + '/api/health');
      console.log('  ╚═══════════════════════════════════╝\n');
      try {
        await initDb();
        await ensureAdminAccount();
        console.log('  ✓ Database initialised\n');
      } catch (err) {
        console.warn('[DB] Startup initialization failed:', err.message);
      }
      resolve(server);
    });

    server.on('error', onError);
  });
}

if (require.main === module || process.env.NODE_ENV === 'test') {
  startServer().catch((err) => {
    console.error('[Startup] Failed to start server:', err);
    process.exit(1);
  });
}
app.use('/api', require('./routes/security'));

module.exports = app;
module.exports.startServer = startServer;
