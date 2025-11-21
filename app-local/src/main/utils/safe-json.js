// utils/safe-json.js
/**
 * safe-json.js
 *
 * Fornece wrappers seguros para JSON.parse e JSON.stringify:
 *   ✔ evita exceptions quebrando o app
 *   ✔ protege contra ataques de prototype pollution
 *   ✔ loga erros de forma estruturada
 *   ✔ permite definir valores padrão
 */

const { createLogger } = require("../src/main/logger");
const logger = createLogger("safe-json");

/**
 * Remove chaves perigosas usadas em ataques
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;

  const dangerousKeys = ["__proto__", "constructor", "prototype"];

  for (const key of dangerousKeys) {
    if (key in obj) {
      delete obj[key];
      logger.warn("prototype_pollution_attempt_detected", { key });
    }
  }

  // Recursão segura
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === "object") sanitizeObject(val);
  }

  return obj;
}

/**
 * Parse seguro
 */
function safeParse(jsonString, defaultValue = null) {
  try {
    if (typeof jsonString !== "string") return defaultValue;

    const parsed = JSON.parse(jsonString);
    return sanitizeObject(parsed);

  } catch (err) {
    logger.error("safe_json_parse_error", {
      error: err.message,
      value: jsonString?.substring?.(0, 200) // evita log gigantesco
    });
    return defaultValue;
  }
}

/**
 * Stringify seguro
 */
function safeStringify(value, defaultValue = "{}") {
  try {
    const sanitized = sanitizeObject(value);
    return JSON.stringify(sanitized);

  } catch (err) {
    logger.error("safe_json_stringify_error", {
      error: err.message,
      value_type: typeof value
    });
    return defaultValue;
  }
}

module.exports = {
  safeParse,
  safeStringify,
  sanitizeObject
};