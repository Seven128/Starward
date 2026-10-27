import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { displayRasterWindowForBounds, displayRasterWindowBounds, displayRasterWindowKey,
  type DisplayRasterWindow, type RasterBounds } from "@starward/coordinate-system";
import { copyFixedRasterPixels } from "./fixed-raster-image.ts";
import { NIGHT_LIGHT_LEGACY_DISPLAY, type MapLayerRaster, type NightLightDisplayStyle } from "@starward/miniapp-contracts";
import { readFixedNightLightImage, readFixedNightLightImagePixels, type FixedNightLightRaster } from "./night-light-publication.ts";
import { projectNightLightDisplay } from "./night-light-display-image.ts";

export type NightLightView = Pick<FixedNightLightRaster, "publicationId" | "methodVersion" | "styleVersion" | "statistic" | "quality" | "image">
  & { grid: Pick<FixedNightLightRaster["grid"], "window" | "width" | "height" | "boundsGcj02">;
    displaySource?: MapLayerRaster["displaySource"] };
export type NightLightWindow = { proof: NightLightView; bytes: Buffer };
export const overlapsNightLight = (a: RasterBounds, b: RasterBounds) => a.west < b.east && a.east > b.west && a.north > b.south && a.south < b.north;
const cell = (p: FixedNightLightRaster) => p.grid.window.columns === 1 && p.grid.window.rows === 1;

/** Select a published numerical LOD, then snap in that existing pyramid.
 * Coarse, continent-wide requests are clipped to published extent rather than
 * allocating a continent-sized image or stretching a small cell over it. */
export function nightLightWindowForBounds(proofs: FixedNightLightRaster[], bounds: RasterBounds): DisplayRasterWindow | null {
  const desired = displayRasterWindowForBounds(bounds), cells = proofs.filter(cell);
  const levels = [...new Set(cells.map(p => p.grid.window.zoom))].sort((a, b) => a - b);
  if (!levels.length) return null;
  const zoom = levels.filter(z => z <= desired.zoom).at(-1) ?? levels[0];
  const available = cells.filter(p => p.grid.window.zoom === zoom);
  if (!available.some(p => overlapsNightLight(p.grid.boundsGcj02, bounds))) return null;
  const factor = 2 ** (zoom - desired.zoom);
  const x = Math.max(Math.floor(desired.x * factor), Math.min(...available.map(p => p.grid.window.x)));
  const y = Math.max(Math.floor(desired.y * factor), Math.min(...available.map(p => p.grid.window.y)));
  const right = Math.min(Math.ceil((desired.x + desired.columns) * factor), Math.max(...available.map(p => p.grid.window.x + 1)));
  const bottom = Math.min(Math.ceil((desired.y + desired.rows) * factor), Math.max(...available.map(p => p.grid.window.y + 1)));
  const window = { grid: desired.grid, tilePixels: desired.tilePixels, zoom, x, y, columns: right - x, rows: bottom - y };
  validateNightLightWindow(window);
  return window;
}

export function validateNightLightWindow(window: DisplayRasterWindow) {
  displayRasterWindowBounds(window);
  if (window.columns > 3 || window.rows > 3) throw new Error("nightlight_window_budget_exceeded");
}

/** Shared admission and quality aggregation for both offline-prepared images
 * and the bounded compatibility composer. Never derives numerical values from
 * PNG colours or turns an image-only window into a numerical publication. */
function windowCells(proofs: FixedNightLightRaster[], window: DisplayRasterWindow) {
  validateNightLightWindow(window);
  const cells = new Map(proofs.filter(cell).map(p => [displayRasterWindowKey(p.grid.window), p]));
  const selected: (FixedNightLightRaster | null)[] = [];
  for (let row = 0; row < window.rows; row++) for (let column = 0; column < window.columns; column++) selected.push(cells.get(
    displayRasterWindowKey({ ...window, x: window.x + column, y: window.y + row, columns: 1, rows: 1 })) ?? null);
  // Keep the existing 16-MiB image read bound across the entire local request.
  if (selected.reduce((n, p) => n + (p?.image.bytes ?? 0), 0) > 16 * 1024 * 1024) throw new Error("nightlight_window_input_budget_exceeded");
  return selected;
}

