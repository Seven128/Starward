import type { ApiEnvelope, ObservationContext, SkyReport, SkyTimeModel, SourceSummary } from "@starward/miniapp-contracts";
import type { ConfirmedObservationContextReply } from "../../services/observation-context-recovery";
import type { ForecastPresentation } from "../../services/forecast-presentation";
import { sameContextVersion } from "../../services/observation-context-version";
import { presentSkyTime, skyPresentationTimeModel } from "./sky-time-presentation";

export function skyReportMatchesContext(data: SkyReport | undefined, context: ObservationContext | null,
  spotId: string): boolean {
  return Boolean(data && context && data.context.contextId === context.contextId &&
    data.context.contextFingerprint === context.contextFingerprint && data.context.contextRevision === context.revision &&
    data.context.spotId === spotId && data.context.localDate === context.localDate && data.context.timezone === context.timezone);
}

/** One page's confirmed time edit may reuse its admitted source while the new
 * query is pending. Keep the original receipt/Context and provider times: this
 * is presentation continuity, never a new API report or a Query-cache write. */
export function createSkyTimeCommitContinuity(presentation: ForecastPresentation<SkyReport>, now: () => number = Date.now) {
  let entry: { target: ObservationContext; source: ApiEnvelope<SkyReport>; spotId: string;
    boundaries: readonly number[]; elapsed: number; projected: ApiEnvelope<SkyReport>; model: SkyTimeModel | null;
    sources: readonly SourceSummary[] | undefined } | null = null;
  return {
    clear() { entry = null; },
    model() { return entry?.model ?? null; },
    sources() { return entry?.sources; },
    stage(from: ObservationContext, response: ConfirmedObservationContextReply, source: ApiEnvelope<SkyReport> | undefined,
      spotId: string, requestedAt: string, suppliedModel?: SkyTimeModel | null, geometrySources?: readonly SourceSummary[]) {
      entry = null;
      if (!source || from.schemaVersion !== "observation-context-v2" ||
        ["EXPIRED", "UNAVAILABLE"].includes(source.dataState) || !skyReportMatchesContext(source.data, from, spotId) ||
        Date.parse(source.data.context.at) !== Date.parse(from.selectedAtUtc) ||
        response.dataState !== "FRESH" || response.data.contextId !== from.contextId || response.data.revision <= from.revision ||
        Date.parse(response.data.selectedAtUtc) !== Date.parse(requestedAt) || response.data.timezone !== from.timezone ||
        !presentSkyTime(source.data, response.data.selectedAtUtc, suppliedModel)) return false;
      entry = { target: response.data, source, spotId, boundaries: presentation.boundaries(source.data),
        elapsed: -1, projected: source, model: suppliedModel ?? skyPresentationTimeModel(source.data), sources: geometrySources };
      return true;
    },
    read(context: ObservationContext | null, spotId: string, allowed: boolean,
      query: { data: ApiEnvelope<SkyReport> | undefined; pending: boolean; failed: boolean }): ApiEnvelope<SkyReport> | undefined {
      if (!entry) return undefined;
      // Any real reply, failure, expiry or ownership change ends the transfer.
      // A later A-to-B-to-A selection cannot revive the discarded entry.
      if (!allowed || query.data || query.failed || !query.pending || !context ||
        !sameContextVersion(entry.target, context) || spotId !== entry.spotId ||
        Date.parse(context.expiresAt) <= now()) { entry = null; return undefined; }
      const elapsed = entry.boundaries.filter(boundary => boundary <= now()).length;
      if (elapsed !== entry.elapsed) {
        entry.elapsed = elapsed;
        const data = presentation.project(entry.source.data, now());
        entry.projected = data === entry.source.data ? entry.source : { ...entry.source, data,
          dataState: entry.source.dataState === "FRESH" ? "PARTIAL" : entry.source.dataState };
      }
      return entry.projected;
    },
  };
}
