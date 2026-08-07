const PRIVATE_V4 =
  /^(?:127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/u;
const LOOPBACK_NAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "[::1]",
  "::1",
]);

export interface UrlValidation {
  ok: boolean;
  normalizedUrl: string | null;
  code:
    | "OK"
    | "URL_LENGTH"
    | "URL_PARSE"
    | "DANGEROUS_SCHEME"
    | "URL_CREDENTIALS"
    | "SSRF_PRIVATE_DESTINATION";
  recovery: readonly string[];
}

export function validateExternalUrl(raw: string): UrlValidation {
  if (raw.length < 8 || raw.length > 2048)
    return {
      ok: false,
      normalizedUrl: null,
      code: "URL_LENGTH",
      recovery: ["保留草稿并检查链接长度"],
    };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return {
      ok: false,
      normalizedUrl: null,
      code: "URL_PARSE",
      recovery: ["仅粘贴完整的 http/https 链接"],
    };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    return {
      ok: false,
      normalizedUrl: null,
      code: "DANGEROUS_SCHEME",
      recovery: ["仅允许 http/https"],
    };
  if (url.username || url.password)
    return {
      ok: false,
      normalizedUrl: null,
      code: "URL_CREDENTIALS",
      recovery: ["移除链接中的账号或凭证"],
    };
  const host = url.hostname.toLowerCase();
  if (
    LOOPBACK_NAMES.has(host) ||
    PRIVATE_V4.test(host) ||
    host.endsWith(".local")
  )
    return {
      ok: false,
      normalizedUrl: null,
      code: "SSRF_PRIVATE_DESTINATION",
      recovery: ["使用公开可访问的主页或帖子链接"],
    };
  url.hash = "";
  return { ok: true, normalizedUrl: url.toString(), code: "OK", recovery: [] };
}
