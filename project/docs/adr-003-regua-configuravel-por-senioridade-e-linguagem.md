# ADR-003: Regua configuravel por senioridade e linguagem

## Status

Aceita

## Contexto

Com mais de uma linguagem suportada e com o objetivo de classificar `Junior`, `Pleno` e `Senior`, a aplicacao nao podia depender apenas de texto solto embutido nos agentes.

Era necessario:

- centralizar roles suportadas e ordem de progressao
- definir perfis esperados por linguagem e senioridade
- separar regras de carreira de regras de avaliacao

## Decisao

Foi criada uma camada de configuracao explicita, com destaque para:

- `roleConfig.js`
- `evaluationFramework.js`

`roleConfig.js` concentra:

- roles suportadas
- aliases
- ordem de progressao
- normalizacao de role

`evaluationFramework.js` concentra:

- criterios avaliados
- pesos
- bandas de score
- gates minimos
- referencias por linguagem
- rubricas por senioridade

## O que muda na pratica

- a aplicacao deixa de espalhar regras de carreira em multiplos pontos
- os agentes passam a montar contexto a partir de configuracoes reutilizaveis
- a progressao entre niveis fica consistente
- calibracoes futuras podem ser feitas alterando configuracao, e nao fluxo inteiro

## Consequencias

### Positivas

- facilita manutencao e calibracao
- reduz inconsistencias entre agentes
- melhora transparencia do criterio usado

### Negativas

- exige disciplina para manter docs e configs sincronizados
- a configuracao passa a ser parte critica do comportamento observado

## Observacao

Essa decisao foi fundamental para a evolucao posterior do framework estruturado de avaliacao.
