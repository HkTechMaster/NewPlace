const mongoose = require('mongoose');

const skillFacultySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    // Dean reference
    dean: { type: mongoose.Schema.Types.ObjectId, ref: 'Dean', default: null },
    deanName: { type: String, trim: true, default: '' },
    deanEmail: { type: String, lowercase: true, trim: true, default: '' },
    // Departments with chairperson refs
    departments: [
      {
        name: { type: String, trim: true },
        code: { type: String, trim: true },
        chairpersonName: { type: String, trim: true, default: '' },
        chairpersonEmail: { type: String, trim: true, lowercase: true, default: '' },
        chairperson: { type: mongoose.Schema.Types.ObjectId, ref: 'Chairperson', default: null },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SkillFaculty', skillFacultySchema);
