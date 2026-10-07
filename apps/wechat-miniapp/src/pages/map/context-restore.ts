import type {
  ApiEnvelope,
  ObservationContext,
  ObservationContextResolveRequest,
  MapSceneData,
  SpotId,
} from "@starward/miniapp-contracts";

/** A selected place may still be resolving; keep its already confirmed time reference. */
export function spotSelectionAllowsContextRestore(
  expected: Pick<ObservationContext, "location"> | null,
  selectedSpotId: SpotId | null,
) {
  return !expected || !selectedSpotId ||
    (expected.location.kind === "FORMAL_SPOT" && expected.location.spotId === selectedSpotId);
}

export async function restoreMapBootstrapContext(input: {
  storedContext: ObservationContext | null;
  fallback: ObservationContextResolveRequest;
  restore: (context: ObservationContext, signal?: AbortSignal) => Promise<ApiEnvelope<ObservationContext>>;
  resolve: (request: ObservationContextResolveRequest, signal?: AbortSignal) => Promise<ApiEnvelope<ObservationContext>>;
  shouldFallback: (error: unknown) => boolean;
  retiredContextId?: string | null;
  replaceRetired?: (context: ObservationContext, signal?: AbortSignal) => Promise<ApiEnvelope<ObservationContext>>;
  signal?: AbortSignal;
}) {
  if (!input.storedContext) return input.resolve(input.fallback, input.signal);
  try {
    if (input.retiredContextId && input.storedContext.contextId === input.retiredContextId) {
      if (!input.replaceRetired) throw new Error("retired_context_replacement_unavailable");
      return await input.replaceRetired(input.storedContext, input.signal);
    }
    return await input.restore(input.storedContext, input.signal);
  } catch (error) {
    if ((!input.storedContext.privateProposal && input.storedContext.location.kind !== "FORMAL_SPOT") || !input.shouldFallback(error))
      throw error;
    return input.resolve(input.fallback, input.signal);
  }
}

/** A scene's missing Context is an upstream expiry, not a missing map dataset. */
export function observationSceneNeedsContextRestore(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const failure = error as { code?: unknown; statusCode?: unknown };
  return (failure.code === "NOT_FOUND" && failure.statusCode === 404) ||
    (failure.code === "STALE_REJECTED" && failure.statusCode === 410);
}

export async function retryObservationScene(input: {
  context: ObservationContext | null;
  retryContext: boolean;
  retryScene: boolean;
  sceneFailure: unknown;
  current: () => boolean;
  refreshContext: () => Promise<ApiEnvelope<ObservationContext> | undefined>;
  refreshScene: () => Promise<ApiEnvelope<MapSceneData> | undefined>;
}) {
  if (!input.current()) return { contextChanged: false, result: null };
  if (!input.context || input.retryContext || observationSceneNeedsContextRestore(input.sceneFailure)) {
    const restored = await input.refreshContext();
    // A retired query or failed restoration must not launch the old scene.
    if (!input.current() || !restored || restored.dataState === "STALE_USABLE") return { contextChanged: false, result: null };
    if (!input.context || restored.data.contextId !== input.context.contextId ||
      restored.data.revision !== input.context.revision ||
      restored.data.contextFingerprint !== input.context.contextFingerprint) {
      // The current Context owner installs this response. Its new query key
      // loads the matching scene; this render still addresses the expired ID.
      return { contextChanged: true, result: restored };
    }
  }
  return { contextChanged: false, result: input.retryScene ? await input.refreshScene() : null };
}
