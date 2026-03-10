const mongoose = require('mongoose');

const chairpersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    googleId: { type: String, default: null },
    avatar: { type: String, default: null },
    role: { type: String, default: 'chairperson', immutable: true },
    skillFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillFaculty',
      default: null,
    },
    departmentCode: { type: String, default: null },
    departmentName: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true, collection: 'chairpersons' }
);

module.exports = mongoose.model('Chairperson', chairpersonSchema);
