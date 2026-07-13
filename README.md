# Sistema Multiagente para Avaliação da Evolução Técnica de Desenvolvedores

> Trabalho de Conclusão de Curso — Ciência da Computação  
> Universidade Federal de Lavras (UFLA)

Este projeto implementa um sistema multiagente baseado em Grandes Modelos de Linguagem (LLMs) para avaliar código-fonte, acompanhar a evolução técnica de desenvolvedores ao longo do tempo e gerar planos personalizados de melhoria.

O sistema foi desenvolvido como parte do Trabalho de Conclusão de Curso (TCC) de Diego Marques Andrade.

---

# Índice

- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Como executar](#como-executar)
- [Configuração](#configuração)
- [Executando a API](#executando-a-api)
- [Executando os testes](#executando-os-testes)
- [Documentação](#documentação)
- [Arquitetura dos agentes](#arquitetura-dos-agentes)
- [Framework de avaliação](#framework-de-avaliação)
- [Resultados](#resultados)

---

# Arquitetura

O pipeline completo da aplicação é composto por quatro agentes especializados.

```
                Upload do Código
                       │
                       ▼
         Code Analysis Agent
                       │
                Analysis Artifact
                       │
                       ▼
        Progress State Agent
                       │
                 User State
                       │
                       ▼
        Consolidation Agent
                       │
              Consolidation
                       │
                       ▼
         Improvement Agent
                       │
              Improvement Plan
```

Cada agente possui responsabilidade única e bem definida.

---

# Tecnologias

Backend

- Node.js
- Express
- MongoDB

LLMs

- OpenAI
- Anthropic
- Gemini

Outros

- JavaScript
- MongoDB
- dotenv

---

# Estrutura do Projeto

```
project/
│
├── config/
├── docs/
├── models/
├── routes/
├── services/
│   ├── agents/
│   ├── llm/
│   └── ...
├── scripts/
├── test-files/
├── test-results/
└── app.js
```

---

# Como executar

## 1. Clone o projeto

```bash
git clone https://github.com/diego2marques/tcc.git

cd tcc/project
```

---

## 2. Instale as dependências

```bash
npm install
```

---

## 3. Configure as variáveis de ambiente

Crie um arquivo `.env`

```env
PORT=3000

MONGO_URI=

LLM_PROVIDER=openai

OPENAI_API_KEY=

ANTHROPIC_API_KEY=

GOOGLE_API_KEY=

CODE_ANALYSIS_MODEL=gpt-4.1
PROGRESS_STATE_MODEL=gpt-4.1
CONSOLIDATION_AGENT_MODEL=gpt-4.1
IMPROVEMENT_AGENT_MODEL=gpt-4.1-mini
```

---

## 4. Execute o MongoDB

Mongo local

```
mongodb://127.0.0.1:27017
```

ou

Mongo Atlas

---

## 5. Execute a API

```bash
npm start
```

A API ficará disponível em

```
http://localhost:3000
```

---

# Executando os testes

O projeto possui um runner automatizado de testes.

Configure

```powershell
$env:TEST_API_BASE_URL="http://localhost:3000"

$env:TEST_RUN_LABEL="OpenAI"

$env:TEST_RUN_SEQUENCE="1"

$env:TEST_INCLUDE_MODEL_IN_RUN_ID="true"

npm run test:progression
```

Também é possível executar apenas linguagens específicas.

```
TEST_TRACKS=java

TEST_TRACKS=typescript

TEST_TRACKS=react
```

---

# Documentação

Toda a documentação do projeto encontra-se em

```
project/docs/
```

Os documentos mais importantes são:

| Documento | Descrição |
|------------|-----------|
| architecture.md | Arquitetura final |
| structured-evaluation.md | Framework de avaliação |
| testing-protocol.md | Motor de testes |
| adr/ | Decisões arquiteturais |

---

# Arquitetura dos agentes

## Code Analysis Agent

Responsável pela análise técnica do código.

Entrada

- código
- linguagem
- role

Saída

- Analysis Artifact

---

## Progress State Agent

Responsável por construir o estado atual do desenvolvedor.

Entrada

- análise atual
- análise anterior

Saída

- User State

---

## Consolidation Agent

Responsável por consolidar a evolução histórica.

Entrada

- estado atual
- estado anterior
- plano anterior

Saída

- Consolidation Report

---

## Improvement Agent

Responsável pela geração do plano de melhoria.

Entrada

- estado atual
- consolidação

Saída

- Improvement Plan

---

# Framework de avaliação

A avaliação considera os seguintes critérios:

- Implementation
- Typing
- Architecture
- Maintainability
- Testing
- Debugging
- Autonomy

Os critérios são combinados com uma régua estruturada para determinar a senioridade do desenvolvedor.

---

# Resultados dos testes

As execuções geram automaticamente:

```
test-results/

raw/

reports/

summary.json

summary.csv
```

Esses artefatos podem ser utilizados para auditoria ou comparação entre provedores.

---

# Reproduzindo os experimentos

Para reproduzir exatamente os experimentos do TCC:

1. Configure o mesmo provedor de LLM.
2. Utilize os mesmos modelos.
3. Execute as trilhas de progressão na ordem definida.
4. Preserve os arquivos `summary.json`, `summary.csv` e `raw`.

---

# Trabalho Acadêmico

**Sistema Multiagente Baseado em Grandes Modelos de Linguagem para Avaliação e Acompanhamento da Evolução Técnica de Desenvolvedores**

Universidade Federal de Lavras — UFLA

Curso de Ciência da Computação

---

# Autor

Diego Marques Andrade