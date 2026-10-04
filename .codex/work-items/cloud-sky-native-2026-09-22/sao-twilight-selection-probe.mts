import { readFileSync } from "node:fs";
import { createBsc5pSkyCatalogProvider } from "../../../workers/miniapp-api/src/sky-scene-catalog-provider.ts";
import { createSkyViewBasis } from "../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import { selectSkyStellarTiles } from "../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts";

const index = JSON.parse(readFileSync(new URL("../../../workers/miniapp-api/assets/sao-v2/index.json", import.meta.url), "utf8"));
const provider = createBsc5pSkyCatalogProvider("bsc5p-bright-stars.v3");
const catalog = provider.load();
const observer = { latitude: 22.5, longitude: 114.5, elevationM: 20 };
const at = "2026-10-08T13:00:00.000Z";
const frame = provider.frame({ ...observer, at: new Date(at), catalog });
const scenarios = [
  { name: "night", sunAltitudeDeg: -18 },
  { name: "nautical", sunAltitudeDeg: -12 },
  { name: "day", sunAltitudeDeg: 0 },
  { name: "observation", sunAltitudeDeg: undefined },
] as const;
const result = scenarios.map(scenario => {
  let samples = 0, emptyViews = 0, maximumTiles = 0, maximumBytes = 0, sumBytes = 0;
  for (const verticalFovDeg of [267.8, 128.8, 45, 20, 5, 1.5, .15])
    for (const pitch of [-60, -30, 0, 30, 60, 90])
      for (const heading of [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]) {
        const basis = createSkyViewBasis(heading, pitch, 0);
        if (!basis) throw new Error("sky_basis_missing");
        const tiles = selectSkyStellarTiles(index.tiles, {
          frame, expected: { catalog, at, observer }, basis, width: 390, height: 844,
          verticalFovDeg, center: { x: 195, y: 422 },
          ...(scenario.sunAltitudeDeg === undefined ? {} : { sunAltitudeDeg: scenario.sunAltitudeDeg }),
        });
        const bytes = tiles.reduce((sum, tile) => sum + tile.bytes, 0);
        samples++;
        if (!tiles.length) emptyViews++;
        maximumTiles = Math.max(maximumTiles, tiles.length);
        maximumBytes = Math.max(maximumBytes, bytes);
        sumBytes += bytes;
      }
  return { scenario: scenario.name, sunAltitudeDeg: scenario.sunAltitudeDeg ?? null,
    samples, emptyViews, maximumTiles, maximumBytes,
    meanSelectedBytes: Math.round(sumBytes / samples) };
});
process.stdout.write(`${JSON.stringify({ publication: index.catalogVersion, base: index.baseCatalogVersion,
  at, observer, note: "Per-view publication bytes selected; not measured network transfer or GPU memory.",
  result }, null, 2)}\n`);
