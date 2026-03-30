const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Base email wrapper
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

// OTP Email
const sendOTPEmail = async (toEmail, otp, name = '') => {
  await transporter.sendMail({
    from: `"PlacePro" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: 'PlacePro — Password Reset OTP',
    html: baseHtml(`
      <p style="color:#94a3b8;margin-bottom:8px;">Hi ${name || 'Student'},</p>
      <p style="color:#e2e8f0;margin-bottom:24px;">Your OTP for password reset is:</p>
      <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
        <span style="font-size:2.5rem;font-weight:800;letter-spacing:0.3em;color:#3b82f6;">${otp}</span>
      </div>
      <p style="color:#64748b;font-size:0.875rem;">Expires in <strong style="color:#94a3b8;">10 minutes</strong>. Do not share it with anyone.</p>
    `),
  });
};

// Generic student email
const sendEmailToStudent = async (toEmail, name, subject, message) => {
  await transporter.sendMail({
    from: `"PlacePro Placements" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: `PlacePro — ${subject}`,
    html: baseHtml(`
      <p style="color:#94a3b8;margin-bottom:16px;">Hi ${name},</p>
      <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:20px;margin-bottom:20px;">
        <p style="color:#e2e8f0;margin:0;line-height:1.7;white-space:pre-line;">${message}</p>
      </div>
      <p style="color:#64748b;font-size:0.825rem;">Login to PlacePro to view more details.</p>
    `),
  });
};

// Job reminder email
const sendJobReminderEmail = async (toEmail, name, jobTitle, company, deadline) => {
  await transporter.sendMail({
    from: `"PlacePro Placements" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: `Reminder: Apply for ${jobTitle} at ${company}`,
    html: baseHtml(`
      <p style="color:#94a3b8;margin-bottom:8px;">Hi ${name},</p>
      <p style="color:#e2e8f0;margin-bottom:16px;">You haven't applied yet for:</p>
      <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <div style="font-size:1.1rem;font-weight:700;color:#3b82f6;">${jobTitle}</div>
        <div style="color:#94a3b8;font-size:0.875rem;">${company}</div>
        ${deadline ? `<div style="color:#f59e0b;font-size:0.8rem;margin-top:8px;">Deadline: ${new Date(deadline).toLocaleDateString()}</div>` : ''}
      </div>
      <p style="color:#64748b;font-size:0.875rem;">Login to PlacePro to apply before the deadline.</p>
    `),
  });
};

module.exports = { sendOTPEmail, sendEmailToStudent, sendJobReminderEmail };
