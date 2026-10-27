import Taro from "@tarojs/taro";
import { skyResourcePreviewHeaders } from "./sky-resource-preview";
import { createSkyPublicImageCache, type SkyPublicImageFileSystem } from "./sky-public-image-cache";
import { skyNativeArrayBuffer } from "./sky-native-array-buffer";
import { reportSkyImageError } from "./sky-image-diagnostics";

// Keep the existing 32 MiB encoded budget, including staging and retired leases.
// A fixed, qualified 10,374,947-byte PNG exceeds the former 8 MiB per-file cap.
// Admit up to 16 MiB while keeping the previous 2 x 8 MiB maximum sum of active
// encoded I/O; large files therefore queue instead of doubling that envelope.
// These are logical file/I/O policies, not whole-app, native or GPU memory limits.
const ENCODED_BYTE_BUDGET = 32 * 1024 * 1024;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const IO_BYTE_BUDGET = 16 * 1024 * 1024;
let cache: ReturnType<typeof createSkyPublicImageCache> | undefined;
const pendingDemands = new Set<() => void>();

const missing = (cause: { errMsg?: string }) => /no such file or directory/i.test(cause.errMsg ?? "");

function fileSystem(): SkyPublicImageFileSystem {
  const fs = Taro.getFileSystemManager();
  return {
    mkdir: dirPath => new Promise((resolve, reject) => fs.mkdir({ dirPath, recursive: true, success: () => resolve(), fail: reject })),
    list: dirPath => new Promise((resolve, reject) => fs.readdir({ dirPath, success: result => resolve(result.files), fail: reject })),
    size: path => new Promise((resolve, reject) => fs.stat({ path, recursive: false,
      success: result => {
        const stats = result.stats as Taro.Stats;
        if (!stats.isFile() || !Number.isSafeInteger(stats.size) || stats.size < 0) reject(new Error("sky_public_image_stat_invalid"));
        else resolve(stats.size);
      }, fail: reject })),
    read: (filePath, length) => new Promise((resolve, reject) => fs.readFile({ filePath, position: 0, length,
      success: result => {
        const data = skyNativeArrayBuffer(result.data);
        if (data) resolve(data); else reject(new Error("sky_public_image_read_invalid"));
      }, fail: reject })),
    write: (filePath, data) => new Promise((resolve, reject) => fs.writeFile({ filePath, data, success: () => resolve(), fail: reject })),
    rename: (oldPath, newPath) => new Promise((resolve, reject) => fs.rename({ oldPath, newPath, success: () => resolve(), fail: reject })),
    remove: filePath => new Promise((resolve, reject) => fs.unlink({ filePath, success: () => resolve(),
      fail: cause => missing(cause) ? resolve() : reject(cause) })),
  };
}
export function skyPublicImageOwner() {
  return cache ??= createSkyPublicImageCache({
    fs: fileSystem(), root: `${Taro.env.USER_DATA_PATH}/sky-public-images-v1`,
    byteBudget: ENCODED_BYTE_BUDGET, maxFileBytes: MAX_FILE_BYTES, ioByteBudget: IO_BYTE_BUDGET,
    session: `${Date.now().toString(36)}_${Math.floor(Math.random() * 0x1_0000_0000).toString(36)}`,
    transfer(asset) {
      let task: ReturnType<typeof Taro.request> | undefined;
      let settled = false;
      const promise = new Promise<ArrayBuffer>((resolve, no) => {
        task = Taro.request<ArrayBuffer>({ url: asset.url, responseType: "arraybuffer", timeout: 15_000,
          ...skyResourcePreviewHeaders(asset.url),
          success(result) {
            if (settled) return; settled = true;
            const data = skyNativeArrayBuffer(result.data);
            if (result.statusCode === 200 && data) resolve(data);
            else no(new Error(result.statusCode === 200 ? "sky_public_image_response_invalid" : `sky_image_http_${result.statusCode}`));
          }, fail(cause) {
            if (!settled) { settled = true; no(Object.assign(new Error("sky_public_image_request_failed"), { cause })); }
          } });
        task.catch?.(() => undefined);
      });
      return { promise, cancel() {
        if (settled) return;
        // The core rejects cancelled consumers immediately. Only an actual
        // native success/fail callback completes this transport and releases
        // its I/O slot; a failed abort must not fabricate native completion.
        task?.abort();
      } };
    },
  });
}

export const initializeSkyPublicImageCache = () => skyPublicImageOwner().ready();
/** Each metadata demand owns an independent subscription to the same clear.
 * No native file lease is retired through this subscription. */
export function observeSkyPublicImageClear(handler: () => void): () => void {
  const listener = () => handler();
  pendingDemands.add(listener);
  return () => { pendingDemands.delete(listener); };
}
export const clearSkyPublicImageCache = () => {
  // Core fences every entry/waiter first. Metadata cancellation cannot interrupt
  // independent entry retirement or fabricate settlement of native image I/O.
  const clearing = skyPublicImageOwner().clear();
  const retired = [...pendingDemands]; pendingDemands.clear();
  for (const handler of retired) {
    try { handler(); } catch (cause) { reportSkyImageError("load", "encoded-cache:demand_retire", cause); }
  }
  return clearing;
};
