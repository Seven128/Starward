import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/** Conservative encoded-color support for the existing additive survey display.
 * This is neither an alpha/missing-data mask nor scientific validity. A cell
 * is occupied when any source RGB channel is nonzero, including zero-alpha
 * colors because straight-alpha LINEAR filtering may mix neighboring samples.
 * Bits run left to right, then top to bottom in the unchanged decoded image;
 * the first cell is the high bit of the first hexadecimal nibble. */
interface SkyImageDisplaySupportBase {
  sourceSha256: string;
  pixels: 256 | 512;
}
/** Retained, earlier metadata refinement; coarse occupied cells are conservative. */
export interface SkyImageDisplayBits extends SkyImageDisplaySupportBase {
  version: "encoded-rgb-support-v1";
  cellSize: 8;
  occupiedHex: string;
}
export interface SkyImageDisplayRuns extends SkyImageDisplaySupportBase {
  version: "encoded-rgb-runs-v1";
  /** Lossless row-major source pixels: repeated [colored skip, empty length],
   * relative to the end of the preceding empty span. RGB zero is display-only. */
  emptyRuns: readonly number[];
}
export type SkyImageDisplaySupport = SkyImageDisplayBits | SkyImageDisplayRuns;

const ranges = new WeakMap<SkyImageDisplayRuns, readonly (readonly [number, number])[]>();
/** Metadata identity follows the image owner; weak retention needs no GPU/file
 * cleanup and decodes a validated immutable run stream once, outside frame work. */
export function skyImageDisplayEmptyRanges(support: SkyImageDisplayRuns): readonly (readonly [number, number])[] {
  let result = ranges.get(support);
  if (!result) {
    let cursor = 0;
    result = Object.freeze(Array.from({ length: support.emptyRuns.length / 2 }, (_, i) => {
      const start = cursor + support.emptyRuns[i * 2]!;
      cursor = start + support.emptyRuns[i * 2 + 1]!;
      return Object.freeze([start, cursor] as const);
    }));
    ranges.set(support, result);
  }
  return result;
}

/** Validate at the publication/response boundary, against the actual image. */
export function readSkyImageDisplaySupport(value: unknown, pixels: number, source: string | Uint8Array): SkyImageDisplaySupport | null {
  const support = value as SkyImageDisplaySupport | null;
  if (!support || ![256, 512].includes(pixels) || support.pixels !== pixels ||
    typeof support.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(support.sourceSha256)) return null;
  if (support.version === "encoded-rgb-support-v1") {
    if (support.cellSize !== 8 || typeof support.occupiedHex !== "string" || support.occupiedHex.length !== (pixels / 8) ** 2 / 4 ||
      !/^[a-f0-9]+$/u.test(support.occupiedHex)) return null;
  } else if (support.version === "encoded-rgb-runs-v1") {
    if (!Array.isArray(support.emptyRuns) || support.emptyRuns.length % 2 !== 0 || support.emptyRuns.length > pixels ** 2) return null;
    let cursor = 0;
    for (let i = 0; i < support.emptyRuns.length; i += 2) {
      const skip = support.emptyRuns[i]!, length = support.emptyRuns[i + 1]!;
      if (!Number.isInteger(skip) || skip < 0 || !Number.isInteger(length) || length <= 0 ||
        cursor + skip + length > pixels ** 2) return null;
      cursor += skip + length;
    }
  } else return null;
  const sourceSha256 = typeof source === "string" ? source : bytesToHex(sha256(source));
  if (support.sourceSha256 !== sourceSha256) return null;
  if (support.version === "encoded-rgb-support-v1") return Object.freeze({ version: support.version, sourceSha256,
    pixels: support.pixels, cellSize: support.cellSize, occupiedHex: support.occupiedHex });
  const ready = Object.freeze({ version: support.version, sourceSha256, pixels: support.pixels,
    emptyRuns: Object.freeze([...support.emptyRuns]) });
  skyImageDisplayEmptyRanges(ready);
  return ready;
}
