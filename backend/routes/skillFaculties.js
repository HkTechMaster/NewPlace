const express = require('express');
const router = express.Router();
const SkillFaculty = require('../models/SkillFaculty');
const User = require('../models/User');
const { protect, superAdminOnly } = require('../middleware/auth');

// @route  GET /api/skill-faculties
// @desc   Get all skill faculties
// @access Private
router.get('/', protect, async (req, res) => {
  try {
    const faculties = await SkillFaculty.find().populate('dean', 'name email avatar');
    res.json({ success: true, count: faculties.length, faculties });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  GET /api/skill-faculties/:id
// @desc   Get single skill faculty
// @access Private
router.get('/:id', protect, async (req, res) => {
  try {
    const faculty = await SkillFaculty.findById(req.params.id).populate('dean', 'name email avatar');
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Skill Faculty not found' });
    }
    res.json({ success: true, faculty });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  POST /api/skill-faculties
// @desc   Create a new skill faculty with dean
// @access Super Admin only
router.post('/', protect, superAdminOnly, async (req, res) => {
  try {
    const { code, name, description, deanName, deanEmail, departments } = req.body;

    if (!code || !name || !deanName || !deanEmail) {
      return res.status(400).json({
        success: false,
        message: 'Faculty code, name, dean name, and dean email are required',
      });
    }

    const existingFaculty = await SkillFaculty.findOne({ code: code.toUpperCase() });
    if (existingFaculty) {
      return res.status(400).json({
        success: false,
        message: `Faculty with code "${code.toUpperCase()}" already exists`,
      });
    }

    // Create the skill faculty
    const faculty = await SkillFaculty.create({
      code: code.toUpperCase(),
      name,
      description,
      deanName,
      deanEmail: deanEmail.toLowerCase(),
      departments: departments || [],
    });

    // Create or update Dean user
    let deanUser = await User.findOne({ email: deanEmail.toLowerCase() });
    if (deanUser && deanUser.role === 'super_admin') {
      await faculty.deleteOne();
      return res.status(400).json({ success: false, message: 'This email belongs to a Super Admin account' });
    }
    if (!deanUser) {
      deanUser = await User.create({ name: deanName, email: deanEmail.toLowerCase(), role: 'dean', skillFaculty: faculty._id });
    } else {
      deanUser.name = deanName;
      deanUser.role = 'dean';
      deanUser.skillFaculty = faculty._id;
      deanUser.isActive = true;
      await deanUser.save();
    }
    faculty.dean = deanUser._id;

    // Register chairpersons as users
    const updatedDepts = [];
    for (const dept of (departments || [])) {
      const deptEntry = { ...dept };
      if (dept.chairpersonEmail) {
        let chair = await User.findOne({ email: dept.chairpersonEmail.toLowerCase() });
        if (!chair) {
          chair = await User.create({
            name: dept.chairpersonName || 'Chairperson',
            email: dept.chairpersonEmail.toLowerCase(),
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
        deptEntry.chairperson = chair._id;
      }
      updatedDepts.push(deptEntry);
    }

    faculty.departments = updatedDepts;
    await faculty.save();

    const populatedFaculty = await SkillFaculty.findById(faculty._id).populate('dean', 'name email avatar');

    res.status(201).json({
      success: true,
      message: `Skill Faculty "${name}" created! Dean and Chairpersons can now login with Google.`,
      faculty: populatedFaculty,
    });
  } catch (error) {
    console.error('Create faculty error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  PUT /api/skill-faculties/:id
// @desc   Update a skill faculty
// @access Super Admin only
router.put('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      deanName,
      deanEmail,
      establishedYear,
      totalStudents,
      departments,
      contactEmail,
      isActive,
    } = req.body;

    const faculty = await SkillFaculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Skill Faculty not found' });
    }

    // If dean email changed, update user accounts
    if (deanEmail && deanEmail.toLowerCase() !== faculty.deanEmail) {
      // Deactivate old dean
      if (faculty.dean) {
        const oldDean = await User.findById(faculty.dean);
        if (oldDean && oldDean.role === 'dean') {
          oldDean.skillFaculty = null;
          await oldDean.save();
        }
      }

      // Create or update new dean
      let newDean = await User.findOne({ email: deanEmail.toLowerCase() });
      if (!newDean) {
        newDean = await User.create({
          name: deanName || faculty.deanName,
          email: deanEmail.toLowerCase(),
          role: 'dean',
          skillFaculty: faculty._id,
        });
      } else {
        newDean.name = deanName || newDean.name;
        newDean.role = 'dean';
        newDean.skillFaculty = faculty._id;
        newDean.isActive = true;
        await newDean.save();
      }
      faculty.dean = newDean._id;
    } else if (deanName && faculty.dean) {
      // Just update dean name
      await User.findByIdAndUpdate(faculty.dean, { name: deanName });
    }

    // Update faculty fields
    if (code) faculty.code = code.toUpperCase();
    if (name) faculty.name = name;
    if (description !== undefined) faculty.description = description;
    if (deanName) faculty.deanName = deanName;
    if (deanEmail) faculty.deanEmail = deanEmail.toLowerCase();
    if (establishedYear) faculty.establishedYear = establishedYear;
    if (totalStudents !== undefined) faculty.totalStudents = totalStudents;
    if (departments) faculty.departments = departments;
    if (contactEmail) faculty.contactEmail = contactEmail;
    if (isActive !== undefined) faculty.isActive = isActive;

    await faculty.save();

    const updatedFaculty = await SkillFaculty.findById(faculty._id).populate('dean', 'name email avatar');

    res.json({
      success: true,
      message: 'Skill Faculty updated successfully',
      faculty: updatedFaculty,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  DELETE /api/skill-faculties/:id
// @desc   Delete a skill faculty
// @access Super Admin only
router.delete('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const faculty = await SkillFaculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Skill Faculty not found' });
    }

    // Remove dean's skill faculty reference
    if (faculty.dean) {
      await User.findByIdAndUpdate(faculty.dean, { skillFaculty: null });
    }

    await faculty.deleteOne();
    res.json({ success: true, message: 'Skill Faculty deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
