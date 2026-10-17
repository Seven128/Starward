import { latitudeForMercatorY, mercatorY, WEB_MERCATOR_MAX_LATITUDE } from "./mercator.ts";

/** Display coordinates are GCJ-02; this is not an EPSG:3857 numeric source. */
export const DISPLAY_RASTER_GRID = "gcj02-mercator-pixel-centres-v1" as const;
export interface DisplayRasterRegion {
  grid: typeof DISPLAY_RASTER_GRID;
  zoom: number;
  x: number;
  y: number;
  span: 1 | 2 | 4;
  tilePixels: 256;
}
export interface RasterBounds { west: number; south: number; east: number; north: number }
export interface DisplayRasterWindow extends Omit<DisplayRasterRegion, "span"> { columns: number; rows: number }

export function validateDisplayRasterRegion(region: DisplayRasterRegion) {
  const count = 2 ** region.zoom;
  if (region.grid !== DISPLAY_RASTER_GRID || region.tilePixels !== 256
    || !Number.isInteger(region.zoom) || region.zoom < 0 || region.zoom > 12
    || ![1, 2, 4].includes(region.span) || region.span > count
    || !Number.isInteger(region.x) || !Number.isInteger(region.y)
    || region.x < 0 || region.y < 0 || region.x + region.span > count || region.y + region.span > count)
    throw new Error("display_raster_region_invalid");
  return region;
}

export function displayRasterBounds(region: DisplayRasterRegion): RasterBounds {
  validateDisplayRasterRegion(region);
  const count = 2 ** region.zoom;
  return { west: region.x / count * 360 - 180, east: (region.x + region.span) / count * 360 - 180,
    north: latitudeForMercatorY(region.y / count), south: latitudeForMercatorY((region.y + region.span) / count) };
}

/** Fixed, overlapping metatiles avoid an arbitrarily large parent at a group
 * boundary. Only integer grid coordinates determine their spatial identity. */
export function displayRasterRegionForBounds(bounds: RasterBounds, span: 1 | 2 | 4 = 2): DisplayRasterRegion {
  if (![bounds.west, bounds.south, bounds.east, bounds.north].every(Number.isFinite)
    || bounds.west < -180 || bounds.east > 180 || bounds.west >= bounds.east || bounds.south >= bounds.north
    || bounds.south < -WEB_MERCATOR_MAX_LATITUDE - 1e-7 || bounds.north > WEB_MERCATOR_MAX_LATITUDE + 1e-7)
    throw new Error("display_raster_bounds_invalid");
  const left = (bounds.west + 180) / 360, right = (bounds.east + 180) / 360;
  const top = mercatorY(bounds.north), bottom = mercatorY(bounds.south);
  const minimumZoom = Math.log2(span);
  let zoom = Math.max(minimumZoom, Math.min(12, Math.floor(Math.log2(span / Math.max(right - left, bottom - top)))));
  for (;;) {
    const count = 2 ** zoom;
    const x = Math.max(0, Math.min(count - span, Math.floor(left * count + 1e-10)));
    const y = Math.max(0, Math.min(count - span, Math.floor(top * count + 1e-10)));
    if ((x + span) / count >= right - 1e-12 && (y + span) / count >= bottom - 1e-12)
      return { grid: DISPLAY_RASTER_GRID, zoom, x, y, span, tilePixels: 256 };
    zoom--;
    if (zoom < minimumZoom) throw new Error("display_raster_bounds_invalid");
  }
}

export function displayRasterRegionKey(region: DisplayRasterRegion) {
  validateDisplayRasterRegion(region);
  return `${region.zoom}-${region.x}-${region.y}-${region.span}`;
}

export function displayRasterWindowForBounds(bounds: RasterBounds): DisplayRasterWindow {
  // Validate the complete input with the same boundary rules as a metatile.
  displayRasterRegionForBounds(bounds);
  const left = (bounds.west + 180) / 360, right = (bounds.east + 180) / 360;
  const top = mercatorY(bounds.north), bottom = mercatorY(bounds.south);
  // Aim at roughly 512 source-grid pixels along the longer view axis. Taking
  // the lower integer level avoids buying a finer pyramid merely because
  // snapping the view adds edge cells; the window is at most 3×3 cells.
  let zoom = Math.max(0, Math.min(12, Math.floor(Math.log2(2 / Math.max(right - left, bottom - top)))));
  for (;;) {
    const count = 2 ** zoom;
    const x = Math.max(0, Math.min(count - 1, Math.floor(left * count + 1e-10)));
    const y = Math.max(0, Math.min(count - 1, Math.floor(top * count + 1e-10)));
    const columns = Math.max(1, Math.min(count, Math.ceil(right * count - 1e-10)) - x);
    const rows = Math.max(1, Math.min(count, Math.ceil(bottom * count - 1e-10)) - y);
    if (columns <= 3 && rows <= 3) return { grid: DISPLAY_RASTER_GRID, tilePixels: 256, zoom, x, y, columns, rows };
    zoom--;
  }
}

export function displayRasterWindowBounds(window: DisplayRasterWindow): RasterBounds {
  validateDisplayRasterRegion({ ...window, span: 1 });
  if (!Number.isInteger(window.columns) || !Number.isInteger(window.rows) || window.columns < 1 || window.rows < 1
    || window.columns > 5 || window.rows > 5 || window.x + window.columns > 2 ** window.zoom
    || window.y + window.rows > 2 ** window.zoom) throw new Error("display_raster_window_invalid");
  const count = 2 ** window.zoom;
  return { west: window.x / count * 360 - 180, east: (window.x + window.columns) / count * 360 - 180,
    north: latitudeForMercatorY(window.y / count), south: latitudeForMercatorY((window.y + window.rows) / count) };
}

export function displayRasterWindowKey(window: DisplayRasterWindow) {
  displayRasterWindowBounds(window);
  return `${window.zoom}-${window.x}-${window.y}-${window.columns}-${window.rows}`;
}
