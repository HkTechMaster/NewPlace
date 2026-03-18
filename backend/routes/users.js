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

// ── Placement Officers ───────────────────────────────────────────
const PlacementOfficer = require('../models/PlacementOfficer');

router.get('/placement-officers', protect, superAdminOnly, async (req, res) => {
  try {
    const officers = await PlacementOfficer.find().populate('skillFaculty', 'code name');
    res.json({ success: true, officers });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/placement-officers', protect, superAdminOnly, async (req, res) => {
  try {
    const { name, email, skillFacultyId } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email required' });
    const exists = await PlacementOfficer.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
    const officer = await PlacementOfficer.create({ name, email: email.toLowerCase(), skillFaculty: skillFacultyId || null });
    res.status(201).json({ success: true, message: `${name} added as Placement Officer. They can now login with Google.`, officer });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/placement-officers/:id', protect, superAdminOnly, async (req, res) => {
  try {
    await PlacementOfficer.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Placement Officer removed' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
