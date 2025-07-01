const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  documentId: String,
  extension: String,
  date: { type: Date, default: Date.now },
  analysis: String,
});

module.exports = mongoose.model('Analysis', analysisSchema);