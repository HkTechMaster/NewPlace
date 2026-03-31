const mongoose = require('mongoose');

const staffNotificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true },
    recipientModel: {
      type: String,
      enum: ['PlacementOfficer', 'Chairperson'],
      required: true,
    },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'student_applied',
        'student_withdrew',
        'list_approved',
        'list_rejected',
        'list_submitted',
        'po_message',
        'dean_update',
      ],
      required: true,
    },
    isRead:   { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StaffNotification', staffNotificationSchema);
