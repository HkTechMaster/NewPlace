const Notification = require('../models/Notification');

// Create notification + send email to multiple students
const notifyStudents = async ({ studentIds, type, title, message, jobId = null, driveId = null, sendEmail = true, emailSubject = null }) => {
  try {
    if (!studentIds.length) return;

    // Create in-app notifications
    const notifications = studentIds.map(id => ({
      recipient: id,
      type,
      title,
      message,
      jobId,
      driveId,
    }));
    await Notification.insertMany(notifications);

    // Send emails
    if (sendEmail) {
      const Student = require('../models/Student');
      const { sendEmailToStudent } = require('./mailer');
      const students = await Student.find({ _id: { $in: studentIds }, status: 'active' }).select('name email');
      for (const s of students) {
        if (!s.email) continue;
        try {
          await sendEmailToStudent(s.email, s.name, emailSubject || title, message);
        } catch (e) { console.error(`Email failed for ${s.email}:`, e.message); }
      }
    }
  } catch (e) { console.error('notifyStudents error:', e.message); }
};

module.exports = { notifyStudents };
