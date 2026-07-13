const { getNextRole, getSupportedRoles, normalizeRole } = require('../../config/roleConfig');
const { getProfileFor, getRoleRubric } = require('../../config/evaluationFramework');
const { generateText } = require('../llm/textGenerationClient');

async function runProgressStateAgent({
  language,
  role,
  currentAnalysis,
  previousAnalysis = null,
}) {
  const currentProfile = getProfileFor(language, role);
  const nextRole = getNextRole(role);
  const nextProfile = nextRole ? getProfileFor(language, nextRole) : null;
  const currentRoleRubric = getRoleRubric(role);
  const nextRoleRubric = nextRole ? getRoleRubric(nextRole) : null;

  const comparisonContext = previousAnalysis
    ? `
ANALISE ANTERIOR:
${previousAnalysis}

ANALISE ATUAL:
${currentAnalysis}
    `
    : `
ANALISE ATUAL:
${currentAnalysis}
    `;

  const prompt = `
Voce e o Agente de Estado do Desenvolvedor.
Sua responsabilidade e transformar analises tecnicas estruturadas em um retrato claro, objetivo e calibrado do estado atual do desenvolvedor.

Contexto:
- Linguagem: ${language}
- Cargo atual do desenvolvedor: ${role}
- Perfil esperado para o cargo atual (${role}): ${currentProfile}
- Resumo da rubrica do cargo atual (${role}): ${currentRoleRubric?.summary || 'sem rubrica adicional'}
- Proximo cargo avaliado para promocao: ${nextRole || 'sem proximo cargo cadastrado'}
${nextProfile ? `- Perfil esperado para o proximo cargo (${nextRole}): ${nextProfile}` : ''}
${nextRoleRubric ? `- Resumo da rubrica do proximo cargo (${nextRole}): ${nextRoleRubric.summary}` : ''}

Instrucao:
${previousAnalysis
    ? 'Compare a analise atual com a analise anterior e determine no que o dev melhorou, no que permaneceu igual e no que ainda esta distante do esperado.'
    : 'Nao existe analise anterior. Construa um estado inicial do desenvolvedor com base apenas na analise atual.'}
Quando a ANALISE ATUAL ou a ANALISE ANTERIOR trouxerem um bloco ARTIFACT_JSON, use primeiro os scores, evidencias, red flags e classificacao desse bloco.
Use a narrativa apenas para contextualizar o diagnostico.

Importante:
- Nao assuma que o dev continua no nivel ${role} apenas porque esse e o cargo atual dele.
- Trate a ANALISE ATUAL como evidencia principal. A ANALISE ANTERIOR existe para contexto de evolucao, nao para limitar o veredito atual.
- Use o perfil de ${role} para avaliar dominio do cargo atual.
${nextRole
    ? `- Use o perfil de ${nextRole} para avaliar prontidao de promocao. Se a analise atual tiver evidencias fortes de ${nextRole}, diga explicitamente que ele parece pronto ou proximo de estar pronto para ${nextRole}.`
    : '- Como nao existe proximo cargo cadastrado, avalie maturidade e consistencia dentro do cargo atual.'}
- Se ainda faltar para o proximo nivel, explique exatamente quais lacunas impedem a promocao.
- Se a analise mostrar aderencia consistente ao nivel ${role}, diga explicitamente que o desenvolvedor esta no nivel esperado para ${role}, mesmo que ainda existam refinamentos

Formato obrigatorio da resposta:
1. Comece com o marcador exato: STATE_SNAPSHOT_JSON
2. Logo abaixo, devolva um JSON valido, sem markdown, contendo:
{
  "inputRole": "${role}",
  "detectedCurrentLevel": "Junior|Pleno|Senior",
  "targetLevelStatus": "below_expected|at_expected|above_expected",
  "nextSuggestedRole": "Junior|Pleno|Senior|null",
  "promotionReadiness": "not_applicable|not_ready|getting_close|ready",
  "confidence": 0,
  "summary": "texto curto"
}
3. Depois do JSON, escreva o marcador exato: STATE_NARRATIVE
4. Depois do marcador, escreva as secoes:
   - Estado atual do desenvolvedor
   - Melhorias percebidas${previousAnalysis ? '' : ' (ou "sem historico suficiente para medir evolucao")'}
   - Erros e lacunas recorrentes ou provaveis
   - Leitura objetiva dos scores e evidencias mais relevantes
   - Classificacao objetiva no cargo atual (${role})
   - Nivel detectado do desenvolvedor
   ${nextRole ? `- Prontidao para promocao para ${nextRole}` : '- Maturidade dentro do cargo atual'}
   - Principais limitadores para avancar

Regras:
- O foco aqui e diagnostico de evolucao, nao plano de metas
- Seja claro sobre o que e fato observado e o que e inferencia razoavel
- Fale do desenvolvedor como perfil tecnico, nao apenas do arquivo isolado
- Se houver scores estruturados, cite explicitamente quais criterios puxam o diagnostico para cima e quais seguram a promocao
- Se houver divergencia entre texto narrativo e score estruturado, priorize o conjunto de evidencias concretas e explique a divergencia
- Evite conclusoes conservadoras demais quando houver evidencias objetivas de evolucao
- Nao trate a simples existencia de melhorias pendentes como prova de que o desenvolvedor ainda esta abaixo do nivel atual
- Quando o desenvolvedor estiver aderente ao nivel atual, afirme isso com clareza antes de listar refinamentos
- Em arquivos pequenos ou exemplos isolados, avalie a senioridade de forma proporcional ao escopo da amostra
- Neste TCC, quando a amostra for isolada, Senior pode ser reconhecido por maturidade local excepcional, mesmo sem evidencias de sistema completo ou multiplos arquivos
- Nao exija design system inteiro, arquitetura multi-modulo ou escalabilidade em larga escala para reconhecer Senior quando esses sinais nao cabem naturalmente em um unico arquivo
- Nao use ausencia de testes, multiplas camadas ou arquitetura mais extensa como motivo automatico para negar aderencia ao nivel atual quando o exercicio nao pede isso
- Se houver sinais claros de maturidade compativeis com ${role}, prefira concluir que o desenvolvedor esta no nivel esperado com refinamentos, em vez de dizer que ainda nao chegou la
- Se a ANALISE ATUAL classificar o codigo como aderente a ${role}, nao reverta isso para Junior sem citar lacunas estruturais concretas que justifiquem esse rebaixamento
- Quando houver conflito entre o historico e a evidencia atual, prefira a evidencia atual e explique a mudanca de forma explicita
- Feche a resposta com uma frase inequivoca sobre a aderencia atual ao cargo: "abaixo do nivel esperado", "no nivel esperado" ou "acima do nivel esperado"
- detectedCurrentLevel deve refletir o nivel que melhor representa o desenvolvedor hoje, independentemente da role enviada na request
- Se a role enviada for Junior e a evidencia atual for claramente de Pleno, detectedCurrentLevel deve ser Pleno
- nextSuggestedRole deve ser o proximo nivel apos o detectedCurrentLevel, e nao o proximo nivel apos a role da request
- Se detectedCurrentLevel for Senior, nextSuggestedRole deve ser null
- Nao use markdown code fences

${comparisonContext}
  `;

  const content = await generateText({
    prompt,
    model: process.env.PROGRESS_STATE_MODEL || 'gpt-4.1',
    temperature: 0.2,
  });
  const snapshot = parseStateSnapshot(content, role);

  return {
    currentState: content,
    detectedRole: snapshot.detectedCurrentLevel,
    nextRole: snapshot.nextSuggestedRole,
    stateSnapshot: snapshot,
  };
}

