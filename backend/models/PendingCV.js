const mongoose = require('mongoose');

// Mirrors CV schema but represents a resubmission while old CV is still verified
const pendingCVSchema = new mongoose.Schema({
  student:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  cv:       { type: mongoose.Schema.Types.ObjectId, ref: 'CV', required: true }, // parent CV
  data:     { type: mongoose.Schema.Types.Mixed, required: true }, // full CV data snapshot
  status:   { type: String, enum: ['pending','accepted','rejected'], default: 'pending' },
  rejectionReason: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Coordinator', default: null },
  reviewedAt: { type: Date, default: null },
  submittedAt: { type: Date, default: new Date() },
}, { timestamps: true, collection: 'pendingcvs' });

module.exports = mongoose.model('PendingCV', pendingCVSchema);
