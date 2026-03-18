const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  companyLogo: { type: String, default: '' },
  description: { type: String, default: '' },
  location: { type: String, default: '' },
  jobType: { type: String, enum: ['fulltime','parttime','internship','contract'], default: 'fulltime' },
  salary: { type: String, default: '' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlacementOfficer', required: true },
  skillFaculty: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillFaculty', required: true },

  // Eligibility
  eligibleCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  eligibleBatches: [String],
  eligibleSemesters: [Number],
  minCgpa: { type: Number, default: 0 },
  requiresLeetcode: { type: Boolean, default: false },
  customRequirements: { type: String, default: '' },

  // Applications
  applications: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    appliedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['applied','shortlisted','rejected','selected'], default: 'applied' },
    addedBy: { type: String, enum: ['student','po'], default: 'student' },
  }],

  applyDeadline: { type: Date, default: null },
  reminderSentAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  lastDateToApply: { type: Date, default: null },
}, { timestamps: true, collection: 'jobs' });

module.exports = mongoose.model('Job', jobSchema);
