const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Course = require('../models/Course');
const SkillFaculty = require('../models/SkillFaculty');
const { protect } = require('../middleware/auth');

// @route  POST /api/students/register
// @desc   Student submits registration form (after unknown Google login)
// @access Public (no token needed — they just logged in with Google)
router.post('/register', async (req, res) => {
  try {
    const {
      googleId, googleEmail, googleAvatar,
      name, email, phone,
      skillFacultyId, courseId,
      batch, semester, enrollmentNo,
      photo, // base64 string
    } = req.body;

    if (!googleId || !name || !email || !skillFacultyId || !courseId || !batch || !semester) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled' });
    }

    // Check email not already taken
    const emailExists = await Student.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'This email is already registered' });
    }

    // Check this google account not already registered
    const googleExists = await Student.findOne({ googleId });
    if (googleExists) {
      return res.status(400).json({ success: false, message: 'This Google account already has a pending/active registration' });
    }

    // Fetch course and faculty for denormalized names
    const course = await Course.findById(courseId).populate('skillFaculty', 'name code');
    const faculty = await SkillFaculty.findById(skillFacultyId);

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (!faculty) return res.status(404).json({ success: false, message: 'Skill Faculty not found' });

    const student = await Student.create({
      name, email: email.toLowerCase(), phone: phone || '',
      googleId, googleEmail: googleEmail?.toLowerCase() || '',
      googleAvatar: googleAvatar || '', photo: photo || '',
      skillFaculty: skillFacultyId,
      skillFacultyName: faculty.name,
      course: courseId,
      courseName: course.name,
      courseCode: course.code || '',
      departmentCode: course.departmentCode || '',
      departmentName: course.departmentName || '',
      batch, semester: parseInt(semester),
      enrollmentNo: enrollmentNo || '',
      status: 'pending',
      isActive: false,
    });

    res.status(201).json({
      success: true,
      status: 'pending',
      message: 'Registration submitted! Your coordinator will review and approve your request.',
      student: { _id: student._id, name: student.name, email: student.email, status: student.status },
    });
  } catch (error) {
    console.error('Student register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  GET /api/students/pending
// @desc   Coordinator gets pending students for their course/faculty
// @access Coordinator only
router.get('/pending', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
    const students = await Student.find({ skillFaculty: facultyId, status: 'pending' })
      .populate('course', 'name code')
      .populate('skillFaculty', 'name code')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: students.length, students });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// @route  GET /api/students
// @desc   Coordinator gets all students (approved) for their faculty
// @access Coordinator only
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
    const students = await Student.find({ skillFaculty: facultyId, status: 'active' })
      .populate('course', 'name code')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: students.length, students });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// @route  PUT /api/students/:id/approve
// @desc   Coordinator approves student
// @access Coordinator only
router.put('/:id/approve', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (student.status !== 'pending') return res.status(400).json({ success: false, message: 'Already reviewed' });

    student.status = 'active';
    student.isActive = true;
    student.approvedBy = req.user._id;
    student.approvedAt = new Date();
    await student.save();

    res.json({ success: true, message: `${student.name} approved! They can now login.`, student });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// @route  PUT /api/students/:id/reject
// @desc   Coordinator rejects student
// @access Coordinator only
router.put('/:id/reject', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });
    const { reason } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (student.status !== 'pending') return res.status(400).json({ success: false, message: 'Already reviewed' });

    student.status = 'rejected';
    student.isActive = false;
    student.rejectionReason = reason || '';
    student.approvedBy = req.user._id;
    student.approvedAt = new Date();
    await student.save();

    res.json({ success: true, message: `${student.name} rejected.`, student });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET students grouped by course+batch for coordinator
router.get('/by-course', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
    const students = await Student.find({ skillFaculty: facultyId, status: 'active' })
      .populate('course', 'name code duration totalBatches')
      .sort({ course: 1, batch: 1, name: 1 });

    // Group by course then batch
    const grouped = {};
    for (const s of students) {
      const courseId = s.course?._id?.toString() || 'unknown';
      const courseName = s.courseName || s.course?.name || 'Unknown';
      if (!grouped[courseId]) grouped[courseId] = { courseId, courseName, courseCode: s.courseCode, batches: {} };
      const batch = s.batch || 'Unknown';
      if (!grouped[courseId].batches[batch]) grouped[courseId].batches[batch] = [];
      grouped[courseId].batches[batch].push(s);
    }
    res.json({ success: true, grouped });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET single student full profile
router.get('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('course', 'name code duration type')
      .populate('skillFaculty', 'name code');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, student });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
