const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Student = require('../models/Student');
const CV = require('../models/CV');
const StudentList = require('../models/StudentList');
const { protect } = require('../middleware/auth');
const { sendJobReminderEmail } = require('../utils/mailer');
const { notifyStudents } = require('../utils/notifyStudents');

// Helper — get eligible student IDs for a job
const getEligibleStudents = async (job) => {
  const facultyId = job.skillFaculty;
  const approvedLists = await StudentList.find({
    skillFaculty: facultyId,
    status: 'approved',
    ...(job.eligibleCourses?.length ? { course: { $in: job.eligibleCourses } } : {}),
    ...(job.eligibleBatches?.length ? { batch: { $in: job.eligibleBatches } } : {}),
  });
  const studentIds = new Set();
  approvedLists.forEach(l => l.students.forEach(s => studentIds.add(s.student.toString())));

  const filter = { _id: { $in: [...studentIds] }, status: 'active' };
  if (job.eligibleSemesters?.length) filter.semester = { $in: job.eligibleSemesters };
  let students = await Student.find(filter).lean();

  if (job.minCgpa > 0) {
    const cvs = await CV.find({ student: { $in: students.map(s=>s._id) }, status: 'verified' }).select('student overallCgpa');
    const cgpaMap = {};
    cvs.forEach(c => { cgpaMap[c.student.toString()] = c.overallCgpa || 0; });
    students = students.filter(s => (cgpaMap[s._id.toString()] || 0) >= job.minCgpa);
  }
  return students;
};

// GET all jobs
router.get('/', protect, async (req, res) => {
  try {
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
    const jobs = await Job.find({ skillFaculty: facultyId, isActive: true })
      .populate('eligibleCourses', 'name code').sort({ createdAt: -1 });
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

    const eligible = [];
    for (const job of jobs) {
      const courseMatch = !job.eligibleCourses?.length || job.eligibleCourses.some(c => c._id.toString() === (req.user.course?._id||req.user.course)?.toString());
      const batchMatch = !job.eligibleBatches?.length || job.eligibleBatches.includes(req.user.batch);
      const semMatch = !job.eligibleSemesters?.length || job.eligibleSemesters.includes(req.user.semester);
      if (courseMatch && batchMatch && semMatch) {
        const application = job.applications?.find(a => a.student.toString() === req.user._id.toString());
        eligible.push({ ...job.toObject(), alreadyApplied: !!application, applicationStatus: application?.status || null });
      }
    }
    res.json({ success: true, jobs: eligible });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST create job — notify eligible students
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
    const job = await Job.create({ ...req.body, postedBy: req.user._id, skillFaculty: facultyId });

    // Notify eligible students
    const eligible = await getEligibleStudents(job);
    if (eligible.length) {
      await notifyStudents({
        studentIds: eligible.map(s => s._id),
        type: 'new_job',
        title: `New Job: ${job.title} at ${job.company}`,
        message: `${job.company} is hiring for ${job.title}.\n\nLocation: ${job.location || 'Not specified'}\nSalary: ${job.salary || 'Not disclosed'}\nType: ${job.jobType}\n${job.lastDateToApply ? `\nDeadline: ${new Date(job.lastDateToApply).toLocaleDateString('en-IN')}` : ''}`,
        jobId: job._id,
        emailSubject: `New Job Opportunity: ${job.title} at ${job.company}`,
      });
    }

    res.status(201).json({ success: true, message: `Job posted! ${eligible.length} students notified.`, job });
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
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET eligible students for job
router.get('/:id/eligible-students', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    const students = await getEligibleStudents(job);
    res.json({ success: true, count: students.length, students });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET applicants grouped by course → batch
router.get('/:id/applicants', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const job = await Job.findById(req.params.id).populate('eligibleCourses', 'name code');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const appMap = {};
    job.applications.forEach(a => { appMap[a.student.toString()] = a; });
    const studentIds = job.applications.map(a => a.student);
    const students = await Student.find({ _id: { $in: studentIds } }).populate('course', 'name code').lean();
    const cvIds = job.applications.filter(a => a.cvId).map(a => a.cvId);
    const cvs = await CV.find({ _id: { $in: cvIds } }).select('_id title status').lean();
    const cvMap = {};
    cvs.forEach(c => { cvMap[c._id.toString()] = c; });

    const grouped = {};
    for (const s of students) {
      const courseId = s.course?._id?.toString() || 'unknown';
      const courseName = s.courseName || s.course?.name || 'Unknown';
      const courseCode = s.courseCode || s.course?.code || '';
      const batch = s.batch || 'Unknown';
      if (!grouped[courseId]) grouped[courseId] = { courseId, courseName, courseCode, batches: {} };
      if (!grouped[courseId].batches[batch]) grouped[courseId].batches[batch] = [];
      const app = appMap[s._id.toString()];
      grouped[courseId].batches[batch].push({
        ...s,
        applicationStatus: app?.status || 'applied',
        appliedAt: app?.appliedAt,
        consent: app?.consent,
        addedBy: app?.addedBy,
        cv: app?.cvId ? cvMap[app.cvId.toString()] : null,
        cvId: app?.cvId || null,
      });
    }
    res.json({ success: true, job: { _id: job._id, title: job.title, company: job.company }, totalApplicants: job.applications.length, grouped });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST student applies
router.post('/:id/apply', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const { cvId, consent } = req.body;
    if (!consent) return res.status(400).json({ success: false, message: 'Consent required' });

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    const already = job.applications?.find(a => a.student.toString() === req.user._id.toString());
    if (already) return res.status(400).json({ success: false, message: 'Already applied' });

    job.applications.push({ student: req.user._id, cvId: cvId || null, consent: true, addedBy: 'student' });
    await job.save();

    // Confirmation notification
    await notifyStudents({
      studentIds: [req.user._id],
      type: 'application_confirmed',
      title: `Application Submitted — ${job.company}`,
      message: `Your application for ${job.title} at ${job.company} has been submitted successfully.\n\nWe will notify you about further updates.`,
      jobId: job._id,
      emailSubject: `Application Confirmed — ${job.title} at ${job.company}`,
    });

    res.json({ success: true, message: `Applied to ${job.company}!` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE withdraw application
router.delete('/:id/apply', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const appIdx = job.applications.findIndex(a => a.student.toString() === req.user._id.toString());
    if (appIdx === -1) return res.status(404).json({ success: false, message: 'Application not found' });

    const app = job.applications[appIdx];
    if (app.status !== 'applied') return res.status(400).json({ success: false, message: `Cannot withdraw — your application is already ${app.status}` });

    job.applications.splice(appIdx, 1);
    await job.save();
    res.json({ success: true, message: `Application withdrawn from ${job.company}` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT update applicant status
router.put('/:id/applicants/:studentId/status', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const { status } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    const app = job.applications.find(a => a.student.toString() === req.params.studentId);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    app.status = status;
    await job.save();
    res.json({ success: true, message: 'Status updated' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST PO manually adds student
router.post('/:id/add-student', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const { studentId } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    const already = job.applications?.find(a => a.student.toString() === studentId);
    if (already) return res.status(400).json({ success: false, message: 'Already added' });
    job.applications.push({ student: studentId, consent: true, addedBy: 'po' });
    await job.save();
    res.json({ success: true, message: 'Student added' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST send reminder
router.post('/:id/remind', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const job = await Job.findById(req.params.id);
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
      } catch { /* skip */ }
    }
    job.reminderSentAt = new Date();
    await job.save();
    res.json({ success: true, message: `Reminder sent to ${sent} students` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
