const mongoose = require('mongoose');

const ConsolidationSchema = new mongoose.Schema({
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
  basedOnUserStateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserState',
    required: true,
    index: true,
  },
  previousUserStateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserState',
    default: null,
    index: true,
  },
  previousImprovementPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ImprovementPlan',
    default: null,
    index: true,
  },
  content: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Consolidation', ConsolidationSchema);
