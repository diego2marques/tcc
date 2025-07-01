const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { analyzeCSSCode } = require('../services/openaiService');
const Analysis = require('../models/Analysis');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { userId, userName, documentId } = req.body;
    const lastRecord = await Analysis.findOne({ userId }).sort({ date: -1 });
    const file = req.file;
    const extension = path.extname(file.originalname).replace('.', '');

    if (extension !== 'css') {
      return res.status(400).send('Apenas arquivos .css são permitidos.');
    }

    const code = fs.readFileSync(file.path, 'utf8');
    const previousCode = lastRecord?.analysis || null;
    const analysis = await analyzeCSSCode(code, previousCode);

    const record = new Analysis({
      userId,
      userName,
      documentId,
      extension,
      analysis,
    });

    await record.save();
    fs.unlinkSync(file.path); // limpar arquivo

    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao analisar o arquivo.');
  }
});

module.exports = router;