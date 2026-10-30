import Taro from "@tarojs/taro";
import { createRasterFileAdapter } from "./raster-file-adapter";
import { createRasterImageResources, type RasterImageFile } from "./raster-image-resources";

export function mapRasterAssetUrl(value: string) {
  const api = __MINIAPP_API_BASE__.replace(/\/+$/u, "");
  // The qualified API metadata owns the public URL; its immutable object key
  // is the original cloud or final EOG static publication route. A public URL
  // cannot fall back to the business host. Keep this string-only for WEAPP.
  const published = /^(https:\/\/((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?::([1-9]\d{0,4}))?)\/v2\/(?:cloud\/assets\/[a-f0-9]{64}\/cloud-[a-f0-9]{64}|night-light\/assets\/[a-z0-9][a-z0-9._-]{2,127}\/nightlight-contrast-v1-window-\d{1,2}-\d{1,4}-\d{1,4}-[1-3]-[1-3]-[a-f0-9]{64}-[a-f0-9]{64})\.png$/u.exec(value);
  if (published) {
    const [, origin, host, port] = published;
    const labels = host!.split(".");
    const apiAuthority = /^https:\/\/([^/?#]+)/iu.exec(api)?.[1]?.toLowerCase().replace(/:443$/u, "");
    if (host!.length > 253 || labels.some(label => label.length > 63)
      || !/[a-z]/u.test(labels[labels.length - 1]!) || host!.endsWith(".local")
      || port === "443" || Number(port ?? 443) > 65535
      || origin!.slice(8) === apiAuthority) throw new Error("map_raster_asset_path_invalid");
    return value;
  }
  if (!/^\/v2\/(?:terrain\/assets\/|night-light\/assets\/[a-z0-9][a-z0-9._-]{2,127}\/)[A-Za-z0-9][A-Za-z0-9.-]*\.png$/u.test(value)) throw new Error("map_raster_asset_path_invalid");
  return api + value;
}

// Preserve the existing eight cached paths, adding a byte bound. The largest
// measured encoded candidate is ~1.24 MB; 16 MiB leaves headroom for eight.
// All three Map consumers share these limits. Two bounded transfers are
// separate from ready-file accounting/native pins; cloud adds no private cache.
export const MAP_RASTER_FILE_LIMITS = { maximumFiles: 8, maximumBytes: 16 * 1024 * 1024, maximumConcurrent: 2 };
// Taro 4.2's declaration predates the current documented WeChat SHA-256
// digest option. Keep this narrow public-API shape until Taro catches up.
interface RasterFileInfoSystem {
  getFileInfo(options: { filePath: string; digestAlgorithm?: "sha256";
    success(info: { size: number; digest?: string }): void; fail(error: unknown): void }): void;
}
const root = () => `${Taro.env.USER_DATA_PATH}/map-raster-v1`;
const session = `${Date.now().toString(36)}_${Math.floor(Math.random() * 0x1_0000_0000).toString(36)}`;
let sequence = 0;
const stat = (filePath: string, hash: boolean): Promise<{ size: number; digest?: string }> => new Promise((resolve, reject) =>
  (Taro.getFileSystemManager() as unknown as RasterFileInfoSystem).getFileInfo({ filePath,
    ...(hash ? { digestAlgorithm: "sha256" as const } : {}),
    success: info => resolve({ size: info.size, ...(info.digest ? { digest: info.digest } : {}) }), fail: reject,
  }));
export const mapRasterFiles = createRasterImageResources(createRasterFileAdapter({
  allocatePath: () => `${root()}/raster-${session}-${++sequence}.png`,
  async recover() {
    const fs = Taro.getFileSystemManager();
    // Listing verifies an existing directory after mkdir reports EEXIST. No
    // file outside this owner's exact namespace is adopted or removed.
    await new Promise<void>(resolve => fs.mkdir({ dirPath: root(), recursive: true,
      success: () => resolve(), fail: () => resolve() }));
    const names = await new Promise<string[]>((resolve, reject) => fs.readdir({ dirPath: root(),
      success: result => resolve(result.files), fail: reject }));
    const files: RasterImageFile[] = [];
    for (const name of names) if (/^raster-[a-z0-9_]+-[1-9]\d*\.png$/u.test(name)) {
      const path = `${root()}/${name}`;
      let bytes = MAP_RASTER_FILE_LIMITS.maximumBytes;
      try { const info = await stat(path, false); if (Number.isSafeInteger(info.size) && info.size >= 0) bytes = info.size; }
      catch { /* Unknown size remains conservatively owned until real unlink. */ }
      files.push({ path, bytes });
    }
    return files;
  },
  download: options => Taro.downloadFile(options),
  stat,
  remove: filePath => new Promise<void>((resolve, reject) => Taro.getFileSystemManager().unlink({ filePath,
    success: () => resolve(), fail: error => /no such file or directory|file not exist/iu.test(error.errMsg)
      ? resolve() : reject(error) })),
}, mapRasterAssetUrl), MAP_RASTER_FILE_LIMITS);
