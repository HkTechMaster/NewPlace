const mongoose = require('mongoose');

const studentListSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  coordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'Coordinator', required: true },
  coordinatorName: { type: String, default: '' },
  skillFaculty: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillFaculty', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  courseName: { type: String, default: '' },
  courseCode: { type: String, default: '' },
  batch: { type: String, required: true },
  students: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    name: String,
    email: String,
    enrollmentNo: String,
    semester: Number,
    photo: String,
    cvId: { type: mongoose.Schema.Types.ObjectId, ref: 'CV', default: null },
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rejectionReason: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Chairperson', default: null },
  reviewedAt: { type: Date, default: null },
  // Inbox management — chairperson can remove from inbox
  removedFromInbox: { type: Boolean, default: false },
  sentAt: { type: Date, default: Date.now },
}, { timestamps: true, collection: 'studentlists' });

module.exports = mongoose.model('StudentList', studentListSchema);
