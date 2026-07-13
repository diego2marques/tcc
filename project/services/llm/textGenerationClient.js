const { OpenAI } = require('openai');

const DEFAULT_PROVIDER = 'openai';
const ANTHROPIC_VERSION = '2023-06-01';
const OPENAI_DEFAULT_MODEL = 'gpt-4.1';
const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const GEMINI_MAX_RETRIES = 3;
const GEMINI_RETRY_DELAYS_MS = [2000, 5000, 10000];

let openAIClient = null;

function getProvider() {
  return (process.env.LLM_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase();
}

function resolveModel(requestedModel) {
  if (requestedModel) {
    return requestedModel;
  }

  const provider = getProvider();

  if (provider === 'anthropic') {
    return ANTHROPIC_DEFAULT_MODEL;
  }

  if (provider === 'gemini') {
    return GEMINI_DEFAULT_MODEL;
  }

  return OPENAI_DEFAULT_MODEL;
}

function getOpenAIClient() {
  if (!openAIClient) {
    openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openAIClient;
}

async function generateText({
  prompt,
  model,
  temperature = 0.2,
  maxTokens,
}) {
  const provider = getProvider();
  const resolvedModel = resolveModel(model);

  if (provider === 'anthropic') {
    return generateWithAnthropic({
      prompt,
      model: resolvedModel,
      temperature,
      maxTokens,
    });
  }

  if (provider === 'gemini') {
    return generateWithGemini({
      prompt,
      model: resolvedModel,
    });
  }

  return generateWithOpenAI({
    prompt,
    model: resolvedModel,
    temperature,
  });
}

async function generateWithOpenAI({
  prompt,
  model,
  temperature,
}) {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature,
  });

  return response.choices[0]?.message?.content || '';
}

async function generateWithAnthropic({
  prompt,
  model,
  temperature,
  maxTokens,
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY nao configurada para uso com Claude.');
  }

  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens || 8192,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (error) {
    const cause = error?.cause?.message || error?.message || 'unknown fetch error';
    throw new Error(`Anthropic request failed: ${cause}`);
  }

  if (!response.ok) {
    const errorBody = await safeReadJson(response);
    throw new Error(`Anthropic API error (${response.status}): ${JSON.stringify(errorBody)}`);
  }

  const body = await response.json();
  return extractAnthropicText(body);
}

function getGeminiApiKey() {
  return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || null;
}

async function generateWithGemini({
  prompt,
  model,
}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY ou GOOGLE_API_KEY nao configurada para uso com Gemini.');
  }

  for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt += 1) {
    let response;

    try {
      response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          model,
          input: prompt,
        }),
      });
    } catch (error) {
      const cause = error?.cause?.message || error?.message || 'unknown fetch error';
      if (shouldRetryGeminiRequest({ error, attempt })) {
        await sleep(getGeminiRetryDelayMs(attempt));
        continue;
      }

      throw new Error(`Gemini request failed: ${cause}`);
    }

    if (!response.ok) {
      const errorBody = await safeReadJson(response);
      if (shouldRetryGeminiResponse({ response, errorBody, attempt })) {
        await sleep(getGeminiRetryDelayMs(attempt));
        continue;
      }

      throw new Error(`Gemini API error (${response.status}): ${JSON.stringify(errorBody)}`);
    }

    const body = await response.json();
    return extractGeminiText(body);
  }

  throw new Error('Gemini request failed after retries.');
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch {
    return { error: 'Resposta invalida da Anthropic.' };
  }
}

function extractAnthropicText(body) {
  if (!Array.isArray(body?.content)) {
    return '';
  }

  return body.content
    .filter((item) => item?.type === 'text')
    .map((item) => item.text || '')
    .join('');
}

function extractGeminiText(body) {
  if (typeof body?.output_text === 'string' && body.output_text.trim()) {
    return body.output_text;
  }

  if (!Array.isArray(body?.steps)) {
    return '';
  }

  return body.steps
    .filter((step) => step?.type === 'model_output' && Array.isArray(step.content))
    .flatMap((step) => step.content)
    .filter((item) => item?.type === 'text')
    .map((item) => item.text || '')
    .join('');
}

function shouldRetryGeminiRequest({ error, attempt }) {
  if (attempt >= GEMINI_MAX_RETRIES) {
    return false;
  }

  const retryableCodes = new Set([
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EAI_AGAIN',
  ]);

  return retryableCodes.has(error?.cause?.code) || retryableCodes.has(error?.code);
}

function shouldRetryGeminiResponse({ response, errorBody, attempt }) {
  if (attempt >= GEMINI_MAX_RETRIES) {
    return false;
  }

  const status = response?.status;
  const apiErrorCode = errorBody?.error?.code;
  const apiErrorMessage = String(errorBody?.error?.message || '').toLowerCase();

  return (
    status === 429 ||
    status === 503 ||
    status === 504 ||
    (status === 500 && apiErrorCode === 'api_error') ||
    apiErrorMessage.includes('high demand')
  );
}

function getGeminiRetryDelayMs(attempt) {
  return GEMINI_RETRY_DELAYS_MS[attempt - 1] || GEMINI_RETRY_DELAYS_MS[GEMINI_RETRY_DELAYS_MS.length - 1];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  generateText,
  getProvider,
  resolveModel,
};
