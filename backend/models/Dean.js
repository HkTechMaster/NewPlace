const mongoose = require('mongoose');

const deanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    googleId: { type: String, default: null },
    avatar: { type: String, default: null },
    role: { type: String, default: 'dean', immutable: true },
    skillFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillFaculty',
      default: null,
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true, collection: 'deans' }
);

module.exports = mongoose.model('Dean', deanSchema);
