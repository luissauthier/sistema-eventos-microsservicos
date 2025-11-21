// utils/validators.js
/**
 * validators.js
 *
 * Validações genéricas e SchemaValidator leve para o app-local.
 *   ✔ valida payloads do renderer (IPC)
 *   ✔ evita ataques via parâmetros suspeitos
 *   ✔ gera erros padronizados e logados
 *   ✔ sem dependências externas pesadas
 */

const { createLogger } = require("../logger");
const logger = createLogger("validators");

// ======================================================
// VALIDAÇÕES BÁSICAS
// ======================================================

function isString(v) {
  return typeof v === "string";
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isNumber(v) {
  return typeof v === "number" && !isNaN(v);
}

function isPositiveInt(v) {
  return Number.isInteger(v) && v > 0;
}

function isEmail(v) {
  return (
    typeof v === "string" &&
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/.test(v)
  );
}

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function assertRequired(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Campo obrigatório ausente: ${fieldName}`);
  }
}

// ======================================================
// SCHEMA VALIDATION (custom leve, estilo ZOD)
// ======================================================

/**
 * Schema simples:
 *
 * const schema = {
 *   username: { type: "string", required: true },
 *   email:    { type: "email", required: false },
 *   age:      { type: "positiveInt", required: true }
 * };
 *
 * const data = validatePayload(schema, payload);
 */

function validatePayload(schema, input) {
  const output = {};

  if (!isObject(input)) {
    logger.error("validate_payload_not_object", { input });
    throw new Error("Payload inválido (não é um objeto).");
  }

  for (const [field, rules] of Object.entries(schema)) {
    const value = input[field];

    // 1) Campo obrigatório
    if (rules.required) {
      try {
        assertRequired(value, field);
      } catch (err) {
        logger.warn("validate_required_failed", { field });
        throw err;
      }
    }

    // Campo opcional ausente → pula
    if (value === undefined || value === null || value === "") continue;

    // 2) Tipo básico
    switch (rules.type) {
      case "string":
        if (!isString(value)) throw validationError(field, "string");
        break;

      case "nonEmptyString":
        if (!isNonEmptyString(value)) throw validationError(field, "non-empty string");
        break;

      case "number":
        if (!isNumber(value)) throw validationError(field, "number");
        break;

      case "positiveInt":
        if (!isPositiveInt(value)) throw validationError(field, "positive integer");
        break;

      case "email":
        if (!isEmail(value)) throw validationError(field, "email");
        break;

      case "object":
        if (!isObject(value)) throw validationError(field, "object");
        break;

      default:
        logger.warn("unknown_validation_type", { field, rule: rules.type });
        throw new Error(`Tipo de validação desconhecido: ${rules.type}`);
    }

    // 3) Sanitização opcional
    if (rules.trim && typeof value === "string") {
      output[field] = value.trim();
    } else {
      output[field] = value;
    }
  }

  return output;
}

function validationError(field, expected) {
  const msg = `Campo "${field}" deve ser um ${expected}.`;
  logger.warn("validation_error", { field, expected });
  return new Error(msg);
}

// Export público
module.exports = {
  isString,
  isNonEmptyString,
  isNumber,
  isPositiveInt,
  isEmail,
  isObject,
  assertRequired,
  validatePayload
};