export function nightLightWindowView(inventorySha256: string, proofs: FixedNightLightRaster[], window: DisplayRasterWindow,
  image: Pick<NightLightView["image"], "sha256" | "bytes">): NightLightView | null {
  const selected = windowCells(proofs, window), reference = selected.find(p => p !== null);
  if (!reference) return null;
  const exact = proofs.find(p => displayRasterWindowKey(p.grid.window) === displayRasterWindowKey(window));
  if (exact) return exact;
  const counts = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 };
  let validZeroPixelCount = 0, maximumAreaExcessFraction = 0;
  for (const proof of selected) {
    if (!proof) { counts["5"] += 65536; continue; }
    for (const quality of Object.keys(counts) as (keyof typeof counts)[]) counts[quality] += proof.quality.qualityMaskCounts[quality];
    validZeroPixelCount += proof.quality.validZeroPixelCount;
    maximumAreaExcessFraction = Math.max(maximumAreaExcessFraction, proof.quality.maximumAreaExcessFraction);
  }
  const key = displayRasterWindowKey(window), width = window.columns * 256, height = window.rows * 256;
  const identity = createHash("sha256").update(`${reference.datasetVersion}:${inventorySha256}:${key}:${image.sha256}`).digest("hex");
  return { publicationId: `nightlight-window:${identity}`, methodVersion: reference.methodVersion, styleVersion: reference.styleVersion,
    statistic: reference.statistic, grid: { window, width, height, boundsGcj02: displayRasterWindowBounds(window) },
    image: { file: `nightlight-v2-window-${key}-${inventorySha256}-${image.sha256}.png`, sha256: image.sha256, bytes: image.bytes, width, height },
    quality: { ...reference.quality, pixelCount: width * height, validPixelCount: counts["1"] + counts["2"],
      validZeroPixelCount, maximumAreaExcessFraction, qualityMaskCounts: counts } };
}

/** Image-only composition: all statistics and quality remain those of the
 * pinned numerical cells. This is not another published numerical proof. */
export async function composeNightLightWindow(directory: string, inventorySha256: string,
  proofs: FixedNightLightRaster[], window: DisplayRasterWindow, signal: AbortSignal,
  displayStyle: NightLightDisplayStyle = NIGHT_LIGHT_LEGACY_DISPLAY): Promise<NightLightWindow | null> {
  validateNightLightWindow(window); signal.throwIfAborted();
  const selected = windowCells(proofs, window);
  if (!selected.some(p => p !== null)) return null;
  const exact = proofs.find(p => displayRasterWindowKey(p.grid.window) === displayRasterWindowKey(window));
  if (exact) {
    if (displayStyle === NIGHT_LIGHT_LEGACY_DISPLAY) return { proof: exact, bytes: await readFixedNightLightImage(directory, exact, signal) };
    const image = await readFixedNightLightImagePixels(directory, exact, signal);
    return projectNightLightDisplay({ proof: exact, bytes: image.bytes }, inventorySha256, displayStyle, signal, image.pixels);
  }
  const png = new PNG({ width: window.columns * 256, height: window.rows * 256 });
  for (let index = 0; index < selected.length; index++) {
    signal.throwIfAborted();
    const proof = selected[index];
    if (!proof) continue;
    const image = await readFixedNightLightImagePixels(directory, proof, signal); signal.throwIfAborted();
    copyFixedRasterPixels(png, image.pixels, index % window.columns, Math.floor(index / window.columns));
  }
  signal.throwIfAborted();
  const bytes = PNG.sync.write(png), hash = createHash("sha256").update(bytes).digest("hex");
  const source = { bytes, proof: nightLightWindowView(inventorySha256, proofs, window, { sha256: hash, bytes: bytes.length })! };
  return projectNightLightDisplay(source, inventorySha256, displayStyle, signal, png);
}
