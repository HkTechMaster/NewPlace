const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route  GET /api/courses
// @desc   Get courses (filtered by chairperson's faculty/dept)
// @access Chairperson / Dean / SuperAdmin
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'chairperson') {
      filter = { chairperson: req.user._id };
    } else if (req.user.role === 'dean') {
      const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
      filter = { skillFaculty: facultyId };
    }
    const courses = await Course.find(filter)
      .populate('chairperson', 'name email')
      .populate('skillFaculty', 'name code')
      .populate('coordinators.user', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: courses.length, courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  POST /api/courses
// @desc   Chairperson creates a course
// @access Chairperson only
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'chairperson') {
      return res.status(403).json({ success: false, message: 'Only chairpersons can create courses' });
    }

    const {
      name, code, durationYears, durationLabel, totalBatches,
      currentBatch, totalSeats, description, type, coordinators
    } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Course name is required' });

    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;

    // Register coordinators as users
    const processedCoordinators = [];
    for (const coord of (coordinators || [])) {
      const entry = { name: coord.name, email: coord.email, subject: coord.subject || '' };
      if (coord.email) {
        let coordUser = await User.findOne({ email: coord.email.toLowerCase() });
        if (!coordUser) {
          coordUser = await User.create({
            name: coord.name || 'Coordinator',
            email: coord.email.toLowerCase(),
            role: 'coordinator',
            skillFaculty: facultyId,
            departmentCode: req.user.departmentCode,
          });
        } else if (coordUser.role !== 'super_admin' && coordUser.role !== 'dean') {
          coordUser.role = 'coordinator';
          coordUser.skillFaculty = facultyId;
          coordUser.isActive = true;
          await coordUser.save();
        }
        entry.user = coordUser._id;
      }
      processedCoordinators.push(entry);
    }

    const course = await Course.create({
      name,
      code: code?.toUpperCase() || '',
      skillFaculty: facultyId,
      departmentCode: req.user.departmentCode,
      chairperson: req.user._id,
      duration: { years: durationYears || 1, label: durationLabel || `${durationYears || 1} Year` },
      totalBatches: totalBatches || 1,
      currentBatch: currentBatch || '',
      totalSeats: totalSeats || 0,
      description: description || '',
      type: type || 'fulltime',
      coordinators: processedCoordinators,
    });

    const populated = await Course.findById(course._id)
      .populate('chairperson', 'name email')
      .populate('skillFaculty', 'name code');

    res.status(201).json({
      success: true,
      message: `Course "${name}" created! Coordinators can now login with Google.`,
      course: populated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  PUT /api/courses/:id
// @desc   Update a course
// @access Chairperson only (their own)
router.put('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'chairperson') {
      return res.status(403).json({ success: false, message: 'Only chairpersons can update courses' });
    }
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.chairperson.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your course' });
    }

    const {
      name, code, durationYears, durationLabel, totalBatches,
      currentBatch, totalSeats, description, type, coordinators, isActive
    } = req.body;

    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;

    // Re-process coordinators
    if (coordinators) {
      const processedCoordinators = [];
      for (const coord of coordinators) {
        const entry = { name: coord.name, email: coord.email, subject: coord.subject || '' };
        if (coord.email) {
          let coordUser = await User.findOne({ email: coord.email.toLowerCase() });
          if (!coordUser) {
            coordUser = await User.create({
              name: coord.name || 'Coordinator',
              email: coord.email.toLowerCase(),
              role: 'coordinator',
              skillFaculty: facultyId,
              departmentCode: req.user.departmentCode,
            });
          }
          entry.user = coordUser._id;
        }
        processedCoordinators.push(entry);
      }
      course.coordinators = processedCoordinators;
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  DELETE /api/courses/:id
// @desc   Delete a course
// @access Chairperson only
router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'chairperson') {
      return res.status(403).json({ success: false, message: 'Only chairpersons can delete courses' });
    }
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.chairperson.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your course' });
    }
    await course.deleteOne();
    res.json({ success: true, message: 'Course deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
