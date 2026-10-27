const fileCodes = new Set([
  "raster_image_download_missing_file", "raster_image_download_too_large", "raster_image_download_failed",
  "raster_image_file_stat_failed", "raster_image_file_invalid", "raster_image_size_mismatch",
  "raster_image_hash_mismatch", "raster_image_file_path_conflict", "raster_image_budget_busy",
  "raster_image_resources_closed", "raster_image_descriptor_invalid", "raster_image_identity_conflict",
  "raster_image_file_not_owned", "map_raster_asset_path_invalid",
]);

/** Only fixed codes and numeric HTTP status cross the diagnostic boundary.
 * Native messages, image URLs, file paths and location-bearing keys stay out. */
export function rasterImageDiagnostic(error: unknown, url: string | null) {
  let message: unknown;
  try { message = (error as { message?: unknown } | null)?.message; } catch { /* Native getter. */ }
  const http = typeof message === "string" && /^raster_image_download_failed:([1-5]\d{2})$/.exec(message);
  const code = http ? "raster_image_download_failed"
    : typeof message === "string" && fileCodes.has(message) ? message : "raster_image_read_failed";
  const stage = code === "raster_image_file_stat_failed" ? "file_stat"
    : code.startsWith("raster_image_download_") ? "download"
      : ["raster_image_file_invalid", "raster_image_size_mismatch", "raster_image_hash_mismatch"].includes(code)
        ? "file_admission" : "file_owner";
  const resource = url?.startsWith("/v2/terrain/assets/") ? "terrain"
    : url?.startsWith("/v2/night-light/assets/") ? "night_light" : "map_raster";
  return { code, stage, resource, ...(http ? { status: Number(http[1]) } : {}) };
}
