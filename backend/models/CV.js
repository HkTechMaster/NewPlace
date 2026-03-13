const mongoose = require('mongoose');

const semesterResultSchema = new mongoose.Schema({
  semester: Number,
  cgpa: Number,
  reAttempts: { type: Number, default: 0 },
}, { _id: false });

const cvSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },

  // ── Personal (auto-filled + extras) ──
  name: { type: String, trim: true },
  email: { type: String, trim: true },
  phone: { type: String, trim: true },
  altEmail: { type: String, trim: true, default: '' },
  altPhone: { type: String, trim: true, default: '' },
  photo: { type: String, default: '' }, // base64

  // ── Links ──
  linkedin: { type: String, trim: true, default: '' },
  github:   { type: String, trim: true, default: '' },
  leetcode: { type: String, trim: true, default: '' },
  otherLinks: [{ label: String, url: String }],

  // ── Education ──
  tenthSchool:      { type: String, trim: true, default: '' },
  tenthBoard:       { type: String, trim: true, default: '' },
  tenthPercent:     { type: String, trim: true, default: '' },
  tenthYear:        { type: String, trim: true, default: '' },
  tenthMarksheet:   { type: String, default: '' }, // base64

  twelfthSchool:    { type: String, trim: true, default: '' },
  twelfthBoard:     { type: String, trim: true, default: '' },
  twelfthPercent:   { type: String, trim: true, default: '' },
  twelfthYear:      { type: String, trim: true, default: '' },
  twelfthMarksheet: { type: String, default: '' },

  // Graduation — auto from student record
  graduationCourse: { type: String, default: '' },
  currentSemester:  { type: Number, default: 1 },
  batch:            { type: String, default: '' },
  semesterResults:  [semesterResultSchema], // filled if sem >= 4
  overallCgpa:      { type: Number, default: null }, // auto-calculated if sem>=4, manual if 2-3

  // ── Skills ──
  technicalSkills: [{ type: String, trim: true }],
  softSkills:      [{ type: String, trim: true }],

  // ── Projects ──
  projects: [{
    title:       { type: String, trim: true },
    description: { type: String, trim: true },
    startDate:   { type: String },
    endDate:     { type: String },
    link:        { type: String, trim: true, default: '' },
  }],

  // ── Work Experience ──
  workExperience: [{
    company:     { type: String, trim: true },
    role:        { type: String, trim: true },
    startDate:   { type: String },
    endDate:     { type: String },
    description: { type: String, trim: true, default: '' },
  }],

  // ── Achievements & Certifications ──
  achievements: [{
    title:       { type: String, trim: true },
    issuer:      { type: String, trim: true, default: '' },
    date:        { type: String, default: '' },
    description: { type: String, trim: true, default: '' },
  }],

  // ── Verification ──
  // 'draft' → not submitted yet
  // 'pending' → submitted, waiting coordinator
  // 'verified' → coordinator accepted
  // 'rejected' → coordinator rejected
  status: { type: String, enum: ['draft','pending','verified','rejected'], default: 'draft' },

  // When student submits a new CV while already verified, we keep old verified
  // by storing the pending submission separately via pendingVersion
  hasPendingUpdate: { type: Boolean, default: false },

  rejectionReason:  { type: String, default: '' },
  verifiedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'Coordinator', default: null },
  verifiedAt:       { type: Date, default: null },
  submittedAt:      { type: Date, default: null },

  // For coordinator reminder
  reminderSentAt:   { type: Date, default: null },
}, { timestamps: true, collection: 'cvs' });

module.exports = mongoose.model('CV', cvSchema);
