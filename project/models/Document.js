const mongoose = require('mongoose');

// Essa tabela pode morrer futuramente visto que salvar tudo isso do doc talvez nao seja tao interessante.
const DocumentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: { type: String, required: true, trim: true },
  extension: { type: String, required: true, lowercase: true },
  language: { type: String, required: true, trim: true },
  content: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);
