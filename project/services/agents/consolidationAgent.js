const { getNextRole } = require('../../config/roleConfig');
const { getProfileFor, getRoleRubric } = require('../../config/evaluationFramework');
const { generateText } = require('../llm/textGenerationClient');

async function runConsolidationAgent({
  language,
  role,
  detectedRole = null,
  nextRoleOverride = null,
  currentState,
  previousUserState = null,
  previousImprovementPlan = null,
}) {
  const effectiveCurrentRole = detectedRole || role;
  const currentProfile = getProfileFor(language, effectiveCurrentRole);
  const nextRole = nextRoleOverride !== undefined && nextRoleOverride !== null
    ? nextRoleOverride
    : getNextRole(effectiveCurrentRole);
  const nextProfile = nextRole ? getProfileFor(language, nextRole) : null;
  const currentRoleRubric = getRoleRubric(effectiveCurrentRole);
  const nextRoleRubric = nextRole ? getRoleRubric(nextRole) : null;

  const previousStateSection = previousUserState
    ? `
ESTADO ANTERIOR DO DESENVOLVEDOR:
${previousUserState}
    `
    : `
ESTADO ANTERIOR DO DESENVOLVEDOR:
Sem estado anterior registrado.
    `;

  const previousPlanSection = previousImprovementPlan
    ? `
PLANO DE MELHORIA ANTERIOR:
${previousImprovementPlan}
    `
    : `
PLANO DE MELHORIA ANTERIOR:
Sem plano de melhoria anterior registrado.
    `;

  const prompt = `
Voce e o Agente de Consolidacao.
Sua responsabilidade e consolidar a evolucao do desenvolvedor entre ciclos de avaliacao.

Contexto:
- Linguagem: ${language}
- Role recebida na request: ${role}
- Nivel detectado no ciclo atual: ${effectiveCurrentRole}
- Referencia do nivel atual (${effectiveCurrentRole}): ${currentProfile}
- Resumo da rubrica do nivel atual (${effectiveCurrentRole}): ${currentRoleRubric?.summary || 'sem rubrica adicional'}
- Proximo nivel avaliado: ${nextRole || 'sem proximo nivel cadastrado'}
${nextProfile ? `- Referencia do proximo nivel (${nextRole}): ${nextProfile}` : ''}
${nextRoleRubric ? `- Resumo da rubrica do proximo nivel (${nextRole}): ${nextRoleRubric.summary}` : ''}

Instrucao:
Compare o estado atual com o estado anterior do desenvolvedor.
Tambem use o plano de melhoria anterior para identificar onde existem indicios de execucao, evolucao parcial,
e pontos que seguem sem evidencia suficiente de progresso.
Se o ESTADO ATUAL ou o ESTADO ANTERIOR mencionarem scores, criterios, red flags, aderencia ao nivel ou prontidao de promocao,
use isso explicitamente na consolidacao.
O ESTADO ATUAL e a fonte de verdade sobre o nivel atual do desenvolvedor neste ciclo.
Sua funcao nao e reclassificar a senioridade atual, e sim consolidar evolucao, recorrencia, estabilidade e sinais de aproximacao ao proximo nivel.

Objetivo:
- consolidar o que realmente evoluiu
- apontar o que permaneceu recorrente
- identificar sinais de execucao do plano anterior
- avaliar se a evolucao observada sustenta o nivel detectado ${effectiveCurrentRole}
- avaliar se existe evidencia de aproximacao para ${nextRole || 'maior consistencia no nivel atual'}
- separar claramente fatos observados de inferencias razoaveis
- gerar contexto confiavel para a criacao do proximo plano

Formato esperado da resposta:
1. Resumo consolidado da evolucao
2. Veredito herdado do estado atual
3. Evolucoes com evidencia clara
4. Lacunas que permanecem recorrentes
5. Leitura objetiva dos criterios que melhoraram, regrediram ou ficaram estaveis
6. Leitura do plano anterior
7. Metas que parecem concluidas, parciais ou sem evidencia
8. Leitura da consistencia no cargo atual e da prontidao para o proximo nivel
9. Direcionamento para o proximo ciclo

Regras:
- O estado atual e a fonte principal de verdade para o ciclo atual
- Se o ESTADO ATUAL disser que o desenvolvedor esta no nivel esperado para ${role}, nao reverta isso para abaixo do nivel esperado
- Se o ESTADO ATUAL disser que o desenvolvedor esta abaixo ou acima do nivel esperado, preserve esse veredito e apenas explique a consistencia, a estabilidade e a evolucao observada
- A consolidacao pode qualificar confianca, consistencia e sustentacao do nivel, mas nao deve contradizer frontalmente o veredito do estado atual
- Nao assuma que o plano anterior foi executado so porque ele existia
- Quando nao houver evidencia suficiente, diga isso explicitamente
- Evite conclusoes categoricas demais sobre comportamento fora do codigo analisado
- Diferencie evolucao pontual de aderencia sustentada ao nivel esperado
- Se houver proximo nivel, nao trate sinais iniciais como promocao automatica
- Se a evolucao existir em implementacao mas nao em autonomia, arquitetura ou consistencia, diga isso claramente
- Separe evolucao percebida de promocao merecida; uma coisa nao implica automaticamente a outra
- Quando houver melhoria real, diga se ela aproxima o desenvolvedor do centro do nivel atual ou da borda do proximo nivel
- Use expressoes como "ainda nao ha evidencia suficiente de promocao" em vez de rebaixar o dev abaixo do nivel atual quando o problema for apenas falta de sustentacao para o proximo nivel
- Quando houver conflito entre historico e ciclo atual, preserve o ciclo atual e trate o historico apenas como contexto de confianca ou recorrencia

${previousStateSection}

ESTADO ATUAL DO DESENVOLVEDOR:
${currentState}

${previousPlanSection}
  `;

  const consolidationReport = await generateText({
    prompt,
    model: process.env.CONSOLIDATION_AGENT_MODEL || 'gpt-4.1',
    temperature: 0.2,
  });
  return {
    consolidationReport,
  };
}

module.exports = { runConsolidationAgent };
