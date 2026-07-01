// services/email.js — Nodemailer transporter + email templates
const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ── Client confirmation email ──────────────────────────────
async function sendEnquiryConfirmation({ name, email, ref, bottle_size, wedding_date }) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || '"Aqua Verite" <hello@aquaverite.com>',
    to:      email,
    subject: `Your Enquiry Has Been Received — ${ref}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Georgia', serif; background: #0A0A0A; color: #FAF7F2; margin: 0; padding: 40px 20px; }
    .wrap { max-width: 560px; margin: 0 auto; }
    .logo { font-size: 26px; font-weight: 300; letter-spacing: 0.1em; color: #C9A84C; margin-bottom: 36px; }
    .rule { border: none; border-top: 1px solid rgba(201,168,76,0.25); margin: 28px 0; }
    h2 { font-weight: 300; font-size: 22px; line-height: 1.4; margin-bottom: 14px; }
    p { font-family: 'Helvetica Neue', sans-serif; font-size: 13px; line-height: 2; color: rgba(250,247,242,0.65); margin: 0 0 12px; }
    .ref { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #C9A84C; padding: 14px 20px; border: 1px solid rgba(201,168,76,0.25); display: inline-block; margin: 16px 0; }
    .detail { background: rgba(201,168,76,0.05); border-left: 2px solid #C9A84C; padding: 16px 20px; margin: 20px 0; }
    .detail p { margin: 4px 0; }
    .footer { font-size: 10px; letter-spacing: 0.15em; color: rgba(250,247,242,0.25); margin-top: 40px; }
  </style>
</head>
<body>
  <div class="wrap">
    <p class="logo">Aqua Vèntèra</p>
    <hr class="rule">
    <h2>Dear ${name},</h2>
    <p>We have received your consultation request and are honoured by your interest. Our atelier team will review your enquiry and be in touch within <strong style="color:#C9A84C">24 hours</strong>.</p>
    <div class="ref">Reference: ${ref}</div>
    <div class="detail">
      ${bottle_size ? `<p><strong style="color:#C9A84C">Bottle:</strong> ${bottle_size}</p>` : ''}
      ${wedding_date ? `<p><strong style="color:#C9A84C">Wedding Date:</strong> ${wedding_date}</p>` : ''}
    </div>
    <p>In the meantime, if you have any questions or additional inspiration to share, please reply to this email or reach us on WhatsApp.</p>
    <hr class="rule">
    <p class="footer">Aqua Vèntèra · Bespoke Hydration · Every bottle tells a story</p>
  </div>
</body>
</html>
    `.trim()
  });
}

// ── Internal admin alert email ─────────────────────────────
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendAdminAlert({ name, email, ref, bottle_size, engraving_text, guest_count, vision, wedding_date }) {
  const transporter = createTransporter();
  const adminEmail = process.env.EMAIL_TO || process.env.SMTP_USER;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || '"Aqua Verite" <hello@aquaverite.com>',
    to:      adminEmail,
    subject: `New Enquiry ${ref} — ${name} — ${bottle_size || 'Size TBD'}`,
    html: `
<div style="font-family:sans-serif;max-width:600px;padding:24px;background:#111;color:#FAF7F2;">
  <h2 style="color:#C9A84C;font-weight:300;">New Consultation Request</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <tr><td style="padding:8px;color:rgba(255,255,255,.5);border-bottom:1px solid rgba(255,255,255,.06);">Ref</td><td style="padding:8px;font-weight:bold;color:#C9A84C">${ref}</td></tr>
    <tr><td style="padding:8px;color:rgba(255,255,255,.5);border-bottom:1px solid rgba(255,255,255,.06);">Name</td><td style="padding:8px;">${name}</td></tr>
    <tr><td style="padding:8px;color:rgba(255,255,255,.5);border-bottom:1px solid rgba(255,255,255,.06);">Email</td><td style="padding:8px;"><a href="mailto:${escapeHtml(email)}" style="color:#C9A84C">${escapeHtml(email)}</a></td></tr>
    <tr><td style="padding:8px;color:rgba(255,255,255,.5);border-bottom:1px solid rgba(255,255,255,.06);">Wedding Date</td><td style="padding:8px;">${wedding_date || '—'}</td></tr>
    <tr><td style="padding:8px;color:rgba(255,255,255,.5);border-bottom:1px solid rgba(255,255,255,.06);">Guest Count</td><td style="padding:8px;">${guest_count || '—'}</td></tr>
    <tr><td style="padding:8px;color:rgba(255,255,255,.5);border-bottom:1px solid rgba(255,255,255,.06);">Bottle Size</td><td style="padding:8px;">${bottle_size || '—'}</td></tr>
    <tr><td style="padding:8px;color:rgba(255,255,255,.5);border-bottom:1px solid rgba(255,255,255,.06);">Engraving</td><td style="padding:8px;">${engraving_text || '—'}</td></tr>
    <tr><td style="padding:8px;color:rgba(255,255,255,.5);">Vision</td><td style="padding:8px;">${vision || '—'}</td></tr>
  </table>
</div>
    `.trim()
  });
}

async function sendDesignProofEmail({ name, email, ref, uuid, proofUrl }) {
  const transporter = createTransporter();
  const safeUrl = escapeHtml(proofUrl);
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || '"Aqua Verite" <hello@aquaverite.com>',
    to:      email,
    subject: `Your design proof is ready — ${ref}`,
    html: `
<div style="font-family:sans-serif;max-width:600px;padding:24px;background:#111;color:#FAF7F2;">
  <h2 style="color:#C9A84C;font-weight:300;">Your design proof is ready.</h2>
  <p>Dear ${escapeHtml(name)},</p>
  <p>Our design team has prepared the initial proof for your bespoke Aqua Vèntèra collection. Please review the engraving, cap finish, and packaging using the link below.</p>
  <p><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#C9A84C;color:#07070A;text-decoration:none;font-weight:600;">View Your Design Proof →</a></p>
  <p style="margin-top:24px;">Once you have reviewed the proof, simply reply to this email with your feedback. We will revise until it is exactly right — because this is permanent in glass.</p>
  <p style="color:rgba(250,247,242,0.4);font-size:11px;">Reference: <strong style="color:#C9A84C;">${ref}</strong></p>
</div>
    `.trim(),
    text: `Dear ${name},\n\nYour design proof is ready. Please review it at: ${proofUrl}\n\nAqua Vèntèra`,
  });
}

module.exports = { sendEnquiryConfirmation, sendAdminAlert, sendDesignProofEmail };
