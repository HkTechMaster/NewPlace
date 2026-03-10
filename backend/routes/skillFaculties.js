const express = require('express');
const router = express.Router();
const SkillFaculty = require('../models/SkillFaculty');
const Dean = require('../models/Dean');
const Chairperson = require('../models/Chairperson');
const DepartmentRequest = require('../models/DepartmentRequest');
const { protect, superAdminOnly } = require('../middleware/auth');

// GET all
router.get('/', protect, async (req, res) => {
  try {
    const faculties = await SkillFaculty.find().populate('dean', 'name email avatar');
    res.json({ success: true, count: faculties.length, faculties });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET one
router.get('/:id', protect, async (req, res) => {
  try {
    const faculty = await SkillFaculty.findById(req.params.id)
      .populate('dean', 'name email avatar')
      .populate('departments.chairperson', 'name email');
    if (!faculty) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, faculty });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST create — super admin creates faculty + registers dean
router.post('/', protect, superAdminOnly, async (req, res) => {
  try {
    const { code, name, description, deanName, deanEmail, departments } = req.body;
    if (!code || !name || !deanName || !deanEmail) {
      return res.status(400).json({ success: false, message: 'Code, name, dean name & email required' });
    }

    if (await SkillFaculty.findOne({ code: code.toUpperCase() })) {
      return res.status(400).json({ success: false, message: `Faculty code "${code.toUpperCase()}" already exists` });
    }

    // Create faculty first
    const faculty = await SkillFaculty.create({
      code: code.toUpperCase(), name, description,
      deanName, deanEmail: deanEmail.toLowerCase(),
    });

    // Register dean in deans collection
    let dean = await Dean.findOne({ email: deanEmail.toLowerCase() });
    if (!dean) {
      dean = await Dean.create({ name: deanName, email: deanEmail.toLowerCase(), skillFaculty: faculty._id });
    } else {
      dean.name = deanName; dean.skillFaculty = faculty._id; dean.isActive = true;
      await dean.save();
    }
    faculty.dean = dean._id;

    // Register any initial departments + chairpersons
    const processedDepts = [];
    for (const dept of (departments || [])) {
      const entry = { name: dept.name, code: dept.code?.toUpperCase() || '', chairpersonName: dept.chairpersonName || '', chairpersonEmail: dept.chairpersonEmail?.toLowerCase() || '' };
      if (dept.chairpersonEmail) {
        let chair = await Chairperson.findOne({ email: dept.chairpersonEmail.toLowerCase() });
        if (!chair) {
          chair = await Chairperson.create({
            name: dept.chairpersonName || 'Chairperson',
            email: dept.chairpersonEmail.toLowerCase(),
            skillFaculty: faculty._id,
            departmentCode: dept.code || dept.name,
            departmentName: dept.name,
          });
        } else {
          chair.skillFaculty = faculty._id;
          chair.departmentCode = dept.code || dept.name;
          chair.departmentName = dept.name;
          chair.isActive = true;
          await chair.save();
        }
        entry.chairperson = chair._id;
      }
      processedDepts.push(entry);
    }

    faculty.departments = processedDepts;
    await faculty.save();

    const populated = await SkillFaculty.findById(faculty._id).populate('dean', 'name email avatar');
    res.status(201).json({
      success: true,
      message: `Faculty "${name}" created! Dean & Chairpersons registered.`,
      faculty: populated,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// PUT update — dept additions → send as requests to dean
router.put('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const { code, name, description, deanName, deanEmail, departments, isActive } = req.body;
    const faculty = await SkillFaculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ success: false, message: 'Not found' });

    // Dean email change
    if (deanEmail && deanEmail.toLowerCase() !== faculty.deanEmail) {
      if (faculty.dean) {
        await Dean.findByIdAndUpdate(faculty.dean, { skillFaculty: null });
      }
      let newDean = await Dean.findOne({ email: deanEmail.toLowerCase() });
      if (!newDean) {
        newDean = await Dean.create({ name: deanName || faculty.deanName, email: deanEmail.toLowerCase(), skillFaculty: faculty._id });
      } else {
        newDean.name = deanName || newDean.name; newDean.skillFaculty = faculty._id; newDean.isActive = true;
        await newDean.save();
      }
      faculty.dean = newDean._id;
    } else if (deanName && faculty.dean) {
      await Dean.findByIdAndUpdate(faculty.dean, { name: deanName });
    }

    // New departments → send as requests to dean
    let requestsSent = 0;
    if (departments && departments.length > 0) {
      const existingCodes = faculty.departments.map(d => d.code?.toUpperCase()).filter(Boolean);
      const existingNames = faculty.departments.map(d => d.name?.toLowerCase()).filter(Boolean);
      for (const dept of departments) {
        const isNew = dept.code ? !existingCodes.includes(dept.code?.toUpperCase()) : !existingNames.includes(dept.name?.toLowerCase());
        if (isNew) {
          await DepartmentRequest.create({
            skillFaculty: faculty._id,
            requestedBy: req.user._id,
            requestedByModel: 'User',
            department: { name: dept.name, code: dept.code?.toUpperCase() || '', chairpersonName: dept.chairpersonName || '', chairpersonEmail: dept.chairpersonEmail?.toLowerCase() || '' },
          });
          requestsSent++;
        }
      }
    }

    if (code) faculty.code = code.toUpperCase();
    if (name) faculty.name = name;
    if (description !== undefined) faculty.description = description;
    if (deanName) faculty.deanName = deanName;
    if (deanEmail) faculty.deanEmail = deanEmail.toLowerCase();
    if (isActive !== undefined) faculty.isActive = isActive;

    await faculty.save();
    const updated = await SkillFaculty.findById(faculty._id).populate('dean', 'name email avatar');
    res.json({
      success: true,
      message: requestsSent > 0 ? `Updated. ${requestsSent} dept request(s) sent to Dean for approval.` : 'Updated successfully',
      faculty: updated,
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE
router.delete('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const faculty = await SkillFaculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ success: false, message: 'Not found' });
    if (faculty.dean) await Dean.findByIdAndUpdate(faculty.dean, { skillFaculty: null });
    await faculty.deleteOne();
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
