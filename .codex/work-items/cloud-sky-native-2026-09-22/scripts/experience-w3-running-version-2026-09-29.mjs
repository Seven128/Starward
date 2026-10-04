// Public read-only current-version probe, no restart, Context write or native RPC.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
const output = ".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-w3-running-version-2026-09-29.json";
await assert.rejects(fs.access(output), { code: "ENOENT" });
const rows = [];
for (const port of [8789, 8791]) {
  const origin = `http://127.0.0.1:${port}`;
  for (const kind of ["image", "information"]) {
    const route = kind === "image" ? "/v2/celestial-objects/M%3A42/image?level=DETAIL&imageVersion=source-finite-v3" :
      "/v2/celestial-objects/M%3A42?deepSkyImageVersion=source-finite-v3";
    try {
      const response = await fetch(origin + route, { signal: AbortSignal.timeout(5000) });
      if (kind === "image") {
        const bytes = Buffer.from(await response.arrayBuffer());
        rows.push({ port, kind, status: response.status, contentType: response.headers.get("content-type"), bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"), publicationHash: response.headers.get("x-starward-image-publication-hash"),
          sourceId: response.headers.get("x-starward-image-source-id"), missingPixels: response.headers.get("x-starward-image-missing-pixels") });
      } else {
        const information = await response.json();
        rows.push({ port, kind, status: response.status, state: information.dataState,
          imagerySourceIds: information.data?.sources?.filter(source => source.id.startsWith("imagery:")).map(source => source.id) ?? [] });
      }
    } catch (error) { rows.push({ port, kind, unavailable: error.name }); }
  }
}
await fs.writeFile(output, JSON.stringify({ scope: "Read-only public running-service version; no restart, Context/private-state read or write, native/phone action or deployment", rows }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(rows));
