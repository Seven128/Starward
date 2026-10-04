// Evidence analysis uses the real current report/publications and the shared
// projection owners. Predictions are checked against native pixels and taps;
// they are not themselves a claim that a star was painted or selected.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { assertSaoTilePublication } from "@starward/miniapp-contracts";
import { presentSkyTime } from "../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts";
import { attachSkyCatalog, resolveSkySceneFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { resolveSkyStellarSupplement } from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts";
import { createSkyViewBasis, projectSkyDirection } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import { pinchFieldOfView } from "../../../../apps/wechat-miniapp/src/features/sky/sky-zoom.ts";
import { skyStarAppearance } from "../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance.ts";
const task = path.resolve(".codex/work-items/cloud-sky-native-2026-09-22");
const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const json = async (name: string) => JSON.parse(await fs.readFile(path.join(task, name), "utf8"));
const trace = (await fs.readFile(path.join(task, "evidence/experience-sao-v43-native-events-2026-09-30.jsonl"), "utf8"))
  .trim().split(/\r?\n/u).map(line => JSON.parse(line));
const state = trace.findLast(row => row.stage === "sao-recovered-state")!.value;
const recoveredReads = state.tileReads.filter((row: any) => row.sequence >= 45 && row.sequence <= 53);
const input = trace.findLast(row => row.stage === "pinch-geometry")!.value;
const width = input.size.width, height = input.size.height;
const fov = pinchFieldOfView(45, input.startDistance, input.endDistance, width, height);
const reportBytes = await fs.readFile(path.join(task, "tmp/v43-current-public-report.json"));
const report = JSON.parse(reportBytes.toString()).data;
const at = report.context.at;
const httpJson = async (endpoint: string) => {
  const response = await fetch("http://127.0.0.1:60061/v2" + endpoint);
  if (!response.ok) throw new Error("public_resource_status_" + response.status);
  return response.json();
};
const catalog = await httpJson(`/sky/catalogs/${report.skyScene.catalog.catalogVersion}/${report.skyScene.catalog.catalogHash}`);
const presentation = presentSkyTime(report, at)!;
const resolved = attachSkyCatalog(presentation.report, catalog.data);
const baseFrame = resolveSkySceneFrame(resolved.skyScene, at)!;
if (!baseFrame) throw Error(JSON.stringify({kind:'analysis_input_not_resolved',mode:presentation.mode,
  reportScene:{state:report.skyScene.state,catalog:report.skyScene.catalog},
  resolvedScene:{state:resolved.skyScene.state,catalog:resolved.skyScene.catalog && {catalogVersion:resolved.skyScene.catalog.catalogVersion,catalogHash:resolved.skyScene.catalog.catalogHash},
    publication:resolved.skyScene.publication && {catalogVersion:resolved.skyScene.publication.catalogVersion,catalogHash:resolved.skyScene.publication.catalogHash},
    reason:resolved.skyScene.unavailableReason,frames:resolved.skyScene.frames.map(frame=>({at:frame.at,state:frame.state,format:frame.geometry?.format,referenceAt:frame.geometry?.referenceAt}))}}));
const altair = baseFrame.points.find(point => resolved.skyScene.catalog!.entries[point[0]]?.objectRef === "HR:7557")!;
const basis = createSkyViewBasis(altair[1], 90 + altair[2], 0)!;
const publication = (await httpJson("/sky/supplements/sao/v2")).data;
const tiles = await Promise.all(recoveredReads.map(async (read: any) => {
  const tile = (await httpJson(`/sky/supplements/sao/v2/${publication.publicationHash}/tiles/${read.tileId}`)).data;
  assertSaoTilePublication(tile, publication, publication.index.tiles.find((row: any) => row.id === read.tileId));
  return tile;
}));
const supplement = resolveSkyStellarSupplement(publication, tiles, resolved.skyScene, at)!;
const sun = presentation.row.sunAltitudeDeg;
const basePoints = baseFrame.points.flatMap(point => {
  const entry = resolved.skyScene.catalog!.entries[point[0]]!;
  const appearance = skyStarAppearance(entry.magnitude, fov, sun, point[2]);
  const projected = projectSkyDirection(point[1], point[2], basis, width, height, fov);
  return appearance && projected ? [{reference: entry.objectRef, ...projected, ...appearance}] : [];
});
const points = supplement.points.flatMap(point => {
  const appearance = skyStarAppearance(point[1], fov, sun, point[3]);
  const projected = projectSkyDirection(point[2], point[3], basis, width, height, fov);
  return appearance && projected ? [{reference: point[0], magnitude: point[1], ...projected, ...appearance}] : [];
});
const failedBytes = await fs.readFile(path.join(task, "evidence/experience-sao-v43-altair-8-9-failed-2026-09-30.png"));
const recoveredBytes = await fs.readFile(path.join(task, "evidence/experience-sao-v43-altair-8-9-recovered-2026-09-30.png"));
const failed = PNG.sync.read(failedBytes), recovered = PNG.sync.read(recoveredBytes);
if (failed.width !== recovered.width || failed.height !== recovered.height) throw Error("capture_size_changed");
const atPixel = (image: PNG, x: number, y: number) => {
  const offset = (y * image.width + x) * 4;
  return Array.from(image.data.subarray(offset, offset + 3));
};
const neighbourhood = (point: {x: number; y: number}) => {
  const x = Math.floor(point.x / width * recovered.width), y = Math.floor(point.y / height * recovered.height);
  let peak: any = null;
  for (let py = Math.max(30, y - 2); py <= Math.min(recovered.height - 22, y + 2); py++) {
    for (let px = Math.max(2, x - 2); px <= Math.min(recovered.width - 3, x + 2); px++) {
      const a = atPixel(failed, px, py), b = atPixel(recovered, px, py);
      const delta = b.reduce((value, component, index) => value + component - a[index]!, 0);
      if (!peak || delta > peak.delta) peak = {x: px, y: py, before: a, after: b, delta};
    }
  }
  return peak;
};
let changed = 0, increased = 0, totalDelta = 0;
for (let y = 42; y < recovered.height - 22; y++) for (let x = 3; x < recovered.width - 3; x++) {
  const a = atPixel(failed, x, y), b = atPixel(recovered, x, y);
  const delta = b.reduce((value, component, index) => value + component - a[index]!, 0);
  if (a.some((value, index) => value !== b[index])) changed++;
  if (delta > 0) increased++;
  totalDelta += delta;
}
const candidates = points.map(point => ({...point, nearestBase: Math.min(...basePoints.map(base => Math.hypot(point.x - base.x, point.y - base.y))),
  nearestOtherPickable: Math.min(...points.filter(other => other !== point && other.opacity >= .1).map(other => Math.hypot(point.x - other.x, point.y - other.y))),
  pixel: neighbourhood(point)})).filter(point => point.x > 35 && point.x < width - 35 && point.y > 105 && point.y < height - 85);
const result = {at, fov, width, height, basis, sunAltitudeDeg: sun, timePresentation: presentation.mode,
  reportSha256: sha(reportBytes), baseCatalog: report.skyScene.catalog, saoPublicationHash: publication.publicationHash,
  recoveredReads, newVisiblePointPredictions: points.length,
  nativeCapture: {width: recovered.width, height: recovered.height, failedSha256: sha(failedBytes), recoveredSha256: sha(recoveredBytes),
    crop: {x:3,y:42,width:recovered.width-6,height:recovered.height-64}, changed, increased, totalRgbDelta: totalDelta,
    limit: "同一候选、时刻、视角和缩放；原生官方截图Canvas像素，非WXML覆盖层、手机或测光验收"},
  pickableCandidates: candidates.filter(point => point.opacity >= .1 && point.nearestBase > 22 && point.nearestOtherPickable > 20 && point.pixel?.delta > 25)
    .sort((a,b) => b.pixel.delta-a.pixel.delta).slice(0,8),
  faintUnpickableCandidates: candidates.filter(point => point.opacity < .1 && point.nearestBase > 22 && point.nearestOtherPickable > 22 && point.pixel?.delta > 0)
    .sort((a,b) => b.pixel.delta-a.pixel.delta).slice(0,8),
  limits: "共享算法的预测位置需以实际像素和公开Canvas点击核查；不把4120亮星aria计数当SAO新增数，不推断恒星距离。"};
await fs.writeFile(path.join(task,"evidence/experience-sao-v43-painted-points-2026-09-30.json"),JSON.stringify(result,null,2)+"\n");
process.stdout.write(JSON.stringify({at,fov,newVisiblePointPredictions:points.length,nativeCapture:result.nativeCapture,
  pickableCandidates:result.pickableCandidates.slice(0,3),faintUnpickableCandidates:result.faintUnpickableCandidates.slice(0,2)},null,2)+"\n");
