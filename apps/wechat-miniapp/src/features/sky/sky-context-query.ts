import type { ObservationContext } from "@starward/miniapp-contracts";
import { MiniappApiError, getObservationContext, restoreObservationContext } from "../../services/api-client";
import { useAppStore } from "../../state/app-store";
import type { createSkyContextSession } from "./sky-context-session";

/** Query may retain its fetch function after the page leaves. Keep its closure
 * limited to the Context session and store action, not a Sky render/frame. */
export async function getSkyPageObservationContext(
  session: ReturnType<typeof createSkyContextSession>,
  setObservationContext: (value: ObservationContext | null) => void,
  signal?: AbortSignal,
) {
  const current = useAppStore.getState().observationContext;
  const request = current?.privateProposal ? session.begin(current) : null;
  try {
    let response;
    try { response = await getObservationContext(session.contextId, signal); }
    catch (error) {
      if (!request || !current || !session.isCurrent(request) || !(error instanceof MiniappApiError) ||
          (error.code !== "NOT_FOUND" && error.code !== "STALE_REJECTED")) throw error;
      response = await restoreObservationContext(current, signal);
    }
    if (request && session.accept(request, response.data)) setObservationContext(response.data);
    return response;
  } catch (error) {
    if (request && session.isCurrent(request) && error instanceof MiniappApiError &&
        (error.code === "PERMISSION_DENIED" || error.code === "NOT_FOUND")) setObservationContext(null);
    throw error;
  } finally { if (request) session.finish(request); }
}
