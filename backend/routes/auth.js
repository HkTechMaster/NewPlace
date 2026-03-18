const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const { protect, generateToken, findByEmailAnywhere } = require('../middleware/auth');
const Student = require('../models/Student');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @route  POST /api/auth/google
// @desc   Main Google OAuth login — checks ALL collections
//         If unknown email → return needs_registration with googleId
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ success: false, message: 'Credential required' });

    const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    // ── Check if this GOOGLE email matches any staff account ──────────
    const result = await findByEmailAnywhere(email);

    if (result) {
      const { user, role } = result;

      // Student special handling
      if (role === 'student') {
        if (user.status === 'pending') {
          return res.status(200).json({
            success: false,
            status: 'pending',
            message: 'Your registration is under review. Please wait for coordinator approval.',
          });
        }
        if (user.status === 'rejected') {
          return res.status(200).json({
            success: false,
            status: 'rejected',
            message: `Your registration was rejected. ${user.rejectionReason ? 'Reason: ' + user.rejectionReason : 'Contact your coordinator.'}`,
          });
        }
        // Active student — update Google info and login
        user.googleId = googleId;
        user.googleAvatar = picture;
        user.lastLogin = new Date();
        await user.save();
        const token = generateToken(user._id);
        return res.json({
          success: true,
          token,
          user: {
            _id: user._id, name: user.name, email: user.email,
            avatar: user.googleAvatar, role: 'student',
            skillFaculty: user.skillFaculty, course: user.course,
            batch: user.batch, semester: user.semester,
          },
          redirect: '/student/dashboard',
        });
      }

      // Staff account — preserve admin-set name
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account deactivated. Contact Super Admin.' });
      }
      user.googleId = googleId;
      user.avatar = picture;
      if (!user.name || ['Chairperson','Coordinator','Dean'].includes(user.name)) user.name = name;
      user.lastLogin = new Date();
      await user.save();

      const token = generateToken(user._id);
      const redirectMap = {
        super_admin: '/admin/dashboard',
        dean: '/dean/dashboard',
        chairperson: '/chairperson/dashboard',
        coordinator: '/coordinator/dashboard',
        placement_officer: '/placement/dashboard',
      };

      return res.json({
        success: true, token,
        user: {
          _id: user._id, name: user.name, email: user.email,
          avatar: user.avatar, role,
          skillFaculty: user.skillFaculty || null,
          departmentCode: user.departmentCode || null,
          departmentName: user.departmentName || null,
          lastLogin: user.lastLogin,
        },
        redirect: redirectMap[role] || '/login',
      });
    }

    // ── Unknown email → check if they already submitted a pending registration ──
    // Check by googleId in students collection
    const existingPending = await Student.findOne({ googleId });
    if (existingPending) {
      if (existingPending.status === 'pending') {
        return res.json({
          success: false,
          status: 'pending',
          message: 'Your registration is under review. Please wait for coordinator approval.',
        });
      }
      if (existingPending.status === 'rejected') {
        return res.json({
          success: false,
          status: 'rejected',
          message: `Your registration was rejected. ${existingPending.rejectionReason ? 'Reason: ' + existingPending.rejectionReason : 'Contact your coordinator.'}`,
        });
      }
    }

    // ── Totally new user on STAFF login → Access Denied ─────────
    return res.json({
      success: false,
      status: 'access_denied',
      message: 'This email is not registered in the system. Staff accounts are created by Super Admin. If you are a student, please use the Student Login page.',
    });

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
});

// @route  GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({
    success: true,
    user: {
      _id: req.user._id, name: req.user.name, email: req.user.email,
      avatar: req.user.avatar || req.user.googleAvatar || null,
      role: req.user.role,
      skillFaculty: req.user.skillFaculty || null,
      departmentCode: req.user.departmentCode || null,
    },
  });
});

module.exports = router;
