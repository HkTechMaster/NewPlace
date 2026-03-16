const express = require('express');
const router = express.Router();
const DepartmentRequest = require('../models/DepartmentRequest');
const SkillFaculty = require('../models/SkillFaculty');
const Chairperson = require('../models/Chairperson');
const { protect } = require('../middleware/auth');

// Helper: register chairperson
const registerChairperson = async (dept, facultyId) => {
  if (!dept.chairpersonEmail) return null;
  let chair = await Chairperson.findOne({ email: dept.chairpersonEmail });
  if (!chair) {
    chair = await Chairperson.create({
      name: dept.chairpersonName || 'Chairperson',
      email: dept.chairpersonEmail,
      skillFaculty: facultyId,
      departmentCode: dept.code || dept.name,
      departmentName: dept.name,
    });
  } else {
    chair.skillFaculty = facultyId;
    chair.departmentCode = dept.code || dept.name;
    chair.departmentName = dept.name;
    chair.isActive = true;
    await chair.save();
  }
  return chair._id;
};

// GET departments for a faculty — PUBLIC for student registration
router.get('/public/:facultyId', async (req, res) => {
  try {
    const faculty = await SkillFaculty.findById(req.params.facultyId).select('departments');
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });
    res.json({ success: true, departments: faculty.departments || [] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Dean adds department directly (no approval)
router.post('/direct', protect, async (req, res) => {
  try {
    if (req.user.role !== 'dean') return res.status(403).json({ success: false, message: 'Dean only' });
    const { name, code, chairpersonName, chairpersonEmail } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });

    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
    const faculty = await SkillFaculty.findById(facultyId);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });

    if (code && faculty.departments.some(d => d.code?.toUpperCase() === code.toUpperCase())) {
      return res.status(400).json({ success: false, message: `Code "${code}" already exists` });
    }

    const dept = { name, code: code?.toUpperCase() || '', chairpersonName: chairpersonName || '', chairpersonEmail: chairpersonEmail?.toLowerCase() || '' };
    const chairId = await registerChairperson(dept, facultyId);
    if (chairId) dept.chairperson = chairId;

    faculty.departments.push(dept);
    await faculty.save();
    res.status(201).json({ success: true, message: `"${name}" added!`, faculty });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Super admin sends request to dean
router.post('/request', protect, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super Admin only' });
    const { facultyId, name, code, chairpersonName, chairpersonEmail } = req.body;
    if (!facultyId || !name) return res.status(400).json({ success: false, message: 'Faculty ID and name required' });

    const faculty = await SkillFaculty.findById(facultyId);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });

    const request = await DepartmentRequest.create({
      skillFaculty: facultyId,
      requestedBy: req.user._id,
      requestedByModel: 'User',
      department: { name, code: code?.toUpperCase() || '', chairpersonName: chairpersonName || '', chairpersonEmail: chairpersonEmail?.toLowerCase() || '' },
    });

    const populated = await DepartmentRequest.findById(request._id).populate('skillFaculty', 'name code');
    res.status(201).json({ success: true, message: `Request sent to Dean of ${faculty.name}`, request: populated });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Dean gets requests
router.get('/requests', protect, async (req, res) => {
  try {
    if (req.user.role !== 'dean') return res.status(403).json({ success: false, message: 'Dean only' });
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
    const requests = await DepartmentRequest.find({ skillFaculty: facultyId })
      .populate('skillFaculty', 'name code')
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Dean approves
router.put('/requests/:id/approve', protect, async (req, res) => {
  try {
    if (req.user.role !== 'dean') return res.status(403).json({ success: false, message: 'Dean only' });
    const request = await DepartmentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Already reviewed' });

    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;
    const faculty = await SkillFaculty.findById(facultyId);
    const dept = request.department;

    if (request.isEdit && request.deptIndex != null) {
      // Edit existing department
      const existing = faculty.departments[request.deptIndex];
      if (!existing) return res.status(400).json({ success: false, message: 'Department no longer exists' });
      const oldEmail = existing.chairpersonEmail;
      const newEmail = dept.chairpersonEmail;
      if (newEmail && newEmail !== oldEmail) {
        if (existing.chairperson) await Chairperson.findByIdAndUpdate(existing.chairperson, { skillFaculty: null });
        const chairId = await registerChairperson(dept, facultyId);
        existing.chairperson = chairId;
      } else if (dept.chairpersonName && existing.chairperson) {
        await Chairperson.findByIdAndUpdate(existing.chairperson, { name: dept.chairpersonName });
      }
      existing.name = dept.name;
      existing.code = dept.code;
      existing.chairpersonName = dept.chairpersonName;
      existing.chairpersonEmail = dept.chairpersonEmail;
      faculty.departments[request.deptIndex] = existing;
    } else {
      // Add new department
      const deptEntry = { name: dept.name, code: dept.code, chairpersonName: dept.chairpersonName, chairpersonEmail: dept.chairpersonEmail };
      const chairId = await registerChairperson(dept, facultyId);
      if (chairId) deptEntry.chairperson = chairId;
      faculty.departments.push(deptEntry);
    }

    await faculty.save();
    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedByModel = 'Dean';
    request.reviewedAt = new Date();
    await request.save();
    res.json({ success: true, message: request.isEdit ? `"${dept.name}" updated!` : `"${dept.name}" approved and added!`, request });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Dean rejects
router.put('/requests/:id/reject', protect, async (req, res) => {
  try {
    if (req.user.role !== 'dean') return res.status(403).json({ success: false, message: 'Dean only' });
    const { reason } = req.body;
    const request = await DepartmentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Already reviewed' });

    request.status = 'rejected';
    request.rejectionReason = reason || '';
    request.reviewedBy = req.user._id;
    request.reviewedByModel = 'Dean';
    request.reviewedAt = new Date();
    await request.save();
    res.json({ success: true, message: 'Request rejected', request });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Dean edits department directly (no approval)
router.put('/direct/:facultyId/:deptIndex', protect, async (req, res) => {
  try {
    if (req.user.role !== 'dean') return res.status(403).json({ success: false, message: 'Dean only' });
    const { name, code, chairpersonName, chairpersonEmail } = req.body;
    const faculty = await SkillFaculty.findById(req.params.facultyId);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });
    const idx = parseInt(req.params.deptIndex);
    if (isNaN(idx) || idx < 0 || idx >= faculty.departments.length) {
      return res.status(400).json({ success: false, message: 'Invalid department index' });
    }
    const dept = faculty.departments[idx];
    const oldEmail = dept.chairpersonEmail;
    const newEmail = chairpersonEmail?.toLowerCase() || '';

    // If chairperson email changed, update chairperson record
    if (newEmail && newEmail !== oldEmail) {
      // Deactivate old chairperson link
      if (dept.chairperson) {
        await Chairperson.findByIdAndUpdate(dept.chairperson, { skillFaculty: null, departmentCode: null });
      }
      const chairId = await registerChairperson(
        { name: chairpersonName, code: code || dept.code, chairpersonName, chairpersonEmail: newEmail },
        faculty._id
      );
      dept.chairperson = chairId;
    } else if (chairpersonName && dept.chairperson) {
      await Chairperson.findByIdAndUpdate(dept.chairperson, { name: chairpersonName });
    }

    if (name) dept.name = name;
    if (code) dept.code = code.toUpperCase();
    if (chairpersonName) dept.chairpersonName = chairpersonName;
    if (chairpersonEmail) dept.chairpersonEmail = newEmail;
    faculty.departments[idx] = dept;
    await faculty.save();
    res.json({ success: true, message: 'Department updated!', faculty });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Super admin sends edit request to dean
router.post('/edit-request', protect, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super Admin only' });
    const { facultyId, deptIndex, name, code, chairpersonName, chairpersonEmail } = req.body;
    const faculty = await SkillFaculty.findById(facultyId);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });
    const dept = faculty.departments[deptIndex];
    if (!dept) return res.status(400).json({ success: false, message: 'Department not found' });

    const request = await DepartmentRequest.create({
      skillFaculty: facultyId,
      requestedBy: req.user._id,
      requestedByModel: 'User',
      isEdit: true,
      deptIndex,
      department: {
        name: name || dept.name,
        code: code?.toUpperCase() || dept.code,
        chairpersonName: chairpersonName || dept.chairpersonName,
        chairpersonEmail: chairpersonEmail?.toLowerCase() || dept.chairpersonEmail,
      },
    });
    res.status(201).json({ success: true, message: `Edit request sent to Dean of ${faculty.name}`, request });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Dean deletes department
router.delete('/:facultyId/:deptIndex', protect, async (req, res) => {
  try {
    if (req.user.role !== 'dean') return res.status(403).json({ success: false, message: 'Dean only' });
    const faculty = await SkillFaculty.findById(req.params.facultyId);
    if (!faculty) return res.status(404).json({ success: false, message: 'Not found' });
    const idx = parseInt(req.params.deptIndex);
    if (isNaN(idx) || idx < 0 || idx >= faculty.departments.length) {
      return res.status(400).json({ success: false, message: 'Invalid index' });
    }
    faculty.departments.splice(idx, 1);
    await faculty.save();
    res.json({ success: true, message: 'Department removed', faculty });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET all requests for admin (including accepted/rejected with reasons)
router.get('/requests/admin-history', protect, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const requests = await DepartmentRequest.find()
      .populate('skillFaculty', 'name code')
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
