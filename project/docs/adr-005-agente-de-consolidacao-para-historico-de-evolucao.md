# ADR-005: Agente de consolidacao para resumir melhor o historico de evolucao

## Status

Aceita

## Contexto

Mesmo com `Analysis`, `UserState` e `ImprovementPlan`, ainda faltava uma etapa dedicada a interpretar a evolucao entre ciclos.

Sem isso, o plano seguinte poderia:

- repetir metas antigas sem considerar execucao parcial
- ignorar melhoras reais do ciclo anterior
- perder estabilidade de leitura ao comparar apenas estado atual e codigo atual

## Decisao

Foi adicionado o `consolidationAgent`, com persistencia em `Consolidation`.

Ele recebe:

- estado atual
- estado anterior
- plano de melhoria anterior

E devolve um consolidado que resume:

- evolucoes com evidencia clara
- lacunas recorrentes
- estabilidade no nivel atual
- sinais de aproximacao ao proximo nivel

## O que muda na pratica

- o plano de melhoria passa a ser gerado a partir de `UserState + Consolidation`
- o historico deixa de ser apenas sequencial e passa a ser interpretado
- a narrativa entre ciclos fica mais coerente

## Consequencias

### Positivas

- reduz repeticao cega de recomendacoes
- melhora leitura longitudinal do desenvolvedor
- torna o plano seguinte mais contextualizado

### Negativas

- aumenta custo e latencia do pipeline
- adiciona uma nova etapa que tambem precisa ser calibrada

## Observacao

Esse passo consolidou a ideia de que o projeto nao analisa apenas arquivos, mas uma trilha de evolucao por linguagem e por usuario.
