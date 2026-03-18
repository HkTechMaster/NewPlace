const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Student = require('../models/Student');
const CV = require('../models/CV');
const StudentList = require('../models/StudentList');
const { protect } = require('../middleware/auth');
const { sendOTPEmail, sendJobReminderEmail } = require('../utils/mailer');

// Helper — get eligible students for a job
const getEligibleStudents = async (job) => {
  const facultyId = job.skillFaculty;
  // Only chairperson-approved list students
  const approvedLists = await StudentList.find({
    skillFaculty: facultyId,
    status: 'approved',
    ...(job.eligibleCourses?.length ? { course: { $in: job.eligibleCourses } } : {}),
    ...(job.eligibleBatches?.length ? { batch: { $in: job.eligibleBatches } } : {}),
  });
  const studentIds = new Set();
  approvedLists.forEach(l => l.students.forEach(s => studentIds.add(s.student.toString())));

  // Fetch full student details
  const filter = { _id: { $in: [...studentIds] }, status: 'active' };
  if (job.eligibleSemesters?.length) filter.semester = { $in: job.eligibleSemesters };

  let students = await Student.find(filter).lean();

  // Filter by CGPA if set
  if (job.minCgpa > 0) {
    const cvs = await CV.find({ student: { $in: students.map(s=>s._id) }, status: 'verified' }).select('student overallCgpa');
    const cgpaMap = {};
    cvs.forEach(c => { cgpaMap[c.student.toString()] = c.overallCgpa || 0; });
    students = students.filter(s => (cgpaMap[s._id.toString()] || 0) >= job.minCgpa);
  }
  return students;
};

// GET all jobs for faculty — student or PO
router.get('/', protect, async (req, res) => {
  try {
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
    const jobs = await Job.find({ skillFaculty: facultyId, isActive: true })
      .populate('eligibleCourses', 'name code')
      .sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET eligible jobs for student
router.get('/eligible', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
    const jobs = await Job.find({ skillFaculty: facultyId, isActive: true })
      .populate('eligibleCourses', 'name code').sort({ createdAt: -1 });

    // Filter jobs student is eligible for
    const eligible = [];
    for (const job of jobs) {
      const courseMatch = !job.eligibleCourses?.length || job.eligibleCourses.some(c => c._id.toString() === (req.user.course?._id||req.user.course)?.toString());
      const batchMatch = !job.eligibleBatches?.length || job.eligibleBatches.includes(req.user.batch);
      const semMatch = !job.eligibleSemesters?.length || job.eligibleSemesters.includes(req.user.semester);
      if (courseMatch && batchMatch && semMatch) {
        const alreadyApplied = job.applications?.some(a => a.student.toString() === req.user._id.toString());
        eligible.push({ ...job.toObject(), alreadyApplied });
      }
    }
    res.json({ success: true, jobs: eligible });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST create job — PO only
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'Placement Officer only' });
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
    const job = await Job.create({ ...req.body, postedBy: req.user._id, skillFaculty: facultyId });
    res.status(201).json({ success: true, message: 'Job posted!', job });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT update job
router.put('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, job });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE job
router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    await Job.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Job removed' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET eligible students for a job
router.get('/:id/eligible-students', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    const students = await getEligibleStudents(job);
    res.json({ success: true, count: students.length, students });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST student applies for job
router.post('/:id/apply', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    const already = job.applications?.find(a => a.student.toString() === req.user._id.toString());
    if (already) return res.status(400).json({ success: false, message: 'Already applied' });
    job.applications.push({ student: req.user._id, addedBy: 'student' });
    await job.save();
    res.json({ success: true, message: `Applied to ${job.company}!` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST PO adds student to job
router.post('/:id/add-student', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const { studentId } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    const already = job.applications?.find(a => a.student.toString() === studentId);
    if (already) return res.status(400).json({ success: false, message: 'Student already added' });
    job.applications.push({ student: studentId, addedBy: 'po' });
    await job.save();
    res.json({ success: true, message: 'Student added to job' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST send reminder to eligible students who haven't applied
router.post('/:id/remind', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const job = await Job.findById(req.params.id).populate('eligibleCourses','name');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const eligible = await getEligibleStudents(job);
    const appliedIds = new Set(job.applications.map(a => a.student.toString()));
    const notApplied = eligible.filter(s => !appliedIds.has(s._id.toString()));

    let sent = 0;
    for (const s of notApplied) {
      if (!s.email) continue;
      try {
        await sendJobReminderEmail(s.email, s.name, job.title, job.company, job.lastDateToApply);
        sent++;
      } catch { /* skip failed */ }
    }
    job.reminderSentAt = new Date();
    await job.save();
    res.json({ success: true, message: `Reminder sent to ${sent} students who haven't applied yet` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
