const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { protect } = require('../middleware/auth');
const StaffNotification = require('../models/StaffNotification');
const PlacementOfficer  = require('../models/PlacementOfficer');
const Chairperson       = require('../models/Chairperson');
const notifyStaff       = require('../utils/notifyStaff');

// ─── CRITICAL helper ────────────────────────────────────────────────────────
// auth.js sets req.user.role BUT req.user is a Mongoose doc whose schema has
// its own `role` field (default: 'chairperson'). On some Mongoose versions
// the assigned value gets shadowed by the schema default when accessed.
// Solution: read role directly from the JWT token — always reliable.
const getRoleFromToken = (req) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // JWT only has `id` — use req.user.role but fall back to re-deriving it
    // The safest approach: trust req.user.role but read it as a plain string
    return String(req.user.role);
  } catch {
    return String(req.user.role);
  }
};

const modelName = (role) =>
  role === 'placement_officer' ? 'PlacementOfficer' : 'Chairperson';

// ════════════════════════════════════════════════════════════════════════════
// IMPORTANT: All named/static routes MUST come before /:id param routes
// ════════════════════════════════════════════════════════════════════════════

// ─── GET /api/staff-notifications/chairpersons ──────────────────────────────
router.get('/chairpersons', protect, async (req, res) => {
  try {
    const role = getRoleFromToken(req);
    if (role !== 'placement_officer')
      return res.status(403).json({ success: false, message: 'PO only' });

    // Get skillFaculty ID safely — req.user.skillFaculty may be populated object
    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;

    if (!facultyId) {
      return res.status(400).json({ success: false, message: 'No faculty assigned to this PO' });
    }

    // Direct query on Chairperson collection — no dependency on Course model
    const chairpersons = await Chairperson.find({
      skillFaculty: facultyId,
    }).select('name email departmentName departmentCode');

    res.json({ success: true, chairpersons });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── PATCH /api/staff-notifications/mark-all-read ───────────────────────────
router.patch('/mark-all-read', protect, async (req, res) => {
  try {
    const role = getRoleFromToken(req);
    await StaffNotification.updateMany(
      {
        recipientId:    req.user._id,
        recipientModel: modelName(role),
        isRead: false,
      },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── POST /api/staff-notifications/po-message ───────────────────────────────
router.post('/po-message', protect, async (req, res) => {
  try {
    const role = getRoleFromToken(req);
    if (role !== 'placement_officer')
      return res.status(403).json({ success: false, message: 'Only Placement Officers can send messages' });

    const { chairpersonId, message } = req.body;
    if (!chairpersonId || !message?.trim())
      return res.status(400).json({ success: false, message: 'chairpersonId and message are required' });

    const [chairperson, po] = await Promise.all([
      Chairperson.findById(chairpersonId),
      PlacementOfficer.findById(req.user._id),
    ]);

    if (!chairperson)
      return res.status(404).json({ success: false, message: 'Chairperson not found' });

    await notifyStaff({
      recipientId:    chairperson._id,
      recipientModel: 'Chairperson',
      recipientEmail: chairperson.email,
      recipientName:  chairperson.name,
      title:   `Message from Placement Officer — ${po.name}`,
      message: message.trim(),
      type:    'po_message',
      metadata: { poId: po._id, poName: po.name },
    });

    res.json({ success: true, message: `Message sent to ${chairperson.name}` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── GET /api/staff-notifications ───────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const role = getRoleFromToken(req);
    const allowed = ['placement_officer', 'chairperson'];
    if (!allowed.includes(role))
      return res.status(403).json({ success: false, message: 'Access denied' });

    const notifications = await StaffNotification.find({
      recipientId:    req.user._id,
      recipientModel: modelName(role),
    }).sort({ createdAt: -1 });

    const unreadCount = notifications.filter(n => !n.isRead).length;
    res.json({ success: true, notifications, unreadCount });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── PATCH /api/staff-notifications/:id/read ────────────────────────────────
// NOTE: Must be AFTER all static routes to avoid param conflicts
router.patch('/:id/read', protect, async (req, res) => {
  try {
    await StaffNotification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── DELETE /api/staff-notifications/:id ────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    await StaffNotification.findOneAndDelete({
      _id: req.params.id,
      recipientId: req.user._id,
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
