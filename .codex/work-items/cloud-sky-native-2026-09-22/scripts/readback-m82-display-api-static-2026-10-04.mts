/** Saved byte/source readback and a failing-before check of this escaped family gap. */
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import * as contracts from "@starward/miniapp-contracts";
import { NotFoundException } from "@nestjs/common";
import { validateSkyStaticBundle } from "../../../../tools/deployment/sky-static-bundle.mjs";
const root = resolve(import.meta.dirname, "../../../.."), out = join(root, "output/sdss-m82-display-api-readback-1004-r2");
mkdirSync(out);
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const bind = (p: string) => { const b = readFileSync(join(root, p)); return { path: p, bytes: b.length, sha256: sha(b) }; };
const actualPath = "output/sdss-m82-display-api-static-1004-r1/result.json";
const actual = JSON.parse(readFileSync(join(root, actualPath), "utf8"));
for (const p of actual.publicationBindingsAfterExact) assert.deepEqual(bind(p.path), p);
const staticBundle = await validateSkyStaticBundle(join(root, actual.standardStatic.output));
assert.equal(staticBundle.publicationHash, actual.standardStatic.publicationHash);
assert.equal(staticBundle.files, 1730); assert.equal(staticBundle.bytes, 82235809);
const wire = JSON.parse(readFileSync(join(root, "output/sdss-m82-display-api-static-1004-r1/http-manifest.json"), "utf8"));
contracts.assertSdssCalibratedOpticalManifest(wire, "M:82", actual.publicationHash);
const info = JSON.parse(readFileSync(join(root, "output/sdss-m82-display-api-static-1004-r1/http-information.json"), "utf8"));
const packetId = `optical-imagery:${wire.publicationId}:${wire.publicationHash}`;
const source = info.data.sources.find((s: any) => s.id === packetId); assert(source);
assert.match(source.precision, /显示估计.*不是新的科学测量/u);
assert(source.limitations.some((s: string) => s.includes(wire.publicationHash)));
const levels = contracts.SDSS_OPTICAL_LEVELS.map(level => {
  const a = wire.levels[level], record = staticBundle.records.find(r => r.route === a.downloadUrl); assert(record);
  const bytes = readFileSync(join(root, actual.standardStatic.output, "files", a.downloadUrl));
  assert.equal(bytes.length, a.bytes); assert.equal(sha(bytes), a.sha256);
  const http = actual.http.find((r: any) => r.route === a.downloadUrl && r.method === "GET");
  const head = actual.http.find((r: any) => r.route === a.downloadUrl && r.method === "HEAD");
  assert.equal(http.status, 200); assert.equal(http.bytes, a.bytes); assert.equal(http.sha256, a.sha256);
  assert.equal(head.status, 200); assert.equal(head.bytes, 0); assert.equal(Number(head.headers["content-length"]), a.bytes);
  for (const [name, value] of Object.entries(record.headers)) assert.equal(http.headers[name], value);
  return { level, bytes: a.bytes, sha256: a.sha256, actualHttpSavedAndStaticBytesExact: true };
});
// Evaluate only the archived class and its two constants with the same imported
// contracts. No server startup, default registry edits or old publication processing.
const archivePath = "output/sdss-m82-display-api-development-1004-r1/before/workers/miniapp-api/src/sdss-optical-imagery.ts";
const archivePins = JSON.parse(readFileSync(join(root, "output/sdss-m82-display-api-development-1004-r1/before-bindings.json"), "utf8"));
const archivePin = archivePins.find((p: any) => p.path === "workers/miniapp-api/src/sdss-optical-imagery.ts");
assert.equal(bind(archivePath).sha256, archivePin.sha256);
const sourceText = readFileSync(join(root, archivePath), "utf8"), ast = ts.createSourceFile(archivePath, sourceText, ts.ScriptTarget.Latest, true);
const statements = ast.statements.filter(s => ts.isClassDeclaration(s) ||
  ts.isVariableStatement(s) && s.declarationList.declarations.some(d => ["sourceLabel", "hashPattern"].includes(d.name.getText(ast))));
const code = statements.map(s => s.getText(ast).replace(/^export\s+/u, "").replaceAll("import.meta.url", "archivedOwnerUrl")).join("\n") + "\nSdssOpticalImageryService;";
const Before = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
  { ...contracts, NotFoundException, URL, Map, readFileSync, structuredClone,
    archivedOwnerUrl: pathToFileURL(join(root, "workers/miniapp-api/src/sdss-optical-imagery.ts")).href }) as any;
const descriptor = { reference: "M:82", expectedHash: wire.publicationHash,
  manifestUrl: pathToFileURL(join(root, "output/sdss-m82-display-publication-1004-r2/publication/manifest.json")) };
assert.throws(() => new Before({ calibratedPublications: [descriptor] }).manifest(wire.publicationHash), /sdss_optical_publication_not_found/u);
assert.throws(() => new Before({ sciencePublications: [descriptor] }).manifest(wire.publicationHash), /sdss_science_optical_publication_invalid/u);
const result = { scope: "Saved actual HTTP/static byte and source readback; archived-class failing-before only, no HTTP rerun",
  actualResult: bind(actualPath), archive: bind(archivePath), levels, staticFiles: staticBundle.files,
  staticBytes: staticBundle.bytes, displayBytes: levels.reduce((n, r) => n + r.bytes, 0),
  sourcePacketId: packetId, archivedOwnerCannotRegisterCalibratedDisplay: true,
  originalScienceOnlyOwnerStillRejectsDisplay: true, inputsAfterExact: true,
  limits: "Transport/standard static only; no client cache/Hook/Scene/Back/native/phone/image quality/capacity or independent review acceptance",
  otherBusinessLogicEdited: false, ordinaryAdoption: false };
writeFileSync(join(out, "executed-reader.mts"), readFileSync(import.meta.filename), { flag: "wx" });
writeFileSync(join(out, "result.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
process.stdout.write(JSON.stringify(result) + "\n");
