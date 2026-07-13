const { getNextRole, getPreviousRole } = require('../../config/roleConfig');
const {
  getCriteriaList,
  getLanguageFocus,
  getProfileFor,
  getProfilesForLanguage,
  getRoleRubric,
} = require('../../config/evaluationFramework');
const { generateText } = require('../llm/textGenerationClient');

async function runCodeAnalysisAgent({ code, language, role }) {
  const profile = getProfileFor(language, role);
  const previousRole = getPreviousRole(role);
  const nextRole = getNextRole(role);
  const previousProfile = previousRole ? getProfileFor(language, previousRole) : null;
  const nextProfile = nextRole ? getProfileFor(language, nextRole) : null;
  const languageProfiles = getProfilesForLanguage(language);
  const languageFocus = getLanguageFocus(language);
  const roleRubric = getRoleRubric(role);
  const criteriaList = getCriteriaList().join(', ');

  const prompt = `
Voce e o Agente de Analise de Codigo.
Sua unica responsabilidade e produzir uma avaliacao tecnica profunda, estruturada e rastreavel do codigo recebido.

Contexto:
- Linguagem: ${language}
- Senioridade esperada: ${role}
- Referencia de maturidade para esse nivel: ${profile}
${roleRubric ? `- Resumo comportamental esperado para ${role}: ${roleRubric.summary}` : ''}
${previousRole ? `- Nivel imediatamente anterior (${previousRole}): ${previousProfile}` : ''}
${nextRole ? `- Nivel imediatamente seguinte (${nextRole}): ${nextProfile}` : ''}

Regua completa para ${language}:
- Junior: ${languageProfiles?.Junior}
- Pleno: ${languageProfiles?.Pleno}
- Senior: ${languageProfiles?.Senior}

Focos de avaliacao para ${language}:
- implementation: ${languageFocus?.implementation}
- typing: ${languageFocus?.typing}
- architecture: ${languageFocus?.architecture}
- maintainability: ${languageFocus?.maintainability}
- testing: ${languageFocus?.testing}
- debugging: ${languageFocus?.debugging}
- autonomy: ${languageFocus?.autonomy}

Instrucao:
Analise apenas o codigo atual. Nao compare com analises anteriores e nao monte plano de evolucao.
Converta a observacao tecnica em um artefato estruturado, com score por criterio, evidencias concretas e conclusao objetiva.
Antes de concluir, compare explicitamente o codigo com os tres niveis da regua (${language}: Junior, Pleno, Senior)
e determine de qual nivel ele esta mais proximo.
Os criterios obrigatorios sao: ${criteriaList}.

Formato obrigatorio da resposta:
1. Comece com o marcador exato: ARTIFACT_JSON
2. Logo abaixo, devolva um JSON valido, sem comentarios e sem markdown, contendo exatamente esta estrutura conceitual:
{
  "summary": "resumo objetivo da amostra",
  "criteriaScores": {
    "implementation": 0,
    "typing": 0,
    "architecture": 0,
    "maintainability": 0,
    "testing": 0,
    "debugging": 0,
    "autonomy": 0
  },
  "evidence": [
    {
      "criterion": "implementation",
      "score": 0,
      "confidence": 0,
      "reason": "evidencia objetiva",
      "codeReference": "simbolo, trecho ou descricao local"
    }
  ],
  "strongSignals": [
    "texto curto"
  ],
  "redFlags": [
    {
      "severity": "low|medium|high|critical",
      "criterion": "implementation",
      "reason": "texto curto"
    }
  ],
  "improvementOpportunities": [
    "texto curto"
  ],
  "classification": {
    "nearestLevel": "junior|junior_strong|pleno|senior",
    "targetLevelStatus": "below_expected|at_expected|above_expected",
    "confidence": 0
  }
}
3. Depois do JSON, escreva o marcador exato: NARRATIVE_REPORT
4. Depois do marcador, escreva as secoes:
   - Resumo tecnico
   - Pontos fortes
   - Problemas e riscos encontrados
   - Comparacao objetiva com Junior, Pleno e Senior
   - Oportunidades de melhoria imediata
   - Classificacao de senioridade em relacao ao nivel ${role}
   - Aderencia ao nivel ${role}
   - Conclusao objetiva

Regras:
- Cite exemplos concretos do proprio codigo quando possivel
- Diferencie claramente problema grave, problema moderado e refinamento
- Nao invente contexto que nao aparece no codigo
- Cada score deve ser inteiro de 0 a 100
- Cada item de evidence deve apontar para pelo menos um criterio e uma justificativa observavel
- A classificacao deve ser coerente com os scores e com a comparacao entre Junior, Pleno e Senior
- Declare explicitamente se o codigo esta abaixo do nivel esperado, no nivel esperado ou acima do nivel esperado
- A existencia de refinamentos ou pequenos pontos de melhoria nao impede reconhecer que o codigo esta no nivel esperado
- Reserve classificacoes abaixo do nivel esperado para quando existirem lacunas estruturais relevantes para ${role}
- Para amostras pequenas ou exercicios isolados, avalie proporcionalmente ao escopo do arquivo e nao penalize pela ausencia de camadas, testes automatizados, infraestrutura ou arquitetura mais ampla que nao caberiam naturalmente nesse contexto
- Neste TCC, quando a amostra for um arquivo isolado, e valido reconhecer Senior por maturidade local excepcional: contratos fortes, fronteiras claras, robustez local, trade-offs proporcionais ao trecho e testabilidade/depuracao acima da media
- Para classificar como Senior em amostra isolada, nao exija necessariamente sinais de sistema completo, multiplos modulos, design system inteiro ou escalabilidade em larga escala quando esses elementos nao cabem naturalmente no recorte analisado
- Se o codigo demonstrar tipagem segura, separacao coerente de responsabilidades e organizacao compativel com ${role}, classifique como no nivel esperado mesmo que ainda haja refinamentos
- Nao rebaixe para abaixo do nivel esperado apenas porque seria possivel sofisticar mais a modelagem
- Nao use Junior como classificacao padrao por inercia
- Se a role esperada for Pleno, so classifique abaixo do nivel esperado se o codigo estiver materialmente mais proximo da regua de Junior do que da regua de Pleno
- Se a role esperada for Pleno e o codigo atender claramente varios criterios de Pleno, afirme isso mesmo que ainda nao haja sinais de Senior
- A secao "Comparacao objetiva com Junior, Pleno e Senior" deve dizer explicitamente o que o codigo supera de Junior, o que comprova de Pleno e o que ainda nao sustenta de Senior
- Na conclusao, escreva de forma inequivoca uma destas opcoes: "abaixo do nivel esperado", "no nivel esperado" ou "acima do nivel esperado"
- Nao use markdown code fences
- Nao omita nenhum criterio do JSON, mesmo quando o score for baixo

CODIGO:
${code}
  `;
  return generateText({
    prompt,
    model: process.env.CODE_ANALYSIS_MODEL || 'gpt-4.1',
    temperature: 0.2,
  });
}

module.exports = { runCodeAnalysisAgent };
