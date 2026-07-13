const { getNextRole } = require('../../config/roleConfig');
const { getProfileFor, getRoleRubric } = require('../../config/evaluationFramework');
const { generateText } = require('../llm/textGenerationClient');

async function runImprovementAgent({
  language,
  role,
  detectedRole = null,
  nextRoleOverride = null,
  currentState,
  consolidationReport,
}) {
  const effectiveCurrentRole = detectedRole || role;
  const nextRole = nextRoleOverride !== undefined && nextRoleOverride !== null
    ? nextRoleOverride
    : getNextRole(effectiveCurrentRole);
  const currentProfile = getProfileFor(language, effectiveCurrentRole);
  const nextProfile = nextRole ? getProfileFor(language, nextRole) : null;
  const currentRoleRubric = getRoleRubric(effectiveCurrentRole);
  const nextRoleRubric = nextRole ? getRoleRubric(nextRole) : null;

  const prompt = `
Voce e o Agente de Melhoria.
Sua responsabilidade e transformar o consolidado de evolucao do desenvolvedor em um plano pratico de evolucao.

Contexto:
- Linguagem: ${language}
- Role recebida na request: ${role}
- Nivel detectado atual: ${effectiveCurrentRole}
- Referencia do nivel atual: ${currentProfile}
- Resumo da rubrica do nivel atual: ${currentRoleRubric?.summary || 'sem rubrica adicional'}
- Proximo nivel desejado: ${nextRole || 'Sem proximo nivel cadastrado'}
${nextProfile ? `- Referencia do proximo nivel: ${nextProfile}` : ''}
${nextRoleRubric ? `- Resumo da rubrica do proximo nivel: ${nextRoleRubric.summary}` : ''}

Instrucao:
Receba o estado atual e o consolidado de evolucao do desenvolvedor e devolva um plano de metas e melhoria extremamente pratico.
Explique onde estudar, o que praticar, quais metas executar e como saber se houve evolucao real.
Use como base principal as lacunas recorrentes, os criterios mais fracos, os riscos estruturais e a distancia entre o nivel atual e o proximo nivel.
Se o consolidado mostrar que o dev ja esta no nivel esperado, foque em consolidacao e subida para o proximo nivel.
Se o consolidado mostrar que o dev ainda esta abaixo do nivel esperado, foque primeiro em fechar lacunas do nivel atual antes de acelerar promocao.
O ESTADO ATUAL e a fonte de verdade para definir se o dev esta abaixo, no ou acima do nivel esperado no ciclo atual.
Use o CONSOLIDADO para entender recorrencia, estabilidade, execucao do plano anterior e prioridades, mas nao para contradizer o veredito principal do ESTADO ATUAL.

Formato esperado da resposta:
1. Prioridades de melhoria
2. O que parar, manter e comecar a fazer
3. Plano pratico de curto prazo
4. Metas objetivas para validar evolucao
5. Fontes e referencias recomendadas
6. O que precisa mudar para atingir o proximo nivel${nextRole ? ` (${nextRole})` : ''}

Regras:
- Prefira orientacoes executaveis e especificas
- Inclua exemplos de exercicios ou tipos de tarefas
- Nao repita apenas diagnostico; converta em acao
- Se houver conflito entre ESTADO ATUAL e CONSOLIDADO, priorize o ESTADO ATUAL para a classificacao do nivel atual e use o CONSOLIDADO apenas para calibrar foco, urgencia e consistencia
- Use o consolidado como fonte principal para decidir o que manter, remover ou adicionar no novo plano
- Se nao houver proximo nivel, foque em aprofundamento e consistencia
- Organize as metas de forma que seja possivel perceber se a melhora ocorreu em implementacao, arquitetura, testabilidade, debugging ou autonomia
- Quando sugerir estudo, conecte a referencia a uma lacuna real do consolidado
- Evite recomendar passos genericos como "estudar mais arquitetura" sem dizer o que praticar e como verificar resultado
- Nao escreva como se estivesse em uma conversa interativa com o usuario
- Nao termine oferecendo ajuda adicional, proximos passos em chat ou frases como "se quiser posso ajudar"
- Entregue o plano como documento final e autocontido

ESTADO ATUAL DO DESENVOLVEDOR:
${currentState}

CONSOLIDADO DE EVOLUCAO:
${consolidationReport}
  `;

  const improvementPlan = await generateText({
    prompt,
    model: process.env.IMPROVEMENT_AGENT_MODEL || 'gpt-4.1-mini',
    temperature: 0.4,
  });
  return {
    nextRole,
    improvementPlan,
  };
}

module.exports = { runImprovementAgent };
