import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { projectAdoptedSkyCatalog } from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import { attachSkyCatalog } from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import { presentSkyTime } from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import { resolveSkyStellarSupplement } from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts';
import { INITIAL_MANUAL_SKY_VIEW } from '../../../../apps/wechat-miniapp/src/features/sky/sky-manual-view.ts';
import { drawSkyScene } from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-render.ts';
import { pickPaintedSkyObjects, type SkyPickSnapshot } from '../../../../apps/wechat-miniapp/src/features/sky/sky-object-picking.ts';

const task = '.codex/work-items/cloud-sky-native-2026-09-22';
const prior = JSON.parse(await fs.readFile(task + '/tmp/sao-current-inputs-0930.json', 'utf8'));
const selection = JSON.parse(await fs.readFile(task + '/evidence/experience-sao-native-selection-2026-10-01.json', 'utf8'));
const raw = projectAdoptedSkyCatalog(JSON.parse(await fs.readFile(task + '/tmp/current-native-report-2026-10-01.json', 'utf8'))).data;
const at = raw.context.at;
assert.equal(at, selection.at);
const report = attachSkyCatalog(presentSkyTime(raw, at)!.report, prior.report.skyScene.publication);
const tiles = await Promise.all(selection.selected.map(async row => ({
  publicationHash: prior.index.data.publicationHash,
  tile: JSON.parse(await fs.readFile('workers/miniapp-api/assets/sao-v2/' + row.id + '.json', 'utf8')),
})));
const supplement = resolveSkyStellarSupplement(prior.index.data, tiles, report.skyScene, at)!;
let snapshot: SkyPickSnapshot | null = null;
const surface = new Proxy({}, { get: () => () => true });
const args: any[] = [surface, report, at, null, null, selection.width, selection.height, 'DAY',
  (value: SkyPickSnapshot) => { snapshot = value; }, undefined, 45, null, INITIAL_MANUAL_SKY_VIEW];
args[16] = supplement;
drawSkyScene(...args as Parameters<typeof drawSkyScene>);
assert(snapshot);
const frame = snapshot as SkyPickSnapshot;
const candidates = frame.objects.filter(object => object.reference.startsWith('SAO:') &&
  object.x > 105 && object.x < 290 && object.y > 310 && object.y < 640 &&
  pickPaintedSkyObjects(frame, { ...object, frameAt: at, catalogVersion: frame.catalogVersion,
    catalogHash: frame.catalogHash })[0]?.reference === object.reference)
  .sort((a, b) => (a.magnitude ?? 99) - (b.magnitude ?? 99));
assert(candidates.length > 0, 'the model must supply a real pickable supplement star outside controls');
const output = task + '/evidence/experience-sao-native-pick-candidates-2026-10-01.json';
await fs.writeFile(output, JSON.stringify({
  scope: 'Real production resolver/draw/picker with existing published SAO-v2 bytes; stub surface supplies coordinate candidates only, not pixels or native confirmation',
  at, width: selection.width, height: selection.height, fov: 45,
  supplementPaintedObjects: frame.objects.filter(object => object.reference.startsWith('SAO:')).length,
  candidate: candidates[0],
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, supplementObjects: frame.objects.filter(object => object.reference.startsWith('SAO:')).length,
  candidate: candidates[0] }));
