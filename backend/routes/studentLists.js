const express = require('express');
const router = express.Router();
const StudentList = require('../models/StudentList');
const Student     = require('../models/Student');
const CV          = require('../models/CV');
const Course      = require('../models/Course');
const Chairperson = require('../models/Chairperson');
const PlacementOfficer = require('../models/PlacementOfficer');
const { protect }  = require('../middleware/auth');
const notifyStaff  = require('../utils/notifyStaff');

// ─────────────────────────────────────────────
// COORDINATOR ROUTES
// ─────────────────────────────────────────────

// GET coordinator's lists
router.get('/mine', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });
    const lists = await StudentList.find({ coordinator: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, lists });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST create and send list to chairperson ── triggers Chairperson notification
router.post('/create', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });

    const { name, courseId, batch } = req.body;
    if (!name || !courseId || !batch) return res.status(400).json({ success: false, message: 'Name, course and batch required' });

    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
    const course    = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const isAssigned = course.coordinators?.some(c => c.coordinator?.toString() === req.user._id.toString());
    if (!isAssigned) return res.status(403).json({ success: false, message: 'You are not assigned to this course' });

    const students = await Student.find({ skillFaculty: facultyId, course: courseId, batch, status: 'active' });
    if (!students.length) return res.status(400).json({ success: false, message: 'No active students found in this course and batch' });

    const studentIds  = students.map(s => s._id);
    const verifiedCVs = await CV.find({ student: { $in: studentIds }, status: 'verified' }).select('student _id');
    const cvMap = {};
    verifiedCVs.forEach(c => { cvMap[c.student.toString()] = c._id; });

    const verifiedStudents = students.filter(s => cvMap[s._id.toString()]);
    if (!verifiedStudents.length) return res.status(400).json({ success: false, message: 'No verified students found. Students need verified CVs to be included.' });

    const studentEntries = verifiedStudents.map(s => ({
      student: s._id, name: s.name, email: s.email,
      enrollmentNo: s.enrollmentNo || '', semester: s.semester,
      photo: s.photo || '', cvId: cvMap[s._id.toString()] || null,
    }));

    const list = await StudentList.create({
      name, coordinator: req.user._id, coordinatorName: req.user.name,
      skillFaculty: facultyId, course: courseId, courseName: course.name,
      courseCode: course.code || '', batch, students: studentEntries,
      status: 'pending', sentAt: new Date(),
    });

    // ── NEW: Notify Chairperson of this course
    const chairpersonId = course.chairperson;
    if (chairpersonId) {
      const chairperson = await Chairperson.findById(chairpersonId);
      if (chairperson) {
        await notifyStaff({
          recipientId:    chairperson._id,
          recipientModel: 'Chairperson',
          recipientEmail: chairperson.email,
          recipientName:  chairperson.name,
          title:  `New Student List Submitted — ${course.name}`,
          message: `Coordinator ${req.user.name} has submitted a student list "${name}" for ${course.name} (Batch: ${batch}) with ${verifiedStudents.length} students.\n\nPlease review it in your inbox.`,
          type:   'list_submitted',
          metadata: { listId: list._id, courseId: course._id, coordinatorName: req.user.name },
        });
      }
    }

    res.status(201).json({ success: true, message: `List "${name}" sent to Chairperson with ${verifiedStudents.length} students!`, list });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT re-send rejected list
router.put('/:id/resend', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });

    const list = await StudentList.findOne({ _id: req.params.id, coordinator: req.user._id });
    if (!list) return res.status(404).json({ success: false, message: 'List not found' });
    if (list.status !== 'rejected') return res.status(400).json({ success: false, message: 'Only rejected lists can be re-sent' });

    const { name } = req.body;
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;

    const students    = await Student.find({ skillFaculty: facultyId, course: list.course, batch: list.batch, status: 'active' });
    const studentIds  = students.map(s => s._id);
    const verifiedCVs = await CV.find({ student: { $in: studentIds }, status: 'verified' }).select('student _id');
    const cvMap = {};
    verifiedCVs.forEach(c => { cvMap[c.student.toString()] = c._id; });

    const verifiedStudents = students.filter(s => cvMap[s._id.toString()]);
    if (!verifiedStudents.length) return res.status(400).json({ success: false, message: 'No verified students found' });

    list.name     = name || list.name;
    list.students = verifiedStudents.map(s => ({
      student: s._id, name: s.name, email: s.email,
      enrollmentNo: s.enrollmentNo || '', semester: s.semester,
      photo: s.photo || '', cvId: cvMap[s._id.toString()] || null,
    }));
    list.status          = 'pending';
    list.rejectionReason = '';
    list.reviewedBy      = null;
    list.reviewedAt      = null;
    list.removedFromInbox = false;
    list.sentAt = new Date();
    await list.save();

    // Notify chairperson again
    const course = await Course.findById(list.course);
    if (course?.chairperson) {
      const chairperson = await Chairperson.findById(course.chairperson);
      if (chairperson) {
        await notifyStaff({
          recipientId:    chairperson._id,
          recipientModel: 'Chairperson',
          recipientEmail: chairperson.email,
          recipientName:  chairperson.name,
          title:  `Student List Re-submitted — ${list.courseName}`,
          message: `Coordinator ${req.user.name} has re-submitted the student list "${list.name}" after addressing your feedback. Please review it in your inbox.`,
          type:   'list_submitted',
          metadata: { listId: list._id, courseId: list.course },
        });
      }
    }

    res.json({ success: true, message: `List re-sent to Chairperson with ${verifiedStudents.length} students!`, list });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE list
