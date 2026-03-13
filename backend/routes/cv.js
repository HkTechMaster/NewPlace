const express = require('express');
const router = express.Router();
const CV = require('../models/CV');
const PendingCV = require('../models/PendingCV');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');

// ─────────────────────────────────────────────
// STUDENT ROUTES
// ─────────────────────────────────────────────

// GET own CV
router.get('/mine', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const cv = await CV.findOne({ student: req.user._id });
    const pending = cv ? await PendingCV.findOne({ cv: cv._id, status: 'pending' }) : null;
    res.json({ success: true, cv: cv || null, hasPending: !!pending, pending: pending || null });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST create or update draft CV
router.post('/save', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const student = await Student.findById(req.user._id).populate('course','name code duration');
    const data = req.body;

    let cv = await CV.findOne({ student: req.user._id });

    if (!cv) {
      // First time — create
      cv = await CV.create({
        student: req.user._id,
        ...data,
        graduationCourse: student.courseName,
        currentSemester: student.semester,
        batch: student.batch,
        status: 'draft',
      });
    } else {
      // Update existing draft/rejected
      if (cv.status === 'verified') {
        // Don't overwrite verified — save as pending update
        return res.status(400).json({ success: false, message: 'Use /submit-update to resubmit a verified CV' });
      }
      Object.assign(cv, data);
      cv.status = 'draft';
      await cv.save();
    }
    res.json({ success: true, message: 'CV saved', cv });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST submit CV for verification (first time or after rejection)
router.post('/submit', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const student = await Student.findById(req.user._id).populate('course','name code');
    const data = req.body;

    let cv = await CV.findOne({ student: req.user._id });
    if (!cv) {
      cv = await CV.create({
        student: req.user._id,
        ...data,
        graduationCourse: student.courseName,
        currentSemester: student.semester,
        batch: student.batch,
        status: 'pending',
        submittedAt: new Date(),
      });
    } else {
      if (cv.status === 'verified') {
        return res.status(400).json({ success: false, message: 'Already verified. Use /submit-update' });
      }
      Object.assign(cv, data);
      cv.status = 'pending';
      cv.submittedAt = new Date();
      cv.rejectionReason = '';
      await cv.save();
    }
    res.json({ success: true, message: 'CV submitted for verification!', cv });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST submit updated CV while already verified (creates PendingCV)
router.post('/submit-update', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const cv = await CV.findOne({ student: req.user._id, status: 'verified' });
    if (!cv) return res.status(404).json({ success: false, message: 'No verified CV found. Use /submit instead.' });

    // Delete any old pending update
    await PendingCV.deleteMany({ cv: cv._id, status: 'pending' });

    const pending = await PendingCV.create({
      student: req.user._id,
      cv: cv._id,
      data: req.body,
      status: 'pending',
      submittedAt: new Date(),
    });
    cv.hasPendingUpdate = true;
    await cv.save();

    res.json({ success: true, message: 'Updated CV submitted! Your verified status stays until coordinator reviews.', pending });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─────────────────────────────────────────────
// COORDINATOR ROUTES
// ─────────────────────────────────────────────

// GET all pending CV submissions for coordinator's faculty
router.get('/requests', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;

    // Pending first-time CVs
    const pendingCVs = await CV.find({ status: 'pending' })
      .populate({ path: 'student', match: { skillFaculty: facultyId }, select: 'name email course courseName batch semester photo departmentName' })
      .sort({ submittedAt: 1 });
    const filtered = pendingCVs.filter(c => c.student); // remove non-matching faculty

    // Pending update CVs
    const pendingUpdates = await PendingCV.find({ status: 'pending' })
      .populate({ path: 'student', match: { skillFaculty: facultyId }, select: 'name email course courseName batch semester photo' })
      .populate('cv', 'status verifiedAt')
      .sort({ submittedAt: 1 });
    const filteredUpdates = pendingUpdates.filter(u => u.student);

    res.json({ success: true, pendingCVs: filtered, pendingUpdates: filteredUpdates });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET all students grouped by course+batch with CV status (for coordinator's verified/unverified lists)
router.get('/students-list', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;

    const students = await Student.find({ skillFaculty: facultyId, status: 'active' })
      .populate('course', 'name code')
      .sort({ courseName: 1, batch: 1, name: 1 });

    // Get CV statuses for all these students
    const studentIds = students.map(s => s._id);
    const cvs = await CV.find({ student: { $in: studentIds } }).select('student status hasPendingUpdate verifiedAt submittedAt rejectionReason');
    const cvMap = {};
    cvs.forEach(c => { cvMap[c.student.toString()] = c; });

    // Group by course → batch
    const grouped = {};
    for (const s of students) {
      const courseKey = s.courseName || 'Unknown';
      const batchKey = s.batch || 'Unknown';
      if (!grouped[courseKey]) grouped[courseKey] = {};
      if (!grouped[courseKey][batchKey]) grouped[courseKey][batchKey] = [];
      const cv = cvMap[s._id.toString()] || null;
      grouped[courseKey][batchKey].push({
        _id: s._id, name: s.name, email: s.email, photo: s.photo,
        enrollmentNo: s.enrollmentNo, semester: s.semester,
        cvStatus: cv?.status || 'no_cv',
        hasPendingUpdate: cv?.hasPendingUpdate || false,
        cvId: cv?._id || null,
        cvVerifiedAt: cv?.verifiedAt || null,
        cvSubmittedAt: cv?.submittedAt || null,
        rejectionReason: cv?.rejectionReason || '',
      });
    }
    res.json({ success: true, grouped });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET full CV by id (coordinator view)
router.get('/:id', protect, async (req, res) => {
  try {
    if (!['coordinator','student'].includes(req.user.role)) return res.status(403).json({ success:false, message:'Access denied' });
    const cv = await CV.findById(req.params.id).populate('student','name email photo courseName batch semester');
    if (!cv) return res.status(404).json({ success:false, message:'CV not found' });
    res.json({ success:true, cv });
  } catch (e) { res.status(500).json({ success:false, message:e.message }); }
});

// GET pending update CV by id
router.get('/pending/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success:false, message:'Coordinator only' });
    const p = await PendingCV.findById(req.params.id).populate('student','name email courseName batch semester');
    if (!p) return res.status(404).json({ success:false, message:'Not found' });
    res.json({ success:true, pending: p });
  } catch (e) { res.status(500).json({ success:false, message:e.message }); }
});

// PUT verify CV (first-time)
router.put('/:id/verify', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success:false, message:'Coordinator only' });
    const cv = await CV.findById(req.params.id);
    if (!cv) return res.status(404).json({ success:false, message:'CV not found' });
    cv.status = 'verified';
    cv.verifiedBy = req.user._id;
    cv.verifiedAt = new Date();
    cv.rejectionReason = '';
    await cv.save();
    res.json({ success:true, message:'CV verified!', cv });
  } catch (e) { res.status(500).json({ success:false, message:e.message }); }
});

// PUT reject CV (first-time)
router.put('/:id/reject', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success:false, message:'Coordinator only' });
    const { reason } = req.body;
    const cv = await CV.findById(req.params.id);
    if (!cv) return res.status(404).json({ success:false, message:'CV not found' });
    cv.status = 'rejected';
    cv.rejectionReason = reason || '';
    await cv.save();
    res.json({ success:true, message:'CV rejected', cv });
  } catch (e) { res.status(500).json({ success:false, message:e.message }); }
});

