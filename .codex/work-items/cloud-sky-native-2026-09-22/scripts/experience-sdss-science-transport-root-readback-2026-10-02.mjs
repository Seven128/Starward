// Independent root file/response identity readback, without another HTTP run.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const source = "output/sdss-science-optical-transport-1002-r2";
const out = "output/sdss-science-transport-root-readback-1002-r1";
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const bind = file => { const bytes = fs.readFileSync(file); return { path: file, bytes: bytes.length, sha256: hash(bytes) }; };
const json = file => JSON.parse(fs.readFileSync(file, "utf8"));
const save = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
fs.mkdirSync(out);
fs.copyFileSync(new URL(import.meta.url), path.join(out, "executed-script.mjs.txt"), fs.constants.COPYFILE_EXCL);
const authorResult = json(`${source}/result.json`), observations = json(`${source}/actual-observations.json`);
assert.equal(authorResult.status, "ACTUAL_OPT_IN_SCIENCE_OPTICAL_TRANSPORT_PASSED");
assert.deepEqual(bind(authorResult.observations.path), authorResult.observations);
assert.deepEqual(bind(authorResult.finalOwner.path), authorResult.finalOwner);
const before = json(`${source}/binding-before.json`), after = json(`${source}/binding-after.json`);
assert.equal(before.length, authorResult.sourceBindings);
assert.deepEqual(after, before);
const current = before.map(row => { const actual = bind(row.path); assert.deepEqual(actual, row); return actual; });
const images = authorResult.images.map(row => {
  assert.deepEqual(bind(row.actual.path), row.actual); assert.deepEqual(bind(row.source.path), row.source);
  const delivered = fs.readFileSync(row.actual.path), published = fs.readFileSync(row.source.path);
  assert.deepEqual(delivered, published);
  assert.equal(row.headers["content-type"], "image/png");
  assert.equal(Number(row.headers["content-length"]), delivered.length);
  assert.equal(delivered.readUInt32BE(16), 512); assert.equal(delivered.readUInt32BE(20), 512);
  return { level: row.level, delivered: row.actual, published: row.source, exactBytes: true };
});
const manifest = json(authorResult.manifest.path);
assert.equal(manifest.publicationHash, authorResult.publicationHash);
const own = observations.information.find(row => row.condition === "explicit-v2").body;
const expectedSource = `optical-imagery:${manifest.publicationId}:${manifest.publicationHash}`;
assert.equal(own.dataState, "FRESH");
assert.deepEqual(own.data.sources, own.sources);
assert.deepEqual(own.data.sources.find(row => row.id === expectedSource), observations.direct.scienceSource);
const old = observations.information.find(row => row.condition === "default-v1").body;
assert.deepEqual(own.data.facts, old.data.facts);
assert.notEqual(old.data.sources.find(row => row.id.startsWith("optical-imagery:")).id, expectedSource);
for (const row of observations.information.filter(row => row.condition.includes("unknown") || row.condition.includes("foreign"))) {
  assert.equal(row.body.dataState, "PARTIAL");
  assert(row.body.warnings.includes("sdss_optical_publication_unavailable"));
  assert(!row.body.data.sources.some(item => item.id.startsWith("optical-imagery:")));
  assert(row.body.data.sources.some(item => item.id.startsWith("imagery:")));
  assert(row.body.data.sources.some(item => item.id.startsWith("catalog:")));
}
const preserved = json(".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json");
for (const row of preserved) assert.equal(bind(row.path).sha256, row.sha256);
save("binding.json", { authorResult: bind(`${source}/result.json`), observations: bind(`${source}/actual-observations.json`), current, images, preserved });
save("result.json", { status: "ROOT_ACTUAL_TRANSPORT_IDENTITY_READBACK_PASSED", sourceBindings: current.length,
  publicationHash: manifest.publicationHash, images, informationIdentityReadback: true, settingsOutboxPreserved: preserved.length,
  scope: "Actual saved response/byte identity and current input readback only. No new HTTP/client/native/GPU/quality/capacity execution." });
console.log(JSON.stringify(bind(`${out}/result.json`)));
