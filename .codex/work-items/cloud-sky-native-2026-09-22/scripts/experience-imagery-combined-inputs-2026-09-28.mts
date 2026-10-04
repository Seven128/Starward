import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import sdk from "miniprogram-automator";
import { decodeSkyLandscapeAlpha } from "@starward/miniapp-contracts";
import { createSkyPanoramaMask, skyPanoramaAlpha } from "../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-mask.ts";
import { skyMoonDiscAt } from "../../../../apps/wechat-miniapp/src/features/sky/sky-moon-disc.ts";
import { createSkyViewBasis, unprojectSkyPoint } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
const output = path.resolve(".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-imagery-combined-inputs-2026-09-28.json");
assert.equal(await fs.access(output).then(() => true, () => false), false);
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9444" }), 5000);
boundWechatProtocol(program, 5000);
const get = async (route: string) => {
  const response = await fetch("http://127.0.0.1:8789" + route, { signal: AbortSignal.timeout(8000) });
  assert.equal(response.status, 200); return response.json();
};
try {
  const page = await program.currentPage(); assert.equal(page.path, "sky/detail/index");
  const saved = await program.callWxMethod("getStorageSync", "starward.wechat-miniapp.state.current");
  const context = saved.observationContext; assert.equal(context.location.kind, "FORMAL_SPOT");
  const envelope = await get(`/v2/spots/${encodeURIComponent(context.location.spotId)}/sky?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`);
  const report = envelope.data; assert.equal(report.context.contextId, context.contextId);
  const canvas = await page.$(".sky-orientation-canvas"); assert.ok(canvas);
  const size = await canvas.size(), centre = { x: size.width / 2, y: size.height / 2 };
  const publication = await get("/v2/sky/landscape/manifest");
  const masks = [];
  for (const resource of publication.resources) {
    const alpha = await get(resource.alpha.downloadUrl);
    masks.push(createSkyPanoramaMask(publication, resource, decodeSkyLandscapeAlpha(alpha, resource)));
  }
  const format = new Intl.DateTimeFormat("en-GB", { timeZone: context.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const rows = [];
  for (const row of report.hourly) {
    if (!Number.isFinite(row.moonAzimuthDeg) || !Number.isFinite(row.moonAltitudeDeg) || row.moonAltitudeDeg < 0 || row.moonAltitudeDeg > 25) continue;
    const basis = createSkyViewBasis(row.moonAzimuthDeg, 90 + row.moonAltitudeDeg, 0); assert.ok(basis);
    const disc = skyMoonDiscAt(report.hourly, row.at, basis, size.width, size.height, 1.5, centre);
    if (!disc) continue;
    const samples = [];
    for (const [x, y, fraction, angle] of [[disc.x, disc.y, 0, 0], ...Array.from({ length: 32 }, (_, index) => {
      const angle = index * Math.PI / 16; return [disc.x + Math.cos(angle) * disc.radiusPx * .92, disc.y + Math.sin(angle) * disc.radiusPx * .92, .92, angle];
    })]) {
      const ray = unprojectSkyPoint(x, y, basis, size.width, size.height, 1.5, centre); assert.ok(ray);
      samples.push({ x, y, fraction, angle, alpha: masks.map(mask => ({ id: mask.resource.id, value: skyPanoramaAlpha(mask, ray) })) });
    }
    rows.push({ at: row.at, localClock: format.format(new Date(row.at)), moonAzimuthDeg: row.moonAzimuthDeg, moonAltitudeDeg: row.moonAltitudeDeg,
      moonAngularDiameterDeg: row.moonAngularDiameterDeg, moonIllumination: row.moonIllumination,
      disc: { x: disc.x, y: disc.y, radiusPx: disc.radiusPx, sunward: disc.sunward, illuminatedFraction: disc.illuminatedFraction },
      masks: masks.map((mask, index) => ({ id: mask.resource.id, centerAlpha: samples[0].alpha[index].value,
        minSampledAlpha: Math.min(...samples.map(sample => sample.alpha[index].value)), maxSampledAlpha: Math.max(...samples.map(sample => sample.alpha[index].value)) })), samples });
  }
  const record = { scope: "Read actual current native shared Context and its real LOCAL/MEMORY_TEST BFF SkyReport; same production Moon projection/ray and published panorama-alpha owners identify untested composition conditions. Sampled rays guide public UI trials; they do not certify entire footprints or physical-site/phone visibility. IDs remain in memory, no Context or UI was changed.",
    sdkPort: 9444, timezone: context.timezone, localDate: context.localDate, selectedAtUtc: context.selectedAtUtc, canvasSize: size, verticalFovDeg: 1.5,
    publicationHash: publication.publicationHash, moonCoverage: await get("/v2/sky/moon/coverage/manifest"), rows };
  await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ rows: rows.map(row => ({ at: row.at, localClock: row.localClock, azimuth: row.moonAzimuthDeg, altitude: row.moonAltitudeDeg, masks: row.masks })), moonCoverageSchema: record.moonCoverage.schemaVersion, moonCoverageHash: record.moonCoverage.publicationHash }));
} finally { await program.disconnect(); }
