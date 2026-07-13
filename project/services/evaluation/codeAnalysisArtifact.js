const { EVALUATION_CRITERIA, getLanguageFocus, getRoleRubric } = require('../../config/evaluationFramework');

const STRUCTURED_ARTIFACT_VERSION = '1.0';
const STRUCTURED_ARTIFACT_KIND = 'code_analysis';

function createCriteriaScores() {
  return Object.fromEntries(
    Object.keys(EVALUATION_CRITERIA).map((criterion) => [criterion, null])
  );
}

function createEmptyCodeAnalysisArtifact({ language, role, agent = 'codeAnalysisAgent' }) {
  return {
    artifactVersion: STRUCTURED_ARTIFACT_VERSION,
    artifactKind: STRUCTURED_ARTIFACT_KIND,
    agent,
    language,
    targetRole: role,
    targetRoleRubric: getRoleRubric(role),
    languageFocus: getLanguageFocus(language),
    summary: '',
    criteriaScores: createCriteriaScores(),
    evidence: [],
    strongSignals: [],
    redFlags: [],
    improvementOpportunities: [],
    classification: {
      targetLevelStatus: null,
      nearestLevel: null,
      weightedScore: null,
      confidence: null,
    },
    narrative: {
      strengths: [],
      risks: [],
      levelComparison: {
        junior: '',
        pleno: '',
        senior: '',
      },
      conclusion: '',
    },
  };
}

function getCodeAnalysisArtifactContract() {
  return {
    artifactVersion: STRUCTURED_ARTIFACT_VERSION,
    artifactKind: STRUCTURED_ARTIFACT_KIND,
    requiredFields: [
      'artifactVersion',
      'artifactKind',
      'agent',
      'language',
      'targetRole',
      'summary',
      'criteriaScores',
      'evidence',
      'redFlags',
      'strongSignals',
      'improvementOpportunities',
      'classification',
      'narrative',
    ],
    criteriaScale: {
      min: 0,
      max: 100,
      guidance: 'Cada criterio deve receber um score inteiro de 0 a 100 com base em evidencia concreta do codigo.',
    },
    evidenceShape: {
      criterion: 'implementation | typing | architecture | maintainability | testing | debugging | autonomy',
      score: 'number',
      confidence: 'number entre 0 e 1',
      reason: 'texto curto e objetivo',
      codeReference: 'trecho, simbolo ou descricao da evidencia no arquivo analisado',
    },
    redFlagShape: {
      severity: 'low | medium | high | critical',
      criterion: 'criterio mais afetado',
      reason: 'texto curto e objetivo',
    },
    classificationShape: {
      targetLevelStatus: 'below_expected | at_expected | above_expected',
      nearestLevel: 'junior | junior_strong | pleno | senior',
      weightedScore: 'number',
      confidence: 'number entre 0 e 1',
    },
  };
}

module.exports = {
  STRUCTURED_ARTIFACT_KIND,
  STRUCTURED_ARTIFACT_VERSION,
  createEmptyCodeAnalysisArtifact,
  getCodeAnalysisArtifactContract,
};
