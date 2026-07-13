const crypto = require('crypto');
function generateRequestId() {
  return crypto.randomBytes(6).toString('hex'); // 12 chars
}

module.exports = {
  generateRequestId,
};