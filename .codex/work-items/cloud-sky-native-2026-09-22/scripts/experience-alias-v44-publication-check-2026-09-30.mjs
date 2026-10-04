import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { enrichChineseAliasPublication } from "../../../../data-pipelines/star-catalog/enrich_wikidata_chinese_aliases.mjs";
const root = new URL("../../../../", import.meta.url);
const read = path => readFile(new URL(path, root));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const baseBytes = await read("workers/miniapp-api/assets/celestial-names-v2/chinese-bright-star-aliases.v2.json");
const baseManifest = JSON.parse(await read("workers/miniapp-api/assets/celestial-names-v2/publication.json"));
const entityBytes = await read(".codex/work-items/cloud-sky-native-2026-09-22/evidence/wikidata-Q12975-2026-09-30.json");
const currentBytes = await read("workers/miniapp-api/assets/celestial-names-v3/chinese-bright-star-aliases.v3.json");
const result = enrichChineseAliasPublication(baseBytes, baseManifest, entityBytes, "2026-09-29T23:05:03.594Z");
assert.deepEqual(result.assetBytes, currentBytes, "the archived primary input must reproduce the real current publication");
const differentIdentity = JSON.parse(entityBytes);
const claim = differentIdentity.entities.Q12975.claims.P528.find(row => row.mainsnak.datavalue?.value === "HR 7557");
claim.mainsnak.datavalue.value = "HR 7558";
assert.throws(() => enrichChineseAliasPublication(baseBytes, baseManifest, Buffer.from(JSON.stringify(differentIdentity)),
  "2026-09-29T23:05:03.594Z"), /chinese_alias_enrichment_identity_mismatch/);
assert.throws(() => enrichChineseAliasPublication(Buffer.from(`${baseBytes} `), baseManifest, entityBytes,
  "2026-09-29T23:05:03.594Z"), /chinese_alias_enrichment_base_invalid/);
const before = JSON.parse(baseBytes), after = JSON.parse(currentBytes);
const changed = after.rows.filter((row, index) => JSON.stringify(row) !== JSON.stringify(before.rows[index]));
assert.deepEqual(changed, [{ reference: "HR:7557", wikidataItem: "Q12975", aliases: ["河鼓二", "牛郎星", "天鹰座α"] }]);
const evidence = { result: "pass", beforeSha256: sha(baseBytes), afterSha256: sha(currentBytes),
  primarySha256: sha(entityBytes), sourceProvenanceSha256: sha(result.provenanceBytes),
  rowCount: after.rows.length, changed, reproduction: "exact raw bytes", wrongHrRejected: true,
  previousBytesTamperRejected: true, limits: "Publication/source identity checks, not native or device acceptance" };
await writeFile(new URL("../tmp/v44-alias-publication-check.json", import.meta.url), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence));
