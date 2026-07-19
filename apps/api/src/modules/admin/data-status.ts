import { createHash } from "node:crypto";

export function serializeDataEnvelope(input: { generatedAt: string; expiresAt: string; parts: Array<{ key: string; status: string; confidence: number; sourceVersion?: string; warning?: string }> }) {
  const parts = Object.fromEntries(input.parts.map(({ key, ...value }) => [key, value]));
  const warnings = input.parts.flatMap((part) => part.warning ? [part.warning] : []);
  const status = input.parts.every((part) => part.status === "fresh") ? "fresh" : "partial";
  return { status, generatedAt: input.generatedAt, expiresAt: input.expiresAt, etag: createHash("sha256").update(JSON.stringify(parts)).digest("hex"), warnings, parts };
}
