const mongoose = require('mongoose');

const skillFacultySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      // e.g., SFET, SFASH, SFMSR
    },
    name: {
      type: String,
      required: true,
      trim: true,
      // e.g., Skill Faculty of Engineering & Technology
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    dean: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deanName: {
      type: String,
      trim: true,
      default: '',
    },
    deanEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    establishedYear: {
      type: Number,
      default: new Date().getFullYear(),
    },
    totalStudents: {
      type: Number,
      default: 0,
    },
    departments: [
      {
        name: { type: String, trim: true },
        code: { type: String, trim: true },
        chairpersonName: { type: String, trim: true, default: '' },
        chairpersonEmail: { type: String, trim: true, lowercase: true, default: '' },
        chairperson: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      },
    ],
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SkillFaculty', skillFacultySchema);
