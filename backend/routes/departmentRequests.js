const express = require('express');
const router = express.Router();
const DepartmentRequest = require('../models/DepartmentRequest');
const SkillFaculty = require('../models/SkillFaculty');
const User = require('../models/User');
const { protect, superAdminOnly } = require('../middleware/auth');

// Super Admin: Create a department request to dean
router.post('/', protect, superAdminOnly, async (req, res) => {
  try {
    const { skillFacultyId, department, note } = req.body;
    if (!skillFacultyId || !department?.name) {
      return res.status(400).json({ success: false, message: 'Faculty and department name required' });
    }
    const faculty = await SkillFaculty.findById(skillFacultyId);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });
    if (!faculty.dean) return res.status(400).json({ success: false, message: 'This faculty has no dean assigned yet' });

    const request = await DepartmentRequest.create({
      skillFaculty: skillFacultyId,
      requestedBy: req.user._id,
      department,
      note: note || '',
      status: 'pending',
    });

    const populated = await DepartmentRequest.findById(request._id)
      .populate('skillFaculty', 'name code')
      .populate('requestedBy', 'name email');
    res.status(201).json({ success: true, message: 'Request sent to dean for approval', request: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Super Admin: View all requests
router.get('/all', protect, superAdminOnly, async (req, res) => {
  try {
    const requests = await DepartmentRequest.find()
      .populate('skillFaculty', 'name code')
      .populate('requestedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Dean: Get requests for their faculty
router.get('/mine', protect, async (req, res) => {
  try {
    if (!req.user.skillFaculty) return res.json({ success: true, requests: [] });
    const requests = await DepartmentRequest.find({ skillFaculty: req.user.skillFaculty })
      .populate('skillFaculty', 'name code')
      .populate('requestedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Dean: Approve
router.put('/:id/approve', protect, async (req, res) => {
  try {
    const request = await DepartmentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Already reviewed' });

    const faculty = await SkillFaculty.findById(request.skillFaculty);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });

    const dept = request.department.toObject ? request.department.toObject() : { ...request.department };
    if (dept.chairpersonEmail) {
      let chair = await User.findOne({ email: dept.chairpersonEmail });
      if (!chair) {
        chair = await User.create({
          name: dept.chairpersonName || 'Chairperson',
          email: dept.chairpersonEmail,
          role: 'chairperson',
          skillFaculty: faculty._id,
          departmentCode: dept.code || dept.name,
        });
      } else {
        chair.role = 'chairperson';
        chair.skillFaculty = faculty._id;
        chair.departmentCode = dept.code || dept.name;
        chair.isActive = true;
        await chair.save();
      }
      dept.chairperson = chair._id;
    }

    faculty.departments.push(dept);
    await faculty.save();
    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();
    res.json({ success: true, message: 'Department approved and added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Dean: Reject
router.put('/:id/reject', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await DepartmentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Already reviewed' });
    request.status = 'rejected';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.rejectionReason = reason || '';
    await request.save();
    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
