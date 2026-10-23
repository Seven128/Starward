export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** New writes are JSON values, not lossy coercions of Date/undefined/NaN/etc. */
export function canonicalJson(value: unknown, legacy = false, ancestors = new Set<object>()): string {
  if (legacy && value === undefined) return "null";
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (typeof value !== "object" || value === null || ancestors.has(value)) throw new Error("preference_runtime_payload_invalid");
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) throw new Error("preference_runtime_payload_invalid");
  if (Object.getOwnPropertySymbols(value).length) throw new Error("preference_runtime_payload_invalid");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${Array.from({ length: value.length }, (_, i) => canonicalJson(value[i], legacy, ancestors)).join(",")}]`;
    }
    return `{${Object.keys(value).sort().map(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) throw new Error("preference_runtime_payload_invalid");
      return `${JSON.stringify(key)}:${canonicalJson(descriptor.value, legacy, ancestors)}`;
    }).join(",")}}`;
  } finally { ancestors.delete(value); }
}

export async function defaultDigest(value: string): Promise<string> {
  const processRuntime = (globalThis as { process?: { getBuiltinModule?: (name: string) => any } }).process;
  const nodeCrypto = processRuntime?.getBuiltinModule?.("node:crypto");
  if (nodeCrypto?.createHash) return nodeCrypto.createHash("sha256").update(value).digest("hex");
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const bytes = await subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes), item => item.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("preference_runtime_digest_required");
}
