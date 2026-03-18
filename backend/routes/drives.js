const express = require('express');
const router = express.Router();
const Drive = require('../models/Drive');
const Job = require('../models/Job');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');

// GET all drives for faculty
router.get('/', protect, async (req, res) => {
  try {
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
    const drives = await Drive.find({ skillFaculty: facultyId })
      .populate('job', 'title company').sort({ createdAt: -1 });
    res.json({ success: true, drives });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET student's drives
router.get('/mine', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const drives = await Drive.find({
      'participants.student': req.user._id,
    }).populate('job', 'title company location jobType salary');
    const result = drives.map(d => {
      const p = d.participants.find(p => p.student.toString() === req.user._id.toString());
      return { ...d.toObject(), myStatus: p?.finalStatus, offerLetter: p?.offerLetter };
    });
    res.json({ success: true, drives: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET single drive
router.get('/:id', protect, async (req, res) => {
  try {
    const drive = await Drive.findById(req.params.id).populate('job', 'title company location');
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    res.json({ success: true, drive });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST create drive from job applications
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const { jobId, startDate, rounds } = req.body;
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;

    const job = await Job.findById(jobId).populate('applications.student');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // Build participants from job applications
    const studentIds = job.applications.map(a => a.student._id || a.student);
    const students = await Student.find({ _id: { $in: studentIds } });
    const studentMap = {};
    students.forEach(s => { studentMap[s._id.toString()] = s; });

    const participants = job.applications.map(a => {
      const sid = (a.student._id || a.student).toString();
      const s = studentMap[sid];
      return { student: s?._id, name: s?.name||'', email: s?.email||'', enrollmentNo: s?.enrollmentNo||'', photo: s?.photo||'', finalStatus: 'in_process' };
    }).filter(p => p.student);

    // Build rounds with attendance & results pre-populated
    const builtRounds = (rounds || []).map(r => ({
      name: r.name, type: r.type || 'other', date: r.date || null, venue: r.venue || '',
      status: 'upcoming',
      attendance: participants.map(p => ({ student: p.student, name: p.name, present: false })),
      results: participants.map(p => ({ student: p.student, name: p.name, status: 'pending', remarks: '' })),
    }));

    const drive = await Drive.create({
      job: jobId, company: job.company, title: job.title,
      skillFaculty: facultyId, postedBy: req.user._id,
      participants, rounds: builtRounds,
      driveStatus: 'upcoming', startDate: startDate || null,
    });

    res.status(201).json({ success: true, message: 'Drive created!', drive });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST add round to existing drive
router.post('/:id/rounds', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const drive = await Drive.findById(req.params.id);
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    const { name, type, date, venue } = req.body;
    // Only add participants who are still in_process
    const active = drive.participants.filter(p => p.finalStatus === 'in_process');
    drive.rounds.push({
      name, type: type||'other', date: date||null, venue: venue||'', status: 'upcoming',
      attendance: active.map(p => ({ student: p.student, name: p.name, present: false })),
      results: active.map(p => ({ student: p.student, name: p.name, status: 'pending', remarks: '' })),
    });
    await drive.save();
    res.json({ success: true, message: 'Round added!', drive });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT update attendance for a round
router.put('/:id/rounds/:roundId/attendance', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const drive = await Drive.findById(req.params.id);
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    const round = drive.rounds.id(req.params.roundId);
    if (!round) return res.status(404).json({ success: false, message: 'Round not found' });

    const { attendance } = req.body; // [{ studentId, present }]
    attendance.forEach(a => {
      const entry = round.attendance.find(r => r.student.toString() === a.studentId);
      if (entry) entry.present = a.present;
    });
    round.status = 'ongoing';
    await drive.save();
    res.json({ success: true, message: 'Attendance saved!', drive });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT update results for a round
router.put('/:id/rounds/:roundId/results', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const drive = await Drive.findById(req.params.id);
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    const round = drive.rounds.id(req.params.roundId);
    if (!round) return res.status(404).json({ success: false, message: 'Round not found' });

    const { results } = req.body; // [{ studentId, status, remarks }]
    results.forEach(r => {
      const entry = round.results.find(x => x.student.toString() === r.studentId);
      if (entry) { entry.status = r.status; entry.remarks = r.remarks || ''; }
      // Update final status if selected or rejected
      if (r.status === 'selected' || r.status === 'rejected') {
        const participant = drive.participants.find(p => p.student.toString() === r.studentId);
        if (participant) participant.finalStatus = r.status === 'selected' ? 'selected' : 'rejected';
      }
    });
    round.status = 'completed';
    // Check if all participants have final status
    const allDone = drive.participants.every(p => p.finalStatus !== 'in_process');
    if (allDone) drive.driveStatus = 'completed';
    await drive.save();
    res.json({ success: true, message: 'Results saved!', drive });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT upload offer letter — PO or student
router.put('/:id/offer-letter/:studentId', protect, async (req, res) => {
  try {
    if (!['placement_officer','student'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Access denied' });
    const drive = await Drive.findById(req.params.id);
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    const participant = drive.participants.find(p => p.student.toString() === req.params.studentId);
    if (!participant) return res.status(404).json({ success: false, message: 'Student not in drive' });

    participant.offerLetter = req.body.offerLetter;
    participant.offerUploadedBy = req.user.role === 'placement_officer' ? 'po' : 'student';
    await drive.save();
    res.json({ success: true, message: 'Offer letter uploaded!' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET reports
router.get('/:id/report', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const drive = await Drive.findById(req.params.id).populate('job','title company');
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });

    const selected = drive.participants.filter(p => p.finalStatus === 'selected');
    const rejected = drive.participants.filter(p => p.finalStatus === 'rejected');
    const inProcess = drive.participants.filter(p => p.finalStatus === 'in_process');

    res.json({
      success: true,
      report: {
        drive: { id: drive._id, title: drive.title, company: drive.company, status: drive.driveStatus },
        summary: { total: drive.participants.length, selected: selected.length, rejected: rejected.length, inProcess: inProcess.length },
        selected, rejected, inProcess,
        rounds: drive.rounds.map(r => ({
          name: r.name, status: r.status,
          present: r.attendance.filter(a=>a.present).length,
          absent: r.attendance.filter(a=>!a.present).length,
          selectedInRound: r.results.filter(x=>x.status==='selected').length,
          rejectedInRound: r.results.filter(x=>x.status==='rejected').length,
        })),
      }
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
