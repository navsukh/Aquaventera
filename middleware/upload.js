// middleware/upload.js — Multer config for moodboard uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '../data/uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = ['image/jpeg','image/png','image/webp','image/gif','application/pdf'];
const MAX_MB = parseInt(process.env.UPLOAD_MAX_MB || '10');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type not allowed. Accepted: JPG, PNG, WEBP, GIF, PDF`));
  }
});

module.exports = { upload, UPLOAD_DIR };
