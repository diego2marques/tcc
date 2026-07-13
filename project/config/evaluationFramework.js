const EVALUATION_CRITERIA = {
  implementation: {
    weight: 0.18,
    label: 'Implementacao',
    description: 'Correcao do fluxo principal, clareza das estruturas e consistencia da solucao entregue.',
  },
  typing: {
    weight: 0.16,
    label: 'Tipagem e contratos',
    description: 'Seguranca de tipos, expressividade dos contratos e reducao de ambiguidade.',
  },
  architecture: {
    weight: 0.18,
    label: 'Arquitetura local',
    description: 'Separacao de responsabilidades, composicao, modelagem e acoplamento.',
  },
  maintainability: {
    weight: 0.16,
    label: 'Manutenibilidade',
    description: 'Legibilidade, organizacao, coesao e facilidade de evolucao do codigo.',
  },
  testing: {
    weight: 0.1,
    label: 'Testabilidade',
    description: 'Facilidade de validar comportamento, previsibilidade e cobertura de cenarios importantes.',
  },
  debugging: {
    weight: 0.1,
    label: 'Confiabilidade e depuracao',
    description: 'Tratamento de erros, protecao de bordas e capacidade de isolar problemas.',
  },
  autonomy: {
    weight: 0.12,
    label: 'Autonomia tecnica',
    description: 'Capacidade de tomar boas decisoes sem depender de direcionamento excessivo.',
  },
};

const SCORE_BANDS = [
  {
    key: 'junior',
    label: 'Junior',
    min: 0,
    max: 54,
    summary: 'Entrega funcional, mas ainda com lacunas relevantes de consistencia, arquitetura ou autonomia.',
  },
  {
    key: 'junior_strong',
    label: 'Junior forte',
    min: 55,
    max: 69,
    summary: 'Boa execucao e fundamentos solidos, porem ainda sem sustentacao suficiente para Pleno.',
  },
  {
    key: 'pleno',
    label: 'Pleno',
    min: 70,
    max: 84,
    summary: 'Entrega consistente, com boa separacao, manutencao razoavel e autonomia compativel com o nivel.',
  },
  {
    key: 'senior',
    label: 'Senior',
    min: 85,
    max: 100,
    summary: 'Decisao madura, trade-offs claros e qualidade sustentada mesmo sob ambiguidade.',
  },
];

const TARGET_ROLE_GATES = {
  Junior: {
    minimumScore: 45,
    requiredCriteria: {
      implementation: 50,
      typing: 45,
      maintainability: 40,
    },
    maxCriticalRedFlags: 2,
  },
  Pleno: {
    minimumScore: 70,
    requiredCriteria: {
      implementation: 70,
      architecture: 65,
      autonomy: 65,
      maintainability: 70,
    },
    maxCriticalRedFlags: 1,
  },
  Senior: {
    minimumScore: 83,
    requiredCriteria: {
      architecture: 78,
      autonomy: 82,
      debugging: 75,
      maintainability: 80,
    },
    maxCriticalRedFlags: 0,
  },
};

const ROLE_RUBRICS = {
  Junior: {
    summary: 'Resolve tarefas com escopo definido e boa base tecnica, mas ainda depende mais de direcionamento para decidir melhor.',
    expectedBehaviors: [
      'Implementa o fluxo principal com correcoes localizadas quando recebe contexto claro.',
      'Demonstra entendimento de fundamentos da linguagem e estruturas principais.',
      'Ainda oscila em modelagem, bordas, tratamento de erro ou consistencia de contratos.',
      'Costuma focar primeiro em fazer funcionar antes de otimizar desenho e manutenibilidade.',
    ],
    promotionSignals: [
      'Comeca a separar responsabilidades com intencao clara.',
      'Mostra reducao consistente de duplicacao e acoplamento.',
      'Antecipacao de erros e edge cases deixa de ser pontual e passa a ser recorrente.',
    ],
  },
  Pleno: {
    summary: 'Entrega com autonomia moderada, organizacao sustentada e boa leitura de manutencao, risco e qualidade.',
    expectedBehaviors: [
      'Estrutura o codigo pensando em evolucao, nao apenas em execucao imediata.',
      'Separa responsabilidades de forma clara e controla melhor o acoplamento.',
      'Usa contratos, validacoes e tratamento de erro com consistencia razoavel.',
      'Consegue propor solucoes e justificar escolhas tecnicas comuns sem depender de guia detalhado.',
    ],
    promotionSignals: [
      'Mostra maturidade em trade-offs, nao apenas em boas praticas isoladas.',
      'Identifica riscos sistemicos e limita impactos antes que virem defeitos.',
      'Mantem qualidade sob escopos ambiguos e exemplos menos guiados.',
    ],
  },
  Senior: {
    summary: 'No contexto deste TCC, demonstra maturidade tecnica excepcional mesmo em amostra isolada, com trade-offs claros, contratos fortes e robustez local acima da media, sem depender de uma base multi-arquivo para ser reconhecido.',
    expectedBehaviors: [
      'Modela fronteiras, contratos e responsabilidades de forma muito clara e sustentavel, mesmo em um unico arquivo.',
      'Toma decisoes locais com criterio explicito, equilibrando simplicidade, robustez e evolucao da solucao.',
      'Antecipa falhas, bordas e manutencao futura de maneira proporcional ao escopo da amostra.',
      'Mostra qualidade tecnica excepcional sem depender de contexto arquitetural mais amplo, design system completo ou varios modulos para ser reconhecido.',
    ],
    promotionSignals: [
      'Consistencia alta em arquitetura local, depuracao, contratos e autonomia.',
      'Capacidade de estruturar um trecho pequeno com padroes reaproveitaveis e baixo risco local.',
      'Justificativa clara de escolhas e trade-offs mesmo quando o escopo e limitado, inclusive com testabilidade e observabilidade proporcionais ao trecho.',
    ],
  },
};