// PUT accept pending update (replaces main CV data, keeps verified status)
router.put('/pending/:id/accept', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success:false, message:'Coordinator only' });
    const pending = await PendingCV.findById(req.params.id);
    if (!pending) return res.status(404).json({ success:false, message:'Not found' });
    const cv = await CV.findById(pending.cv);
    if (!cv) return res.status(404).json({ success:false, message:'Parent CV not found' });

    // Merge new data into main CV
    Object.assign(cv, pending.data);
    cv.status = 'verified';
    cv.hasPendingUpdate = false;
    cv.verifiedBy = req.user._id;
    cv.verifiedAt = new Date();
    await cv.save();

    pending.status = 'accepted';
    pending.reviewedBy = req.user._id;
    pending.reviewedAt = new Date();
    await pending.save();

    res.json({ success:true, message:'Updated CV accepted and verified!', cv });
  } catch (e) { res.status(500).json({ success:false, message:e.message }); }
});

// PUT reject pending update (old verified stays)
router.put('/pending/:id/reject', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success:false, message:'Coordinator only' });
    const { reason } = req.body;
    const pending = await PendingCV.findById(req.params.id);
    if (!pending) return res.status(404).json({ success:false, message:'Not found' });
    const cv = await CV.findById(pending.cv);
    if (cv) { cv.hasPendingUpdate = false; await cv.save(); }
    pending.status = 'rejected';
    pending.rejectionReason = reason || '';
    pending.reviewedBy = req.user._id;
    pending.reviewedAt = new Date();
    await pending.save();
    res.json({ success:true, message:'Update rejected. Old verified CV stays active.' });
  } catch (e) { res.status(500).json({ success:false, message:e.message }); }
});

// POST send reminder to student
router.post('/:id/remind', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success:false, message:'Coordinator only' });
    const cv = await CV.findById(req.params.id);
    if (!cv) return res.status(404).json({ success:false, message:'Not found' });
    cv.reminderSentAt = new Date();
    await cv.save();
    res.json({ success:true, message:'Reminder recorded' });
  } catch (e) { res.status(500).json({ success:false, message:e.message }); }
});

module.exports = router;
