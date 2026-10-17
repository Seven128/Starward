import type { RasterImageAdapter, RasterImageFile } from "./raster-image-resources";
import { MiniappRequestCancelled } from "./request-lifecycle";

export interface RasterFilePlatform {
  download(options: { url: string; timeout: number;
    success(result: { statusCode: number; tempFilePath: string }): void;
    fail(error: { errMsg: string }): void;
  }): { abort(): void; onProgressUpdate(callback: (value: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void): void };
  stat(path: string, sha256: boolean): Promise<{ size: number; digest?: string }>;
  remove(path: string): Promise<void>;
}

export function createRasterFileAdapter(platform: RasterFilePlatform, assetUrl: (relative: string) => string): RasterImageAdapter {
  return {
    remove: path => platform.remove(path),
    download: (input, signal, maximumBytes) => new Promise<RasterImageFile>((resolve, reject) => {
      if (signal.aborted) { reject(new MiniappRequestCancelled("superseded")); return; }
      let task: ReturnType<RasterFilePlatform["download"]> | undefined;
      let tooLarge = false;
      let terminal = false;
      const abort = () => task?.abort();
      const cleanup = () => signal.removeEventListener("abort", abort);
      task = platform.download({ url: assetUrl(input.url), timeout: 18_000,
        success(result) {
          terminal = true;
          cleanup();
          if (!result.tempFilePath) { reject(new Error("raster_image_download_missing_file")); return; }
          // Return ownership even after cancellation/integrity failure. The
          // resource owner disposes it and retains failed unlink accounting.
          void platform.stat(result.tempFilePath, Boolean(input.expectedSha256)).then(info => {
            resolve({ path: result.tempFilePath, bytes: info.size,
              ...(input.expectedSha256 && info.digest ? { sha256: info.digest.toLowerCase() } : {}),
              ...(tooLarge || result.statusCode < 200 || result.statusCode >= 300
                ? { integrityError: new Error(tooLarge ? "raster_image_download_too_large" : `raster_image_download_failed:${result.statusCode}`) } : {}) });
          }, () => resolve({ path: result.tempFilePath, bytes: maximumBytes, integrityError: new Error("raster_image_file_stat_failed") }));
        },
        fail(error) {
          terminal = true;
          cleanup(); reject(signal.aborted ? new MiniappRequestCancelled("superseded")
            : new Error(tooLarge ? "raster_image_download_too_large" : error.errMsg || "raster_image_download_failed"));
        },
      });
      task.onProgressUpdate(value => {
        if (value.totalBytesExpectedToWrite > maximumBytes || value.totalBytesWritten > maximumBytes) { tooLarge = true; task?.abort(); }
      });
      if (!terminal) {
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) abort();
      }
    }),
  };
}
