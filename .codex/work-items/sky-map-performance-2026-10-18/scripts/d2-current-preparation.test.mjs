import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const builder = new URL('./build-r17-normal-baseline-v3.mjs', import.meta.url).href;
async function profile(flags) {
  const script = `const flags=JSON.parse(process.argv[1]);process.argv=['node','profile-only','inspect',...flags];const m=await import(${JSON.stringify(builder)});console.log(JSON.stringify(m.describeNormalPreparationProfile()));`;
  const result = await run(process.execPath, ['--input-type=module', '-e', script, JSON.stringify(flags)], { windowsHide: true });
  return JSON.parse(result.stdout);
}
test('current D2 preparation has a distinct identity and never selects frozen/map/query probes or USB reverse', async () => {
  const p = await profile(['--d2-current']);
  assert.equal(p.d2Current, true);
  assert.equal(p.buildGeneration, 35);
  assert.equal(p.trialName, 'r17-d2-current');
  assert.equal(p.slot, 'd2-current-20261028');
  for (const key of ['usbReverse', 'terrainWait', 'nativeRegion', 'memoryOwnerLinks', 'queryCallbackLinks', 'firstAcceptedCosts', 'observationA1', 'geometryStages']) assert.equal(p[key], false, key);
  for (const key of ['currentUi', 'memoryLifetime', 'memoryCheckpoints']) assert.equal(p[key], true, key);
  assert.equal(p.normalPlayTrialMs, null, 'decode observation has no automatic product Pause');
});
test('current D2 selection rejects additional, duplicate and unknown historical flags before preparing files', async () => {
  for (const flags of [['--d2-current', '--usb-reverse'], ['--d2-current', '--observe-a1'],
    ['--d2-current', '--review-r25'], ['--d2-current', '--d2-current'], ['--d2-current', '--unknown']]) {
    await assert.rejects(profile(flags), error => /finite_normal_revision_required/.test(error.stderr));
  }
});
test('default historical profile stays separate without executing a generation', async () => {
  const p = await profile([]);
  assert.equal(p.d2Current, false);
  assert.equal(p.buildGeneration, 25);
  assert.equal(p.trialName, 'r17-normal-baseline-v3');
  assert.equal(p.memoryCheckpoints, false);
  assert.equal(p.usbReverse, false);
});
test('GPU resources use a new isolated identity while the original decode and frozen generations remain separate', async () => {
  const p = await profile(['--d2-gpu-resources']);
  assert.equal(p.d2GpuResources, true);
  assert.equal(p.buildGeneration, 36);
  assert.equal(p.trialName, 'r17-d2-gpu-resources-20261029');
  assert.equal(p.slot, 'd2-gpu-resources-20261029');
  assert.equal(p.normalPlayTrialMs, null);
  for (const key of ['usbReverse', 'terrainWait', 'nativeRegion', 'memoryOwnerLinks', 'queryCallbackLinks', 'firstAcceptedCosts', 'observationA1', 'geometryStages']) assert.equal(p[key], false, key);
  for (const flags of [['--d2-gpu-resources', '--d2-current'], ['--d2-gpu-resources', '--usb-reverse'], ['--d2-gpu-resources', '--d2-gpu-resources']])
    await assert.rejects(profile(flags), error => /finite_normal_revision_required/.test(error.stderr));
});
