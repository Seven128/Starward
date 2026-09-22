export type DeepSkyImageLevel = "OVERVIEW" | "MEDIUM" | "DETAIL";

export interface DeepSkyImageAsset {
  reference: string;
  level: DeepSkyImageLevel;
  fieldDegrees: number;
  tempFilePath: string;
}

export interface OwnedDeepSkyImageAsset extends DeepSkyImageAsset {
  /** The page releases this file after neither pending nor decoded imagery uses it. */
  release(): void;
}

let requestSequence = 0;
const requestSession = Date.now().toString(36);

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
  asset: Omit<DeepSkyImageAsset, "fieldDegrees">;
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
  let written = false, released = false;
  // Native writes cannot be aborted. A canceled write must never share a file
  // with its replacement, even for the same object and image level.
  const tempFilePath = input.asset.tempFilePath.replace(/\.jpg$/i, "") + `-${requestSession}-${++requestSequence}.jpg`;
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
      if (!active) return;
      const fieldHeader = Object.entries(result.header ?? {}).find(([name]) => name.toLowerCase() === "x-starward-image-field-degrees")?.[1];
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
      try { input.writeFile({
        filePath: tempFilePath,
        data: result.data,
        success: () => {
          written = true;
          if (!active || released) { remove(); return; }
          active = false;
          input.onReady({ ...input.asset, fieldDegrees, tempFilePath, release });
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
