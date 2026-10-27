import Taro from "@tarojs/taro";
import { createRasterFileAdapter } from "./raster-file-adapter";
import { createRasterImageResources, type RasterImageFile } from "./raster-image-resources";

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
