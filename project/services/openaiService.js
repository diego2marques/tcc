const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeCSSCode(newCode, previousCode = null) {
  let = '';
  if (previousCode) {
    prompt = `
        Você é um assistente que compara códigos CSS de um mesmo desenvolvedor em momentos diferentes.

        Analise a versão antiga (A) e a nova (B) e diga:

        1. Se o desenvolvedor melhorou e onde
        2. Quais boas práticas foram mantidas
        3. Quais problemas ainda persistem
        4. Sugira fontes (como sites ou cursos) para ele estudar

        VERSÃO A (antiga):
        ${previousCode}

        VERSÃO B (nova):
        ${newCode}
        `;
  } else {
    prompt = `
        Você é um assistente de revisão de código CSS. Analise o seguinte código:

        ${newCode}

        Liste os acertos, erros e sugestões de melhoria.
        `;
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
  });

  return response.choices[0].message.content;
}

module.exports = { analyzeCSSCode };