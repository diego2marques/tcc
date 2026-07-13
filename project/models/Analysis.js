const mongoose = require('mongoose');

// TODO pensar melhor futuramente sobre o formato de result, podemos quebrar em atributos por exemplo.
// TODO hoje guardamos a ultima analise aqui tambem, mas e importante saber que no futuro queremos usar
// ou a propria OpenAI ou algum tipo de concatenacao de analises.
const AnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  language: {
    type: String,
    required: true,
    index: true,
  },
  comparedToAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis',
    default: null,
    index: true,
  },
  result: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Analysis', AnalysisSchema, 'analysis');
