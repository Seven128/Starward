import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { crc32, inflateSync } from "node:zlib";
import type { AccountAvatarMimeType, ContributionMediaUpload } from "@starward/miniapp-contracts";
import type { MediaObjectStorePort } from "./ports.ts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const PNG_SAFE_ANCILLARY = new Set(["tRNS", "sRGB", "gAMA", "cHRM"]);
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
  0xcf,
]);
const JPEG_STRIPPED_MARKERS = new Set([0xe1, 0xed, 0xfe]);

function jpegMarkerAt(input: Buffer, offset: number) {
  if (input[offset] !== 0xff || offset + 1 >= input.length)
    throw new Error("contribution_media_jpeg_invalid");
  const marker = input[offset + 1]!;
  if (
    marker === 0x00 ||
    marker === 0xff ||
    (marker >= 0xd0 && marker <= 0xd8)
  )
    throw new Error("contribution_media_jpeg_invalid");
  return marker;
}

function jpegSegmentEnd(input: Buffer, offset: number) {
  if (offset + 4 > input.length)
    throw new Error("contribution_media_jpeg_invalid");
  const length = input.readUInt16BE(offset + 2);
  const end = offset + 2 + length;
  if (length < 2 || end > input.length)
    throw new Error("contribution_media_jpeg_invalid");
  return { length, end };
}

function assertJpegDimensions(input: Buffer, offset: number, length: number) {
  if (length < 8) throw new Error("contribution_media_jpeg_invalid");
  const height = input.readUInt16BE(offset + 5);
  const width = input.readUInt16BE(offset + 7);
  if (!width || !height || width * height > 24_000_000)
    throw new Error("contribution_media_dimensions_invalid");
}

function sanitizeJpeg(input: Buffer) {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8)
    throw new Error("contribution_media_signature_invalid");
  const output: Buffer[] = [input.subarray(0, 2)];
  let offset = 2;
  let hasDimensions = false;
  let hasScan = false;
  while (offset < input.length) {
    const marker = jpegMarkerAt(input, offset);
    if (marker === 0xda) {
      if (!hasDimensions) throw new Error("contribution_media_jpeg_incomplete");
      const { end } = jpegSegmentEnd(input, offset);
      let scanEnd = end;
      while (scanEnd < input.length) {
        if (input[scanEnd] !== 0xff) { scanEnd++; continue; }
        const next = input[scanEnd + 1];
        if (next === 0x00 || (next !== undefined && next >= 0xd0 && next <= 0xd7)) {
          scanEnd += 2;
          continue;
        }
        break;
      }
      output.push(input.subarray(offset, scanEnd));
      offset = scanEnd;
      hasScan = true;
      continue;
    }
    if (marker === 0xd9) {
      if (!hasDimensions || !hasScan) throw new Error("contribution_media_jpeg_incomplete");
      output.push(input.subarray(offset, offset + 2));
      if (offset + 2 !== input.length)
        throw new Error("contribution_media_jpeg_trailing_data");
      return Buffer.concat(output);
    }
    const { length, end } = jpegSegmentEnd(input, offset);
    if (JPEG_SOF_MARKERS.has(marker)) {
      assertJpegDimensions(input, offset, length);
      hasDimensions = true;
    }
    if (!JPEG_STRIPPED_MARKERS.has(marker))
      output.push(input.subarray(offset, end));
    offset = end;
  }
  throw new Error("contribution_media_jpeg_incomplete");
}

function readPngChunk(input: Buffer, offset: number) {
  if (offset + 12 > input.length)
    throw new Error("contribution_media_png_invalid");
  const length = input.readUInt32BE(offset);
  const end = offset + 12 + length;
  if (end > input.length) throw new Error("contribution_media_png_invalid");
  const type = input.toString("ascii", offset + 4, offset + 8);
  if (!/^[A-Za-z]{4}$/u.test(type))
    throw new Error("contribution_media_png_invalid");
  const expectedCrc = input.readUInt32BE(end - 4);
  const actualCrc = crc32(input.subarray(offset + 4, end - 4)) >>> 0;
  if (actualCrc !== expectedCrc)
    throw new Error("contribution_media_png_crc_invalid");
  return { offset, length, end, type };
}

