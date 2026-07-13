const {
  EVALUATION_CRITERIA,
  getCriteriaList,
  getScoreBand,
  getTargetRoleGate,
} = require('../../config/evaluationFramework');

function clampScore(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeRedFlags(redFlags = []) {
  return redFlags.map((redFlag) => {
    if (typeof redFlag === 'string') {
      return {
        severity: 'medium',
        criterion: null,
        reason: redFlag,
      };
    }

    return {
      severity: redFlag?.severity || 'medium',
      criterion: redFlag?.criterion || null,
      reason: redFlag?.reason || '',
    };
  });
}

function countCriticalRedFlags(redFlags = []) {
  return normalizeRedFlags(redFlags).filter((redFlag) => redFlag.severity === 'critical').length;
}

function calculateWeightedScore(criteriaScores = {}) {
  const criteria = getCriteriaList();

  const weightedTotal = criteria.reduce((total, criterionKey) => {
    const score = clampScore(criteriaScores[criterionKey]);
    const weight = EVALUATION_CRITERIA[criterionKey].weight;
    return total + score * weight;
  }, 0);

  return Number(weightedTotal.toFixed(2));
}

function listMissingGateCriteria(criteriaScores = {}, requiredCriteria = {}) {
  return Object.entries(requiredCriteria)
    .filter(([criterionKey, minimumScore]) => clampScore(criteriaScores[criterionKey]) < minimumScore)
    .map(([criterionKey, minimumScore]) => ({
      criterion: criterionKey,
      expectedAtLeast: minimumScore,
      actualScore: clampScore(criteriaScores[criterionKey]),
    }));
}

function resolveTargetRoleStatus({ targetRole, weightedScore, criteriaScores, redFlags }) {
  if (!targetRole) {
    return null;
  }

  const gate = getTargetRoleGate(targetRole);
  if (!gate) {
    return null;
  }

  const missingCriteria = listMissingGateCriteria(criteriaScores, gate.requiredCriteria);
  const criticalRedFlags = countCriticalRedFlags(redFlags);
  const gatePassed =
    weightedScore >= gate.minimumScore &&
    missingCriteria.length === 0 &&
    criticalRedFlags <= gate.maxCriticalRedFlags;

  if (gatePassed) {
    return {
      role: targetRole,
      status: weightedScore >= gate.minimumScore + 15 ? 'above_expected' : 'at_expected',
      criticalRedFlags,
      missingCriteria,
    };
  }

  return {
    role: targetRole,
    status: 'below_expected',
    criticalRedFlags,
    missingCriteria,
  };
}

function summarizeCriteria(criteriaScores = {}) {
  return getCriteriaList().map((criterionKey) => ({
    criterion: criterionKey,
    score: clampScore(criteriaScores[criterionKey]),
    weight: EVALUATION_CRITERIA[criterionKey].weight,
    label: EVALUATION_CRITERIA[criterionKey].label,
  }));
}

function classifyDeveloperLevel({
  criteriaScores = {},
  redFlags = [],
  targetRole = null,
}) {
  const weightedScore = calculateWeightedScore(criteriaScores);
  const nearestLevel = getScoreBand(weightedScore);
  const targetRoleAssessment = resolveTargetRoleStatus({
    targetRole,
    weightedScore,
    criteriaScores,
    redFlags,
  });

  return {
    weightedScore,
    nearestLevel: nearestLevel.key,
    nearestLevelLabel: nearestLevel.label,
    nearestLevelSummary: nearestLevel.summary,
    criteriaBreakdown: summarizeCriteria(criteriaScores),
    targetRoleAssessment,
    redFlagCount: normalizeRedFlags(redFlags).length,
    criticalRedFlagCount: countCriticalRedFlags(redFlags),
  };
}

module.exports = {
  calculateWeightedScore,
  classifyDeveloperLevel,
  countCriticalRedFlags,
  listMissingGateCriteria,
  resolveTargetRoleStatus,
};
