const crypto = require("crypto");
const Log = require("../models/Log");

/**
 * Gera requestId curto.
 */
function generateRequestId() {
  return crypto.randomBytes(6).toString("hex"); // 12 chars
}

/**
 * Monta payload de erro no formato do seu schema
 */
function normalizeError(err) {
  if (!err) return undefined;
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
}

/**
 * Logger persistente no Mongo, compatível com seu LogSchema.
 * - levels: debug/info/warn/error
 * - campos: action, message, requestId, userId/documentId/analysisId, error
 * - contexto mutável via setContext
 */
function createRequestDbLogger({ requestId }) {
  const context = {
    requestId,
    userId: null,
    documentId: null,
    analysisId: null,
  };

  const write = (level, action, message, extra = {}) => {
    const payload = {
      requestId: context.requestId,
      userId: context.userId,
      documentId: context.documentId,
      analysisId: context.analysisId,

      level,
      action,
      message,

      // extra pode sobrescrever contexto se você passar explicitamente
      userIdOverride: undefined, // só pra não “vazar” no payload
    };

    // Permite sobrescrever IDs no ato do log:
    // write('info', 'X', 'Y', { userId, documentId, analysisId })
    if (extra.userId) payload.userId = extra.userId;
    if (extra.documentId) payload.documentId = extra.documentId;
    if (extra.analysisId) payload.analysisId = extra.analysisId;

    // Erro no formato do schema
    if (extra.error) {
      payload.error = normalizeError(extra.error);
    }

    // Dica: se você quiser salvar mais coisa, teria que adicionar campo no schema.
    // Como seu schema não tem "meta", eu NÃO coloco mais nada aqui
    // pra evitar perder info ou quebrar validação.

    // Persistir sem travar a request (fire-and-forget)
    Log.create(payload).catch((e) => {
      // fallback: não quebra request se log falhar
      console.error(
        "[LOG_DB_FAIL]",
        JSON.stringify({
          requestId,
          level,
          action,
          message,
          errorMessage: e?.message,
        })
      );
    });
  };

  return {
    requestId,

    // Permite setar contexto depois que você descobrir IDs
    setContext: ({ userId, documentId, analysisId }) => {
      if (userId !== undefined) context.userId = userId;
      if (documentId !== undefined) context.documentId = documentId;
      if (analysisId !== undefined) context.analysisId = analysisId;
    },

    debug: (action, message, extra) => write("debug", action, message, extra),
    info: (action, message, extra) => write("info", action, message, extra),
    warn: (action, message, extra) => write("warn", action, message, extra),
    error: (action, message, extra) => write("error", action, message, extra),
  };
}

/**
 * Middleware Express
 */
module.exports = function requestLogger(req, res, next) {
  const requestId = generateRequestId();
  req.requestId = requestId;
  req.log = createRequestDbLogger({ requestId });

  const start = Date.now();

  req.log.info("request.start", "Request started");

  res.on("finish", () => {
    req.log.info("request.finish", "Request finished", {
      // não tem campo meta no schema, então só message.
      // Se quiser status/duration, você pode colocar no message:
    });

    // Se quiser incluir status/duração sem mexer no schema:
    req.log.debug(
      "request.metrics",
      `status=${res.statusCode} durationMs=${Date.now() - start}`
    );
  });

  next();
};