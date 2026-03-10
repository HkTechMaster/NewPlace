const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, superAdminOnly } = require('../middleware/auth');

// @route  GET /api/users/deans
// @desc   Get all deans
// @access Super Admin only
router.get('/deans', protect, superAdminOnly, async (req, res) => {
  try {
    const deans = await User.find({ role: 'dean' }).populate('skillFaculty', 'code name');
    res.json({ success: true, count: deans.length, deans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  GET /api/users/stats
// @desc   Get system stats for super admin dashboard
// @access Super Admin only
router.get('/stats', protect, superAdminOnly, async (req, res) => {
  try {
    const totalDeans = await User.countDocuments({ role: 'dean' });
    const activeDeans = await User.countDocuments({ role: 'dean', isActive: true });
    const SkillFaculty = require('../models/SkillFaculty');
    const totalFaculties = await SkillFaculty.countDocuments();
    const activeFaculties = await SkillFaculty.countDocuments({ isActive: true });

    res.json({
      success: true,
      stats: {
        totalDeans,
        activeDeans,
        totalFaculties,
        activeFaculties,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  PUT /api/users/:id/toggle-status
// @desc   Toggle dean active status
// @access Super Admin only
router.put('/:id/toggle-status', protect, superAdminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role === 'super_admin') {
      return res.status(400).json({ success: false, message: 'Cannot modify Super Admin status' });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
