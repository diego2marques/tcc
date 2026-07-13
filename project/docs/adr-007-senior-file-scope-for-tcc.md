# ADR-007: Regua de Senior proporcional a amostra isolada no TCC

## Status

Aceita

## Contexto

O projeto foi concebido para evoluir de uma analise de arquivo enviado para uma analise mais proxima de alteracoes reais de desenvolvimento, como commits com mudancas em multiplos arquivos.

Na pratica, a regua original de `Senior` foi escrita com um vies mais sistemico:

- impacto alem do arquivo isolado
- preocupacao com escalabilidade
- trade-offs arquiteturais amplos
- sinais de robustez e evolucao em contexto maior

Esse desenho faz sentido quando a entrada representa um conjunto de mudancas reais em varios arquivos correlacionados.

Para o TCC, porem, o protocolo de teste adotado nesta etapa usa amostras isoladas por arquivo para comparar a sensibilidade dos agentes entre `Junior`, `Pleno` e `Senior`.

Com essa restricao, a regua sistemica original passou a produzir um efeito colateral importante:

- `Junior` e parte de `Pleno` eram avaliados de forma razoavel
- `Senior` ficava artificialmente raro, mesmo em amostras localmente muito maduras

## Decisao

Para o contexto especifico do TCC, a classificacao de `Senior` passa a ser avaliada de forma proporcional ao escopo da amostra quando a entrada for um arquivo isolado.

Isso significa que, neste trabalho:

- um arquivo unico pode ser reconhecido como `Senior`
- nao sera obrigatorio exigir evidencia de sistema completo, design system inteiro, arquitetura multi-modulo ou escalabilidade em larga escala
- a promocao para `Senior` pode ocorrer quando houver maturidade local excepcional, com contratos fortes, fronteiras claras, tratamento robusto de falhas, boas decisoes de design e trade-offs proporcionais ao trecho analisado

## O que muda na pratica

Para amostras isoladas, sinais como estes passam a sustentar `Senior`:

- modelagem local muito madura
- contratos claros e expressivos
- separacao de responsabilidades acima da media
- tratamento explicito de erros e bordas
- testabilidade forte por design
- observabilidade ou rastreabilidade local
- escolhas de arquitetura local com intencao clara
- comentarios curtos ou estruturas que explicitem trade-offs do proprio trecho

## O que nao muda

Esta decisao nao afirma que a melhor definicao real de `Senior` seja local por natureza.

A visao arquitetural mais correta continua sendo:

- `Senior` deve ser avaliado preferencialmente em mudancas que representem um contexto mais amplo
- o insumo ideal para isso seria um commit ou conjunto de arquivos relacionados
- nesse cenario, sinais sistemicos voltariam a ter peso central

## Consequencias

### Positivas

- a bateria de testes do TCC fica mais coerente com o insumo atual
- a classificacao de `Senior` deixa de depender de um contexto que a rodada de testes ainda nao entrega
- a comparacao entre linguagens e niveis se torna mais util para o experimento atual

### Negativas

- a regua de `Senior` fica mais permissiva do que seria desejavel em um produto final orientado a commits reais
- os resultados desta etapa nao devem ser lidos como validacao definitiva de senioridade sistemica

## Proximo passo arquitetural desejado

Quando o projeto evoluir para analise de commits ou pacotes multi-arquivo, a regua de `Senior` deve voltar a privilegiar evidencias sistemicas, incluindo:

- impacto arquitetural em multiplos arquivos
- consistencia entre fronteiras
- robustez de integracao
- decisoes sob ambiguidade em contexto maior
- escalabilidade e evolucao do sistema como um todo
