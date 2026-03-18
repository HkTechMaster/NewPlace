const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['aptitude','technical','hr','group_discussion','assignment','other'], default: 'other' },
  date: { type: Date, default: null },
  venue: { type: String, default: '' },
  attendance: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    name: String,
    present: { type: Boolean, default: false },
  }],
  results: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    name: String,
    status: { type: String, enum: ['selected','rejected','next_round','pending'], default: 'pending' },
    remarks: { type: String, default: '' },
  }],
  status: { type: String, enum: ['upcoming','ongoing','completed'], default: 'upcoming' },
}, { _id: true });

const driveSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  company: { type: String, required: true },
  title: { type: String, required: true },
  skillFaculty: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillFaculty', required: true },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlacementOfficer', required: true },

  // Participants — from job applications
  participants: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    name: String,
    email: String,
    enrollmentNo: String,
    photo: String,
    cgpa: Number,
    finalStatus: { type: String, enum: ['in_process','selected','rejected'], default: 'in_process' },
    offerLetter: { type: String, default: '' }, // base64 or URL
    offerUploadedBy: { type: String, enum: ['po','student',''], default: '' },
  }],

  rounds: [roundSchema],
  driveStatus: { type: String, enum: ['upcoming','ongoing','completed'], default: 'upcoming' },
  startDate: { type: Date, default: null },
}, { timestamps: true, collection: 'drives' });

module.exports = mongoose.model('Drive', driveSchema);
