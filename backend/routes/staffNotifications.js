const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const StaffNotification = require('../models/StaffNotification');
const PlacementOfficer  = require('../models/PlacementOfficer');
const Chairperson       = require('../models/Chairperson');
const notifyStaff       = require('../utils/notifyStaff');

// ─── helper ─────────────────────────────────────────────────────────────────
const modelName = (role) =>
  role === 'placement_officer' ? 'PlacementOfficer' : 'Chairperson';

// ─── GET /api/staff-notifications/chairpersons ──────────────────────────────
// IMPORTANT: This route MUST be defined BEFORE /:id routes to avoid conflicts
// PO fetches list of chairpersons in same faculty for the message dropdown
router.get('/chairpersons', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer')
      return res.status(403).json({ success: false, message: 'PO only' });

    const facultyId = req.user.skillFaculty?._id || req.user.skillFaculty;

    // Direct DB query on Chairperson model — most reliable approach
    const chairpersons = await Chairperson.find({
      skillFaculty: facultyId,
      isActive: { $ne: false }, // include docs where isActive is true or not set
    }).select('name email departmentName departmentCode');

    res.json({ success: true, chairpersons });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── GET /api/staff-notifications/mark-all-read ─────────────────────────────
// IMPORTANT: Also must be before /:id to avoid 'mark-all-read' being treated as an id
router.patch('/mark-all-read', protect, async (req, res) => {
  try {
    await StaffNotification.updateMany(
      { recipientId: req.user._id, recipientModel: modelName(req.user.role), isRead: false },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── GET /api/staff-notifications ───────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const allowed = ['placement_officer', 'chairperson'];
    if (!allowed.includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Access denied' });

    const notifications = await StaffNotification.find({
      recipientId:    req.user._id,
      recipientModel: modelName(req.user.role),
    }).sort({ createdAt: -1 });

    const unreadCount = notifications.filter(n => !n.isRead).length;
    res.json({ success: true, notifications, unreadCount });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── POST /api/staff-notifications/po-message ───────────────────────────────
router.post('/po-message', protect, async (req, res) => {
  try {
    if (req.user.role !== 'placement_officer')
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
      title:  `Message from Placement Officer — ${po.name}`,
      message: message.trim(),
      type:   'po_message',
      metadata: { poId: po._id, poName: po.name },
    });

    res.json({ success: true, message: `Message sent to ${chairperson.name}` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── PATCH /api/staff-notifications/:id/read ────────────────────────────────
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
