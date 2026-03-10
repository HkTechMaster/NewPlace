const mongoose = require('mongoose');

const departmentRequestSchema = new mongoose.Schema(
  {
    skillFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillFaculty',
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestedByRole: {
      type: String,
      enum: ['super_admin'],
      default: 'super_admin',
    },
    department: {
      name: { type: String, required: true, trim: true },
      code: { type: String, trim: true },
      chairpersonName: { type: String, trim: true, default: '' },
      chairpersonEmail: { type: String, trim: true, lowercase: true, default: '' },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DepartmentRequest', departmentRequestSchema);
