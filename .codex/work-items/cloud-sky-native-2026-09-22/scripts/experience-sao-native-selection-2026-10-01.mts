import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { projectAdoptedSkyCatalog } from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import { attachSkyCatalog } from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import { presentSkyTime } from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import { supplementGeometry } from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts';
import { selectSkyStellarTiles } from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts';
import { INITIAL_MANUAL_SKY_VIEW } from '../../../../apps/wechat-miniapp/src/features/sky/sky-manual-view.ts';
import { skySolarLightAt } from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light.ts';
import { SKY_STELLAR_VIEW_BYTES } from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-loader.ts';

const task = '.codex/work-items/cloud-sky-native-2026-09-22';
const currentBytes = await fs.readFile(task + '/tmp/current-native-report-2026-10-01.json');
const priorBytes = await fs.readFile(task + '/tmp/sao-current-inputs-0930.json');
const prior = JSON.parse(priorBytes.toString());
const raw = projectAdoptedSkyCatalog(JSON.parse(currentBytes.toString())).data;
const at = raw.context.at;
assert.equal(at, '2026-09-30T13:50:33.000Z');
assert.equal(raw.skyScene.catalog.catalogHash, prior.report.skyScene.publication.catalogHash);
const report = attachSkyCatalog(presentSkyTime(raw, at)!.report, prior.report.skyScene.publication);
const geometry = supplementGeometry(prior.index.data, report.skyScene, at)!;
assert(geometry);
const wanted = selectSkyStellarTiles(prior.index.data.index.tiles, {
  frame: geometry, expected: { catalog: report.skyScene.publication!, at, observer: report.skyScene.observer! },
  basis: INITIAL_MANUAL_SKY_VIEW, width: 390.3999938964844, height: 844,
  verticalFovDeg: 45, center: { x: 390.3999938964844 / 2, y: 422 },
  sunAltitudeDeg: skySolarLightAt(report.hourly, at)?.altitudeDeg,
});
const selectedBytes = wanted.reduce((sum, tile) => sum + tile.bytes, 0);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const output = task + '/evidence/experience-sao-native-selection-2026-10-01.json';
await fs.writeFile(output, JSON.stringify({
  scope: 'Production selector with current owned report and previously saved, validated publication; no new provider download or native state assertion',
  inputHashes: { currentReport: sha(currentBytes), priorSaoInput: sha(priorBytes) }, at,
  publicationHash: prior.index.data.publicationHash, width: 390.3999938964844, height: 844,
  fov: 45, selectedBytes, budget: SKY_STELLAR_VIEW_BYTES, overBudget: selectedBytes > SKY_STELLAR_VIEW_BYTES,
  selected: wanted.map(tile => ({ id: tile.id, bytes: tile.bytes })),
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, selectedTiles: wanted.length, selectedBytes,
  budget: SKY_STELLAR_VIEW_BYTES, overBudget: selectedBytes > SKY_STELLAR_VIEW_BYTES }));
