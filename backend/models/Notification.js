const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type: {
    type: String,
    enum: ['new_job','drive_schedule','round_result','offer_letter','application_confirmed','round_added'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  // References
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  driveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive', default: null },
}, { timestamps: true, collection: 'notifications' });

module.exports = mongoose.model('Notification', notificationSchema);
