import sdk from "miniprogram-automator";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
import { attachSkyCatalog, resolveSkySceneFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { SkyLandscapePublicationService } from "../../../../workers/miniapp-api/src/sky-landscape-publication.ts";
import { decodeSkyLandscapeAlpha } from "../../../../packages/miniapp-contracts/src/sky-landscape-publication.ts";
import { createSkyPanoramaMask, skyPanoramaAlpha } from "../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-mask.ts";
import { skyHorizontalDirection } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9439" }), 5000);
boundWechatProtocol(program);
try {
  const page = await program.currentPage(), query = page.query;
  if (page.path !== "sky/detail/index" || !query.contextId || !query.spotId) throw Error("normal_route_missing");
  const at = "2026-09-28T16:00:00.000Z";
  const response = await fetch(`http://127.0.0.1:8789/v2/spots/${encodeURIComponent(decodeURIComponent(query.spotId))}/sky?contextId=${encodeURIComponent(decodeURIComponent(query.contextId))}&catalogVersion=bsc5p-bright-stars.v3`);
  if (!response.ok) throw Error(`actual_report_unavailable:${response.status}`);
  const report = (await response.json()).data;
  const catalog = report.skyScene.catalog;
  const rawPublication = await (await fetch(`http://127.0.0.1:8789/v2/sky/catalogs/${catalog.catalogVersion}/${catalog.catalogHash}`)).json();
  const publication = rawPublication.data ?? rawPublication;
  const resolved = attachSkyCatalog(report, publication), frame = resolveSkySceneFrame(resolved.skyScene, at);
  if (!frame) {
    console.log(JSON.stringify({ scope: "public data shape only", reportState: report.skyScene.state,
      publicationKeys: Object.keys(publication), catalogVersion: catalog.catalogVersion,
      frames: report.skyScene.frames?.map(value => ({ at: value.at, state: value.state })),
      resolvedState: resolved.skyScene.state, hasCatalog: Boolean(resolved.skyScene.catalog) }));
    throw Error("actual_catalog_frame_unavailable");
  }
  const owner = new SkyLandscapePublicationService(), landscape = owner.manifest(), resource = landscape.resources[0]!;
  const alpha = await owner.asset(landscape.publicationHash, resource.alpha.file);
  const mask = createSkyPanoramaMask(landscape, resource, decodeSkyLandscapeAlpha(JSON.parse(alpha.bytes.toString()), resource));
  const choices = frame.points.flatMap(([index, azimuth, altitude]) => {
    const star = resolved.skyScene.catalog!.entries[index]!;
    const opacity = skyPanoramaAlpha(mask, skyHorizontalDirection(azimuth, altitude)!);
    return altitude > 0 && altitude < 6 && star.magnitude < 4.8 && opacity >= 254.5
      ? [{ reference: star.objectRef, name: star.displayName, magnitude: star.magnitude, azimuth, altitude, alpha: opacity }] : [];
  }).sort((a, b) => a.magnitude - b.magnitude);
  console.log(JSON.stringify({ scope: "Actual current local report and pinned photo mask; selected celestial identities only, no route/session identifiers", choices: choices.slice(0, 8) }));
} finally { await program.disconnect(); }
