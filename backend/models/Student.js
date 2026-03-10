const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    // Identity
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    photo: { type: String, default: '' }, // base64 or file path
    role: { type: String, default: 'student', immutable: true },

    // Google OAuth — stored at registration time
    googleId: { type: String, default: null },
    googleEmail: { type: String, lowercase: true, default: '' }, // the gmail used to sign in
    googleAvatar: { type: String, default: '' },

    // Academic info — selected from dropdowns
    skillFaculty: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillFaculty', required: true },
    skillFacultyName: { type: String, default: '' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    courseName: { type: String, default: '' },
    courseCode: { type: String, default: '' },
    departmentCode: { type: String, default: '' },
    departmentName: { type: String, default: '' },
    batch: { type: String, required: true, trim: true }, // e.g. "2024-2028"
    semester: { type: Number, required: true, min: 1, max: 12 },
    enrollmentNo: { type: String, trim: true, default: '' },

    // Approval
    status: {
      type: String,
      enum: ['pending', 'active', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: '' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Coordinator', default: null },
    approvedAt: { type: Date, default: null },

    isActive: { type: Boolean, default: false }, // only true after approval
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true, collection: 'students' }
);

module.exports = mongoose.model('Student', studentSchema);
