import type { SkyPublicImageDemand } from "./sky-public-image-cache";
export type { SkyPublicImageDemand } from "./sky-public-image-cache";
import Taro from "@tarojs/taro";
import { skyImageContentHash } from "@starward/miniapp-contracts";
import { createSkyPublicImageCache, type SkyPublicImageAcquisition, type SkyPublicImageFileSystem } from "./sky-public-image-cache";
import type { SkyEncodedImage } from "./sky-image-bytes";
import type { SkyEncodedJson } from "./sky-public-file-bytes";

// Initial encoded-file policy: two copies of the measured current 13.57 MiB
// library plus its 3.16 MiB largest-write headroom fit 32 MiB. Staging counts
// inside this limit. This is not the 200 MiB whole-app limit or a GPU budget.
const ENCODED_BYTE_BUDGET = 32 * 1024 * 1024;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
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
      success: result => result.data instanceof ArrayBuffer ? resolve(result.data) : reject(new Error("sky_public_image_read_invalid")), fail: reject })),
    write: (filePath, data) => new Promise((resolve, reject) => fs.writeFile({ filePath, data, success: () => resolve(), fail: reject })),
    rename: (oldPath, newPath) => new Promise((resolve, reject) => fs.rename({ oldPath, newPath, success: () => resolve(), fail: reject })),
    remove: filePath => new Promise((resolve, reject) => fs.unlink({ filePath, success: () => resolve(),
      fail: cause => missing(cause) ? resolve() : reject(cause) })),
  };
}
function owner() {
  return cache ??= createSkyPublicImageCache({
    fs: fileSystem(), root: `${Taro.env.USER_DATA_PATH}/sky-public-images-v1`,
    byteBudget: ENCODED_BYTE_BUDGET, maxFileBytes: MAX_FILE_BYTES,
    session: `${Date.now().toString(36)}_${Math.floor(Math.random() * 0x1_0000_0000).toString(36)}`,
    transfer(asset) {
      let task: ReturnType<typeof Taro.request> | undefined;
      let settled = false;
      const promise = new Promise<ArrayBuffer>((resolve, no) => {
        task = Taro.request<ArrayBuffer>({ url: asset.url, responseType: "arraybuffer", timeout: 15_000,
          ...(typeof __MINIAPP_OPERATOR_PREVIEW_TOKEN__ !== "undefined" && __MINIAPP_OPERATOR_PREVIEW_TOKEN__ ?
            { header: { "X-Starward-Operator-Preview": __MINIAPP_OPERATOR_PREVIEW_TOKEN__ } } : {}),
          success(result) {
            if (settled) return; settled = true;
            if (result.statusCode === 200 && result.data instanceof ArrayBuffer) resolve(result.data);
            else no(new Error("sky_public_image_response_invalid"));
          }, fail() { if (!settled) { settled = true; no(new Error("sky_public_image_request_failed")); } } });
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

/** The caller has already validated its publication manifest. Only immutable
 * public image routes from that same configured environment enter this cache. */
export function acquirePublishedSkyImage(asset: SkyEncodedImage, url: string, publicationHash: string): SkyPublicImageAcquisition {
  const base = __MINIAPP_API_BASE__.replace(/\/+$/, "");
  if (!/^[a-f0-9]{64}$/.test(publicationHash) || !/^(?:https?:\/\/)[A-Za-z0-9.:_-]+$/.test(base) ||
    !url.startsWith(`${base}/v2/sky/`)) throw new Error("sky_public_image_route_invalid");
  const path = url.slice(base.length);
  const route = /^\/v2\/sky\/(constellations|moon|mercury|mars|jupiter|saturn|uranus|neptune|galactic|landscape|wide-field|sdss-optical)\/([a-f0-9]{64})\/[A-Za-z0-9/_-]+\.(?:png|jpg)$/;
  const match = route.exec(path);
  // Current Moon uses /moon/coverage/{hash}/... rather than /moon/{hash}/... .
  const coverage = /^\/v2\/sky\/moon\/coverage\/([a-f0-9]{64})\/[A-Za-z0-9_-]+\.png$/.exec(path);
  const selected = /^\/v2\/sky\/deep-sky\/([a-f0-9]{64})\/(M-(?:[1-9]|[1-9][0-9]|10[0-9]|110))\/\2-(?:overview|medium|detail)(?:\.([a-f0-9]{64})\.png|\.jpg)$/.exec(path);
  const prepared = /^\/v2\/sky\/prepared-optical\/([a-f0-9]{64})\/(?:M-(?:[1-9]|[1-9][0-9]|10[0-9]|110)-(?:overview|medium|detail)\.png|[a-z0-9]+(?:-[a-z0-9]+)*-(?:overview|medium|detail)\.(?:png|jpg))$/.exec(path);
  // The validated LOCAL HiPS subset uses the same encoded owner. Ordinary
  // builds cannot admit trial routes; native hide still releases its decode.
  const optical = typeof __MINIAPP_DEVELOPMENT_FIXTURE_MODE__ !== "undefined" && __MINIAPP_DEVELOPMENT_FIXTURE_MODE__
    ? /^\/v2\/sky\/optical\/([a-f0-9]{64})\/([a-z0-9-]{1,40})\/(0|[1-9]|10|11)\/(0|[1-9]\d*)$/.exec(path) : null;
  if ((match?.[2] ?? coverage?.[1] ?? selected?.[1] ?? prepared?.[1] ?? optical?.[1]) !== publicationHash || path.includes("//") ||
    (optical && (Number(optical[4]) >= 12 * 4 ** Number(optical[3]) || asset.width !== 512 || asset.height !== 512 ||
      (asset.format !== "jpeg" && asset.format !== "png"))) ||
    (selected?.[3] !== undefined && selected[3] !== asset.sha256)) throw new Error("sky_public_image_route_invalid");
  const environment = skyImageContentHash(Uint8Array.from(base, c => c.charCodeAt(0)));
  return owner().acquire({ ...asset, environment, url });
}

/** Validated SAO/landscape publications supply identity/byte bounds. This is the same owner,
 * directory, byte budget and native transfer queue as images, not a JSON store. */
export function acquirePublishedSkyJson(asset: SkyEncodedJson, url: string, publicationHash: string): SkyPublicImageAcquisition {
  const base = __MINIAPP_API_BASE__.replace(/\/+$/, "");
  const route = /^\/v2\/sky\/supplements\/sao\/v2\/([a-f0-9]{64})\/assets\/\d{2}-\d{2}-(?:7|8|9|10)-\d{1,3}$/;
  const landscape = /^\/v2\/sky\/landscape\/([a-f0-9]{64})\/panorama-(?:1024|2048)\.alpha-rle\.json$/;
  const resourcePath = url.slice(base.length);
  if (!/^[a-f0-9]{64}$/.test(publicationHash) || !/^(?:https?:\/\/)[A-Za-z0-9.:_-]+$/.test(base) ||
    !url.startsWith(base + "/v2/sky/") || (route.exec(resourcePath)?.[1] ?? landscape.exec(resourcePath)?.[1]) !== publicationHash ||
    asset.format !== "json" || asset.bytes > 192 * 1024) throw new Error("sky_public_json_route_invalid");
  const environment = skyImageContentHash(Uint8Array.from(base, c => c.charCodeAt(0)));
  return owner().acquire({ ...asset, environment, url });
}

/** Native UTF-8 decoding avoids a browser TextDecoder requirement. A cancelled
 * reader rejects immediately but holds its file lease until the actual native
 * read callback settles, preventing clear from unlinking an active read. */
export function readPublishedSkyJson(asset: SkyEncodedJson, url: string, publicationHash: string, signal?: AbortSignal): Promise<unknown> {
  signal?.throwIfAborted();
  const acquisition = acquirePublishedSkyJson(asset, url, publicationHash);
  return new Promise((resolve, reject) => {
    let settled = false, reading = false;
    const fail = (cause: unknown) => {
      if (settled) return; settled = true; signal?.removeEventListener("abort", onAbort); reject(cause);
    };
    const onAbort = () => { if (!reading) acquisition.cancel(); fail(new Error("sky_public_json_cancelled")); };
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
    void acquisition.promise.then(lease => {
      if (settled || !lease.isCurrent()) { lease.release(); fail(new Error("sky_public_json_cancelled")); return; }
      const unsubscribe = lease.onRetire(() => fail(new Error("sky_public_json_cancelled")));
      if (settled) { unsubscribe(); lease.release(); return; }
      const finish = () => { unsubscribe(); lease.release(); signal?.removeEventListener("abort", onAbort); };
      reading = true;
      try { Taro.getFileSystemManager().readFile({ filePath: lease.filePath, encoding: "utf8",
        success(result) {
          try {
            if (settled) return;
            if (!lease.isCurrent() || signal?.aborted || typeof result.data !== "string") throw new Error("sky_public_json_cancelled");
            // Revalidate these exact read bytes too; a post-acquisition disk
            // change must not evade the core's earlier hash verification.
            const escaped = encodeURIComponent(result.data), bytes = new Uint8Array(escaped.length); let length = 0;
            for (let i = 0; i < escaped.length; i++) {
              if (escaped[i] === "%") { bytes[length++] = Number.parseInt(escaped.slice(i + 1, i + 3), 16); i += 2; }
              else bytes[length++] = escaped.charCodeAt(i);
            }
            if (length !== asset.bytes || skyImageContentHash(bytes.subarray(0, length)) !== asset.sha256) throw new Error("sky_public_json_read_integrity");
            const value: unknown = JSON.parse(result.data);
            settled = true; resolve(value);
          } catch (cause) { fail(cause); } finally { finish(); }
        }, fail(cause) { fail(cause); finish(); } });
      } catch (cause) { fail(cause); finish(); }
    }, fail);
  });
}

export const initializeSkyPublicImageCache = () => owner().ready();
/** A cached immutable manifest keeps its originating file-cache generation.
 * It owns no listener or releaseable file/demand, so one observer's cleanup
 * cannot invalidate another observer of the same query result. */
export function capturePublishedSkyImageGeneration(): { readonly isCurrent: () => boolean } {
  const cacheOwner = owner(), epoch = cacheOwner.inspect().epoch;
  return { isCurrent: () => cacheOwner.inspect().epoch === epoch };
}
/** A descriptor request must survive the same epoch fence as its subsequent
 * encoded acquisition, including the microtask gap before bytes are requested. */
export function beginPublishedSkyImageDemand(): SkyPublicImageDemand {
  const cacheOwner = owner(), epoch = cacheOwner.inspect().epoch;
  let released = false;
  const listeners = new Set<() => void>();
  const isCurrent = () => !released && cacheOwner.inspect().epoch === epoch;
  return { isCurrent, onRetire(handler) {
    if (!isCurrent()) { handler(); return () => {}; }
    const listener = () => handler();
    listeners.add(listener); pendingDemands.add(listener);
    return () => { listeners.delete(listener); pendingDemands.delete(listener); };
  }, release() {
    if (released) return; released = true;
    for (const handler of listeners) pendingDemands.delete(handler); listeners.clear();
  } };
}
export const clearSkyPublicImageCache = () => {
  // Core fences every entry/waiter first. Metadata cancellation cannot interrupt
  // independent entry retirement or fabricate settlement of native image I/O.
  const clearing = owner().clear();
  const retired = [...pendingDemands]; pendingDemands.clear();
  for (const handler of retired) { try { handler(); } catch { /* Other demands still retire. */ } }
  return clearing;
};
