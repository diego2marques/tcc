# ADR-006: Structured evaluation para reduzir subjetividade da classificacao

## Status

Aceita

## Contexto

Os primeiros ciclos mostraram que texto livre sozinho gerava variacao excessiva na classificacao.

Os principais sintomas eram:

- classificacoes conservadoras demais
- dificuldade para explicar por que um caso era `Pleno` ou `Senior`
- oscilacao entre niveis parecidos mesmo com boas evidencias

## Decisao

Foi adotado um framework estruturado de avaliacao com:

1. criterios obrigatorios
2. pesos por criterio
3. bandas intermediarias
4. gates minimos por role
5. artefato estruturado antes da narrativa

Esse desenho foi documentado em `structured-evaluation.md` e implementado com apoio de:

- `evaluationFramework.js`
- `codeAnalysisArtifact.js`
- `classifyDeveloperLevel.js`

## O que muda na pratica

- o agente de analise passa a produzir `ARTIFACT_JSON`
- a classificacao deixa de depender apenas de impressao textual
- a leitura final combina scores, evidencias e gates minimos

## Consequencias

### Positivas

- melhora explicabilidade da classificacao
- reduz subjetividade
- facilita calibracao de false positives e false negatives

### Negativas

- exige mais disciplina nos prompts
- aumenta acoplamento entre docs, configs e artefatos

## Observacao

Esse ADR marca a passagem da avaliacao puramente narrativa para um sistema mais mensuravel e auditavel.
