const express = require('express');
const router = express.Router();
const Drive = require('../models/Drive');
const Job = require('../models/Job');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');
const { notifyStudents } = require('../utils/notifyStudents');

// GET all drives
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
    const drives = await Drive.find({ 'participants.student': req.user._id })
      .populate('job', 'title company location jobType salary');
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

// POST create drive — notify participants
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const { jobId, startDate, rounds } = req.body;
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const studentIds = job.applications.map(a => a.student._id || a.student);
    const students = await Student.find({ _id: { $in: studentIds } });
    const studentMap = {};
    students.forEach(s => { studentMap[s._id.toString()] = s; });

    const participants = job.applications.map(a => {
      const sid = (a.student._id || a.student).toString();
      const s = studentMap[sid];
      return { student: s?._id, name: s?.name||'', email: s?.email||'', enrollmentNo: s?.enrollmentNo||'', photo: s?.photo||'', finalStatus: 'in_process' };
    }).filter(p => p.student);

    const builtRounds = (rounds || []).map(r => ({
      name: r.name, type: r.type||'other', date: r.date||null, venue: r.venue||'',
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

    // Notify all participants
    if (participants.length) {
      const roundNames = builtRounds.map(r => r.name).join(', ');
      await notifyStudents({
        studentIds: participants.map(p => p.student),
        type: 'drive_schedule',
        title: `Drive Scheduled — ${job.company}`,
        message: `A placement drive has been scheduled for ${job.title} at ${job.company}.\n\nRounds: ${roundNames}${startDate ? `\nDate: ${new Date(startDate).toLocaleDateString('en-IN')}` : ''}\n\nPlease be prepared and check your schedule.`,
        jobId: job._id,
        driveId: drive._id,
        emailSubject: `Drive Scheduled — ${job.company}`,
      });
    }

    res.status(201).json({ success: true, message: `Drive created! ${participants.length} students notified.`, drive });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST add round — notify participants
router.post('/:id/rounds', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const drive = await Drive.findById(req.params.id);
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });

    const { name, type, date, venue } = req.body;
    const active = drive.participants.filter(p => p.finalStatus === 'in_process');
    drive.rounds.push({
      name, type: type||'other', date: date||null, venue: venue||'', status: 'upcoming',
      attendance: active.map(p => ({ student: p.student, name: p.name, present: false })),
      results: active.map(p => ({ student: p.student, name: p.name, status: 'pending', remarks: '' })),
    });
    await drive.save();

    // Notify active participants
    if (active.length) {
      await notifyStudents({
        studentIds: active.map(p => p.student),
        type: 'round_added',
        title: `New Round Added — ${drive.company}`,
        message: `A new round "${name}" has been added to the ${drive.company} placement drive.\n\n${date ? `Date: ${new Date(date).toLocaleDateString('en-IN')}` : ''}\n${venue ? `Venue: ${venue}` : ''}\n\nPlease prepare accordingly.`,
        driveId: drive._id,
        emailSubject: `New Round Added — ${drive.company} Drive`,
      });
    }

    res.json({ success: true, message: 'Round added!', drive });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT update attendance
router.put('/:id/rounds/:roundId/attendance', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const drive = await Drive.findById(req.params.id);
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    const round = drive.rounds.id(req.params.roundId);
    if (!round) return res.status(404).json({ success: false, message: 'Round not found' });

    const { attendance } = req.body;
    attendance.forEach(a => {
      const entry = round.attendance.find(r => r.student.toString() === a.studentId);
      if (entry) entry.present = a.present;
    });
    round.status = 'ongoing';
    await drive.save();
    res.json({ success: true, message: 'Attendance saved!', drive });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT update results — notify students
router.put('/:id/rounds/:roundId/results', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer') return res.status(403).json({ success: false, message: 'PO only' });
    const drive = await Drive.findById(req.params.id);
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    const round = drive.rounds.id(req.params.roundId);
    if (!round) return res.status(404).json({ success: false, message: 'Round not found' });

    const { results } = req.body;
    const selectedIds = [];
    const rejectedIds = [];
    const nextRoundIds = [];

    results.forEach(r => {
      const entry = round.results.find(x => x.student.toString() === r.studentId);
      if (entry) { entry.status = r.status; entry.remarks = r.remarks || ''; }
      if (r.status === 'selected') {
        const p = drive.participants.find(p => p.student.toString() === r.studentId);
        if (p) p.finalStatus = 'selected';
        selectedIds.push(r.studentId);
      } else if (r.status === 'rejected') {
        const p = drive.participants.find(p => p.student.toString() === r.studentId);
        if (p) p.finalStatus = 'rejected';
        rejectedIds.push(r.studentId);
      } else if (r.status === 'next_round') {
        nextRoundIds.push(r.studentId);
      }
    });

    round.status = 'completed';
    const allDone = drive.participants.every(p => p.finalStatus !== 'in_process');
    if (allDone) drive.driveStatus = 'completed';
    await drive.save();

    // Notify selected
    if (selectedIds.length) {
      await notifyStudents({
        studentIds: selectedIds,
        type: 'round_result',
        title: `🎉 Selected in ${round.name} — ${drive.company}`,
        message: `Congratulations! You have been selected in ${round.name} of the ${drive.company} placement drive for ${drive.title}.\n\nFurther updates will be shared soon.`,
        driveId: drive._id,
        emailSubject: `Selected in ${round.name} — ${drive.company}`,
      });
    }

    // Notify rejected
    if (rejectedIds.length) {
      await notifyStudents({
        studentIds: rejectedIds,
        type: 'round_result',
        title: `${round.name} Result — ${drive.company}`,
        message: `Thank you for participating in ${round.name} of the ${drive.company} placement drive.\n\nUnfortunately, you have not been selected to proceed further. We encourage you to keep applying for other opportunities.`,
        driveId: drive._id,
        emailSubject: `${round.name} Result — ${drive.company}`,
      });
    }

    // Notify next round
    if (nextRoundIds.length) {
      await notifyStudents({
        studentIds: nextRoundIds,
        type: 'round_result',
        title: `Advanced to Next Round — ${drive.company}`,
        message: `Congratulations! You have cleared ${round.name} and advanced to the next round of the ${drive.company} placement drive.\n\nDetails about the next round will be shared soon.`,
        driveId: drive._id,
        emailSubject: `Advanced to Next Round — ${drive.company}`,
      });
    }

    res.json({ success: true, message: 'Results saved!', drive });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT upload offer letter — notify student
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

    // Notify student if PO uploaded
    if (req.user.role === 'placement_officer') {
      await notifyStudents({
        studentIds: [req.params.studentId],
        type: 'offer_letter',
        title: `🎉 Offer Letter Available — ${drive.company}`,
        message: `Your offer letter for ${drive.title} at ${drive.company} has been uploaded.\n\nPlease login to PlacePro to view and download your offer letter.`,
        driveId: drive._id,
        emailSubject: `Offer Letter Available — ${drive.company}`,
      });
    }

    res.json({ success: true, message: 'Offer letter uploaded!' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET drive report
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
