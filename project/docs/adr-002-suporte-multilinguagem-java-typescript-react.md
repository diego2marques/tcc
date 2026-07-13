# ADR-002: Suporte multilinguagem para Java, TypeScript e React

## Status

Aceita

## Contexto

O projeto deixou de analisar um unico tipo de codigo e passou a comparar comportamento do pipeline em linguagens diferentes.

Para o experimento do TCC, era importante observar:

- se a regua se mantinha coerente entre linguagens
- se a leitura de senioridade variava conforme o ecossistema
- se o historico de evolucao permanecia separado por linguagem

## Decisao

A API passou a aceitar arquivos de:

- `Java` via `.java`
- `TypeScript` via `.ts`
- `React` via `.jsx` e `.tsx`

A linguagem e inferida pela extensao do arquivo, e o historico de analise passa a ser consultado por `usuario + linguagem`.

## O que muda na pratica

- a rota valida extensoes suportadas
- o `Document` registra a linguagem inferida
- a busca de historico (`Analysis`, `UserState`, `ImprovementPlan`) passa a considerar `language`
- os testes de progressao passam a usar trilhas independentes por linguagem

## Consequencias

### Positivas

- o pipeline pode ser comparado entre ecossistemas diferentes
- o historico de um usuario em Java nao contamina o de TypeScript ou React
- as regras de avaliacao podem ser especializadas por linguagem

### Negativas

- aumenta a necessidade de calibracao da regua
- cresce a responsabilidade dos prompts e configs para evitar vieses entre linguagens

## Observacao

Esse suporte multilinguagem abriu espaco para a configuracao de referencias especificas por linguagem nos passos seguintes.