function parseStateSnapshot(content, fallbackRole) {
  const defaultNextRole = getNextRole(fallbackRole);
  const fallbackSnapshot = {
    inputRole: fallbackRole,
    detectedCurrentLevel: fallbackRole,
    targetLevelStatus: 'at_expected',
    nextSuggestedRole: defaultNextRole,
    promotionReadiness: defaultNextRole ? 'not_ready' : 'not_applicable',
    confidence: 0.5,
    summary: '',
  };

  if (typeof content !== 'string') {
    return fallbackSnapshot;
  }

  const match = content.match(/STATE_SNAPSHOT_JSON\s*([\s\S]*?)\s*STATE_NARRATIVE/);
  if (!match) {
    return fallbackSnapshot;
  }

  try {
    const parsed = JSON.parse(match[1].trim());
    const supportedRoles = new Set(getSupportedRoles());
    const detectedCurrentLevel = supportedRoles.has(parsed.detectedCurrentLevel)
      ? parsed.detectedCurrentLevel
      : normalizeRole(parsed.detectedCurrentLevel) || fallbackRole;

    let nextSuggestedRole = parsed.nextSuggestedRole;
    if (nextSuggestedRole === null) {
      nextSuggestedRole = null;
    } else if (supportedRoles.has(nextSuggestedRole)) {
      nextSuggestedRole = nextSuggestedRole;
    } else {
      nextSuggestedRole = normalizeRole(nextSuggestedRole) || getNextRole(detectedCurrentLevel);
    }

    return {
      ...fallbackSnapshot,
      ...parsed,
      detectedCurrentLevel,
      nextSuggestedRole,
    };
  } catch {
    return fallbackSnapshot;
  }
}

module.exports = { runProgressStateAgent };
