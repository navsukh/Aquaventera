// middleware/auth.js
const jwt = require('jsonwebtoken');
const SECRET = () => process.env.JWT_SECRET || 'dev_secret_change_me';

function requireAdmin(req, res, next) {
  // Check Authorization header first, then session
  let token = null;
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    token = auth.slice(7).trim();
  } else if (req.session && req.session.adminToken) {
    token = req.session.adminToken;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorised — please log in' });
  }

  try {
    req.admin = jwt.verify(token, SECRET());
    next();
  } catch (err) {
    return res.status(401).json({
      error: err.name === 'TokenExpiredError'
        ? 'Session expired — please log in again'
        : 'Invalid token — please log in again'
    });
  }
}

module.exports = { requireAdmin };
