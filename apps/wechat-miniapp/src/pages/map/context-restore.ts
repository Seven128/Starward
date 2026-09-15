import type {
  ApiEnvelope,
  ObservationContext,
  ObservationContextResolveRequest,
} from "@starward/miniapp-contracts";

export async function restoreMapBootstrapContext(input: {
  storedContext: ObservationContext | null;
  fallback: ObservationContextResolveRequest;
  restore: (context: ObservationContext, signal?: AbortSignal) => Promise<ApiEnvelope<ObservationContext>>;
  resolve: (request: ObservationContextResolveRequest, signal?: AbortSignal) => Promise<ApiEnvelope<ObservationContext>>;
  shouldFallback: (error: unknown) => boolean;
  signal?: AbortSignal;
}) {
  if (!input.storedContext) return input.resolve(input.fallback, input.signal);
  try {
    return await input.restore(input.storedContext, input.signal);
  } catch (error) {
    if (input.storedContext.location.kind !== "FORMAL_SPOT" || !input.shouldFallback(error))
      throw error;
    return input.resolve(input.fallback, input.signal);
  }
}
