const express = require('express');
const router = express.Router();
const DepartmentRequest = require('../models/DepartmentRequest');
const SkillFaculty = require('../models/SkillFaculty');
const User = require('../models/User');
const { protect, superAdminOnly } = require('../middleware/auth');

// ─── DEAN: Add department directly to their faculty ──────────────────────────

// @route  POST /api/departments/direct
// @desc   Dean adds a department directly (no approval needed)
// @access Dean only
router.post('/direct', protect, async (req, res) => {
  try {
    if (req.user.role !== 'dean') {
      return res.status(403).json({ success: false, message: 'Only deans can use this route' });
    }

    const { name, code, chairpersonName, chairpersonEmail } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Department name is required' });

    const facultyId = req.user.skillFaculty._id || req.user.skillFaculty;
    const faculty = await SkillFaculty.findById(facultyId);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });

    // Check duplicate code
    if (code && faculty.departments.some(d => d.code?.toUpperCase() === code.toUpperCase())) {
      return res.status(400).json({ success: false, message: `Department code "${code}" already exists in this faculty` });
    }

    const deptEntry = { name, code: code?.toUpperCase() || '', chairpersonName: chairpersonName || '', chairpersonEmail: chairpersonEmail?.toLowerCase() || '' };

    // Register chairperson as user if email provided
    if (chairpersonEmail) {
      let chair = await User.findOne({ email: chairpersonEmail.toLowerCase() });
      if (!chair) {
        chair = await User.create({
          name: chairpersonName || 'Chairperson',
          email: chairpersonEmail.toLowerCase(),
          role: 'chairperson',
          skillFaculty: facultyId,
          departmentCode: code || name,
        });
      } else {
        chair.role = 'chairperson';
        chair.skillFaculty = facultyId;
        chair.departmentCode = code || name;
        chair.isActive = true;
        await chair.save();
      }
      deptEntry.chairperson = chair._id;
    }

    faculty.departments.push(deptEntry);
    await faculty.save();

    res.status(201).json({ success: true, message: `Department "${name}" added successfully!`, faculty });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── SUPER ADMIN: Send department request to dean ─────────────────────────────

// @route  POST /api/departments/request
// @desc   Super Admin sends a department add request to a faculty dean
// @access Super Admin only
router.post('/request', protect, superAdminOnly, async (req, res) => {
  try {
    const { facultyId, name, code, chairpersonName, chairpersonEmail } = req.body;
    if (!facultyId || !name) {
      return res.status(400).json({ success: false, message: 'Faculty ID and department name are required' });
    }

    const faculty = await SkillFaculty.findById(facultyId);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });

    // Check if same code already pending
    const existing = await DepartmentRequest.findOne({
      skillFaculty: facultyId,
      'department.code': code?.toUpperCase(),
      status: 'pending',
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A pending request for this department code already exists' });
    }

    const request = await DepartmentRequest.create({
      skillFaculty: facultyId,
      requestedBy: req.user._id,
      department: { name, code: code?.toUpperCase() || '', chairpersonName: chairpersonName || '', chairpersonEmail: chairpersonEmail?.toLowerCase() || '' },
    });

    const populated = await DepartmentRequest.findById(request._id)
      .populate('skillFaculty', 'name code')
      .populate('requestedBy', 'name email');

    res.status(201).json({ success: true, message: `Request sent to Dean of ${faculty.name}`, request: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DEAN: Get pending requests for their faculty ─────────────────────────────

// @route  GET /api/departments/requests
// @desc   Dean gets all department requests for their faculty
// @access Dean only
router.get('/requests', protect, async (req, res) => {
  try {
    if (req.user.role !== 'dean') {
      return res.status(403).json({ success: false, message: 'Only deans can view requests' });
    }
    const facultyId = req.user.skillFaculty._id || req.user.skillFaculty;
    const requests = await DepartmentRequest.find({ skillFaculty: facultyId })
      .populate('requestedBy', 'name email avatar')
      .populate('skillFaculty', 'name code')
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── SUPER ADMIN: Get all requests sent ──────────────────────────────────────

// @route  GET /api/departments/requests/all
// @desc   Super admin sees all requests they sent
// @access Super Admin only
router.get('/requests/all', protect, superAdminOnly, async (req, res) => {
  try {
    const requests = await DepartmentRequest.find({ requestedBy: req.user._id })
      .populate('skillFaculty', 'name code')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DEAN: Approve request ────────────────────────────────────────────────────

// @route  PUT /api/departments/requests/:id/approve
// @desc   Dean approves a department request → adds dept to faculty
// @access Dean only
router.put('/requests/:id/approve', protect, async (req, res) => {
  try {
    if (req.user.role !== 'dean') {
      return res.status(403).json({ success: false, message: 'Only deans can approve requests' });
    }

    const request = await DepartmentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already reviewed' });
    }

    const facultyId = req.user.skillFaculty._id || req.user.skillFaculty;
    if (request.skillFaculty.toString() !== facultyId.toString()) {
      return res.status(403).json({ success: false, message: 'Not your faculty' });
    }

    const faculty = await SkillFaculty.findById(facultyId);
    const dept = request.department;
    const deptEntry = { name: dept.name, code: dept.code, chairpersonName: dept.chairpersonName, chairpersonEmail: dept.chairpersonEmail };

    // Register chairperson
    if (dept.chairpersonEmail) {
      let chair = await User.findOne({ email: dept.chairpersonEmail });
      if (!chair) {
        chair = await User.create({
          name: dept.chairpersonName || 'Chairperson',
          email: dept.chairpersonEmail,
          role: 'chairperson',
          skillFaculty: facultyId,
          departmentCode: dept.code || dept.name,
        });
      } else {
        chair.role = 'chairperson';
        chair.skillFaculty = facultyId;
        chair.departmentCode = dept.code || dept.name;
        chair.isActive = true;
        await chair.save();
      }
      deptEntry.chairperson = chair._id;
    }

    faculty.departments.push(deptEntry);
    await faculty.save();

    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    res.json({ success: true, message: `Department "${dept.name}" approved and added!`, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DEAN: Reject request ─────────────────────────────────────────────────────

// @route  PUT /api/departments/requests/:id/reject
// @desc   Dean rejects a department request
// @access Dean only
router.put('/requests/:id/reject', protect, async (req, res) => {
  try {
    if (req.user.role !== 'dean') {
      return res.status(403).json({ success: false, message: 'Only deans can reject requests' });
    }
    const { reason } = req.body;
    const request = await DepartmentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already reviewed' });
    }

    request.status = 'rejected';
    request.rejectionReason = reason || '';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    res.json({ success: true, message: 'Request rejected', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DEAN: Delete a department ────────────────────────────────────────────────

// @route  DELETE /api/departments/:facultyId/:deptCode
// @desc   Dean removes a department from their faculty
// @access Dean only
router.delete('/:facultyId/:deptIndex', protect, async (req, res) => {
  try {
    if (req.user.role !== 'dean') {
      return res.status(403).json({ success: false, message: 'Only deans can remove departments' });
    }
    const faculty = await SkillFaculty.findById(req.params.facultyId);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });

    const idx = parseInt(req.params.deptIndex);
    if (isNaN(idx) || idx < 0 || idx >= faculty.departments.length) {
      return res.status(400).json({ success: false, message: 'Invalid department index' });
    }

    faculty.departments.splice(idx, 1);
    await faculty.save();
    res.json({ success: true, message: 'Department removed', faculty });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
