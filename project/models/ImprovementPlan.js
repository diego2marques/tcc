const mongoose = require('mongoose');

const ImprovementPlanSchema = new mongoose.Schema({
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
  basedOnUserStateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserState',
    required: true,
    index: true,
  },
  basedOnConsolidationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consolidation',
    required: true,
    index: true,
  },
  nextRole: {
    type: String,
    default: null,
  },
  detectedRole: {
    type: String,
    default: null,
    index: true,
  },
  content: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('ImprovementPlan', ImprovementPlanSchema);
