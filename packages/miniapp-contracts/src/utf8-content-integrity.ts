import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/** Exact UTF-8 content identity in Node and WEAPP, without a TextEncoder global.
 * Serialization and admission remain with the calling publication/catalog.
 * Lone UTF-16 surrogates use the same U+FFFD replacement as TextEncoder.
 */
export function utf8ContentIntegrity(text: string): { bytes: number; sha256: string } {
  if (typeof text !== "string") throw new TypeError("utf8_content_invalid");
  // Reuse the project's native-safe URI byte conversion. JSON serializers
  // already escape lone surrogates; raw attribution text also preserves the
  // original TextEncoder replacement semantics before this same conversion.
  const wellFormed = text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]/g,
    value => value.length === 1 ? "\uFFFD" : value);
  const escaped = encodeURIComponent(wellFormed), buffer = new Uint8Array(escaped.length);
  let length = 0;
  for (let i = 0; i < escaped.length; i++) {
    if (escaped[i] === "%") { buffer[length++] = Number.parseInt(escaped.slice(i + 1, i + 3), 16); i += 2; }
    else buffer[length++] = escaped.charCodeAt(i);
  }
  return { bytes: length, sha256: bytesToHex(sha256(buffer.subarray(0, length))) };
}
