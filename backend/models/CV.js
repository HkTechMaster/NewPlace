const mongoose = require('mongoose');

const semesterResultSchema = new mongoose.Schema({
  semester: Number,
  cgpa: Number,
  reAttempts: { type: Number, default: 0 },
}, { _id: false });

const cvSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  title: { type: String, default: 'My CV' }, // student-given name

  // Personal
  name: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  altEmail: { type: String, trim: true, default: '' },
  altPhone: { type: String, trim: true, default: '' },
  photo: { type: String, default: '' },

  // Links
  linkedin: { type: String, default: '' },
  github: { type: String, default: '' },
  leetcode: { type: String, default: '' },
  otherLinks: [{ label: String, url: String }],

  // Education
  tenthSchool: { type: String, default: '' },
  tenthBoard: { type: String, default: '' },
  tenthPercent: { type: String, default: '' },
  tenthYear: { type: String, default: '' },
  tenthMarksheet: { type: String, default: '' },
  twelfthSchool: { type: String, default: '' },
  twelfthBoard: { type: String, default: '' },
  twelfthPercent: { type: String, default: '' },
  twelfthYear: { type: String, default: '' },
  twelfthMarksheet: { type: String, default: '' },
  graduationCourse: { type: String, default: '' },
  currentSemester: { type: Number, default: 1 },
  batch: { type: String, default: '' },
  semesterResults: [semesterResultSchema],
  overallCgpa: { type: Number, default: null },

  // Skills
  technicalSkills: [String],
  softSkills: [String],

  // Projects
  projects: [{
    title: String, description: String,
    startDate: String, endDate: String, link: String,
  }],

  // Work
  workExperience: [{
    company: String, role: String,
    startDate: String, endDate: String, description: String,
  }],

  // Achievements
  achievements: [{
    title: String, issuer: String, date: String, description: String,
  }],

  // Status per CV
  // draft | pending | verified | rejected
  status: { type: String, enum: ['draft','pending','verified','rejected'], default: 'draft' },
  rejectionReason: { type: String, default: '' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Coordinator', default: null },
  verifiedAt: { type: Date, default: null },
  submittedAt: { type: Date, default: null },

  // Reminder from coordinator
  reminderAt: { type: Date, default: null },
  reminderDismissed: { type: Boolean, default: false },

}, { timestamps: true, collection: 'cvs' });

module.exports = mongoose.model('CV', cvSchema);
