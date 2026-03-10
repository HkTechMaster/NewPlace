const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true, default: '' },
    skillFaculty: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillFaculty', required: true },
    departmentCode: { type: String, trim: true, default: '' },
    departmentName: { type: String, trim: true, default: '' },
    chairperson: { type: mongoose.Schema.Types.ObjectId, ref: 'Chairperson', required: true },
    duration: {
      years: { type: Number, default: 1 },
      label: { type: String, default: '1 Year' },
    },
    totalBatches: { type: Number, default: 1 },
    currentBatch: { type: String, trim: true, default: '' },
    totalSeats: { type: Number, default: 0 },
    description: { type: String, trim: true, default: '' },
    type: { type: String, enum: ['fulltime', 'parttime', 'online', 'hybrid'], default: 'fulltime' },
    // Coordinators stored as refs to Coordinator collection
    coordinators: [
      {
        coordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'Coordinator', default: null },
        name: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        subject: { type: String, trim: true, default: '' },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'courses' }
);

module.exports = mongoose.model('Course', courseSchema);
