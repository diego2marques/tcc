require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const analyzeRoute = require('./routes/analyze');

const app = express();
app.use(express.json());
app.use('/analyze', analyzeRoute);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB conectado');
    app.listen(3000, () => console.log('API rodando em http://localhost:3000'));
  })
  .catch(err => console.error('Erro de conexão Mongo:', err));