function pngInflatedByteCount(input: Buffer, offset: number, length: number) {
  if (length !== 13) throw new Error("contribution_media_png_invalid");
  const width = input.readUInt32BE(offset + 8);
  const height = input.readUInt32BE(offset + 12);
  if (!width || !height || width * height > 24_000_000)
    throw new Error("contribution_media_dimensions_invalid");
  const bitDepth = input[offset + 16]!;
  const colorType = input[offset + 17]!;
  const channels = new Map([
    [0, 1],
    [2, 3],
    [3, 1],
    [4, 2],
    [6, 4],
  ]).get(colorType);
  const standardEncoding =
    input[offset + 18] === 0 &&
    input[offset + 19] === 0 &&
    input[offset + 20] === 0;
  if (!channels || ![1, 2, 4, 8, 16].includes(bitDepth) || !standardEncoding)
    throw new Error("contribution_media_png_format_invalid");
  const byteCount =
    (Math.ceil((width * channels * bitDepth) / 8) + 1) * height;
  if (byteCount > 96_000_000)
    throw new Error("contribution_media_dimensions_invalid");
  return byteCount;
}

function assertPngImageData(imageData: Buffer[], expectedBytes: number) {
  let inflated: Buffer;
  try {
    inflated = inflateSync(Buffer.concat(imageData), {
      maxOutputLength: expectedBytes,
    });
  } catch {
    throw new Error("contribution_media_png_data_invalid");
  }
  if (inflated.length !== expectedBytes)
    throw new Error("contribution_media_png_data_invalid");
}

function sanitizePng(input: Buffer) {
  if (input.length < 33 || !input.subarray(0, 8).equals(PNG_SIGNATURE))
    throw new Error("contribution_media_signature_invalid");
  const output: Buffer[] = [input.subarray(0, 8)];
  const imageData: Buffer[] = [];
  let offset = 8;
  let expectedInflatedBytes: number | null = null;
  let hasEnd = false;
  while (offset < input.length) {
    const chunk = readPngChunk(input, offset);
    if (chunk.type === "IHDR") {
      if (expectedInflatedBytes !== null)
        throw new Error("contribution_media_png_invalid");
      expectedInflatedBytes = pngInflatedByteCount(
        input,
        chunk.offset,
        chunk.length,
      );
    }
    if (chunk.type === "IDAT")
      imageData.push(input.subarray(chunk.offset + 8, chunk.end - 4));
    if (chunk.type === "IEND") {
      if (chunk.length !== 0 || chunk.end !== input.length)
        throw new Error("contribution_media_png_invalid");
      hasEnd = true;
    }
    const critical = chunk.type[0] === chunk.type[0]!.toUpperCase();
    if (critical || PNG_SAFE_ANCILLARY.has(chunk.type))
      output.push(input.subarray(chunk.offset, chunk.end));
    offset = chunk.end;
  }
  if (expectedInflatedBytes === null || !imageData.length || !hasEnd)
    throw new Error("contribution_media_png_incomplete");
  assertPngImageData(imageData, expectedInflatedBytes);
  return Buffer.concat(output);
}

export function sanitizeContributionImage(
  bytes: Uint8Array,
  mimeType: ContributionMediaUpload["mimeType"],
) {
  const input = Buffer.from(bytes);
  return mimeType === "image/jpeg" ? sanitizeJpeg(input) : sanitizePng(input);
}

function assertObjectKey(value: string) {
  if (!/^(?:contributions|profiles)\/[a-f0-9]{24}\/[a-zA-Z0-9_-]{10,160}\.(?:jpg|png|webp)$/u.test(value))
    throw new Error("media_object_key_invalid");
}

