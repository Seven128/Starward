import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { PNG } from "pngjs";
import { displayRasterWindowKey } from "@starward/coordinate-system";
import { NIGHT_LIGHT_CONTRAST_DISPLAY, NIGHT_LIGHT_FIXED_SCALE, NIGHT_LIGHT_LEGACY_DISPLAY,
  nightLightDisplayBands, type NightLightDisplayStyle } from "@starward/miniapp-contracts";
import type { NightLightWindow, NightLightView } from "./night-light-window.ts";

const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const policySha256 = hash(JSON.stringify({ sourceStyle: NIGHT_LIGHT_LEGACY_DISPLAY, display: NIGHT_LIGHT_CONTRAST_DISPLAY }));
const channels = (color: string) => [1, 3, 5].map(offset => Number.parseInt(color.slice(offset, offset + 2), 16));
const key = (r: number, g: number, b: number, a: number) => (r << 24) | (g << 16) | (b << 8) | a;
const displayBands = nightLightDisplayBands(NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion);
const palette = new Map(NIGHT_LIGHT_FIXED_SCALE.bands.map((band, index) => {
  const [r, g, b] = channels(band.color), target = displayBands[index]!;
  return [key(r!, g!, b!, NIGHT_LIGHT_FIXED_SCALE.alpha), [...channels(target.color), target.alpha]] as const;
}));

function displayPixel(pixels: Uint8Array, offset: number) {
  if (pixels[offset + 3] === 0) return null;
  const mapped = palette.get(key(pixels[offset]!, pixels[offset + 1]!, pixels[offset + 2]!, pixels[offset + 3]!));
  if (!mapped) throw new Error("nightlight_display_class_invalid");
  return mapped;
}

function decodeDisplayPng(bytes: Buffer, width: number, height: number) {
  if (width < 256 || height < 256 || width > 768 || height > 768 || bytes.length > 16 * 1024 * 1024
    || bytes.length < 33 || bytes.toString("hex", 0, 8) !== "89504e470d0a1a0a"
    || bytes.toString("ascii", 12, 16) !== "IHDR" || bytes.readUInt32BE(16) !== width || bytes.readUInt32BE(20) !== height)
    throw new Error("nightlight_display_dimensions_invalid");
  let decoded: PNG;
  try { decoded = PNG.sync.read(bytes, { checkCRC: true }); }
  catch { throw new Error("nightlight_display_png_invalid"); }
  if (decoded.width !== width || decoded.height !== height || decoded.data.length !== width * height * 4)
    throw new Error("nightlight_display_dimensions_invalid");
  return decoded;
}

/** Identity/metadata shared by offline production and prepared-file admission.
 * This does not read, decode or recolour an image. */
export function nightLightContrastView(proof: NightLightView, inventorySha256: string,
  image: { sha256: string; bytes: number }): NightLightView {
  const style = NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion;
  if (proof.styleVersion !== NIGHT_LIGHT_LEGACY_DISPLAY || !/^[a-f0-9]{64}$/u.test(inventorySha256)
    || !/^[a-f0-9]{64}$/u.test(image.sha256) || !Number.isSafeInteger(image.bytes)
    || image.bytes < 1 || image.bytes > 16 * 1024 * 1024) throw new Error("nightlight_display_source_invalid");
  const width = proof.grid.window.columns * 256, height = proof.grid.window.rows * 256;
  if (width < 256 || height < 256 || width > 768 || height > 768
    || proof.image.width !== width || proof.image.height !== height) throw new Error("nightlight_display_dimensions_invalid");
  const windowKey = displayRasterWindowKey(proof.grid.window), sha256 = image.sha256;
  const displaySource = { publicationId: proof.publicationId, imageSha256: proof.image.sha256, policySha256 };
  const identity = hash(JSON.stringify({ displaySource, inventorySha256, windowKey, style, sha256 }));
  return { publicationId: `nightlight-display:${identity}`, styleVersion: style, displaySource,
    methodVersion: proof.methodVersion, statistic: proof.statistic, quality: proof.quality,
    grid: { window: proof.grid.window, width, height, boundsGcj02: proof.grid.boundsGcj02 },
    image: { file: `nightlight-contrast-v1-window-${windowKey}-${inventorySha256}-${sha256}.png`,
      width, height, sha256, bytes: image.bytes } };
}

/** Offline publication verification of existing bytes. No encoding or writing.
 * The same palette as production checks all RGBA channels, including valid
 * zero and unchanged transparent pixels. This is not an API request reader. */
export function validateNightLightContrastDisplay(source: NightLightWindow, view: NightLightView, bytes: Buffer,
  inventorySha256: string, signal: AbortSignal): void {
  signal.throwIfAborted();
  if (!isDeepStrictEqual(view, nightLightContrastView(source.proof, inventorySha256, { sha256: hash(bytes), bytes: bytes.length }))
    || source.bytes.length !== source.proof.image.bytes || hash(source.bytes) !== source.proof.image.sha256)
    throw new Error("nightlight_display_identity_invalid");
  const width = view.image.width, height = view.image.height;
  const original = decodeDisplayPng(source.bytes, width, height), target = decodeDisplayPng(bytes, width, height);
  let validPixels = 0;
  for (let row = 0; row < height; row++) {
    signal.throwIfAborted();
    for (let offset = row * width * 4, end = offset + width * 4; offset < end; offset += 4) {
      const mapped = displayPixel(original.data, offset);
      if (mapped) validPixels++;
      for (let channel = 0; channel < 4; channel++)
        if (target.data[offset + channel] !== (mapped ? mapped[channel] : original.data[offset + channel]))
          throw new Error("nightlight_display_pixel_mismatch");
    }
  }
  // The scientific producer defines valid support as finite radiance / quality
  // 1 or 2. It colours every such pixel (including genuine zero); transparent
  // pixels remain outside that support. Contrast keeps the same support.
  if (source.proof.quality.pixelCount !== width * height || source.proof.quality.validPixelCount !== validPixels)
    throw new Error("nightlight_display_quality_invalid");
  signal.throwIfAborted();
}

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
      const mapped = displayPixel(pixels.data, offset);
      if (!mapped) continue;
      pixels.data[offset] = mapped[0]!; pixels.data[offset + 1] = mapped[1]!;
      pixels.data[offset + 2] = mapped[2]!; pixels.data[offset + 3] = mapped[3]!;
    }
  }
  signal.throwIfAborted();
  const bytes = PNG.sync.write(pixels), sha256 = hash(bytes);
  // Keep this an image-only view: do not carry a source numerical proof's
  // schema/policy/numeric fields under a new display publication identity.
  return { bytes, proof: nightLightContrastView(proof, inventorySha256, { sha256, bytes: bytes.length }) };
}
