export function traceNightReportEntities(input: { reportId: string; entityVersions: Record<string, number> }) {
  const entityMap: Record<string, string> = {
    preset: "PreferenceProfile", spot: "Spot", weatherRun: "ProviderRun", astronomyRun: "AstronomyWindow", route: "RouteSnapshot", recommendation: "RecommendationSnapshot", fieldReport: "FieldReport",
  };
  const links = Object.entries(input.entityVersions).map(([key, version]) => ({ type: entityMap[key], version, source: key, timezone: "Asia/Shanghai", coordinateSystem: "WGS84" }));
  return { reportId: input.reportId, entityTypes: ["NightReport", ...links.map((item) => item.type)], links, rawInputsImmutable: true };
}
