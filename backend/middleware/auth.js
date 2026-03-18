const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Dean = require('../models/Dean');
const Chairperson = require('../models/Chairperson');
const Coordinator = require('../models/Coordinator');
const Student = require('../models/Student');
const PlacementOfficer = require('../models/PlacementOfficer');

const findUserAnywhere = async (id) => {
  let user = await User.findById(id);
  if (user) return { user, role: 'super_admin' };
  user = await Dean.findById(id).populate('skillFaculty', 'name code departments');
  if (user) return { user, role: 'dean' };
  user = await Chairperson.findById(id).populate('skillFaculty', 'name code');
  if (user) return { user, role: 'chairperson' };
  user = await Coordinator.findById(id).populate('skillFaculty', 'name code').populate('course', 'name code');
  if (user) return { user, role: 'coordinator' };
  user = await PlacementOfficer.findById(id).populate('skillFaculty', 'name code');
  if (user) return { user, role: 'placement_officer' };
  user = await Student.findById(id).populate('skillFaculty', 'name code').populate('course', 'name code');
  if (user) return { user, role: 'student' };
  return null;
};

const findByEmailAnywhere = async (email) => {
  const e = email.toLowerCase();
  let found;
  found = await User.findOne({ email: e });
  if (found) return { user: found, role: 'super_admin' };
  found = await Dean.findOne({ email: e }).populate('skillFaculty', 'name code departments');
  if (found) return { user: found, role: 'dean' };
  found = await Chairperson.findOne({ email: e }).populate('skillFaculty', 'name code');
  if (found) return { user: found, role: 'chairperson' };
  found = await Coordinator.findOne({ email: e }).populate('skillFaculty', 'name code').populate('course', 'name code');
  if (found) return { user: found, role: 'coordinator' };
  found = await PlacementOfficer.findOne({ email: e }).populate('skillFaculty', 'name code');
  if (found) return { user: found, role: 'placement_officer' };
  found = await Student.findOne({ email: e }).populate('skillFaculty', 'name code').populate('course', 'name code');
  if (found) return { user: found, role: 'student' };
  return null;
};

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await findUserAnywhere(decoded.id);
    if (!result) return res.status(401).json({ success: false, message: 'User not found' });
    req.user = result.user;
    req.user.role = result.role;
    next();
  } catch { return res.status(401).json({ success: false, message: 'Invalid token' }); }
};

const superAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super Admin only' });
  next();
};

const generateToken = (id) => require('jsonwebtoken').sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

module.exports = { protect, superAdminOnly, generateToken, findUserAnywhere, findByEmailAnywhere };
