import { mercatorY, type RasterBounds } from "@starward/coordinate-system";

function cropPercent(published: RasterBounds, requested: RasterBounds, northing: (latitude: number) => number) {
  const requestedWidth = requested.east - requested.west;
  const requestedTop = northing(requested.north), requestedHeight = northing(requested.south) - requestedTop;
  if (!(requestedWidth > 0 && requestedHeight > 0)) throw new Error("invalid_raster_viewport");
  return {
    width: (published.east - published.west) / requestedWidth * 100,
    height: (northing(published.south) - northing(published.north)) / requestedHeight * 100,
    left: (published.west - requested.west) / requestedWidth * 100,
    top: (northing(published.north) - requestedTop) / requestedHeight * 100,
  };
}

/** Existing radius DEM images are linear in latitude. Fixed night-light
 * pixels are GCJ Mercator; their vertical crop must use that same projection. */
export const latitudeRasterCropPercent = (published: RasterBounds, requested: RasterBounds) => cropPercent(published, requested, latitude => -latitude);
export const mercatorRasterCropPercent = (published: RasterBounds, requested: RasterBounds) => cropPercent(published, requested, mercatorY);
