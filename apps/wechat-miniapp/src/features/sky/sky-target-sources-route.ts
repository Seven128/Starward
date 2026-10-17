import type { ObservationContext, SkyTarget } from "@starward/miniapp-contracts";
import type { SkyTargetInstantBinding } from "@/services/sky-target-instant-response";

export interface SkyTargetSourceSelection extends SkyTargetInstantBinding {
  dataRevision: string;
  targetId: string;
  sourceId: string;
}

/** Report targets are events or directions too. Keep their report identity;
 * never turn them into a catalogue reference just to open a Sources page. */
export function skyTargetSourcesRoute(context: ObservationContext, spotId: string, dataRevision: string,
  at: string, target: Pick<SkyTarget, "targetId" | "source">) {
  const params = { targetSources: "1", spotId, contextId: context.contextId,
    contextRevision: String(context.revision), contextFingerprint: context.contextFingerprint,
    dataRevision, at, targetId: target.targetId, sourceId: target.source.id };
  return "/sky/sources/index?" + Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");
}

export function parseSkyTargetSourceSelection(params: Record<string, unknown>): SkyTargetSourceSelection | null {
  const read = (key: string) => {
    try { return typeof params[key] === "string" ? decodeURIComponent(params[key] as string) : ""; }
    catch { return ""; }
  };
  const spotId = read("spotId"), contextId = read("contextId"), at = read("at");
  const contextRevision = Number(read("contextRevision")), contextFingerprint = read("contextFingerprint");
  const dataRevision = read("dataRevision"), targetId = read("targetId"), sourceId = read("sourceId");
  if (read("targetSources") !== "1" || !/^(?:spot|contribution):[^\s]+$/u.test(spotId) || !/^ctx:[^\s]+$/u.test(contextId) ||
    !Number.isSafeInteger(contextRevision) || contextRevision < 1 || !contextFingerprint || contextFingerprint.length > 256 ||
    !dataRevision || dataRevision.length > 256 || !targetId || /\s/u.test(targetId) || targetId.length > 256 ||
    !sourceId || sourceId.length > 512 || !Number.isFinite(Date.parse(at)) ||
    ["reference", "imagePublicationHash", "opticalPublicationHash", "preparedPublicationHash", "bodyImagePublicationHash", "hipsPublicationHash", "hipsSourceIds"]
      .some(key => params[key] !== undefined)) return null;
  return { spotId, contextId: contextId as SkyTargetInstantBinding["contextId"], contextRevision,
    contextFingerprint, dataRevision, at, targetId, sourceId };
}

export function skyTargetSourceContextMatches(selection: SkyTargetSourceSelection, context: ObservationContext | null): boolean {
  return Boolean(context && context.contextId === selection.contextId && context.revision === selection.contextRevision &&
    context.contextFingerprint === selection.contextFingerprint &&
    (context.location.kind === "FORMAL_SPOT" ? context.location.spotId === selection.spotId : selection.spotId.startsWith("contribution:")));
}
