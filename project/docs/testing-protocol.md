# Protocolo de testes da trilha de evolucao

## Objetivo

Validar o comportamento completo do fluxo de analise com historico:

- `Analysis`
- `UserState`
- `Consolidation`
- `ImprovementPlan`

O foco nao e apenas classificar um arquivo isolado, mas observar em qual ponto o sistema passa a reconhecer a evolucao do desenvolvedor dentro de cada linguagem.

## Estrategia escolhida

Os testes usam `3 usuarios fixos`, um por linguagem:

- `typescript.progression@teste.local`
- `java.progression@teste.local`
- `react.progression@teste.local`

Cada usuario recebe apenas arquivos da propria linguagem, sempre em ordem crescente de maturidade:

1. `junior_iniciante`
2. `junior_medio`
3. `junior_avancado`
4. `pleno_iniciante`
5. `pleno_medio`
6. `pleno_avancado`
7. `senior_iniciante`
8. `senior_medio`
9. `senior_avancado`

## Regra de role enviada

Cada trilha comeca com `role=Junior`.

Depois disso:

- enquanto `detectedRole` continuar `Junior`, os proximos uploads seguem com `role=Junior`
- no primeiro retorno com `detectedRole=Pleno`, os proximos uploads passam a usar `role=Pleno`
- no primeiro retorno com `detectedRole=Senior`, os proximos uploads passam a usar `role=Senior`

Essa regra permite medir:

- em qual arquivo o sistema deixa de ver o usuario como Junior
- em qual arquivo passa a reconhecer Pleno
- em qual ponto enxerga Senior
- se a narrativa de historico acompanha a progressao observada

## O que esse protocolo testa

### 1. Classificacao

Verifica se os agentes reconhecem corretamente a senioridade sugerida pelos artefatos.

Campos principais:

- `appliedRole`
- `detectedRole`
- `stateSnapshot.detectedCurrentLevel`
- `stateSnapshot.targetLevelStatus`
- `stateSnapshot.promotionReadiness`

### 2. Coerencia de historico

Verifica se o sistema usa os ciclos anteriores de forma consistente.

Pontos observados:

- se o `UserState` reconhece melhora real
- se o `Consolidation` preserva o veredito do ciclo atual e usa o historico como contexto
- se o `ImprovementPlan` muda de forma coerente com a evolucao

### 3. Ponto de transicao

O teste mostra em qual amostra a plataforma passa a promover a leitura do usuario de:

- `Junior -> Pleno`
- `Pleno -> Senior`

## Fonte de verdade dos resultados

Os resultados do teste devem vir dos artefatos salvos automaticamente pelo runner.

O Notion pode continuar sendo usado como camada de apresentacao, mas nao deve ser a fonte primaria da rodada.

Arquivos gerados por execucao:

- `test-results/<provider>/<model>/<tentativa>/raw/`
- `test-results/<provider>/<model>/<tentativa>/summary.json`
- `test-results/<provider>/<model>/<tentativa>/summary.csv`
- `test-results/<provider>/<model>/<tentativa>/reports/<linguagem>.md`

## Estrutura dos resultados

### `raw/`

Armazena a resposta completa da API para cada upload.

Serve para auditoria, reprocessamento e consulta posterior.

### `summary.json`

Resumo estruturado da rodada inteira com:

- linguagem
- arquivo analisado
- role enviada
- role detectada
- status de aderencia
- prontidao para promocao
- ids de artefatos persistidos

### `summary.csv`

Versao tabular para comparacao rapida, filtros e importacao em planilhas.

### `reports/<linguagem>.md`

Relatorio legivel por usuario/linguagem contendo:

- ordem dos uploads
- mudancas de role ao longo do fluxo
- momento de transicao para Pleno
- momento de transicao para Senior
- resumo dos vereditos mais importantes

## Ambiente recomendado

Como o projeto ainda esta em fase de testes, nao e obrigatorio separar banco de producao.

Mesmo assim, para evitar contaminacao de historico:

- manter os `3 usuarios fixos` exclusivos para esse protocolo
- nao reutilizar esses mesmos emails para testes manuais aleatorios
- quando precisar reiniciar a trilha, limpar apenas os registros desses usuarios

## Execucao recomendada

### Modo API

Com a API rodando localmente:

```powershell
cd project
npm run test:progression
```

### Modo direto

Para provedores mais lentos ou quando a rodada nao deve depender do timeout do endpoint HTTP local:

```powershell
cd project
$env:TEST_RUN_MODE="direct"
npm run test:progression
```

Variaveis uteis:

```powershell
$env:TEST_API_BASE_URL="http://localhost:3000"
$env:TEST_RUN_MODE="api"
$env:TEST_TRACKS="typescript,java,react"
$env:TEST_RUN_LABEL="rodada-relatorio-01"
$env:TEST_RUN_SEQUENCE="primeira-tentativa"
$env:TEST_INCLUDE_MODEL_IN_RUN_ID="true"
npm run test:progression
```

Exemplos de estrutura gerada:

- `test-results/open-ai/gpt-4.1/primeira tentativa`
- `test-results/open-ai/gpt-4.1/decima quarta tentativa`
- `test-results/anthropic/claude-sonnet-4-5-20250929/primeira tentativa`
- `test-results/gemini/gemini-3.5-flash/primeira tentativa`

Regras praticas:

- `TEST_RUN_MODE` alterna entre `api` e `direct`
- `TEST_TRACKS` permite rodar apenas um subconjunto, como `typescript` ou `java,react`
- `TEST_RUN_LABEL`, `TEST_RUN_SEQUENCE` e `TEST_INCLUDE_MODEL_IN_RUN_ID` continuam registradas no `summary.json`, mesmo com o nome da pasta sendo organizado por tentativa

## Criterio de leitura dos resultados

Uma rodada e considerada boa quando:

- os arquivos `junior_*` permanecem majoritariamente em leitura de Junior
- os arquivos `pleno_*` passam a gerar reconhecimento consistente de Pleno
- os arquivos `senior_*` passam a gerar reconhecimento consistente de Senior
- as mudancas de `detectedRole` aparecem em pontos plausiveis da trilha
- o historico consolidado nao contradiz a analise atual

## Uso no relatorio

Esse protocolo permite documentar com clareza:

- o desenho experimental adotado
- a ordem dos estimulos enviados ao sistema
- a regra de adaptacao da `role`
- os indicadores observados em cada ciclo
- a forma de coleta automatizada dos resultados
- o provedor/modelo usado em cada rodada
