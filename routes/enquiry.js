// routes/enquiry.js
// FIX: Accept JSON body (not multipart) for the main form submission.
// File uploads are a separate optional endpoint.

const express   = require('express');
const router    = express.Router();
const crypto    = require('crypto');
const { body, validationResult } = require('express-validator');
const { getDb, transaction } = require('../db/database');
const { sendEnquiryConfirmation, sendAdminAlert } = require('../services/email');
const rateLimit = require('express-rate-limit');
const { upload } = require('../middleware/upload');

const { uploadToSupabase } = require('../services/supabase');

// Rate limit: 5 submissions per 15 min per IP
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many submissions. Please wait a few minutes and try again.' }
});

function isValidDateInput(value) {
  if (!value) return true;
  const trimmed = String(value).trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  const alt = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(trimmed);
  if (!iso && !alt) return false;

  const parts = iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])] : [Number(alt[3]), Number(alt[2]), Number(alt[1])];
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) return false;

  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

const allowedGuestCounts = [
  'Under 100 guests',
  '100–300 guests',
  '300–600 guests',
  '600–1000 guests',
  'Over 1000 guests'
];

const allowedBottleSizes = [
  '250 ml - The Petite',
  '330 ml - The Classic',
  '500 ml - The Grand',
  '750 ml - The Prestige',
  'Consultation first'
];

function normalizeBottleSize(value) {
  if (!value) return '';
  const trimmed = String(value).trim().replace(/\s+/g, ' ').replace(/[–—−]/g, '-');
  const lower = trimmed.toLowerCase();
  if (/250/.test(lower) && /ml/.test(lower)) return '250 ml - The Petite';
  if (/330/.test(lower) && /ml/.test(lower)) return '330 ml - The Classic';
  if (/500/.test(lower) && /ml/.test(lower)) return '500 ml - The Grand';
  if (/750/.test(lower) && /ml/.test(lower)) return '750 ml - The Prestige';
  if (/consultation/i.test(lower)) return 'Consultation first';
  return trimmed;
}

// Validation rules
const submitRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 120 }).withMessage('Name must be between 2 and 120 characters').matches(/^[A-Za-zÀ-ÿ .,'-]+$/u).withMessage('Name can only contain letters, spaces, periods, apostrophes and hyphens'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ min: 7, max: 30 }).withMessage('Phone must be between 7 and 30 characters').matches(/^[0-9+\-() ]+$/).withMessage('Phone can only contain numbers, spaces, +, -, or parentheses'),
  body('wedding_date').optional({ checkFalsy: true }).trim().custom(value => {
    if (!value) return true;
    return isValidDateInput(value);
  }).withMessage('Please enter a valid wedding date'),
  body('guest_count').trim().notEmpty().withMessage('Please choose an estimated guest count').isIn(allowedGuestCounts).withMessage('Please choose a valid guest count'),
  body('bottle_size').trim().customSanitizer(value => normalizeBottleSize(value)).notEmpty().withMessage('Please choose a bottle size').isIn(allowedBottleSizes).withMessage('Please choose a valid bottle size'),
  body('engraving_text').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Engraving text is too long').custom(value => !/[<>]/.test(value)).withMessage('Engraving text contains unsupported characters'),
  body('cap_finish').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
  body('vision').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }).withMessage('Vision notes are too long').custom(value => !/[<>]/.test(value)).withMessage('Vision notes contain unsupported characters'),
  body('script_choice').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Script choice is too long'),
  body('palette').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Palette details are too long'),
  body('packaging').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Packaging choice is too long'),
  body('custom_message').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Custom message is too long').custom(value => !/[<>]/.test(value)).withMessage('Custom message contains unsupported characters'),
];

function genRef() {
  const year = new Date().getFullYear();
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
  return `AV-${year}-${token}`;
}

// ── POST /api/enquiry — multipart/form-data with attachments ─────────────────────────
router.post(
  '/',
  submitLimiter,
  upload.array('attachments', 6),
  submitRules,
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const {
    name, email, phone, wedding_date, guest_count,
    bottle_size, engraving_text, cap_finish, vision,
    script_choice, palette, packaging, custom_message
  } = req.body;
  const normalizedBottleSize = normalizeBottleSize(bottle_size);
  const attachments = Array.isArray(req.files) ? req.files : [];

  const db  = getDb();
  const ref = genRef();
  let enquiryId;

  try {
    await transaction(async (tx) => {
      const result = await tx.query(`
        INSERT INTO enquiries
          (ref, name, email, phone, wedding_date, guest_count,
           bottle_size, engraving_text, cap_finish, vision,
           script_choice, palette, packaging, custom_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
        ref, name, email,
        phone        || null,
        wedding_date || null,
        guest_count  || null,
        normalizedBottleSize || null,
        engraving_text || null,
        cap_finish   || 'Gold',
        vision       || null,
        script_choice || null,
        palette || null,
        packaging || null,
        custom_message || null
      ]);
      enquiryId = result.rows[0].id;

      if (attachments.length) {
        const insertFile = 'INSERT INTO uploads (enquiry_id, filename, original_name, mime_type, size_bytes, storage_url) VALUES ($1, $2, $3, $4, $5, $6)';
        for (const file of attachments) {
          const uploaded = await uploadToSupabase(file);
          await tx.query(insertFile, [
            enquiryId,
            uploaded.storagePath,
            file.originalname,
            file.mimetype,
            file.size,
            uploaded.storageUrl
          ]);
        }
      }

      await tx.query(
        `INSERT INTO activity_log (enquiry_id, action, detail, ip)
         VALUES ($1, $2, $3, $4)`,
        [enquiryId, 'enquiry_submitted', `New enquiry from ${name}`, req.ip]
      );
    });
  } catch (dbErr) {
    console.error('[DB error]', dbErr.message);
    return res.status(500).json({ error: 'Could not save enquiry. Please try again.' });
  }

  // Send emails (non-blocking — don't fail the request if email fails)
  try {
    const customisationSummary = [script_choice, palette, packaging, custom_message, vision].filter(Boolean).join(' | ');
    await Promise.all([
      sendEnquiryConfirmation({ name, email, ref, bottle_size: normalizedBottleSize, wedding_date, vision: customisationSummary }),
      sendAdminAlert({ name, email, ref, bottle_size: normalizedBottleSize, engraving_text, guest_count, vision: customisationSummary, wedding_date })
    ]);
    await db.query(
      `INSERT INTO email_log (enquiry_id, to_email, subject, status) VALUES ($1, $2, $3, $4)`,
      [enquiryId, email, 'Enquiry confirmation', 'sent']
    );
  } catch (emailErr) {
    console.warn('[Email warning]', emailErr.message);
    await db.query(
      `INSERT INTO email_log (enquiry_id, to_email, subject, status, error) VALUES ($1, $2, $3, $4, $5)`,
      [enquiryId, email, 'Enquiry confirmation', 'failed', emailErr.message]
    );
    // Continue — enquiry is saved even if email fails
  }

  return res.status(201).json({
    success: true,
    ref,
    message: `Thank you, ${name}. Your consultation request (${ref}) has been received. We will be in touch within 24 hours.`
  });
});

const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait before checking again.' }
});

// ── GET /api/enquiry/track/:ref ───────────────────────────
router.get('/track/:ref', trackLimiter, async (req, res) => {
  const db  = getDb();
  const row = (await db.query(
    'SELECT ref, name, status, created_at, bottle_size FROM enquiries WHERE ref = $1',
    [req.params.ref]
  )).rows[0];
  if (!row) return res.status(404).json({ error: 'Enquiry not found' });
  return res.json(row);
});

module.exports = router;
