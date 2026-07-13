# Structured Evaluation Framework

## Objetivo

Este documento define a nova base para reduzir subjetividade nos artefatos gerados pelos agentes.
Em vez de depender apenas de texto livre, a avaliacao passa a ter:

1. uma rubrica explicita por nivel
2. um artefato estruturado para cada analise
3. uma classificacao numerica com gates minimos por senioridade

## Rubrica por nivel

### Junior

Sinais esperados:
- resolve tarefas com escopo definido
- demonstra boa base de linguagem e estrutura
- ainda oscila em modelagem, bordas e consistencia
- tende a executar melhor do que decidir

### Pleno

Sinais esperados:
- organiza o codigo pensando em manutencao
- separa responsabilidades com clareza
- trata erros e contratos com consistencia razoavel
- propoe solucoes com autonomia moderada

### Senior

Sinais esperados:
- decide bem sob ambiguidade
- explicita trade-offs tecnicos
- reduz risco estrutural e antecipa falhas
- no contexto do TCC, pode ser reconhecido por maturidade local excepcional mesmo em amostra isolada

## Criterios obrigatorios de score

Todos os agentes de analise de codigo devem pontuar de `0` a `100` os seguintes criterios:

- `implementation`
- `typing`
- `architecture`
- `maintainability`
- `testing`
- `debugging`
- `autonomy`

Pesos atuais:

- `implementation`: `0.18`
- `typing`: `0.16`
- `architecture`: `0.18`
- `maintainability`: `0.16`
- `testing`: `0.10`
- `debugging`: `0.10`
- `autonomy`: `0.12`

## Gates minimos por nivel

O score medio sozinho nao pode decidir a senioridade.
Cada role precisa bater tambem requisitos minimos nos criterios mais importantes.

### Junior

- score final minimo: `45`
- `implementation >= 50`
- `typing >= 45`
- `maintainability >= 40`

### Pleno

- score final minimo: `70`
- `implementation >= 70`
- `architecture >= 65`
- `autonomy >= 65`
- `maintainability >= 70`

### Senior

- score final minimo: `83`
- `architecture >= 78`
- `autonomy >= 82`
- `debugging >= 75`
- `maintainability >= 80`
- `0` red flags criticos

## Bandas intermediarias

Para evitar decisoes binarias demais, o classificador usa bandas:

- `0-54`: `junior`
- `55-69`: `junior_strong`
- `70-84`: `pleno`
- `85-100`: `senior`

Isso ajuda a diferenciar:

- um `Junior forte` de um `Pleno`
- um `Pleno` aderente de um `Senior`

## Contrato do artefato do Agente de Analise

Cada execucao do agente deve produzir um JSON com este formato conceitual:

```json
{
  "artifactVersion": "1.0",
  "artifactKind": "code_analysis",
  "agent": "codeAnalysisAgent",
  "language": "TypeScript",
  "targetRole": "Pleno",
  "summary": "Resumo objetivo da amostra.",
  "criteriaScores": {
    "implementation": 78,
    "typing": 82,
    "architecture": 74,
    "maintainability": 76,
    "testing": 61,
    "debugging": 68,
    "autonomy": 72
  },
  "evidence": [
    {
      "criterion": "architecture",
      "score": 74,
      "confidence": 0.86,
      "reason": "Separacao adequada entre validacao, politica e gateway.",
      "codeReference": "NotificationService e NotificationValidator"
    }
  ],
  "strongSignals": [
    "boa modelagem de contratos",
    "separacao coerente de responsabilidades"
  ],
  "redFlags": [
    {
      "severity": "medium",
      "criterion": "testing",
      "reason": "Nao ha evidencia de cenarios de falha automatizados."
    }
  ],
  "improvementOpportunities": [
    "consolidar erros de entrega em tipos mais especificos"
  ],
  "classification": {
    "targetLevelStatus": "at_expected",
    "nearestLevel": "pleno",
    "weightedScore": 73.4,
    "confidence": 0.81
  },
  "narrative": {
    "strengths": [],
    "risks": [],
    "levelComparison": {
      "junior": "",
      "pleno": "",
      "senior": ""
    },
    "conclusion": ""
  }
}
```

## Regra de decisao

1. O agente identifica evidencias concretas no codigo.
2. O agente converte evidencias em scores por criterio.
3. O classificador calcula `weightedScore`.
4. O sistema compara o resultado com a banda numerica.
5. O sistema valida os gates minimos da role alvo.
6. O veredito final vira:

- `below_expected`
- `at_expected`
- `above_expected`

## Como isso resolve o problema atual

O problema observado hoje e o modelo chamar um codigo de `Junior muito avancado` mesmo quando ele ja demonstra varios sinais de `Pleno`.

Com este framework:

- `Pleno` deixa de ser apenas uma impressao textual
- o agente precisa provar score por criterio
- a classificacao passa a exigir gates minimos de autonomia e arquitetura
- o sistema ganha bandas intermediarias sem perder o cargo final

## Estado atual da implementacao

Os prompts dos agentes ja foram ajustados para produzir o artefato estruturado antes da narrativa, e a classificacao usa essa base como fonte principal para as etapas seguintes do pipeline.

## Separacao de responsabilidades na configuracao

Depois desta refatoracao, a base de configuracao fica separada assim:

- [roleConfig.js](../config/roleConfig.js): aliases, roles suportadas e ordem de progressao
- [evaluationFramework.js](../config/evaluationFramework.js): rubricas, referencias por linguagem, criterios, pesos e gates
- [textGenerationClient.js](../services/llm/textGenerationClient.js): abstracao de provedor/modelo para os agentes

Com isso, a aplicacao deixa de depender de um unico arquivo misturando:

- validacao de role
- progressao de carreira
- descricao qualitativa de senioridade
- chamadas diretas a um unico provedor de LLM
