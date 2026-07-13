const mongoose = require('mongoose');

const UserStateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  language: {
    type: String,
    required: true,
    index: true,
  },
  role: {
    type: String,
    required: true,
    index: true,
  },
  basedOnAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis',
    required: true,
    index: true,
  },
  previousAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis',
    default: null,
    index: true,
  },
  currentState: {
    type: String,
    required: true,
  },
  detectedRole: {
    type: String,
    default: null,
    index: true,
  },
  nextRole: {
    type: String,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('UserState', UserStateSchema);
