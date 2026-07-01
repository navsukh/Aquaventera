// middleware/auth.js
const jwt = require('jsonwebtoken');
const SECRET = () => process.env.JWT_SECRET;

function requireAdmin(req, res, next) {
  // JWT is stored as an httpOnly cookie named auth_token
  const token = req.cookies?.auth_token;

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
