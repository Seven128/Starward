import type { SkyGpuTextureWindow } from "./sky-gpu-textures";
import { skyArtworkViewBounds } from "./sky-artwork-visibility";
import { galacticEquirectUv, type SkyGalacticBand } from "./sky-galactic-band";
import type { SkyArtworkView } from "./sky-artwork-registration";

/** Conservative source-texel window of every viewport ray. Source rows follow
 * the existing unflipped upload: source top is texture v=0. A seam/pole keeps
 * full longitude; neither the horizon nor dark pixels narrow science coverage. */
export function skyGalacticImageWindow(view: SkyArtworkView, width: number, height: number,
  band: Pick<SkyGalacticBand,"pole"|"center">, imageWidth: number, imageHeight: number): SkyGpuTextureWindow {
  const full = { x: 0, y: 0, width: imageWidth, height: imageHeight };
  const cap = skyArtworkViewBounds(view, width, height);
  if (!cap || ![imageWidth, imageHeight].every(n => Number.isInteger(n) && n > 0)) return full;
  const radius = Math.min(Math.PI, cap.radius + 8 * 2 ** -23);
  const latitude = Math.asin(Math.max(-1, Math.min(1,
    cap.center.reduce((sum, value, i) => sum + value * band.pole[i]!, 0))));
  const [u] = galacticEquirectUv(cap.center, band.pole, band.center);
  let left = 0, right = 1;
  if (radius + Math.abs(latitude) < Math.PI / 2) {
    const half = Math.asin(Math.min(1, Math.sin(radius) / Math.cos(latitude))) / (2 * Math.PI);
    // The display filter itself wraps. A cap just short of the seam may still
    // sample the opposite image edge; clipping its padding at x=0 loses it.
    if ((u - half) * imageWidth >= 3 && (u + half) * imageWidth <= imageWidth - 3) {
      left = u - half; right = u + half;
    }
  }
  const top = .5 - Math.min(Math.PI / 2, latitude + radius) / Math.PI;
  const bottom = .5 - Math.max(-Math.PI / 2, latitude - radius) / Math.PI;
  // Three source texels enclose the existing +/-1.2 filter, LINEAR neighbours
  // and float camera error. Outward 32-texel blocks avoid a copy on each tiny
  // camera/time change; a retained larger window can serve a smaller view.
  const lower = (n: number, size: number) => Math.max(0, Math.floor((n * size - 3) / 32) * 32);
  const upper = (n: number, size: number) => Math.min(size, Math.ceil((n * size + 3) / 32) * 32);
  const x = lower(left, imageWidth), y = lower(top, imageHeight);
  return { x, y, width: upper(right, imageWidth) - x, height: upper(bottom, imageHeight) - y };
}
