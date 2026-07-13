const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  externalId: { type: String, index: true },
  name: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  role: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
