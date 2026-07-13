# ADR-004: Separacao do diagnostico em UserState e ImprovementPlan

## Status

Aceita

## Contexto

No desenho inicial, a analise tecnica do codigo carregava responsabilidades demais:

- julgar o trecho atual
- descrever o estado do desenvolvedor
- sugerir plano de melhoria

Isso gerava respostas longas, pouco especializadas e com mistura entre diagnostico e orientacao pratica.

## Decisao

Foram adicionados dois agentes especializados:

- `progressStateAgent`
- `improvementAgent`

Com isso, o fluxo passa a separar:

- analise tecnica do codigo atual
- leitura do estado atual do desenvolvedor com base no historico
- plano pratico de evolucao

## O que muda na pratica

- `Analysis` guarda a analise do artefato atual
- `UserState` guarda o diagnostico do desenvolvedor no ciclo atual
- `ImprovementPlan` guarda o plano pratico gerado para o proximo ciclo

## Consequencias

### Positivas

- cada agente fica responsavel por um problema mais bem definido
- o historico passa a ser mais rico e mais legivel
- o plano de melhoria deixa de competir com a analise tecnica

### Negativas

- o pipeline fica mais longo
- aumenta o numero de artefatos persistidos por rodada
- passa a existir maior dependencia entre etapas

## Observacao

Essa separacao foi o primeiro passo concreto para o sistema deixar de ser apenas uma analise pontual e passar a funcionar como acompanhamento de evolucao.
