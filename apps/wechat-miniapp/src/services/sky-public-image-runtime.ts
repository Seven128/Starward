import Taro from "@tarojs/taro";
import { skyPublishedResourceOrigin, skyResourceEnvironmentIdentity } from "./sky-resource-origin";
import { skyImageContentHash } from "@starward/miniapp-contracts";
import type { SkyPublicImageAcquisition, SkyPublicImageDemand } from "./sky-public-image-cache";
import type { SkyEncodedImage } from "./sky-image-bytes";
import type { SkyEncodedJson } from "./sky-public-file-bytes";
import { skyPublicImageOwner as owner, observeSkyPublicImageClear } from "./sky-public-image-owner";
export type { SkyPublicImageDemand } from "./sky-public-image-cache";
export { initializeSkyPublicImageCache, clearSkyPublicImageCache } from "./sky-public-image-owner";

/** The caller has already validated its publication manifest. Only immutable
 * public image routes from that same configured environment enter this cache. */
export function acquirePublishedSkyImage(asset: SkyEncodedImage, url: string, publicationHash: string): SkyPublicImageAcquisition {
  const base = skyPublishedResourceOrigin();
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
  const environment = skyImageContentHash(Uint8Array.from(skyResourceEnvironmentIdentity(), c => c.charCodeAt(0)));
  return owner().acquire({ ...asset, environment, url });
}

/** Validated SAO/landscape publications supply identity/byte bounds. This is the same owner,
 * directory, byte budget and native transfer queue as images, not a JSON store. */
export function acquirePublishedSkyJson(asset: SkyEncodedJson, url: string, publicationHash: string): SkyPublicImageAcquisition {
  const base = skyPublishedResourceOrigin();
  const route = /^\/v2\/sky\/supplements\/sao\/v2\/([a-f0-9]{64})\/assets\/\d{2}-\d{2}-(?:7|8|9|10)-\d{1,3}$/;
  const landscape = /^\/v2\/sky\/landscape\/([a-f0-9]{64})\/panorama-(?:1024|2048)\.alpha-rle\.json$/;
  const resourcePath = url.slice(base.length);
  if (!/^[a-f0-9]{64}$/.test(publicationHash) || !/^(?:https?:\/\/)[A-Za-z0-9.:_-]+$/.test(base) ||
    !url.startsWith(base + "/v2/sky/") || (route.exec(resourcePath)?.[1] ?? landscape.exec(resourcePath)?.[1]) !== publicationHash ||
    asset.format !== "json" || asset.bytes > 192 * 1024) throw new Error("sky_public_json_route_invalid");
  const environment = skyImageContentHash(Uint8Array.from(skyResourceEnvironmentIdentity(), c => c.charCodeAt(0)));
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

/** A delivered immutable manifest carries a generation stamp, with no file
 * lease or listener whose release could invalidate another observer. */
export function capturePublishedSkyImageGeneration(): { readonly isCurrent: () => boolean } {
  const cacheOwner = owner(), epoch = cacheOwner.inspect().epoch;
  return { isCurrent: () => cacheOwner.inspect().epoch === epoch };
}

/** A descriptor and its later encoded acquisition share the clear fence. */
export function beginPublishedSkyImageDemand(): SkyPublicImageDemand {
  const cacheOwner = owner(), epoch = cacheOwner.inspect().epoch;
  let released = false;
  const listeners = new Set<() => void>();
  const isCurrent = () => !released && cacheOwner.inspect().epoch === epoch;
  return { isCurrent, onRetire(handler) {
    if (!isCurrent()) { handler(); return () => {}; }
    const unsubscribe = observeSkyPublicImageClear(handler);
    listeners.add(unsubscribe);
    return () => { listeners.delete(unsubscribe); unsubscribe(); };
  }, release() {
    if (released) return; released = true;
    for (const unsubscribe of listeners) unsubscribe(); listeners.clear();
  } };
}
