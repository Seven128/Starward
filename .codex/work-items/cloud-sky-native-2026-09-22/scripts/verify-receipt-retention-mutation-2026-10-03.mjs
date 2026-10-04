import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const root = process.cwd(), owner = path.join(root, 'tools/deployment/sky-static-release.mjs');
const test = path.join(root, 'tools/deployment/sky-static-release.test.mjs');
const out = path.join(root, 'output/sky-receipt-retention-development-1003-r1');
await mkdir(out, { recursive: true });
const relocate = text => text.replace(/from "\.\/([^"\n]+)"/g,
  (_, name) => `from "${pathToFileURL(path.join(root, 'tools/deployment', name)).href}"`);
const original = await readFile(owner, 'utf8'), guard = 'await receipts?.verifyUnchanged();';
if (original.split(guard).length !== 2) throw new Error('receipt_mutation_guard_not_unique');
const shadowOwner = path.join(out, 'without-receipt-byte-recheck.mjs');
const shadowTest = path.join(out, 'receipt-byte-recheck-regression.test.mjs');
await writeFile(shadowOwner, relocate(original.replace(guard, '/* bounded mutation: omit final receipt bytes recheck */')));
await writeFile(shadowTest, relocate(await readFile(test, 'utf8')).replace(pathToFileURL(owner).href, pathToFileURL(shadowOwner).href));
const run = spawnSync(process.execPath, ['--test', '--test-name-pattern=receipt byte changes', shadowTest], { encoding: 'utf8' });
await writeFile(path.join(out, 'mutation-output.txt'), run.stdout + run.stderr);
if (run.status !== 1 || !run.stdout.includes('Missing expected rejection')) throw new Error('receipt_mutation_not_caught');
const sourcePins = [];
for (const relative of ['tools/deployment/sky-static-release.mjs', 'tools/deployment/sky-static-release.test.mjs', 'tools/deployment/sky-static-retention.mjs']) {
  const bytes = await readFile(path.join(root, relative));
  sourcePins.push({ path: relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const result = {
  scope: 'Real sealed local filesystem plus injected Docker responses. Typed historical receipt/current-pointer development, not actual remote receipt/mount acceptance.',
  sources: sourcePins, affectedOwnerReleasePreviewChecks: 45, checksExitCode: 0,
  checksBasis: 'Previously executed current owner/release/preview four-file node test command: 45 passed, 0 failed; no broad rerun.',
  receiptByteGuardMutation: { exitCode: run.status, failure: 'Missing expected rejection after receipt changed during second runtime inspection', tests: 1 },
  referenceCompleteness: 'UNVERIFIED', remoteRuntimeRead: 'UNAVAILABLE_NOT_ABSENT', independentReview: 'MISSING',
  legacyReceipts: 'EXPLICIT_WITHOUT_SKY_BINDING', databaseBackupV1: 'NOT_SKY_BACKUP_CONTRACT',
  nondeployPreparedResolver: 'UNCHANGED_NOT_RUNTIME_BOUND', cleanupDeploymentPublication: 'NONE'
};
await writeFile(path.join(out, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ mutationDetected: true, sourcePins: sourcePins.length, result: path.relative(root, path.join(out, 'result.json')) }));
