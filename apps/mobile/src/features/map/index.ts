export type MapSelectionRole = "primary" | "backup";

export function createMapSelectionContext(input: {
  spotId: string;
  role: MapSelectionRole;
  nightDate: string;
  profileId: string;
  routeMode: "drive" | "walk" | "cycle" | "transit";
  revision: number;
}) {
  if (!input.spotId || !/^\d{4}-\d{2}-\d{2}$/u.test(input.nightDate)) throw new Error("map_selection_context_invalid");
  return { ...input, coordinateAuthority: "WGS84" as const, dependentDataState: "stale" as const, nextRevision: input.revision + 1 };
}
