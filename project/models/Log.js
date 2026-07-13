const mongoose = require('mongoose');
const LogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, default: null },
    requestId: { type: String, index: true },
    level: {
      type: String,
      enum: ["debug", "info", "warn", "error"],
      required: true,
      index: true
    },
    action: { type: String, required: true, index: true },
    message: { type: String, required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", index: true, default: null },
    analysisId: { type: mongoose.Schema.Types.ObjectId, ref: "Analysis", index: true, default: null },
    error: {
      name: String,
      message: String,
      stack: String
    },
  },
  { timestamps: true }
);
LogSchema.index({ createdAt: -1 }, { expireAfterSeconds: 60 * 60 * 24 * 14 });

module.exports = mongoose.model('Log', LogSchema);