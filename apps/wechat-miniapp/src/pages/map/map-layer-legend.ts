import { NIGHT_LIGHT_FIXED_SCALE, isNightLightDisplayStyle, nightLightDisplayBands, type DisplayMode, type MapLayerData, type NightLightProductBand } from "@starward/miniapp-contracts";

const bandLabels: Record<NightLightProductBand, string> = {
  VERY_LOW: "很低", LOW: "较低", MODERATE: "中等", HIGH: "较高", VERY_HIGH: "很高",
};

export type MapLayerLegendData = Pick<MapLayerData, "kind" | "legend"> & {
  raster?: Pick<NonNullable<MapLayerData["raster"]>, "methodVersion" | "styleVersion" | "unit">;
};

/** Group only the known fixed scale. Legacy and future legends retain their
 * original wording, ranges and units rather than having strings cut blindly. */
export function projectMapLayerLegend(layer: MapLayerLegendData | null | undefined, mode: DisplayMode) {
  const policy = NIGHT_LIGHT_FIXED_SCALE;
  const bands = isNightLightDisplayStyle(layer?.raster?.styleVersion) ? nightLightDisplayBands(layer.raster.styleVersion) : null;
  const fixed = mode === "DAY" && layer?.kind === "LIGHT_POLLUTION" &&
    layer.raster?.methodVersion === policy.methodVersion && bands !== null &&
    layer.raster.unit === policy.unit && layer.legend.length === policy.bands.length &&
    layer.legend.every((item, index) => {
      const band = bands[index]!;
      return item.label === band.label && item.color === band.color && item.range === `${band.range} ${policy.unit}`;
    });
  if (fixed) return {
    heading: `年度夜光 · ${policy.unit}`,
    items: bands!.map(band => ({ color: band.color, text: `${bandLabels[band.id]} · ${band.range}` })),
  };
  return {
    heading: null,
    items: layer?.legend.slice(0, layer.kind === "LIGHT_POLLUTION" ? 5 : 4).map(item => ({ color: item.color,
      text: layer.kind === "LIGHT_POLLUTION" && !layer.raster ? item.label : `${item.label} · ${item.range}` })) ?? [],
  };
}
