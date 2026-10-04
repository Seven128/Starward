import { readFileSync } from "node:fs";
import { createBsc5pSkyCatalogProvider } from "../../../workers/miniapp-api/src/sky-scene-catalog-provider.ts";
import { createSkyViewBasis } from "../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import { selectSkyStellarTiles } from "../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts";

const index = JSON.parse(readFileSync(new URL("../../../workers/miniapp-api/assets/sao-v2/index.json", import.meta.url), "utf8"));
const publication = JSON.parse(readFileSync(new URL("../../../workers/miniapp-api/assets/sao-v2/publication.json", import.meta.url), "utf8"));
const provider = createBsc5pSkyCatalogProvider("bsc5p-bright-stars.v3");
const catalog = provider.load();
const observer = { latitude: 22.5, longitude: 114.5, elevationM: 20 };
const at = "2026-10-08T13:00:00.000Z";
const frame = provider.frame({ ...observer, at: new Date(at), catalog });

let maximum: { bytes: number; ids: string[]; fov: number; pitch: number; heading: number } | null = null;
for (const fov of [267.8, 128.8, 45, 20, 5, 1.5, .15])
  for (const pitch of [-60, -30, 0, 30, 60, 90])
    for (const heading of [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]) {
      const basis = createSkyViewBasis(heading, pitch, 0);
      if (!basis) throw new Error("sky_basis_missing");
      const tiles = selectSkyStellarTiles(index.tiles, {
        frame, expected: { catalog, at, observer }, basis, width: 390, height: 844,
        verticalFovDeg: fov, center: { x: 195, y: 422 }, sunAltitudeDeg: -18,
      });
      const bytes = tiles.reduce((sum, tile) => sum + tile.bytes, 0);
      if (!maximum || bytes > maximum.bytes)
        maximum = { bytes, ids: tiles.map(tile => tile.id), fov, pitch, heading };
    }

if (!maximum || maximum.ids.length === 0) throw new Error("sky_load_selection_empty");
process.stdout.write(`${JSON.stringify({ observer, at, saoPublicationHash: publication.publicationHash,
  baseCatalogVersion: index.baseCatalogVersion, maximum }, null, 2)}\n`);
