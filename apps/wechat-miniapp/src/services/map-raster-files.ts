import Taro from "@tarojs/taro";
import { createRasterFileAdapter } from "./raster-file-adapter";
import { createRasterImageResources } from "./raster-image-resources";

export function mapRasterAssetUrl(relative: string) {
  if (!/^\/v2\/(?:terrain\/assets\/|night-light\/assets\/[a-z0-9][a-z0-9._-]{2,127}\/)[A-Za-z0-9][A-Za-z0-9.-]*\.png$/u.test(relative)) throw new Error("map_raster_asset_path_invalid");
  return __MINIAPP_API_BASE__.replace(/\/+$/u, "") + relative;
}

// Preserve the existing eight cached paths, adding a byte bound. The largest
// measured encoded candidate is ~1.24 MB; 16 MiB leaves headroom for eight.
// Two bounded transfers are separate from ready-file accounting/native pins.
export const MAP_RASTER_FILE_LIMITS = { maximumFiles: 8, maximumBytes: 16 * 1024 * 1024, maximumConcurrent: 2 };
// Taro 4.2's declaration predates the current documented WeChat SHA-256
// digest option. Keep this narrow public-API shape until Taro catches up.
interface RasterFileInfoSystem {
  getFileInfo(options: { filePath: string; digestAlgorithm?: "sha256";
    success(info: { size: number; digest?: string }): void; fail(error: unknown): void }): void;
}
export const mapRasterFiles = createRasterImageResources(createRasterFileAdapter({
  download: options => Taro.downloadFile(options),
  stat: (filePath, hash) => new Promise((resolve, reject) => (Taro.getFileSystemManager() as unknown as RasterFileInfoSystem).getFileInfo({
    filePath, ...(hash ? { digestAlgorithm: "sha256" as const } : {}),
    success: info => resolve({ size: info.size, ...(info.digest ? { digest: info.digest } : {}) }), fail: reject,
  })),
  remove: filePath => new Promise<void>((resolve, reject) => Taro.getFileSystemManager().unlink({ filePath,
    success: () => resolve(), fail: error => /no such file or directory|file not exist/iu.test(error.errMsg)
      ? resolve() : reject(error) })),
}, mapRasterAssetUrl), MAP_RASTER_FILE_LIMITS);
