const { runCodeAnalysisAgent } = require('./agents/codeAnalysisAgent');
const { runProgressStateAgent } = require('./agents/progressStateAgent');
const { runConsolidationAgent } = require('./agents/consolidationAgent');
const { runImprovementAgent } = require('./agents/improvementAgent');

async function runAnalysisPipeline({
  code,
  language,
  role,
  previousAnalysis = null,
  previousUserState = null,
  previousImprovementPlan = null,
}) {
  const codeAnalysis = await runCodeAnalysisAgent({
    code,
    language,
    role,
  });

  const progressState = await runProgressStateAgent({
    language,
    role,
    currentAnalysis: codeAnalysis,
    previousAnalysis,
  });

  const consolidation = await runConsolidationAgent({
    language,
    role,
    detectedRole: progressState.detectedRole,
    nextRoleOverride: progressState.nextRole,
    currentState: progressState.currentState,
    previousUserState,
    previousImprovementPlan,
  });

  const improvement = await runImprovementAgent({
    language,
    role,
    detectedRole: progressState.detectedRole,
    nextRoleOverride: progressState.nextRole,
    currentState: progressState.currentState,
    consolidationReport: consolidation.consolidationReport,
  });

  return {
    codeAnalysis,
    currentState: progressState.currentState,
    detectedRole: progressState.detectedRole,
    stateSnapshot: progressState.stateSnapshot,
    consolidationReport: consolidation.consolidationReport,
    improvementPlan: improvement.improvementPlan,
    nextRole: progressState.nextRole,
  };
}

module.exports = { runAnalysisPipeline };
