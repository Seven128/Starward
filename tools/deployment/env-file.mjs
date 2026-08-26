import { readFile } from "node:fs/promises";

function fail(code, field) {
  throw new Error(field ? `${code}:${field}` : code);
}

function unquote(value, field) {
  if (!value.startsWith('"') && !value.startsWith("'")) return value;
  const quote = value[0];
  if (!value.endsWith(quote) || value.length < 2)
    fail("environment_file_quote_invalid", field);
  const inner = value.slice(1, -1);
  if (quote === "'") return inner;
  return inner.replace(/\\n/gu, "\n").replace(/\\r/gu, "\r").replace(/\\t/gu, "\t").replace(/\\"/gu, '"').replace(/\\\\/gu, "\\");
}

export function parseEnvironmentText(text, source = "environment") {
  const result = Object.create(null);
  const lines = text.replace(/^\uFEFF/u, "").split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index].trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trimStart();
    const equals = line.indexOf("=");
    if (equals <= 0)
      fail("environment_file_line_invalid", `${source}:${index + 1}`);
    const key = line.slice(0, equals).trim();
    if (!/^[A-Z][A-Z0-9_]*$/u.test(key))
      fail("environment_file_key_invalid", `${source}:${index + 1}`);
    if (Object.hasOwn(result, key))
      fail("environment_file_duplicate_key", `${source}:${key}`);
    result[key] = unquote(line.slice(equals + 1).trim(), `${source}:${key}`);
  }
  return Object.freeze(result);
}

export async function readEnvironmentFile(filePath) {
  return parseEnvironmentText(await readFile(filePath, "utf8"), filePath);
}