const LANGUAGE_ROLE_EXPECTATIONS = {
  Java: {
    Junior: 'codigo funcional, estrutura basica, pouca separacao, validacao simples, mais repeticao',
    Pleno: 'boa separacao em camadas, melhor modelagem, menos duplicacao, tratamento de erro consistente, codigo testavel',
    Senior: 'arquitetura local muito clara, dominio bem modelado, contratos fortes, falhas tratadas com criterio, observabilidade e robustez proporcionais ao escopo do arquivo',
  },
  React: {
    Junior: 'componentes funcionam, mas com logica misturada, pouca composicao e pouca previsibilidade',
    Pleno: 'boa composicao, estado bem organizado, hooks usados corretamente, melhor reutilizacao, mais testabilidade',
    Senior: 'arquitetura frontend local muito madura, contratos claros mesmo em JSX com JSDoc forte ou em TSX, composicao forte, estados previsiveis, side effects bem isolados, preocupacao local com performance, feedback, reuso e injecao de dependencias; nao exige TSX, design system completo ou multiplos arquivos quando o recorte nao pede isso',
  },
  TypeScript: {
    Junior: 'tipagem basica ainda inconsistente, presenca de any ou comparacoes frouxas, pouca modelagem de dominio, funcoes e estruturas simples, baixa separacao de responsabilidades',
    Pleno: 'boa tipagem ponta a ponta, uso util de unions, generics e interfaces, contratos mais seguros, separacao clara de responsabilidades, design mais testavel, menos acoplamento e menos duplicacao',
    Senior: 'tipagem muito expressiva como ferramenta de desenho local, contratos sustentaveis, modelagem de dominio madura, fronteiras bem definidas, controle forte de acoplamento e evolucao segura mesmo em arquivo unico, com tratamento de falhas e testabilidade acima da media; branded types, unions discriminadas, gateways injetados e logging contextualizado ja podem sustentar senioridade sem exigir DDD formal, varios modulos ou fallback distribuido',
  },
};

const LANGUAGE_FOCUS = {
  Java: {
    implementation: 'correcao de fluxo, encapsulamento e uso adequado de classes e servicos',
    typing: 'contratos claros, colecoes tipadas e uso consistente da linguagem',
    architecture: 'camadas, responsabilidades e modelagem orientada ao dominio',
    maintainability: 'nomes claros, baixo acoplamento e legibilidade sustentavel',
    testing: 'testabilidade por design, isolamento e previsibilidade',
    debugging: 'tratamento de excecoes, validacoes e falhas controladas',
    autonomy: 'decisoes coerentes sem depender de excesso de orquestracao externa',
  },
  React: {
    implementation: 'fluxo de renderizacao, estado e comportamento correto da interface',
    typing: 'props e contratos previsiveis, seja em TSX ou em JSX com JSDoc consistente',
    architecture: 'composicao de componentes, isolamento de responsabilidades e reuso',
    maintainability: 'legibilidade de hooks, eventos, efeitos e estrutura de UI',
    testing: 'componentes previsiveis, com comportamento facil de verificar',
    debugging: 'controle de efeitos colaterais, estados invalidos e regressao de interface',
    autonomy: 'capacidade de escolher estrutura de componentes e estado com criterio',
  },
  TypeScript: {
    implementation: 'fluxo correto, modelagem coerente e uso limpo de funcoes e objetos',
    typing: 'uso util de unions, generics, interfaces, narrowing e contratos seguros',
    architecture: 'fronteiras entre camadas, servicos, politicas e infraestrutura',
    maintainability: 'legibilidade, coesao, reuso prudente e reducao de duplicacao',
    testing: 'design que facilita mocks, cenarios e validacao de regras',
    debugging: 'tratamento de erro, estados invalidos e caminhos de falha previsiveis',
    autonomy: 'capacidade de escolher boas abstracoes sem overengineering',
  },
};

function getCriteriaList() {
  return Object.keys(EVALUATION_CRITERIA);
}

function getScoreBand(score) {
  return SCORE_BANDS.find((band) => score >= band.min && score <= band.max) || SCORE_BANDS[0];
}

function getTargetRoleGate(role) {
  return TARGET_ROLE_GATES[role] || null;
}

function getRoleRubric(role) {
  return ROLE_RUBRICS[role] || null;
}

function getProfileFor(language, role) {
  const languageProfiles = LANGUAGE_ROLE_EXPECTATIONS[language];
  if (!languageProfiles) {
    return null;
  }

  return languageProfiles[role] || null;
}

function getProfilesForLanguage(language) {
  return LANGUAGE_ROLE_EXPECTATIONS[language] || null;
}

function getLanguageFocus(language) {
  return LANGUAGE_FOCUS[language] || null;
}

module.exports = {
  EVALUATION_CRITERIA,
  LANGUAGE_FOCUS,
  LANGUAGE_ROLE_EXPECTATIONS,
  ROLE_RUBRICS,
  SCORE_BANDS,
  TARGET_ROLE_GATES,
  getCriteriaList,
  getLanguageFocus,
  getProfileFor,
  getProfilesForLanguage,
  getRoleRubric,
  getScoreBand,
  getTargetRoleGate,
};
