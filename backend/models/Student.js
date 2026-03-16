const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    photo: { type: String, default: '' },
    role: { type: String, default: 'student', immutable: true },

    // Password auth
    password: { type: String, default: '' },
    passwordOtp: { type: String, default: '' },
    passwordOtpExpiry: { type: Date, default: null },

    // Google OAuth
    googleId: { type: String, default: null },
    googleEmail: { type: String, lowercase: true, default: '' },
    googleAvatar: { type: String, default: '' },

    // Academic
    skillFaculty: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillFaculty', required: true },
    skillFacultyName: { type: String, default: '' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    courseName: { type: String, default: '' },
    courseCode: { type: String, default: '' },
    departmentCode: { type: String, default: '' },
    departmentName: { type: String, default: '' },
    batch: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1, max: 12 },
    enrollmentNo: { type: String, trim: true, default: '' },

    // Approval
    status: { type: String, enum: ['pending', 'active', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: '' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Coordinator', default: null },
    approvedAt: { type: Date, default: null },

    isActive: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true, collection: 'students' }
);

// Hash password before save
studentSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

studentSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('Student', studentSchema);
