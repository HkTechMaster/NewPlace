const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Dean = require('../models/Dean');
const Chairperson = require('../models/Chairperson');
const Coordinator = require('../models/Coordinator');
const SkillFaculty = require('../models/SkillFaculty');
const { protect, superAdminOnly } = require('../middleware/auth');

// GET stats for super admin dashboard
router.get('/stats', protect, superAdminOnly, async (req, res) => {
  try {
    const [totalFaculties, activeFaculties, totalDeans, totalChairpersons, totalCoordinators] = await Promise.all([
      SkillFaculty.countDocuments(),
      SkillFaculty.countDocuments({ isActive: true }),
      Dean.countDocuments(),
      Chairperson.countDocuments(),
      Coordinator.countDocuments(),
    ]);
    res.json({ success: true, stats: { totalFaculties, activeFaculties, totalDeans, totalChairpersons, totalCoordinators } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET all deans
router.get('/deans', protect, superAdminOnly, async (req, res) => {
  try {
    const deans = await Dean.find().populate('skillFaculty', 'code name');
    res.json({ success: true, count: deans.length, deans });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET all chairpersons
router.get('/chairpersons', protect, superAdminOnly, async (req, res) => {
  try {
    const chairpersons = await Chairperson.find().populate('skillFaculty', 'code name');
    res.json({ success: true, count: chairpersons.length, chairpersons });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET all coordinators
router.get('/coordinators', protect, superAdminOnly, async (req, res) => {
  try {
    const coordinators = await Coordinator.find().populate('skillFaculty', 'code name').populate('course', 'name code');
    res.json({ success: true, count: coordinators.length, coordinators });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
