import type { RasterImageAdapter, RasterImageFile } from "./raster-image-resources";
import { MiniappRequestCancelled } from "./request-lifecycle";

export interface RasterFilePlatform {
  /** Unique writable user-file destination, never a download temp path. */
  allocatePath(): string;
  recover(): Promise<RasterImageFile[]>;
  download(options: { url: string; filePath: string; timeout: number;
    success(result: { statusCode: number; tempFilePath?: string; filePath?: string }): void;
    fail(error: { errMsg: string; errno?: number; errCode?: number }): void;
  }): { abort(): void; onProgressUpdate(callback: (value: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void): void;
    catch?(rejected: (error: unknown) => void): unknown };
  stat(path: string, sha256: boolean): Promise<{ size: number; digest?: string }>;
  remove(path: string): Promise<void>;
}

export function createRasterFileAdapter(platform: RasterFilePlatform, assetUrl: (relative: string) => string): RasterImageAdapter {
  return {
    recover: () => platform.recover(),
    remove: path => platform.remove(path),
    download: (input, signal, maximumBytes) => new Promise<RasterImageFile>((resolve, reject) => {
      if (signal.aborted) { reject(new MiniappRequestCancelled("superseded")); return; }
      let task: ReturnType<RasterFilePlatform["download"]> | undefined;
      let tooLarge = false;
      let terminal = false;
      const url = assetUrl(input.url);
      const filePath = platform.allocatePath();
      const abort = () => task?.abort();
      const cleanup = () => signal.removeEventListener("abort", abort);
      const finish = (integrityError?: Error) => {
        if (terminal) return;
        terminal = true; cleanup();
        // Even a failed/aborted native transfer may have written a partial
        // destination. Its known path returns to the same accounting owner.
        void platform.stat(filePath, !integrityError && Boolean(input.expectedSha256)).then(info => {
          resolve({ path: filePath, bytes: info.size,
            ...(input.expectedSha256 && info.digest ? { sha256: info.digest.toLowerCase() } : {}),
            ...(integrityError ? { integrityError } : {}) });
        }, cause => {
          const failure = integrityError ?? new Error("raster_image_file_stat_failed");
          // Preserve the transport/HTTP failure as primary. Stat can still
          // provide its numeric cause when there is no native transfer cause.
          if (failure.cause === undefined) failure.cause = cause;
          resolve({ path: filePath, bytes: maximumBytes, integrityError: failure });
        });
      };
      try { task = platform.download({ url, filePath, timeout: 18_000,
        success(result) {
          // Keep the first known response failure even if native file access
          // also fails. A returned path still belongs to the resource owner.
          const integrityCode = result.statusCode < 200 || result.statusCode >= 300
            ? `raster_image_download_failed:${result.statusCode}`
            : tooLarge ? "raster_image_download_too_large" : null;
          finish(integrityCode ? new Error(integrityCode) : undefined);
        },
        fail(error) {
          finish(signal.aborted ? new MiniappRequestCancelled("superseded")
            : new Error(tooLarge ? "raster_image_download_too_large" : "raster_image_download_failed", { cause: error }));
        },
      }); } catch (cause) { finish(new Error("raster_image_download_failed", { cause })); return; }
      // Taro exposes the callback task as a Promise too. The callbacks above
      // own settlement and cancellation; consume the duplicate rejection so
      // a normal abort cannot reach the global unhandled-error feedback.
      task.catch?.(() => undefined);
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
