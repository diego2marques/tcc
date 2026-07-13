# ADR-008: Abstracao de provedor para OpenAI, Anthropic e futura abertura para Gemini

## Status

Aceita

## Contexto

O pipeline nasceu acoplado a um unico provedor de LLM.

Isso limitava:

- comparacao entre modelos
- controle de custo por rodada
- resiliencia arquitetural caso um provedor mudasse latencia, preco ou disponibilidade

Com a necessidade de comparar resultados com Claude e preparar o terreno para Gemini, o acoplamento direto passou a ser um gargalo.

## Decisao

Foi criada uma camada de abstracao de geracao de texto em `services/llm/textGenerationClient.js`.

Essa camada:

- resolve o provedor atual por `LLM_PROVIDER`
- resolve o modelo efetivo por agente
- permite usar OpenAI ou Anthropic sem reescrever os agentes
- prepara o terreno para uma integracao futura com Gemini

Os agentes deixam de conhecer diretamente o SDK de um provedor especifico e passam a depender apenas da funcao `generateText`.

## O que muda na pratica

- `codeAnalysisAgent`, `progressStateAgent`, `consolidationAgent` e `improvementAgent` usam a mesma camada de cliente
- o provedor pode ser trocado por configuracao
- os resultados de testes podem ser organizados por provedor e modelo
- o runner de progressao passa a refletir essa separacao na pasta de `test-results`

## Consequencias

### Positivas

- facilita comparacao entre IAs
- reduz acoplamento dos agentes
- permite otimizar custo por provedor e modelo
- prepara o sistema para novas integracoes

### Negativas

- a camada de abstracao precisa lidar com diferencas de timeout, formato e erro entre provedores
- aumenta a responsabilidade da configuracao por ambiente

## O que ainda nao foi feito

Neste momento:

- OpenAI esta suportada
- Anthropic esta suportada
- Gemini ainda nao foi implementada

Mesmo assim, a arquitetura ja foi aberta para essa terceira possibilidade, sem exigir novo redesenho conceitual.
