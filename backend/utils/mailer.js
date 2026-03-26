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

const sendOTPEmail = async (toEmail, otp, name = '') => {
  const mailOptions = {
    from: `"PlacePro" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: 'PlacePro — Password Reset OTP',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f1117;border-radius:12px;color:#e2e8f0">
        <div style="font-size:1.4rem;font-weight:800;color:#3b82f6;margin-bottom:24px">PlacePro</div>
        <p style="color:#94a3b8;margin-bottom:8px">Hi ${name || 'Student'},</p>
        <p style="color:#e2e8f0;margin-bottom:24px">Your OTP for password reset is:</p>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
          <span style="font-size:2.5rem;font-weight:800;letter-spacing:0.3em;color:#3b82f6">${otp}</span>
        </div>
        <p style="color:#64748b;font-size:0.875rem">Expires in <strong style="color:#94a3b8">10 minutes</strong>. Do not share it with anyone.</p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};

const sendJobReminderEmail = async (toEmail, name, jobTitle, company, deadline) => {
  const mailOptions = {
    from: `"PlacePro Placements" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: `Reminder: Apply for ${jobTitle} at ${company}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f1117;border-radius:12px;color:#e2e8f0">
        <div style="font-size:1.4rem;font-weight:800;color:#3b82f6;margin-bottom:24px">PlacePro</div>
        <p style="color:#94a3b8;margin-bottom:8px">Hi ${name},</p>
        <p style="color:#e2e8f0;margin-bottom:16px">You haven't applied yet for:</p>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px 20px;margin-bottom:20px">
          <div style="font-size:1.1rem;font-weight:700;color:#3b82f6">${jobTitle}</div>
          <div style="color:#94a3b8;font-size:0.875rem">${company}</div>
          ${deadline ? `<div style="color:#f59e0b;font-size:0.8rem;margin-top:8px">Deadline: ${new Date(deadline).toLocaleDateString()}</div>` : ''}
        </div>
        <p style="color:#64748b;font-size:0.875rem">Login to PlacePro to apply before the deadline.</p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail, sendJobReminderEmail };
