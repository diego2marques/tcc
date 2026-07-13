const express = require('express');
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');

const { getSupportedRoles, normalizeRole } = require('../config/roleConfig');
const { runAnalysisPipeline } = require('../services/openaiService');
const Analysis = require('../models/Analysis');
const Consolidation = require('../models/Consolidation');
const User = require('../models/User');
const Document = require('../models/Document');
const ImprovementPlan = require('../models/ImprovementPlan');
const UserState = require('../models/UserState');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const SUPPORTED_LANGUAGES = {
  java: 'Java',
  ts: 'TypeScript',
  jsx: 'React',
  tsx: 'React',
};

function resolveLanguage(extension) {
  return SUPPORTED_LANGUAGES[extension] || null;
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

router.post('/', upload.single('file'), async (req, res) => {
  const log = req.log;
  const requestId = req.requestId;
  let uploadedFilePath = null;

  try {
    log.info('analysis.request.received', 'Incoming analysis request');

    // No futuro algumas dessas informacoes deverao vir da API do Git.
    const { externalId, userName, userEmail, role } = req.body;

    const normalizedEmail = normalizeEmail(userEmail);
    if (!normalizedEmail) {
      log.warn('analysis.validation', 'Missing userEmail');
      return res.status(400).json({ error: 'userEmail e obrigatorio.', requestId });
    }

    const file = req.file;
    if (!file) {
      log.warn('analysis.validation', 'Arquivo nao enviado (field "file").');
      return res
        .status(400)
        .json({ error: 'Arquivo nao enviado (field "file").', requestId });
    }
    uploadedFilePath = file.path;

    const extension = path.extname(file.originalname).replace('.', '').toLowerCase();
    const language = resolveLanguage(extension);
    if (!language) {
      log.warn('analysis.validation', `Invalid extension: ${extension}`);
      return res.status(400).json({
        error: 'Apenas arquivos .java, .ts, .jsx e .tsx sao permitidos.',
        requestId,
      });
    }

    log.debug('analysis.user.upsert.start', 'Upserting user');
    const existingUser = await User.findOne({ email: normalizedEmail });
    const normalizedRequestRole = normalizeRole(role);
    const normalizedExistingRole = normalizeRole(existingUser?.role);
    const normalizedRole = normalizedRequestRole || normalizedExistingRole;

    if (role && !normalizedRequestRole) {
      log.warn('analysis.validation', `Invalid role: ${role}`);
      return res.status(400).json({
        error: `role invalida. Use uma destas opcoes: ${getSupportedRoles().join(', ')}.`,
        requestId,
      });
    }

    if (!normalizedRole) {
      log.warn('analysis.validation', `Missing role for email=${normalizedEmail}`);
      return res.status(400).json({
        error: `role e obrigatoria para usuarios novos. Use uma destas opcoes: ${getSupportedRoles().join(', ')}.`,
        requestId,
      });
    }

    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $setOnInsert: { email: normalizedEmail, createdAt: new Date() },
        $set: {
          externalId: externalId ?? existingUser?.externalId,
          name: userName ?? existingUser?.name,
          role: normalizedRole,
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );
    log.info('analysis.user.upsert.done', `User resolved userId=${user._id}`);
    log.setContext({ userId: user._id });

    log.debug('analysis.file.read.start', 'Reading uploaded file');
    const code = await fs.readFile(file.path, 'utf8');
    log.debug('analysis.file.read.done', `Read ${language} content length=${code.length}`);

    log.debug('analysis.document.create.start', 'Creating document');
    const document = await Document.create({
      userId: user._id,
      name: file.originalname,
      extension,
      language,
      content: code,
    });
    log.info('analysis.document.create.done', `Document created documentId=${document._id}`);
    log.setContext({ documentId: document._id });

    log.debug('analysis.last.fetch.start', 'Fetching last analysis');
    const lastRecord = await Analysis.findOne({
      userId: user._id,
      language,
    }).sort({ createdAt: -1 });
    log.debug(
      'analysis.last.fetch.done',
      lastRecord ? `Found lastAnalysisId=${lastRecord._id}` : 'No previous analysis'
    );

    const previousAnalysis = lastRecord?.result || null;
    const previousUserStateRecord = await UserState.findOne({
      userId: user._id,
      language,
    }).sort({ createdAt: -1 });
    const previousImprovementPlanRecord = await ImprovementPlan.findOne({
      userId: user._id,
      language,
    }).sort({ createdAt: -1 });

    log.debug('analysis.ai.start', `Running analysis pipeline for language=${language} role=${normalizedRole}`);
    const pipelineResult = await runAnalysisPipeline({
      code,
      language,
      role: normalizedRole,
      previousAnalysis,
      previousUserState: previousUserStateRecord?.currentState || null,
      previousImprovementPlan: previousImprovementPlanRecord?.content || null,
    });
    log.info('analysis.ai.done', 'analysis pipeline finished');

    log.debug('analysis.record.create.start', 'Saving analysis record');
    const record = await Analysis.create({
      userId: user._id,
      documentId: document._id,
      language,
      comparedToAnalysisId: lastRecord?._id ?? null,
      result: pipelineResult.codeAnalysis,
    });
    log.info('analysis.record.create.done', `Analysis saved analysisId=${record._id}`);
    log.setContext({ analysisId: record._id });

    log.debug('analysis.state.create.start', 'Saving user state');
    const userState = await UserState.create({
      userId: user._id,
      language,
      role: normalizedRole,
      basedOnAnalysisId: record._id,
      previousAnalysisId: lastRecord?._id ?? null,
      currentState: pipelineResult.currentState,
      detectedRole: pipelineResult.detectedRole,
      nextRole: pipelineResult.nextRole,
    });
    log.info('analysis.state.create.done', `User state saved userStateId=${userState._id}`);

    log.debug('analysis.consolidation.create.start', 'Saving consolidation report');
    const consolidationRecord = await Consolidation.create({
      userId: user._id,
      language,
      role: normalizedRole,
      basedOnUserStateId: userState._id,
      previousUserStateId: previousUserStateRecord?._id ?? null,
      previousImprovementPlanId: previousImprovementPlanRecord?._id ?? null,
      content: pipelineResult.consolidationReport,
    });
    log.info(
      'analysis.consolidation.create.done',
      `Consolidation saved consolidationId=${consolidationRecord._id}`
    );

    log.debug('analysis.improvement.create.start', 'Saving improvement plan');
    const improvementPlanRecord = await ImprovementPlan.create({
      userId: user._id,
      language,
      role: normalizedRole,
      basedOnAnalysisId: record._id,
      basedOnUserStateId: userState._id,
      basedOnConsolidationId: consolidationRecord._id,
      detectedRole: pipelineResult.detectedRole,
      nextRole: pipelineResult.nextRole,
      content: pipelineResult.improvementPlan,
    });
    log.info(
      'analysis.improvement.create.done',
      `Improvement plan saved improvementPlanId=${improvementPlanRecord._id}`
    );

    return res.json({
      ok: true,
      requestId,
      user: {
        id: user._id,
        externalId: user.externalId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      document: {
        id: document._id,
        name: document.name,
        extension: document.extension,
        language: document.language,
      },
      appliedRole: normalizedRole,
      detectedRole: pipelineResult.detectedRole,
      stateSnapshot: pipelineResult.stateSnapshot,
      analysis: record,
      userState,
      consolidation: consolidationRecord,
      improvementPlan: improvementPlanRecord,
    });
  } catch (err) {
    log.error('analysis.error', 'Error in analysis route', { error: err });

    return res.status(500).json({
      error: err?.message || 'Erro ao analisar o arquivo.',
      requestId,
    });
  } finally {
    if (uploadedFilePath) {
      try {
        await fs.unlink(uploadedFilePath);
        log.debug('analysis.cleanup', 'Temp file removed');
      } catch (e) {
        log.warn('analysis.cleanup', `Failed to remove temp file: ${e?.message}`);
      }
    }
  }
});

module.exports = router;