router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ success: false, message: 'Coordinator only' });
    const list = await StudentList.findOne({ _id: req.params.id, coordinator: req.user._id });
    if (!list) return res.status(404).json({ success: false, message: 'List not found' });
    if (list.status === 'approved') return res.status(400).json({ success: false, message: 'Cannot delete an approved list' });
    await list.deleteOne();
    res.json({ success: true, message: 'List deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─────────────────────────────────────────────
// CHAIRPERSON ROUTES
// ─────────────────────────────────────────────

// GET all lists for chairperson grouped by course
router.get('/inbox', protect, async (req, res) => {
  try {
    if (req.user.role !== 'chairperson') return res.status(403).json({ success: false, message: 'Chairperson only' });

    const deptCode = req.user.departmentCode;
    const lists = await StudentList.find({ removedFromInbox: false })
      .populate('course', 'name code departmentCode departmentName')
      .populate('coordinator', 'name email')
      .sort({ sentAt: -1 });

    const filtered = lists.filter(l =>
      l.course?.departmentCode === deptCode ||
      l.course?.departmentName === req.user.departmentName
    );

    const grouped = {};
    for (const list of filtered) {
      const courseId   = list.course?._id?.toString() || 'unknown';
      const courseName = list.courseName || list.course?.name || 'Unknown';
      if (!grouped[courseId]) {
        grouped[courseId] = { courseId, courseName, courseCode: list.courseCode || list.course?.code || '', pendingCount: 0, lists: [] };
      }
      grouped[courseId].lists.push(list);
      if (list.status === 'pending') grouped[courseId].pendingCount++;
    }

    res.json({ success: true, grouped });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET approved lists for Placement Officer
router.get('/approved', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'Placement Officer only' });

    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
    const query = { status: 'approved' };
    if (facultyId) query.skillFaculty = facultyId;

    const lists = await StudentList.find(query)
      .populate('course', 'name code departmentCode')
      .populate('coordinator', 'name email')
      .sort({ reviewedAt: -1 });

    const grouped = {};
    for (const list of lists) {
      const courseId   = list.course?._id?.toString() || 'unknown';
      const courseName = list.courseName || list.course?.name || 'Unknown';
      if (!grouped[courseId]) {
        grouped[courseId] = { courseId, courseName, courseCode: list.courseCode || '', lists: [] };
      }
      grouped[courseId].lists.push(list);
    }

    res.json({ success: true, grouped, lists });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET single list
router.get('/:id', protect, async (req, res) => {
  try {
    if (!['chairperson', 'coordinator', 'placement_officer'].includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Access denied' });

    const list = await StudentList.findById(req.params.id)
      .populate('course', 'name code')
      .populate('coordinator', 'name email');
    if (!list) return res.status(404).json({ success: false, message: 'List not found' });
    res.json({ success: true, list });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT approve list ── triggers PO notification
router.put('/:id/approve', protect, async (req, res) => {
  try {
    if (req.user.role !== 'chairperson') return res.status(403).json({ success: false, message: 'Chairperson only' });

    const list = await StudentList.findById(req.params.id);
    if (!list) return res.status(404).json({ success: false, message: 'List not found' });

    list.status      = 'approved';
    list.reviewedBy  = req.user._id;
    list.reviewedAt  = new Date();
    list.rejectionReason = '';
    await list.save();

    // ── NEW: Notify all POs in this faculty
    const pos = await PlacementOfficer.find({ skillFaculty: list.skillFaculty });
    for (const po of pos) {
      await notifyStaff({
        recipientId:    po._id,
        recipientModel: 'PlacementOfficer',
        recipientEmail: po.email,
        recipientName:  po.name,
        title:  `Student List Approved — ${list.courseName}`,
        message: `Chairperson ${req.user.name} has approved the student list "${list.name}" for ${list.courseName} (Batch: ${list.batch}) with ${list.students.length} students.\n\nIt is now available in your Students tab.`,
        type:   'list_approved',
        metadata: { listId: list._id, courseId: list.course, batch: list.batch },
      });
    }

    res.json({ success: true, message: `"${list.name}" approved!`, list });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT reject list ── triggers PO notification
router.put('/:id/reject', protect, async (req, res) => {
  try {
    if (req.user.role !== 'chairperson') return res.status(403).json({ success: false, message: 'Chairperson only' });

    const { reason } = req.body;
    const list = await StudentList.findById(req.params.id);
    if (!list) return res.status(404).json({ success: false, message: 'List not found' });

    list.status          = 'rejected';
    list.rejectionReason = reason || '';
    list.reviewedBy      = req.user._id;
    list.reviewedAt      = new Date();
    await list.save();

    // ── NEW: Notify all POs in this faculty
    const pos = await PlacementOfficer.find({ skillFaculty: list.skillFaculty });
    for (const po of pos) {
      await notifyStaff({
        recipientId:    po._id,
        recipientModel: 'PlacementOfficer',
        recipientEmail: po.email,
        recipientName:  po.name,
        title:  `Student List Rejected — ${list.courseName}`,
        message: `Chairperson ${req.user.name} has rejected the student list "${list.name}" for ${list.courseName} (Batch: ${list.batch}).\n\nReason: ${reason || 'No reason provided.'}`,
        type:   'list_rejected',
        metadata: { listId: list._id, courseId: list.course, reason: reason || '' },
      });
    }

    res.json({ success: true, message: 'List rejected', list });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT remove from inbox
router.put('/:id/remove-inbox', protect, async (req, res) => {
  try {
    if (req.user.role !== 'chairperson') return res.status(403).json({ success: false, message: 'Chairperson only' });
    const list = await StudentList.findById(req.params.id);
    if (!list) return res.status(404).json({ success: false, message: 'List not found' });
    list.removedFromInbox = true;
    await list.save();
    res.json({ success: true, message: 'Removed from inbox' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
