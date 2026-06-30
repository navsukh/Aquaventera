// server/mailer.js — Nodemailer email service
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

// ── Shared HTML wrapper (luxury brand feel) ──────────────
function wrapEmail(content) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@300;400&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:#0A0A0D;font-family:'Montserrat',Arial,sans-serif;color:#FAF7F2;}
  .shell{max-width:600px;margin:0 auto;background:#0A0A0D;}
  .header{padding:40px 48px 32px;border-bottom:1px solid rgba(201,168,76,0.2);text-align:center;}
  .brand{font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;font-weight:300;letter-spacing:0.12em;color:#FAF7F2;}
  .brand em{color:#C9A84C;font-style:normal;}
  .tagline{font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:rgba(201,168,76,0.5);margin-top:8px;}
  .body{padding:44px 48px;}
  .gold-rule{width:40px;height:1px;background:linear-gradient(to right,transparent,#C9A84C,transparent);margin:28px auto;}
  h1{font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;font-weight:300;line-height:1.2;color:#FAF7F2;margin-bottom:16px;}
  p{font-size:13px;line-height:2;color:rgba(250,247,242,0.62);margin-bottom:16px;}
  .detail-box{background:#161618;border:1px solid rgba(201,168,76,0.12);padding:24px 28px;margin:24px 0;}
  .detail-row{display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-bottom:1px solid rgba(201,168,76,0.06);}
  .detail-row:last-child{border:none;}
  .detail-lbl{font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(201,168,76,0.55);}
  .detail-val{font-size:13px;color:#FAF7F2;text-align:right;max-width:60%;}
  .cta-btn{display:inline-block;margin:24px 0 0;padding:14px 36px;background:#C9A84C;color:#07070A;font-size:9px;font-family:'Montserrat',Arial,sans-serif;letter-spacing:0.26em;text-transform:uppercase;text-decoration:none;font-weight:500;}
  .footer{padding:28px 48px;border-top:1px solid rgba(201,168,76,0.1);text-align:center;}
  .foot-p{font-size:10px;color:rgba(250,247,242,0.25);letter-spacing:0.06em;line-height:2;}
  .gold{color:#C9A84C;}
</style></head>
<body><div class="shell">
  <div class="header">
    <p class="brand">Aqua <em>Vérité</em></p>
    <p class="tagline">Bespoke Hydration · Est. for the Discerning</p>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p class="foot-p">© Aqua Vérité · Crafted with intention · No two bottles are the same</p>
    <p class="foot-p" style="margin-top:6px;"><a href="{{BASE_URL}}" style="color:#C9A84C;text-decoration:none;">{{BASE_URL}}</a></p>
  </div>
</div></body></html>`;
}

// ── Email templates ──────────────────────────────────────

function buildWelcomeEmail(data) {
  const html = wrapEmail(`
    <h1>Your enquiry has been received.</h1>
    <div class="gold-rule"></div>
    <p>Dear ${data.full_name},</p>
    <p>Thank you for reaching out to Aqua Vérité. We have received your enquiry and our design team will be in touch within 24 hours to begin the conversation about your bespoke collection.</p>
    <div class="detail-box">
      ${data.wedding_date ? `<div class="detail-row"><span class="detail-lbl">Wedding Date</span><span class="detail-val">${data.wedding_date}</span></div>` : ''}
      ${data.guest_count  ? `<div class="detail-row"><span class="detail-lbl">Guest Count</span><span class="detail-val">${data.guest_count}</span></div>` : ''}
      ${data.bottle_size  ? `<div class="detail-row"><span class="detail-lbl">Bottle Size</span><span class="detail-val">${data.bottle_size}</span></div>` : ''}
      ${data.engraving_text ? `<div class="detail-row"><span class="detail-lbl">Engraving</span><span class="detail-val">${data.engraving_text}</span></div>` : ''}
    </div>
    <p>While you wait, feel free to explore our collection and gather any additional inspiration — images, fabric swatches, colour references — that you'd like us to consider when designing your bottles.</p>
    <p style="color:rgba(250,247,242,0.4);font-size:11px;">Your reference number: <span class="gold">#AV-${data.uuid.slice(0,8).toUpperCase()}</span></p>
  `).replace(/\{\{BASE_URL\}\}/g, process.env.BASE_URL || 'https://aquaverite.com');

  return {
    subject: `Aqua Vérité — We've received your enquiry · #AV-${data.uuid.slice(0,8).toUpperCase()}`,
    html,
    text: `Dear ${data.full_name},\n\nThank you for your enquiry. Our team will be in touch within 24 hours.\n\nReference: #AV-${data.uuid.slice(0,8).toUpperCase()}\n\nAqua Vérité`,
  };
}

function buildAdminNotificationEmail(data) {
  const html = wrapEmail(`
    <h1>New Enquiry Received</h1>
    <div class="gold-rule"></div>
    <p>A new commission enquiry has arrived through the website.</p>
    <div class="detail-box">
      <div class="detail-row"><span class="detail-lbl">Name</span><span class="detail-val">${data.full_name}</span></div>
      <div class="detail-row"><span class="detail-lbl">Email</span><span class="detail-val">${data.email}</span></div>
      ${data.phone ? `<div class="detail-row"><span class="detail-lbl">Phone</span><span class="detail-val">${data.phone}</span></div>` : ''}
      ${data.wedding_date ? `<div class="detail-row"><span class="detail-lbl">Wedding Date</span><span class="detail-val">${data.wedding_date}</span></div>` : ''}
      ${data.guest_count  ? `<div class="detail-row"><span class="detail-lbl">Guests</span><span class="detail-val">${data.guest_count}</span></div>` : ''}
      ${data.venue_city   ? `<div class="detail-row"><span class="detail-lbl">City</span><span class="detail-val">${data.venue_city}</span></div>` : ''}
      ${data.bottle_size  ? `<div class="detail-row"><span class="detail-lbl">Size</span><span class="detail-val">${data.bottle_size}</span></div>` : ''}
      ${data.cap_finish   ? `<div class="detail-row"><span class="detail-lbl">Cap Finish</span><span class="detail-val">${data.cap_finish}</span></div>` : ''}
      ${data.engraving_text ? `<div class="detail-row"><span class="detail-lbl">Engraving</span><span class="detail-val">${data.engraving_text}</span></div>` : ''}
    </div>
    ${data.vision_notes ? `<p><strong style="color:#C9A84C;">Vision Notes:</strong><br/>${data.vision_notes}</p>` : ''}
    <a href="${process.env.BASE_URL}/admin/enquiry/${data.uuid}" class="cta-btn">View in Admin Panel →</a>
    <p style="font-size:10px;color:rgba(250,247,242,0.3);margin-top:16px;">Ref: #AV-${data.uuid.slice(0,8).toUpperCase()}</p>
  `).replace(/\{\{BASE_URL\}\}/g, process.env.BASE_URL || 'https://aquaverite.com');

  return {
    subject: `🔔 New Enquiry — ${data.full_name} · ${data.guest_count || '?'} guests · ${data.bottle_size || '?'}`,
    html,
    text: `New enquiry from ${data.full_name} (${data.email})\nRef: #AV-${data.uuid.slice(0,8).toUpperCase()}`,
  };
}

function buildDesignProofEmail(data, proofUrl) {
  const html = wrapEmail(`
    <h1>Your design proof is ready.</h1>
    <div class="gold-rule"></div>
    <p>Dear ${data.full_name},</p>
    <p>Our design team has prepared the initial proof for your bespoke Aqua Vérité collection. Please review the engraving, cap finish, and packaging below.</p>
    ${proofUrl ? `<a href="${proofUrl}" class="cta-btn">View Your Design Proof →</a>` : ''}
    <p style="margin-top:24px;">Once you have reviewed the proof, simply reply to this email with your feedback. We will revise until it is exactly right — because this is permanent in glass.</p>
    <p style="color:rgba(250,247,242,0.4);font-size:11px;">Reference: <span class="gold">#AV-${data.uuid.slice(0,8).toUpperCase()}</span></p>
  `).replace(/\{\{BASE_URL\}\}/g, process.env.BASE_URL || 'https://aquaverite.com');

  return {
    subject: `Aqua Vérité — Your design proof is ready · #AV-${data.uuid.slice(0,8).toUpperCase()}`,
    html,
    text: `Dear ${data.full_name},\n\nYour design proof is ready. Please review it at: ${proofUrl}\n\nAqua Vérité`,
  };
}

// ── Send function ─────────────────────────────────────────
async function sendMail({ to, subject, html, text }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[MAILER] SMTP not configured — email skipped:', subject);
    return { skipped: true };
  }
  try {
    const info = await getTransporter().sendMail({
      from: `"${process.env.BRAND_NAME || 'Aqua Vérité'}" <${process.env.SMTP_USER}>`,
      to, subject, html, text,
    });
    console.log('[MAILER] Sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('[MAILER] Error:', err.message);
    throw err;
  }
}

module.exports = { sendMail, buildWelcomeEmail, buildAdminNotificationEmail, buildDesignProofEmail };
