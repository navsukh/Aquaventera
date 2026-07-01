const crypto = require('crypto');

const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'x-csrf-token';

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

function csrfCookieOptions(req) {
  return {
    httpOnly: false,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    sameSite: 'Strict',
    path: '/'
  };
}

function ensureCsrfToken(req, res, next) {
  let token = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = generateCsrfToken();
    res.cookie(CSRF_COOKIE, token, csrfCookieOptions(req));
  }
  req.csrfToken = token;
  next();
}

function getCsrfToken(req, res) {
  const token = req.csrfToken || ensureCsrfToken(req, res, () => {});
  return res.json({ csrfToken: token });
}

function validateCsrf(req, res, next) {
  const headerToken = req.get(CSRF_HEADER);
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}

module.exports = { getCsrfToken, validateCsrf, ensureCsrfToken };
