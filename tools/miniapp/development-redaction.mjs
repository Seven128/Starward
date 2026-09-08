const sensitive = /token|authorization|cookie|password|secret|openid|unionid|sessionkey|latitude|longitude|phone|email/iu;
export function redactDevelopmentValue(value, depth = 0) {
  if (depth > 3) return "[bounded]";
  if (typeof value === "string") return value.slice(0, 4000)
    .replace(/(?:Bearer\s+)[^\s,;"']+/giu, "Bearer [redacted]")
    .replace(/(["']?(?:access[_-]?token|refresh[_-]?token|token|authorization|cookie|password|secret|openid|unionid|sessionkey|latitude|longitude|phone|email)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}]+)/giu, "$1[redacted]")
    .replace(/\b[-+]?\d{1,3}\.\d{4,}\s*[,，]\s*[-+]?\d{1,3}\.\d{4,}\b/gu, "[coordinates]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, "[email]")
    .replace(/\b1[3-9]\d{9}\b/gu, "[phone]")
    .replace(/\b[A-Za-z0-9_+/=-]{28,}\b/gu, "[opaque]")
    .slice(0, 512);
  if (Array.isArray(value)) return value.slice(0, 8).map(item => redactDevelopmentValue(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).slice(0, 12)
    .map(([key, item]) => [key, sensitive.test(key) ? "[redacted]" : redactDevelopmentValue(item, depth + 1)]));
  return typeof value === "number" || typeof value === "boolean" || value === null ? value : String(value);
}
