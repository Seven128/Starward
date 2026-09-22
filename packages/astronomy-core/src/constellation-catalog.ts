import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import pack from "../data/stellarium-modern-v24.4.v2.json" with { type: "json" };
import manifest from "../data/stellarium-modern-v24.4.v2.manifest.json" with { type: "json" };

function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

/** Node-only raw publication owner. The public contract validator belongs to
 * miniapp-contracts and is applied by the BFF; astronomy-core never imports it. */
export function loadConstellationCatalog(): { data: unknown; catalogHash: string } {
  // Keep the JSON import in the release compiler's dependency graph so it is
  // copied to dist/data, but never expose its shared mutable module object.
  void pack;
  const file = new URL("../data/stellarium-modern-v24.4.v2.json",import.meta.url);
  const data: unknown = JSON.parse(readFileSync(file,"utf8"));
  // TypeScript reformats JSON in dist. Like BSC5P, bind the canonical parsed
  // representation so source and release have the same factual identity.
  const encoded = JSON.stringify(data);
  const catalogHash = createHash("sha256").update(encoded).digest("hex");
  if (Buffer.byteLength(encoded,"utf8") !== manifest.bytes || catalogHash !== manifest.sha256 ||
    manifest.hashEncoding !== "JSON.stringify(parsed catalog)" || manifest.catalogVersion !== "stellarium-modern-v24.4.v2")
    throw new Error("constellation_source_integrity");
  return { data: freeze(data), catalogHash };
}
