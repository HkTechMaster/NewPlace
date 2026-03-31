const nodemailer = require('nodemailer');
const StaffNotification = require('../models/StaffNotification');

// Same transporter config as mailer.js
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Same base HTML wrapper as mailer.js
const baseHtml = (content) => `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f1117;border-radius:12px;overflow:hidden;">
  <div style="background:#1e293b;padding:20px 28px;border-bottom:1px solid #334155;">
    <span style="font-size:1.3rem;font-weight:800;color:#3b82f6;letter-spacing:-0.02em;">PlacePro</span>
    <span style="font-size:0.75rem;color:#64748b;margin-left:10px;">Placement Management System</span>
  </div>
  <div style="padding:28px;">
    ${content}
  </div>
  <div style="padding:16px 28px;border-top:1px solid #1e293b;font-size:0.75rem;color:#475569;text-align:center;">
    This is an automated message from PlacePro. Please do not reply.
  </div>
</div>`;

const TYPE_ICONS = {
  student_applied:  '📥',
  student_withdrew: '↩️',
  list_approved:    '✅',
  list_rejected:    '❌',
  list_submitted:   '📋',
  po_message:       '💬',
  dean_update:      '🏫',
};

/**
 * Create in-app notification + send email to a staff member (PO or Chairperson)
 * DB save and email are FULLY SEPARATED — bell always works even if email fails.
 *
 * @param {Object} opts
 * @param {ObjectId} opts.recipientId
 * @param {'PlacementOfficer'|'Chairperson'} opts.recipientModel
 * @param {string}   opts.recipientEmail
 * @param {string}   opts.recipientName
 * @param {string}   opts.title
 * @param {string}   opts.message
 * @param {string}   opts.type
 * @param {Object}  [opts.metadata]
 */
async function notifyStaff({
  recipientId,
  recipientModel,
  recipientEmail,
  recipientName = '',
  title,
  message,
  type,
  metadata = {},
}) {
  // ── STEP 1: Save in-app notification to DB ──────────────────────────────
  // This is INDEPENDENT of email — bell always works even if email fails
  try {
    await StaffNotification.create({
      recipientId,
      recipientModel,
      title,
      message,
      type,
      metadata,
    });
  } catch (err) {
    console.error('[notifyStaff] DB save failed:', err.message);
    return; // if DB itself fails, stop here
  }

  // ── STEP 2: Send email separately ──────────────────────────────────────
  // Failure here does NOT affect the bell notification already saved above
  try {
    const icon = TYPE_ICONS[type] || '🔔';
    await transporter.sendMail({
      from: `"PlacePro" <${process.env.MAIL_USER}>`,
      to: recipientEmail,
      subject: `PlacePro — ${title}`,
      html: baseHtml(`
        <p style="color:#94a3b8;margin-bottom:8px;">Hi ${recipientName || 'there'},</p>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:20px;margin-bottom:20px;">
          <div style="font-size:1.5rem;margin-bottom:10px;">${icon}</div>
          <div style="font-size:1rem;font-weight:700;color:#e2e8f0;margin-bottom:8px;">${title}</div>
          <p style="color:#94a3b8;margin:0;line-height:1.7;white-space:pre-line;">${message}</p>
        </div>
        <p style="color:#64748b;font-size:0.825rem;">Login to PlacePro to view more details.</p>
      `),
    });
  } catch (err) {
    // Bell is already saved — just log the email failure, don't crash
    console.error('[notifyStaff] Email failed (bell was saved):', err.message);
  }
}

module.exports = notifyStaff;
