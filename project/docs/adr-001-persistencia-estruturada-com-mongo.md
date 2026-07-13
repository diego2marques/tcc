# ADR-001: Persistencia estruturada com Mongo para usuarios, documentos, analises e historico

## Status

Aceita

## Contexto

No inicio, a analise poderia ser tratada apenas como uma resposta em memoria ou como um retorno pontual da API.

Esse formato era insuficiente para o objetivo do projeto, porque o TCC precisava:

- manter historico de evolucao por usuario
- separar artefatos de entrada e saida
- rastrear documentos, usuarios e analises de forma independente
- permitir consolidacao e planos de melhoria em ciclos posteriores

Sem persistencia estruturada, o sistema perderia contexto entre rodadas e ficaria limitado a uma leitura isolada por arquivo.

## Decisao

Foi adotado MongoDB como banco principal da aplicacao, com persistencia separada para os principais conceitos do dominio:

- `User`
- `Document`
- `Analysis`
- `UserState`
- `Consolidation`
- `ImprovementPlan`
- `Log`

Cada entidade passa a guardar um papel especifico no fluxo, evitando um unico documento gigante com toda a historia do usuario.

## O que muda na pratica

- o usuario passa a ser identificado principalmente por `email`
- o arquivo enviado passa a ser salvo como `Document`
- a analise do codigo passa a ser salva como `Analysis`
- o retrato atual do desenvolvedor passa a ser salvo como `UserState`
- o resumo entre ciclos passa a ser salvo como `Consolidation`
- o plano pratico de evolucao passa a ser salvo como `ImprovementPlan`
- eventos operacionais passam a ser registrados em `Log`

## Consequencias

### Positivas

- historico de evolucao deixa de depender de memoria de processo
- artefatos ficam rastreaveis e auditaveis
- o sistema ganha base para comparacao entre ciclos
- testes automatizados passam a produzir evidencias persistidas

### Negativas

- aumenta a complexidade operacional do ambiente local
- exige manutencao de modelos e relacionamentos
- passa a existir risco de contaminacao de historico entre rodadas se nao houver cuidado com usuarios de teste

## Observacao

Essa decisao foi a base para os ADRs seguintes, porque a separacao de agentes e a consolidacao entre ciclos dependem diretamente dessa estrutura persistida.
