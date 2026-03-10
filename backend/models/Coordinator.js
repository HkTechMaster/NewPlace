const mongoose = require('mongoose');

const coordinatorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    googleId: { type: String, default: null },
    avatar: { type: String, default: null },
    role: { type: String, default: 'coordinator', immutable: true },
    skillFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillFaculty',
      default: null,
    },
    departmentCode: { type: String, default: null },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    subject: { type: String, default: '' }, // what they coordinate
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true, collection: 'coordinators' }
);

module.exports = mongoose.model('Coordinator', coordinatorSchema);
