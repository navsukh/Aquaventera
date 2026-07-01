// middleware/upload.js — Multer config for moodboard uploads
const multer = require('multer');

const ALLOWED = ['image/jpeg','image/png','image/webp','image/gif','application/pdf'];
const MAX_MB = parseInt(process.env.UPLOAD_MAX_MB || '10');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type not allowed. Accepted: JPG, PNG, WEBP, GIF, PDF`));
  }
});

module.exports = { upload, ALLOWED, MAX_MB };
