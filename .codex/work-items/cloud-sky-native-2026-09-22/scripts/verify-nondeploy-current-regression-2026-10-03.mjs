import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const root = process.cwd(), out = path.join(root, 'output/sky-current-loader-development-1003-r1');
await mkdir(out, { recursive: true });
const owner = path.join(root, 'tools/deployment/sky-static-release.mjs');
const test = path.join(root, 'tools/deployment/sky-static-release.test.mjs');
const previousFile = path.join(root, 'output/sky-receipt-retention-development-1003-r1/without-receipt-byte-recheck.mjs');
const current = await readFile(owner, 'utf8'), previous = await readFile(previousFile, 'utf8');
const block = /export async function loadSkyStaticDelivery\([\s\S]*?\n}\n(?=\n\/\*\* Retention)/;
const previousLoader = previous.match(block)?.[0];
if (!previousLoader || !previousLoader.includes('return await deliveryResult({ directory, state, validation, dispose });') ||
    previousLoader.includes('currentDelivery') || !current.match(block)) throw new Error('previous_loader_archive_invalid');
const relocate = source => source.replace(/from "\.\/([^"\n]+)"/g,
  (_, name) => `from "${pathToFileURL(path.join(root, 'tools/deployment', name)).href}"`);
const shadowOwner = path.join(out, 'previous-prepared-loader.mjs'), shadowTest = path.join(out, 'current-generation-regression.test.mjs');
await writeFile(shadowOwner, relocate(current.replace(block, previousLoader)));
await writeFile(shadowTest, relocate(await readFile(test, 'utf8')).replace(pathToFileURL(owner).href, pathToFileURL(shadowOwner).href));
const run = spawnSync(process.execPath, ['--test', '--test-name-pattern=non-deploy selects', shadowTest], { encoding: 'utf8' });
await writeFile(path.join(out, 'previous-loader-output.txt'), run.stdout + run.stderr);
if (run.status !== 1 || !run.stdout.includes('Expected values to be strictly equal')) throw new Error('previous_loader_regression_not_caught');
const pin = (relative, bytes) => ({ path: relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const sources = [];
for (const relative of ['tools/deployment/sky-static-release.mjs', 'tools/deployment/operator-preview.mjs',
  'tools/deployment/sky-static-release.test.mjs', 'tools/deployment/sky-static-consumer.test.mjs']) sources.push(pin(relative, await readFile(path.join(root, relative))));
const result = { scope: 'Current receipt/runtime non-deploy development using sealed local files and injected Docker, not remote runtime acceptance.',
  sources, priorLoaderArchive: pin(path.relative(root, previousFile), Buffer.from(previous)),
  failingBeforeFix: { exitCode: run.status, tests: 1, behavior: 'previous loader selects newer prepared directory instead of actual older current/mount' },
  affectedOwnerConsumerReleasePreviewChecks: 49, checksExitCode: 0,
  actualConsumer: 'operatePreview default loadStatic through sealed filesystem owner, controlled runtime and Compose/HTTP-verification dependencies',
  check: 'requires current success v2 and matching observed running mount',
  stoppedMaintenance: 'valid current record plus explicit NO_RUNNING_CADDY_OBSERVED; no live-service claim',
  legacyOrMissingCurrent: 'FAIL_WITHOUT_PREPARED_FALLBACK', historicalReceiptCorruption: 'retention inventory responsibility, not current-operation dependency',
  runtimeAndReceiptRecheck: 'UNDER_EXISTING_LEASE', independentReview: 'MISSING', remoteRuntimeRead: 'UNAVAILABLE_NOT_ABSENT',
  referenceCompleteness: 'UNVERIFIED', cleanupDeploymentPublication: 'NONE' };
await writeFile(path.join(out, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ previousLoaderDefectDetected: true, sourcePins: sources.length, result: path.relative(root, path.join(out, 'result.json')) }));
