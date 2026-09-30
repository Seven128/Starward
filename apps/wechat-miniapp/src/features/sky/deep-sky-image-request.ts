import { skyImageFileSession } from "../../services/sky-image-file-session";
import { DEEP_SKY_IMAGE_PIXELS, readSkyImageDisplaySupport, type SkyImageDisplaySupport, type DeepSkyImageLevel } from "@starward/miniapp-contracts";

export type { DeepSkyImageLevel } from "@starward/miniapp-contracts";

export interface DeepSkyImageAsset {
  reference: string;
  level: DeepSkyImageLevel;
  fieldDegrees: number;
  tempFilePath: string;
  publicationHash?: string;
  sourceId?: string;
  pixelSize?: 256 | 512;
  sourceMissingPixels?: number;
  displaySupport?: SkyImageDisplaySupport;
}

export interface OwnedDeepSkyImageAsset extends DeepSkyImageAsset {
  /** The page releases this file after neither pending nor decoded imagery uses it. */
  release(): void;
}

export interface DeepSkyImageRequestOptions {
  url: string;
  responseType: "arraybuffer";
  success(result: { statusCode: number; data: unknown; header?: Record<string, string | number> }): void;
  fail(): void;
}

export interface DeepSkyImageWriteOptions {
  filePath: string;
  data: ArrayBuffer;
  success(): void;
  fail(): void;
}

export interface DeepSkyImageRequestInput {
  asset: Pick<DeepSkyImageAsset, "reference" | "level" | "tempFilePath">;
  url: string;
  request(options: DeepSkyImageRequestOptions): {
    abort?: () => void;
    catch?: (handler: (error: unknown) => unknown) => unknown;
  };
  writeFile(options: DeepSkyImageWriteOptions): void;
  removeFile(path: string): void;
  onReady(asset: OwnedDeepSkyImageAsset): void;
  onError(): void;
  onCancel?(): void;
}

export function startDeepSkyImageRequest(input: DeepSkyImageRequestInput) {
  let active = true;
  let responseAccepted = false;
  let written = false, released = false;
  // Native writes cannot be aborted. A canceled write must never share a file
  // with its replacement, even for the same object and image level.
  const pathStem = input.asset.tempFilePath.replace(/\.(?:jpg|png)$/i, "") + `-${skyImageFileSession.nextRequestSuffix()}`;
  let tempFilePath = pathStem + ".jpg";
  const remove = () => {
    if (!written) return;
    written = false;
    try { input.removeFile(tempFilePath); } catch { /* Best-effort owned cache cleanup. */ }
  };
  const release = () => { if (!released) { released = true; remove(); } };
  const fail = () => {
    if (!active) return;
    active = false;
    release();
    input.onError();
  };
  let task: ReturnType<DeepSkyImageRequestInput["request"]> | undefined;
  try { task = input.request({
    url: input.url,
    responseType: "arraybuffer",
    success: (result) => {
      if (!active || responseAccepted) return;
      const header = (key: string) => Object.entries(result.header ?? {}).find(([name]) => name.toLowerCase() === key)?.[1];
      const fieldHeader = header("x-starward-image-field-degrees");
      const fieldDegrees = Number(fieldHeader);
      if (
        result.statusCode < 200 ||
        result.statusCode >= 300 ||
        !(result.data instanceof ArrayBuffer) ||
        !Number.isFinite(fieldDegrees) ||
        fieldDegrees <= 0 ||
        fieldDegrees > 8
      ) {
        fail();
        return;
      }
      const contentType = String(header("content-type") ?? "image/jpeg").split(";")[0]?.trim().toLowerCase();
      const publicationHash = header("x-starward-image-publication-hash");
      const sourceId = header("x-starward-image-source-id");
      const pixelsHeader = header("x-starward-image-pixels"), pixelSize = Number(pixelsHeader);
      const missingHeader = header("x-starward-image-missing-pixels"), sourceMissingPixels = Number(missingHeader);
      const png = contentType === "image/png";
      if ((contentType !== "image/jpeg" && !png) ||
        (typeof publicationHash !== "string" || !/^[a-f0-9]{64}$/u.test(publicationHash) ||
          typeof sourceId !== "string" || !/^imagery:[^:]+:[a-f0-9]{64}$/u.test(sourceId) || !sourceId.endsWith(`:${publicationHash}`) ||
          pixelSize !== DEEP_SKY_IMAGE_PIXELS[input.asset.level]) ||
        (png ? missingHeader === undefined || !Number.isInteger(sourceMissingPixels) || sourceMissingPixels < 0 || sourceMissingPixels >= pixelSize ** 2
          : missingHeader !== undefined)) { fail(); return; }
      const bytes = new Uint8Array(result.data);
      if (png) {
        const signature = [137, 80, 78, 71, 13, 10, 26, 10];
        if (bytes.length < 45 || !signature.every((value, i) => bytes[i] === value) ||
          bytes[12] !== 73 || bytes[13] !== 72 || bytes[14] !== 68 || bytes[15] !== 82 ||
          new DataView(result.data).getUint32(16) !== pixelSize || new DataView(result.data).getUint32(20) !== pixelSize ||
          bytes[24] !== 8 || bytes[25] !== 6) { fail(); return; }
      } else if (header("content-type") !== undefined &&
        (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217)) {
        fail(); return;
      }
      const supportHeader = header("x-starward-image-display-support");
      let displaySupport: SkyImageDisplaySupport | null = null;
      if (supportHeader !== undefined) {
        try { displaySupport = png && typeof supportHeader === "string" ?
          readSkyImageDisplaySupport(JSON.parse(supportHeader), pixelSize, bytes) : null; }
        catch { /* Invalid optional metadata must not become a successful cue-retirement claim. */ }
        if (!displaySupport) { fail(); return; }
      }
      const metadata = { publicationHash, sourceId, pixelSize: pixelSize as 256 | 512, ...(png ? { sourceMissingPixels } : {}),
        ...(displaySupport ? { displaySupport } : {}) };
      tempFilePath = pathStem + (png ? ".png" : ".jpg");
      responseAccepted = true;
      try { input.writeFile({
        filePath: tempFilePath,
        data: result.data,
        success: () => {
          written = true;
          if (!active || released) { remove(); return; }
          active = false;
          input.onReady({ reference: input.asset.reference, level: input.asset.level,
            ...metadata, fieldDegrees, tempFilePath, release });
        },
        fail: () => { written = true; remove(); fail(); },
      }); } catch { written = true; remove(); fail(); }
    },
    fail,
  }); } catch { fail(); }
  // Taro's RequestTask may also be Promise-like even when callbacks are used.
  // The callback owns product state; consume the duplicate rejection so one
  // native failure cannot escape as an unhandled promise rejection.
  task?.catch?.(() => undefined);

  return () => {
    if (!active) return;
    active = false;
    try { task?.abort?.(); } finally { release(); input.onCancel?.(); }
  };
}
