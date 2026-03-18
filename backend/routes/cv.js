const express = require('express');
const router = express.Router();
const CV = require('../models/CV');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');

// ─────────────────────────────────────────────
// STUDENT ROUTES
// ─────────────────────────────────────────────

// GET all my CVs
router.get('/mine', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const cvs = await CV.find({ student: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, cvs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST create new CV (draft)
router.post('/create', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const student = await Student.findById(req.user._id);
    const cv = await CV.create({
      student: req.user._id,
      ...req.body,
      graduationCourse: student.courseName,
      currentSemester: student.semester,
      batch: student.batch,
      status: 'draft',
    });
    res.status(201).json({ success: true, cv });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT update existing CV (save draft or update rejected/draft)
router.put('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const cv = await CV.findOne({ _id: req.params.id, student: req.user._id });
    if (!cv) return res.status(404).json({ success: false, message: 'CV not found' });
    // Can update draft, rejected, or verified (verified gets re-saved as draft awaiting new submission)
    const allowUpdate = ['draft', 'rejected', 'verified'];
    if (!allowUpdate.includes(cv.status)) return res.status(400).json({ success: false, message: 'Cannot edit a pending CV. Withdraw it first.' });
    Object.assign(cv, req.body);
    // If was verified and student edits — keep verified status until they resubmit
    await cv.save();
    res.json({ success: true, cv });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST submit CV for verification
router.post('/:id/submit', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    // Check no other CV is pending
    const alreadyPending = await CV.findOne({ student: req.user._id, status: 'pending' });
    if (alreadyPending && alreadyPending._id.toString() !== req.params.id) {
      return res.status(400).json({ success: false, message: 'You already have a CV pending verification. Only 1 at a time.' });
    }
    const cv = await CV.findOne({ _id: req.params.id, student: req.user._id });
    if (!cv) return res.status(404).json({ success: false, message: 'CV not found' });
    if (cv.status === 'pending') return res.status(400).json({ success: false, message: 'Already submitted for verification' });
    cv.status = 'pending';
    cv.submittedAt = new Date();
    cv.rejectionReason = '';
    await cv.save();
    res.json({ success: true, message: 'CV submitted for verification!', cv });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE cv (only draft or rejected)
router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const cv = await CV.findOne({ _id: req.params.id, student: req.user._id });
    if (!cv) return res.status(404).json({ success: false, message: 'CV not found' });
    if (['pending','verified'].includes(cv.status)) return res.status(400).json({ success: false, message: 'Cannot delete a pending or verified CV' });
    await cv.deleteOne();
    res.json({ success: true, message: 'CV deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST dismiss reminder
router.post('/:id/dismiss-reminder', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const cv = await CV.findOne({ _id: req.params.id, student: req.user._id });
    if (!cv) return res.status(404).json({ success: false, message: 'Not found' });
    cv.reminderDismissed = true;
    await cv.save();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─────────────────────────────────────────────
// COORDINATOR ROUTES
// ─────────────────────────────────────────────

// GET pending CV submissions for coordinator's faculty
router.get('/requests', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;

    // Only students in coordinator's assigned courses
    const Course = require('../models/Course');
    const myCourses = await Course.find({ 'coordinators.coordinator': req.user._id }).select('_id');
    const myCourseIds = myCourses.map(c => c._id);

    const pendingCVs = await CV.find({ status: 'pending' })
      .populate({
        path: 'student',
        match: {
          skillFaculty: facultyId,
          ...(myCourseIds.length ? { course: { $in: myCourseIds } } : {}),
        },
        select: 'name email photo courseName batch semester enrollmentNo skillFaculty'
      })
      .sort({ submittedAt: 1 });

    const filtered = pendingCVs.filter(c => c.student);
    res.json({ success: true, pendingCVs: filtered });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET students list grouped by course → batch with CV status
router.get('/students-list', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;

    // Only courses assigned to this coordinator
    const Course = require('../models/Course');
    const myCourses = await Course.find({ 'coordinators.coordinator': req.user._id }).select('_id');
    const myCourseIds = myCourses.map(c => c._id);

    const students = await Student.find({
      skillFaculty: facultyId,
      status: 'active',
      ...(myCourseIds.length ? { course: { $in: myCourseIds } } : {}),
    }).sort({ courseName: 1, batch: 1, name: 1 });

    const studentIds = students.map(s => s._id);
    // Get verified CV per student (only 1 per student)
    const verifiedCVs = await CV.find({ student: { $in: studentIds }, status: 'verified' })
      .select('student status verifiedAt reminderAt');
    // Also get pending
    const pendingCVs = await CV.find({ student: { $in: studentIds }, status: 'pending' })
      .select('student status submittedAt');
    // Also get rejected
    const rejectedCVs = await CV.find({ student: { $in: studentIds }, status: 'rejected' })
      .select('student status rejectionReason _id reminderAt reminderDismissed');

    const verifiedMap = {};
    verifiedCVs.forEach(c => { verifiedMap[c.student.toString()] = c; });
    const pendingMap = {};
    pendingCVs.forEach(c => { pendingMap[c.student.toString()] = c; });
    const rejectedMap = {};
    rejectedCVs.forEach(c => { rejectedMap[c.student.toString()] = c; });

    // Group by course → batch
    const grouped = {};
    for (const s of students) {
      const courseKey = s.courseName || 'Unknown';
      const batchKey = s.batch || 'Unknown';
      if (!grouped[courseKey]) grouped[courseKey] = {};
      if (!grouped[courseKey][batchKey]) grouped[courseKey][batchKey] = [];

      const sid = s._id.toString();
      const verifiedCV = verifiedMap[sid] || null;
      const pendingCV = pendingMap[sid] || null;
      const rejectedCV = rejectedMap[sid] || null;

      let cvStatus = 'no_cv';
      let cvId = null;
      if (verifiedCV) { cvStatus = 'verified'; cvId = verifiedCV._id; }
      else if (pendingCV) { cvStatus = 'pending'; cvId = pendingCV._id; }
      else if (rejectedCV) { cvStatus = 'rejected'; cvId = rejectedCV._id; }

      grouped[courseKey][batchKey].push({
        _id: s._id, name: s.name, email: s.email, photo: s.photo,
        enrollmentNo: s.enrollmentNo, semester: s.semester,
        cvStatus, cvId,
        rejectionReason: rejectedCV?.rejectionReason || '',
        verifiedAt: verifiedCV?.verifiedAt || null,
      });
    }
    res.json({ success: true, grouped });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET verified CV by student ID — for PO and coordinators
router.get('/student-verified/:studentId', protect, async (req, res) => {
  try {
    if (!['placement_officer','coordinator','chairperson'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const cv = await CV.findOne({ student: req.params.studentId, status: 'verified' })
      .populate('student', 'name email photo courseName batch semester');
    if (!cv) return res.status(404).json({ success: false, message: 'No verified CV found for this student' });
    res.json({ success: true, cv });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET full CV by id
router.get('/:id', protect, async (req, res) => {
  try {
    const cv = await CV.findById(req.params.id).populate('student', 'name email photo courseName batch semester');
    if (!cv) return res.status(404).json({ success: false, message: 'CV not found' });
    res.json({ success: true, cv });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT verify CV
router.put('/:id/verify', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });
    const cv = await CV.findById(req.params.id);
    if (!cv) return res.status(404).json({ success: false, message: 'CV not found' });

    // Unverify any previously verified CV for this student
    await CV.updateMany({ student: cv.student, status: 'verified', _id: { $ne: cv._id } }, { status: 'draft' });

    cv.status = 'verified';
    cv.verifiedBy = req.user._id;
    cv.verifiedAt = new Date();
    cv.rejectionReason = '';
    await cv.save();
    res.json({ success: true, message: 'CV verified!', cv });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT reject CV
router.put('/:id/reject', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });
    const { reason } = req.body;
    const cv = await CV.findById(req.params.id);
    if (!cv) return res.status(404).json({ success: false, message: 'CV not found' });
    cv.status = 'rejected';
    cv.rejectionReason = reason || '';
    await cv.save();
    res.json({ success: true, message: 'CV rejected', cv });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST send reminder to student (sets reminderAt, clears dismissed)
router.post('/:id/remind', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });
    const cv = await CV.findById(req.params.id);
    if (!cv) return res.status(404).json({ success: false, message: 'Not found' });
    cv.reminderAt = new Date();
    cv.reminderDismissed = false;
    await cv.save();
    res.json({ success: true, message: 'Reminder sent!' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
