const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const Student = require('../models/Student');
const SkillFaculty = require('../models/SkillFaculty');
const Course = require('../models/Course');
const { sendOTPEmail } = require('../utils/mailer');
const { protect, generateToken } = require('../middleware/auth');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const genOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── POST /api/student-auth/register ─────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const {
      googleId, googleEmail, googleAvatar,
      name, email, phone, password,
      skillFacultyId, courseId, departmentCode, departmentName,
      batch, semester, enrollmentNo, photo,
    } = req.body;

    if (!name || !email || !password || !skillFacultyId || !courseId || !batch || !semester) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const emailExists = await Student.findOne({ email: email.toLowerCase() });
    if (emailExists) return res.status(400).json({ success: false, message: 'This email is already registered' });

    if (googleId) {
      const googleExists = await Student.findOne({ googleId });
      if (googleExists) return res.status(400).json({ success: false, message: 'This Google account already has a registration' });
    }

    const course = await Course.findById(courseId);
    const faculty = await SkillFaculty.findById(skillFacultyId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (!faculty) return res.status(404).json({ success: false, message: 'Skill Faculty not found' });

    const student = new Student({
      name, email: email.toLowerCase(), phone: phone || '',
      googleId: googleId || null,
      googleEmail: googleEmail?.toLowerCase() || '',
      googleAvatar: googleAvatar || '', photo: photo || '',
      skillFaculty: skillFacultyId, skillFacultyName: faculty.name,
      course: courseId, courseName: course.name, courseCode: course.code || '',
      departmentCode: departmentCode || '', departmentName: departmentName || '',
      batch, semester: parseInt(semester),
      enrollmentNo: enrollmentNo || '',
      status: 'pending', isActive: false,
    });
    student.password = password; // will be hashed by pre-save hook
    await student.save();

    res.status(201).json({
      success: true, status: 'pending',
      message: 'Registration submitted! Your coordinator will review and approve.',
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── POST /api/student-auth/login ─────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier = email or enrollmentNo
    if (!identifier || !password) return res.status(400).json({ success: false, message: 'Email/Roll No. and password required' });

    const student = await Student.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { enrollmentNo: identifier },
      ],
    });

    if (!student) return res.status(401).json({ success: false, message: 'Account not found. Check your email or roll number.' });

    if (student.status === 'pending') return res.status(200).json({ success: false, status: 'pending', message: 'Your registration is under review.' });
    if (student.status === 'rejected') return res.status(200).json({ success: false, status: 'rejected', message: `Registration rejected. ${student.rejectionReason || ''}` });

    if (!student.password) return res.status(401).json({ success: false, message: 'No password set. Please use Google login or reset your password.' });

    const isMatch = await student.matchPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Incorrect password.' });

    student.lastLogin = new Date();
    await student.save();

    const token = generateToken(student._id);
    res.json({
      success: true, token,
      user: {
        _id: student._id, name: student.name, email: student.email,
        avatar: student.photo || student.googleAvatar || null,
        role: 'student',
        skillFaculty: student.skillFaculty, course: student.course,
        batch: student.batch, semester: student.semester,
        enrollmentNo: student.enrollmentNo,
        skillFacultyName: student.skillFacultyName,
        courseName: student.courseName,
        departmentName: student.departmentName,
      },
      redirect: '/student/dashboard',
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── POST /api/student-auth/google-login ──────────────────────────
// Student-specific Google login (from student login page)
router.post('/google-login', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ success: false, message: 'Credential required' });

    const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    // Check students only
    let student = await Student.findOne({ googleId });
    if (!student) student = await Student.findOne({ googleEmail: email.toLowerCase() });
    if (!student) student = await Student.findOne({ email: email.toLowerCase() });

    if (!student) {
      return res.json({
        success: false, status: 'needs_registration',
        message: 'No student account found. Please register first.',
        googleUser: { googleId, googleEmail: email, googleName: name, googleAvatar: picture },
      });
    }

    if (student.status === 'pending') return res.json({ success: false, status: 'pending', message: 'Your registration is under review.' });
    if (student.status === 'rejected') return res.json({ success: false, status: 'rejected', message: `Registration rejected. ${student.rejectionReason || ''}` });

    student.googleId = googleId;
    student.googleAvatar = picture;
    student.lastLogin = new Date();
    await student.save();

    const token = generateToken(student._id);
    res.json({
      success: true, token,
      user: {
        _id: student._id, name: student.name, email: student.email,
        avatar: student.photo || student.googleAvatar, role: 'student',
        skillFaculty: student.skillFaculty, course: student.course,
        batch: student.batch, semester: student.semester,
        enrollmentNo: student.enrollmentNo,
        skillFacultyName: student.skillFacultyName,
        courseName: student.courseName,
        departmentName: student.departmentName,
      },
      redirect: '/student/dashboard',
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── POST /api/student-auth/forgot-password ───────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ success: false, message: 'Email or roll number required' });

    const student = await Student.findOne({
      $or: [{ email: identifier.toLowerCase() }, { enrollmentNo: identifier }],
      status: 'active',
    });

    if (!student) return res.status(404).json({ success: false, message: 'No active account found with this email or roll number' });
    if (!student.email) return res.status(400).json({ success: false, message: 'No email on file for this account' });

    const otp = genOTP();
    student.passwordOtp = otp;
    student.passwordOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await student.save();

    await sendOTPEmail(student.email, otp, student.name);

    res.json({
      success: true,
      message: `OTP sent to ${student.email.replace(/(.{2}).+(@.+)/, '$1***$2')}`,
      maskedEmail: student.email.replace(/(.{2}).+(@.+)/, '$1***$2'),
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to send OTP. Check server email config.' }); }
});

// ── POST /api/student-auth/verify-otp ────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;
    const student = await Student.findOne({
      $or: [{ email: identifier?.toLowerCase() }, { enrollmentNo: identifier }],
    });
    if (!student) return res.status(404).json({ success: false, message: 'Account not found' });
    if (!student.passwordOtp || student.passwordOtp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });
    if (new Date() > student.passwordOtpExpiry) return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    student.password = newPassword; // hashed by pre-save
    student.passwordOtp = '';
    student.passwordOtpExpiry = null;
    await student.save();

    res.json({ success: true, message: 'Password reset successfully! You can now login.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── PUT /api/student-auth/change-password ────────────────────────
router.put('/change-password', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both current and new password required' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });

    const student = await Student.findById(req.user._id);
    if (!student.password) return res.status(400).json({ success: false, message: 'No password set. Set one via forgot password.' });

    const isMatch = await student.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    student.password = newPassword;
    await student.save();
    res.json({ success: true, message: 'Password changed successfully!' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