export function sanitizeAccountAvatarImage(bytes: Uint8Array, mimeType: AccountAvatarMimeType) {
  if (mimeType !== "image/webp") return sanitizeContributionImage(bytes, mimeType);
  const input = Buffer.from(bytes);
  if (input.length < 20 || input.toString("ascii", 0, 4) !== "RIFF" || input.toString("ascii", 8, 12) !== "WEBP" || input.readUInt32LE(4) + 8 !== input.length)
    throw new Error("account_avatar_signature_invalid");
  let offset = 12;
  let imageChunks = 0;
  let dimensionsSeen = false;
  const output: Buffer[] = [];
  while (offset < input.length) {
    if (offset + 8 > input.length) throw new Error("account_avatar_webp_invalid");
    const type = input.toString("ascii", offset, offset + 4);
    const length = input.readUInt32LE(offset + 4);
    const end = offset + 8 + length + (length % 2);
    if (end > input.length) throw new Error("account_avatar_webp_invalid");
    if (type === "ANIM" || type === "ANMF") throw new Error("account_avatar_animated_invalid");
    const payload = offset + 8;
    if (type === "VP8X") {
      if (length !== 10) throw new Error("account_avatar_webp_invalid");
      const width = 1 + input.readUIntLE(payload + 4, 3);
      const height = 1 + input.readUIntLE(payload + 7, 3);
      if (width * height > 24_000_000) throw new Error("contribution_media_dimensions_invalid");
      dimensionsSeen = true;
      const chunk = Buffer.from(input.subarray(offset, end));
      chunk[8] = chunk[8]! & ~0x0c;
      output.push(chunk);
    } else if (type === "VP8 ") {
      imageChunks++;
      if (length < 10 || !input.subarray(payload + 3, payload + 6).equals(Buffer.from([0x9d, 0x01, 0x2a]))) throw new Error("account_avatar_webp_invalid");
      const width = input.readUInt16LE(payload + 6) & 0x3fff;
      const height = input.readUInt16LE(payload + 8) & 0x3fff;
      if (!width || !height || width * height > 24_000_000) throw new Error("contribution_media_dimensions_invalid");
      dimensionsSeen = true; output.push(input.subarray(offset, end));
    } else if (type === "VP8L") {
      imageChunks++;
      if (length < 5 || input[payload] !== 0x2f) throw new Error("account_avatar_webp_invalid");
      const bits = input.readUInt32LE(payload + 1);
      const width = 1 + (bits & 0x3fff);
      const height = 1 + ((bits >>> 14) & 0x3fff);
      if (width * height > 24_000_000) throw new Error("contribution_media_dimensions_invalid");
      dimensionsSeen = true; output.push(input.subarray(offset, end));
    } else if (!["EXIF", "XMP "].includes(type)) output.push(input.subarray(offset, end));
    offset = end;
  }
  if (imageChunks !== 1 || !dimensionsSeen) throw new Error("account_avatar_webp_invalid");
  const body = Buffer.concat(output);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0, "ascii"); header.writeUInt32LE(body.length + 4, 4); header.write("WEBP", 8, "ascii");
  return Buffer.concat([header, body]);
}

export class DisabledMediaObjectStore implements MediaObjectStorePort {
  readonly kind = "disabled" as const;
  readonly enabled = false;
  async put() {
    throw new Error("media_upload_capability_disabled");
  }
  async read() {
    return null;
  }
  async delete() {}
  async close() {}
}

export class MemoryMediaObjectStore implements MediaObjectStorePort {
  readonly kind = "memory" as const;
  readonly enabled = true;
  #objects = new Map<string, Uint8Array>();
  async put(input: { objectKey: string; bytes: Uint8Array }) {
    assertObjectKey(input.objectKey);
    this.#objects.set(input.objectKey, Uint8Array.from(input.bytes));
  }
  async read(objectKey: string) {
    const value = this.#objects.get(objectKey);
    return value ? Uint8Array.from(value) : null;
  }
  async delete(objectKey: string) {
    this.#objects.delete(objectKey);
  }
  async close() {
    this.#objects.clear();
  }
}

export class LocalFilesystemMediaObjectStore implements MediaObjectStorePort {
  readonly kind = "local-filesystem" as const;
  readonly enabled = true;
  readonly #root: string;

  constructor(root: string) {
    this.#root = path.resolve(root);
  }

  #path(objectKey: string) {
    assertObjectKey(objectKey);
    const resolved = path.resolve(this.#root, ...objectKey.split("/"));
    if (!resolved.startsWith(this.#root + path.sep))
      throw new Error("media_object_path_invalid");
    return resolved;
  }

  async put(input: { objectKey: string; bytes: Uint8Array }) {
    const destination = this.#path(input.objectKey);
    await mkdir(path.dirname(destination), { recursive: true });
    const temporary = destination + `.pending-${randomUUID()}`;
    try {
      await writeFile(temporary, input.bytes, { flag: "wx" });
      await rename(temporary, destination);
    } finally {
      await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
  }

  async read(objectKey: string) {
    return readFile(this.#path(objectKey)).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
  }

  async delete(objectKey: string) {
    // The lifecycle owner retires the upload before cleanup, excluding active writers.
    const destination = this.#path(objectKey);
    const directory = path.dirname(destination);
    const prefix = path.basename(destination) + ".pending";
    const entries = await readdir(directory).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    const files = [destination, ...entries.filter(name => name === prefix ||
      (name.startsWith(prefix + "-") && /^[0-9a-f-]{36}$/u.test(name.slice(prefix.length + 1))))
      .map(name => path.join(directory, name))];
    for (const file of files) await unlink(file).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }

  async close() {}
}

export function createMediaObjectStore(
  config: MiniappRuntimeConfig,
): MediaObjectStorePort {
  if (config.mediaStorage.mode === "DISABLED")
    return new DisabledMediaObjectStore();
  if (!config.mediaStorage.root)
    throw new Error("runtime_config_invalid:media_storage_root_required");
  return new LocalFilesystemMediaObjectStore(config.mediaStorage.root);
}
