import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { displayRasterWindowKey } from "@starward/coordinate-system";
import { NIGHT_LIGHT_CONTRAST_DISPLAY, NIGHT_LIGHT_FIXED_SCALE, NIGHT_LIGHT_LEGACY_DISPLAY,
  nightLightDisplayBands, type NightLightDisplayStyle } from "@starward/miniapp-contracts";
import type { NightLightWindow } from "./night-light-window.ts";

const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const policySha256 = hash(JSON.stringify({ sourceStyle: NIGHT_LIGHT_LEGACY_DISPLAY, display: NIGHT_LIGHT_CONTRAST_DISPLAY }));
const channels = (color: string) => [1, 3, 5].map(offset => Number.parseInt(color.slice(offset, offset + 2), 16));
const key = (r: number, g: number, b: number, a: number) => (r << 24) | (g << 16) | (b << 8) | a;
const displayBands = nightLightDisplayBands(NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion);
const palette = new Map(NIGHT_LIGHT_FIXED_SCALE.bands.map((band, index) => {
  const [r, g, b] = channels(band.color), target = displayBands[index]!;
  return [key(r!, g!, b!, NIGHT_LIGHT_FIXED_SCALE.alpha), [...channels(target.color), target.alpha]] as const;
}));

/** One bounded display projection of validated product classes, never a numeric
 * reconstruction. The caller's existing binary-read slot owns its lifetime. */
export function projectNightLightDisplay(source: NightLightWindow, inventorySha256: string,
  style: NightLightDisplayStyle, signal: AbortSignal, decoded?: PNG): NightLightWindow {
  signal.throwIfAborted();
  if (style === NIGHT_LIGHT_LEGACY_DISPLAY) return source;
  if (style !== NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion || source.proof.styleVersion !== NIGHT_LIGHT_LEGACY_DISPLAY)
    throw new Error("nightlight_display_style_invalid");
  const { proof } = source, width = proof.grid.window.columns * 256, height = proof.grid.window.rows * 256;
  if (width < 256 || height < 256 || width > 768 || height > 768 || source.bytes.length > 16 * 1024 * 1024
    || proof.image.width !== width || proof.image.height !== height || hash(source.bytes) !== proof.image.sha256
    || !/^[a-f0-9]{64}$/u.test(inventorySha256)) throw new Error("nightlight_display_source_invalid");
  // Validate the header before a fresh decode, including prepared-window input.
  if (source.bytes.length < 33 || source.bytes.toString("hex", 0, 8) !== "89504e470d0a1a0a"
    || source.bytes.toString("ascii", 12, 16) !== "IHDR" || source.bytes.readUInt32BE(16) !== width
    || source.bytes.readUInt32BE(20) !== height) throw new Error("nightlight_display_dimensions_invalid");
  const pixels = decoded ?? PNG.sync.read(source.bytes, { checkCRC: true });
  if (pixels.width !== width || pixels.height !== height || pixels.data.length !== width * height * 4)
    throw new Error("nightlight_display_dimensions_invalid");
  for (let row = 0; row < height; row++) {
    signal.throwIfAborted();
    for (let offset = row * width * 4, end = offset + width * 4; offset < end; offset += 4) {
      if (pixels.data[offset + 3] === 0) continue;
      const mapped = palette.get(key(pixels.data[offset]!, pixels.data[offset + 1]!, pixels.data[offset + 2]!, pixels.data[offset + 3]!));
      if (!mapped) throw new Error("nightlight_display_class_invalid");
      pixels.data[offset] = mapped[0]!; pixels.data[offset + 1] = mapped[1]!;
      pixels.data[offset + 2] = mapped[2]!; pixels.data[offset + 3] = mapped[3]!;
    }
  }
  signal.throwIfAborted();
  const bytes = PNG.sync.write(pixels), sha256 = hash(bytes), windowKey = displayRasterWindowKey(proof.grid.window);
  const displaySource = { publicationId: proof.publicationId, imageSha256: proof.image.sha256, policySha256 };
  const identity = hash(JSON.stringify({ displaySource, inventorySha256, windowKey, style, sha256 }));
  // Keep this an image-only view: do not carry a source numerical proof's
  // schema/policy/numeric fields under a new display publication identity.
  return { bytes, proof: { publicationId: `nightlight-display:${identity}`, styleVersion: style, displaySource,
    methodVersion: proof.methodVersion, statistic: proof.statistic, quality: proof.quality,
    grid: { window: proof.grid.window, width, height, boundsGcj02: proof.grid.boundsGcj02 },
    image: { file: `nightlight-contrast-v1-window-${windowKey}-${inventorySha256}-${sha256}.png`,
      width, height, sha256, bytes: bytes.length } } };
}
