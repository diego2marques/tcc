require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const { getProvider, resolveModel } = require('../services/llm/textGenerationClient');
const { getSupportedRoles, normalizeRole } = require('../config/roleConfig');
const { runAnalysisPipeline } = require('../services/openaiService');
const Analysis = require('../models/Analysis');
const Consolidation = require('../models/Consolidation');
const User = require('../models/User');
const Document = require('../models/Document');
const ImprovementPlan = require('../models/ImprovementPlan');
const UserState = require('../models/UserState');

const API_BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:3000';
const RUN_LABEL = process.env.TEST_RUN_LABEL || null;
const RUN_SEQUENCE = process.env.TEST_RUN_SEQUENCE || null;
const INCLUDE_MODEL_IN_RUN_ID = process.env.TEST_INCLUDE_MODEL_IN_RUN_ID === 'true';
const TEST_RUN_MODE = (process.env.TEST_RUN_MODE || 'api').trim().toLowerCase();
const TEST_TRACKS = (process.env.TEST_TRACKS || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const TEST_FILE_FILTER = (process.env.TEST_FILE_FILTER || '').trim().toLowerCase();
const TEST_START_INDEX = parsePositiveInteger(process.env.TEST_START_INDEX) || 1;
const TEST_END_INDEX = parsePositiveInteger(process.env.TEST_END_INDEX);
const TEST_MAX_FILES_PER_TRACK = parsePositiveInteger(process.env.TEST_MAX_FILES_PER_TRACK);
const TEST_STOP_ON_ERROR = process.env.TEST_STOP_ON_ERROR === 'true';

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const PROJECT_DIR = path.resolve(__dirname, '..');
const TEST_FILES_DIR = path.join(ROOT_DIR, 'test files');
const RESULTS_DIR = path.join(PROJECT_DIR, 'test-results');
const RESULTS_PROVIDER = slugify(getProvider());

const MODEL_INFO = {
  codeAnalysisModel: resolveModel(process.env.CODE_ANALYSIS_MODEL),
  progressStateModel: resolveModel(process.env.PROGRESS_STATE_MODEL),
  consolidationModel: resolveModel(process.env.CONSOLIDATION_AGENT_MODEL),
  improvementModel: resolveModel(process.env.IMPROVEMENT_AGENT_MODEL),
};

const TRACKS = [
  {
    key: 'typescript',
    languageFolder: 'typescript',
    userName: 'TypeScript Progression',
    userEmail: 'typescript.progression@teste.local',
    files: [
      'junior_iniciante.ts',
      'junior_medio.ts',
      'junior_avancado.ts',
      'pleno_iniciante.ts',
      'pleno_medio.ts',
      'pleno_avancado.ts',
      'senior_iniciante.ts',
      'senior_medio.ts',
      'senior_avancado.ts',
    ],
  },
  {
    key: 'java',
    languageFolder: 'java',
    userName: 'Java Progression',
    userEmail: 'java.progression@teste.local',
    files: [
      'junior_iniciante.java',
      'junior_medio.java',
      'junior_avancado.java',
      'pleno_iniciante.java',
      'pleno_medio.java',
      'pleno_avancado.java',
      'senior_iniciante.java',
      'senior_medio.java',
      'senior_avancado.java',
    ],
  },
  {
    key: 'react',
    languageFolder: 'react',
    userName: 'React Progression',
    userEmail: 'react.progression@teste.local',
    files: [
      'junior_iniciante.jsx',
      'junior_medio.jsx',
      'junior_avancado.jsx',
      'pleno_iniciante.jsx',
      'pleno_medio.jsx',
      'pleno_avancado.jsx',
      'senior_iniciante.jsx',
      'senior_medio.jsx',
      'senior_avancado.jsx',
    ],
  },
];

async function main() {
  if (TEST_RUN_MODE === 'direct') {
    await mongoose.connect(process.env.MONGO_URI);
  }

  const runStamp = buildRunStamp();
  const resultsBaseDir = path.join(RESULTS_DIR, RESULTS_PROVIDER, slugify(MODEL_INFO.codeAnalysisModel));
  const runId = await buildAttemptFolderName(resultsBaseDir);
  const runDir = path.join(resultsBaseDir, runId);
  const rawDir = path.join(runDir, 'raw');
  const reportsDir = path.join(runDir, 'reports');

  await fs.mkdir(rawDir, { recursive: true });
  await fs.mkdir(reportsDir, { recursive: true });

  const summary = {
    runId,
    runStamp,
    startedAt: new Date().toISOString(),
    apiBaseUrl: API_BASE_URL,
    protocol: 'three-users-progression',
    executionConfig: {
      mode: TEST_RUN_MODE,
      tracks: TEST_TRACKS,
      fileFilter: TEST_FILE_FILTER || null,
      startIndex: TEST_START_INDEX,
      endIndex: TEST_END_INDEX ?? null,
      maxFilesPerTrack: TEST_MAX_FILES_PER_TRACK ?? null,
      stopOnError: TEST_STOP_ON_ERROR,
    },
    modelInfo: MODEL_INFO,
    tracks: [],
  };

  const csvRows = [
    [
      'sequence',
      'track',
      'file',
      'inputRole',
      'appliedRole',
      'detectedRole',
      'stateDetectedLevel',
      'targetLevelStatus',
      'promotionReadiness',
      'nextRole',
      'analysisId',
      'userStateId',
      'consolidationId',
      'improvementPlanId',
      'requestId',
      'ok',
      'error',
    ],
  ];

  const selectedTracks = TEST_TRACKS.length > 0
    ? TRACKS.filter((track) => TEST_TRACKS.includes(track.key))
    : TRACKS;

  for (const track of selectedTracks) {
    const trackSummary = await runTrack({
      track,
      rawDir,
      reportsDir,
      csvRows,
    });

    summary.tracks.push(trackSummary);
  }

  summary.finishedAt = new Date().toISOString();
  await fs.writeFile(
    path.join(runDir, 'summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8'
  );
  await fs.writeFile(path.join(runDir, 'summary.csv'), toCsv(csvRows), 'utf8');

  console.log(`Rodada concluida: ${runId}`);
  console.log(`Resultados salvos em: ${runDir}`);

  if (TEST_RUN_MODE === 'direct') {
    await mongoose.disconnect();
  }
}

async function runTrack({ track, rawDir, reportsDir, csvRows }) {
  let currentRole = 'Junior';
  const executions = [];
  const selectedFiles = selectTrackFiles(track.files);

  for (let index = 0; index < selectedFiles.length; index += 1) {
    const fileName = selectedFiles[index].fileName;
    const originalIndex = selectedFiles[index].originalIndex;
    const filePath = path.join(TEST_FILES_DIR, track.languageFolder, fileName);
    const result = await submitAnalysis({
      track,
      fileName,
      filePath,
      inputRole: currentRole,
    });

    const rawFileName = `${track.key}-${pad(originalIndex + 1)}-${fileName}.json`;
    await fs.writeFile(
      path.join(rawDir, rawFileName),
      JSON.stringify(result, null, 2),
      'utf8'
    );

    const executionSummary = buildExecutionSummary({
      track,
      index: originalIndex,
      fileName,
      inputRole: currentRole,
      result,
      rawFileName,
    });

    executions.push(executionSummary);
    csvRows.push([
      String(index + 1),
      track.key,
      fileName,
      executionSummary.inputRole,
      executionSummary.appliedRole,
      executionSummary.detectedRole,
      executionSummary.stateDetectedLevel,
      executionSummary.targetLevelStatus,
      executionSummary.promotionReadiness,
      executionSummary.nextRole,
      executionSummary.analysisId,
      executionSummary.userStateId,
      executionSummary.consolidationId,
      executionSummary.improvementPlanId,
      executionSummary.requestId,
      String(executionSummary.ok),
      executionSummary.error,
    ]);

    if (executionSummary.detectedRole === 'Pleno' && currentRole === 'Junior') {
      currentRole = 'Pleno';
    } else if (executionSummary.detectedRole === 'Senior' && currentRole !== 'Senior') {
      currentRole = 'Senior';
    }

    if (TEST_STOP_ON_ERROR && !executionSummary.ok) {
      break;
    }
  }

  const reportContent = buildTrackReport(track, executions);
  await fs.writeFile(path.join(reportsDir, `${track.key}.md`), reportContent, 'utf8');

  return {
    track: track.key,
    userName: track.userName,
    userEmail: track.userEmail,
    executions,
    firstDetectedPlenoAt: findFirstDetected(executions, 'Pleno'),
    firstDetectedSeniorAt: findFirstDetected(executions, 'Senior'),
  };
}

function selectTrackFiles(files) {
  let selectedFiles = files.map((fileName, originalIndex) => ({ fileName, originalIndex }));

  selectedFiles = selectedFiles.filter(({ fileName, originalIndex }) => {
    const sequence = originalIndex + 1;
    const matchesStart = sequence >= TEST_START_INDEX;
    const matchesEnd = TEST_END_INDEX ? sequence <= TEST_END_INDEX : true;
    const matchesFileFilter = TEST_FILE_FILTER
      ? fileName.toLowerCase().includes(TEST_FILE_FILTER)
      : true;

    return matchesStart && matchesEnd && matchesFileFilter;
  });

  if (TEST_MAX_FILES_PER_TRACK) {
    selectedFiles = selectedFiles.slice(0, TEST_MAX_FILES_PER_TRACK);
  }

  return selectedFiles;
}

async function submitAnalysis({ track, fileName, filePath, inputRole }) {
  if (TEST_RUN_MODE === 'direct') {
    return submitAnalysisDirect({ track, fileName, filePath, inputRole });
  }

  const fileBuffer = await fs.readFile(filePath);
  const form = new FormData();
  form.append('externalId', `${track.key}-${randomUUID()}`);
  form.append('userName', track.userName);
  form.append('userEmail', track.userEmail);
  form.append('role', inputRole);
  form.append('file', new Blob([fileBuffer]), fileName);

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    body: form,
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = { error: 'Resposta nao foi um JSON valido.' };
  }

  return {
    requestedAt: new Date().toISOString(),
    status: response.status,
    ok: response.ok,
    body,
  };
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function resolveLanguage(fileName) {
  const extension = path.extname(fileName).replace('.', '').toLowerCase();

  if (extension === 'java') {
    return { extension, language: 'Java' };
  }

  if (extension === 'ts') {
    return { extension, language: 'TypeScript' };
  }

  if (extension === 'jsx' || extension === 'tsx') {
    return { extension, language: 'React' };
  }

  return { extension, language: null };
}

async function submitAnalysisDirect({ track, fileName, filePath, inputRole }) {
  const requestId = randomUUID().replace(/-/g, '').slice(0, 12);

  try {
    const normalizedEmail = normalizeEmail(track.userEmail);
    const code = await fs.readFile(filePath, 'utf8');
    const { extension, language } = resolveLanguage(fileName);

    if (!language) {
      return {
        requestedAt: new Date().toISOString(),
        status: 400,
        ok: false,
        body: {
          error: 'Apenas arquivos .java, .ts, .jsx e .tsx sao permitidos.',
          requestId,
        },
      };
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    const normalizedRequestRole = normalizeRole(inputRole);
    const normalizedExistingRole = normalizeRole(existingUser?.role);
    const normalizedRole = normalizedRequestRole || normalizedExistingRole;

    if (!normalizedRole || !getSupportedRoles().includes(normalizedRole)) {
      return {
        requestedAt: new Date().toISOString(),
        status: 400,
        ok: false,
        body: {
          error: `role invalida. Use uma destas opcoes: ${getSupportedRoles().join(', ')}.`,
          requestId,
        },
      };
    }

    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $setOnInsert: { email: normalizedEmail, createdAt: new Date() },
        $set: {
          externalId: `${track.key}-${randomUUID()}`,
          name: track.userName,
          role: normalizedRole,
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    const document = await Document.create({
      userId: user._id,
      name: fileName,
      extension,
      language,
      content: code,
    });

    const lastRecord = await Analysis.findOne({
      userId: user._id,
      language,
    }).sort({ createdAt: -1 });

    const previousUserStateRecord = await UserState.findOne({
      userId: user._id,
      language,
    }).sort({ createdAt: -1 });

    const previousImprovementPlanRecord = await ImprovementPlan.findOne({
      userId: user._id,
      language,
    }).sort({ createdAt: -1 });

    const pipelineResult = await runAnalysisPipeline({
      code,
      language,
      role: normalizedRole,
      previousAnalysis: lastRecord?.result || null,
      previousUserState: previousUserStateRecord?.currentState || null,
      previousImprovementPlan: previousImprovementPlanRecord?.content || null,
    });

    const record = await Analysis.create({
      userId: user._id,
      documentId: document._id,
      language,
      comparedToAnalysisId: lastRecord?._id ?? null,
      result: pipelineResult.codeAnalysis,
    });

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

    const consolidationRecord = await Consolidation.create({
      userId: user._id,
      language,
      role: normalizedRole,
      basedOnUserStateId: userState._id,
      previousUserStateId: previousUserStateRecord?._id ?? null,
      previousImprovementPlanId: previousImprovementPlanRecord?._id ?? null,
      content: pipelineResult.consolidationReport,
    });

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

    return {
      requestedAt: new Date().toISOString(),
      status: 200,
      ok: true,
      body: {
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
      },
    };
  } catch (error) {
    return {
      requestedAt: new Date().toISOString(),
      status: 500,
      ok: false,
      body: {
        error: error?.message || 'Erro ao analisar o arquivo.',
        requestId,
      },
    };
  }
}

function buildExecutionSummary({ track, index, fileName, inputRole, result, rawFileName }) {
  const body = result.body || {};
  const snapshot = body.userState?.stateSnapshot || body.stateSnapshot || {};

  return {
    sequence: index + 1,
    track: track.key,
    file: fileName,
    inputRole,
    appliedRole: body.appliedRole || '',
    detectedRole: body.detectedRole || body.userState?.detectedRole || '',
    stateDetectedLevel: snapshot.detectedCurrentLevel || '',
    targetLevelStatus: snapshot.targetLevelStatus || '',
    promotionReadiness: snapshot.promotionReadiness || '',
    nextRole: body.userState?.nextRole || body.improvementPlan?.nextRole || '',
    analysisId: body.analysis?._id || '',
    userStateId: body.userState?._id || '',
    consolidationId: body.consolidation?._id || '',
    improvementPlanId: body.improvementPlan?._id || '',
    requestId: body.requestId || '',
    ok: result.ok,
    status: result.status,
    error: result.ok ? '' : body.error || `HTTP_${result.status}`,
    rawResponseFile: path.join('raw', rawFileName),
  };
}

function buildTrackReport(track, executions) {
  const firstPleno = findFirstDetected(executions, 'Pleno');
  const firstSenior = findFirstDetected(executions, 'Senior');
  const lines = [];

  lines.push(`# Relatorio de progressao - ${track.key}`);
  lines.push('');
  lines.push(`- Usuario: ${track.userEmail}`);
  lines.push(`- Total de execucoes: ${executions.length}`);
  lines.push(`- Primeiro arquivo com detectedRole=Pleno: ${firstPleno || 'nao ocorreu'}`);
  lines.push(`- Primeiro arquivo com detectedRole=Senior: ${firstSenior || 'nao ocorreu'}`);
  lines.push('');
  lines.push('## Execucoes');
  lines.push('');

  for (const execution of executions) {
    lines.push(`### ${execution.sequence}. ${execution.file}`);
    lines.push('');
    lines.push(`- inputRole: ${execution.inputRole}`);
    lines.push(`- appliedRole: ${execution.appliedRole || 'n/d'}`);
    lines.push(`- detectedRole: ${execution.detectedRole || 'n/d'}`);
    lines.push(`- stateDetectedLevel: ${execution.stateDetectedLevel || 'n/d'}`);
    lines.push(`- targetLevelStatus: ${execution.targetLevelStatus || 'n/d'}`);
    lines.push(`- promotionReadiness: ${execution.promotionReadiness || 'n/d'}`);
    lines.push(`- nextRole: ${execution.nextRole || 'n/d'}`);
    lines.push(`- status HTTP: ${execution.status}`);
    lines.push(`- resultado: ${execution.ok ? 'ok' : execution.error}`);
    lines.push(`- resposta bruta: ${execution.rawResponseFile}`);
    lines.push('');
  }

  return lines.join('\n');
}

function findFirstDetected(executions, role) {
  const match = executions.find((execution) => execution.detectedRole === role);
  return match ? match.file : null;
}

function buildRunStamp() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const parts = [stamp];

  if (RUN_SEQUENCE) {
    parts.push(slugify(RUN_SEQUENCE));
  }

  if (RUN_LABEL) {
    parts.push(slugify(RUN_LABEL));
  }

  if (INCLUDE_MODEL_IN_RUN_ID) {
    parts.push(slugify(MODEL_INFO.codeAnalysisModel));
  }

  return parts.join('-');
}

async function buildAttemptFolderName(resultsBaseDir) {
  const directoryEntries = await fs.readdir(resultsBaseDir, { withFileTypes: true }).catch((error) => {
    if (error && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  });

  const attemptIndex = directoryEntries.filter((entry) => entry.isDirectory()).length + 1;
  return formatAttemptFolderName(attemptIndex);
}

function formatAttemptFolderName(attemptIndex) {
  const attemptNames = [
    'primeira tentativa',
    'segunda tentativa',
    'terceira tentativa',
    'quarta tentativa',
    'quinta tentativa',
    'sexta tentativa',
    'setima tentativa',
    'oitava tentativa',
    'nona tentativa',
    'decima tentativa',
    'decima primeira tentativa',
    'decima segunda tentativa',
    'decima terceira tentativa',
    'decima quarta tentativa',
    'decima quinta tentativa',
    'decima sexta tentativa',
    'decima setima tentativa',
    'decima oitava tentativa',
    'decima nona tentativa',
    'vigesima tentativa',
  ];

  if (attemptNames[attemptIndex - 1]) {
    return attemptNames[attemptIndex - 1];
  }

  return `tentativa ${attemptIndex}`;
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function parsePositiveInteger(value) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');
}

main().catch((error) => {
  console.error('Falha ao executar a rodada de progressao.');
  console.error(error);
  process.exitCode = 1;
});
