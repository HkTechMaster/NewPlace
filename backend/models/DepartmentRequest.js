const mongoose = require('mongoose');

const departmentRequestSchema = new mongoose.Schema(
  {
    skillFaculty: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillFaculty', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'requestedByModel', required: true },
    requestedByModel: { type: String, enum: ['User', 'Dean'], default: 'User' },
    department: {
      name: { type: String, required: true, trim: true },
      code: { type: String, trim: true, default: '' },
      chairpersonName: { type: String, trim: true, default: '' },
      chairpersonEmail: { type: String, trim: true, lowercase: true, default: '' },
    },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    isEdit: { type: Boolean, default: false },
    deptIndex: { type: Number, default: null },
    rejectionReason: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'reviewedByModel', default: null },
    reviewedByModel: { type: String, enum: ['User', 'Dean'], default: 'Dean' },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DepartmentRequest', departmentRequestSchema);
