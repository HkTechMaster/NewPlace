const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    skillFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillFaculty',
      required: true,
    },
    departmentCode: {
      type: String,
      trim: true,
    },
    chairperson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Course details
    duration: {
      years: { type: Number, default: 1 },
      label: { type: String, default: '1 Year' }, // e.g. "3 Years", "6 Months"
    },
    totalBatches: {
      type: Number,
      default: 1,
    },
    currentBatch: {
      type: String,
      trim: true,
      default: '',
      // e.g. "2024-25"
    },
    totalSeats: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['fulltime', 'parttime', 'online', 'hybrid'],
      default: 'fulltime',
    },
    // Coordinators
    coordinators: [
      {
        name: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        subject: { type: String, trim: true, default: '' }, // what they coordinate
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);
