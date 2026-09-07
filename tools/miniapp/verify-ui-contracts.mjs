import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const probes = JSON.parse(await readFile(new URL("./ui-contract-probes.json", import.meta.url), "utf8"));
for (const probe of probes) {
  const source = await readFile(path.join(root, probe.path), "utf8");
  for (const marker of probe.all_of ?? []) assert(source.includes(marker), `${probe.key}: missing ${marker}`);
  for (const marker of probe.none_of ?? []) assert(!source.includes(marker), `${probe.key}: forbidden ${marker}`);
}
console.log(JSON.stringify({ status: "passed", production_probes: probes.length, limitation: "Source checks only; runtime behavior requires separate verification." }));
