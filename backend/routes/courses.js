const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Coordinator = require('../models/Coordinator');
const { protect } = require('../middleware/auth');

// GET courses
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'chairperson') filter = { chairperson: req.user._id };
    else if (req.user.role === 'dean') {
      const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
      filter = { skillFaculty: facultyId };
    }
    const courses = await Course.find(filter)
      .populate('chairperson', 'name email departmentCode departmentName')
      .populate('skillFaculty', 'name code')
      .populate('coordinators.coordinator', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: courses.length, courses });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST create course — chairperson only
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'chairperson') return res.status(403).json({ success: false, message: 'Chairperson only' });

    const { name, code, durationYears, durationLabel, totalBatches, currentBatch, totalSeats, description, type, coordinators } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Course name required' });

    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;

    // Register coordinators in coordinators collection
    const processedCoords = [];
    for (const coord of (coordinators || [])) {
      const entry = { name: coord.name, email: coord.email?.toLowerCase(), subject: coord.subject || '' };
      if (coord.email) {
        let coordDoc = await Coordinator.findOne({ email: coord.email.toLowerCase() });
        if (!coordDoc) {
          coordDoc = await Coordinator.create({
            name: coord.name || 'Coordinator',
            email: coord.email.toLowerCase(),
            skillFaculty: facultyId,
            departmentCode: req.user.departmentCode,
            subject: coord.subject || '',
          });
        } else {
          coordDoc.skillFaculty = facultyId;
          coordDoc.isActive = true;
          await coordDoc.save();
        }
        entry.coordinator = coordDoc._id;
      }
      processedCoords.push(entry);
    }

    const course = await Course.create({
      name,
      code: code?.toUpperCase() || '',
      skillFaculty: facultyId,
      departmentCode: req.user.departmentCode,
      departmentName: req.user.departmentName,
      chairperson: req.user._id,
      duration: { years: durationYears || 1, label: durationLabel || `${durationYears || 1} Year` },
      totalBatches: totalBatches || 1,
      currentBatch: currentBatch || '',
      totalSeats: totalSeats || 0,
      description: description || '',
      type: type || 'fulltime',
      coordinators: processedCoords,
    });

    const populated = await Course.findById(course._id)
      .populate('chairperson', 'name email')
      .populate('skillFaculty', 'name code');

    res.status(201).json({ success: true, message: `Course "${name}" created! Coordinators registered.`, course: populated });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: e.message }); }
});

// PUT update
router.put('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'chairperson') return res.status(403).json({ success: false, message: 'Chairperson only' });
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Not found' });
    if (course.chairperson.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not your course' });

    const { name, code, durationYears, durationLabel, totalBatches, currentBatch, totalSeats, description, type, coordinators, isActive } = req.body;
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;

    if (coordinators) {
      const processedCoords = [];
      for (const coord of coordinators) {
        const entry = { name: coord.name, email: coord.email?.toLowerCase(), subject: coord.subject || '' };
        if (coord.email) {
          let coordDoc = await Coordinator.findOne({ email: coord.email.toLowerCase() });
          if (!coordDoc) {
            coordDoc = await Coordinator.create({
              name: coord.name || 'Coordinator',
              email: coord.email.toLowerCase(),
              skillFaculty: facultyId,
              departmentCode: req.user.departmentCode,
              subject: coord.subject || '',
            });
          }
          entry.coordinator = coordDoc._id;
        }
        processedCoords.push(entry);
      }
      course.coordinators = processedCoords;
    }

    if (name) course.name = name;
    if (code) course.code = code.toUpperCase();
    if (durationYears) course.duration = { years: durationYears, label: durationLabel || `${durationYears} Year` };
    if (totalBatches !== undefined) course.totalBatches = totalBatches;
    if (currentBatch !== undefined) course.currentBatch = currentBatch;
    if (totalSeats !== undefined) course.totalSeats = totalSeats;
    if (description !== undefined) course.description = description;
    if (type) course.type = type;
    if (isActive !== undefined) course.isActive = isActive;

    await course.save();
    const updated = await Course.findById(course._id).populate('chairperson', 'name email').populate('skillFaculty', 'name code');
    res.json({ success: true, message: 'Course updated', course: updated });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE
router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'chairperson') return res.status(403).json({ success: false, message: 'Chairperson only' });
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Not found' });
    if (course.chairperson.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not your course' });
    await course.deleteOne();
    res.json({ success: true, message: 'Course deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
