export type DeepSkyImageLevel = "OVERVIEW" | "MEDIUM" | "DETAIL";

export interface DeepSkyImageAsset {
  reference: string;
  level: DeepSkyImageLevel;
  fieldDegrees: number;
  tempFilePath: string;
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
  asset: Omit<DeepSkyImageAsset, "fieldDegrees">;
  url: string;
  request(options: DeepSkyImageRequestOptions): {
    abort?: () => void;
    catch?: (handler: (error: unknown) => unknown) => unknown;
  };
  writeFile(options: DeepSkyImageWriteOptions): void;
  onReady(asset: DeepSkyImageAsset): void;
  onError(): void;
  onCancel?(): void;
}

export function startDeepSkyImageRequest(input: DeepSkyImageRequestInput) {
  let active = true;
  const fail = () => {
    if (!active) return;
    active = false;
    input.onError();
  };
  const task = input.request({
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
      input.writeFile({
        filePath: input.asset.tempFilePath,
        data: result.data,
        success: () => {
          if (!active) return;
          active = false;
          input.onReady({ ...input.asset, fieldDegrees });
        },
        fail,
      });
    },
    fail,
  });
  // Taro's RequestTask may also be Promise-like even when callbacks are used.
  // The callback owns product state; consume the duplicate rejection so one
  // native failure cannot escape as an unhandled promise rejection.
  task.catch?.(() => undefined);

  return () => {
    if (!active) return;
    active = false;
    task.abort?.();
    input.onCancel?.();
  };
}
