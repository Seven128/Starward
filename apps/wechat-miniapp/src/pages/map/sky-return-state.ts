import type { ContributionSubmission, SpotSummary } from "@starward/miniapp-contracts";
import type { SpotPanelExtent } from "./spot-panel";

export interface MapSkyReturnScope {
  accountOwnerId: string | null;
  mapResetVersion: number;
  selectedSpotId: string | null;
  spotOpenRequestVersion: number;
}

export interface MapPanelReturnPosition {
  identity: string;
  top: number;
  galleryIdentity: string;
  left: number;
}

export interface MapSkyReturnPanel {
  extent: SpotPanelExtent;
  selected: SpotSummary | null;
  proposal: ContributionSubmission | null;
  position: MapPanelReturnPosition | null;
}

function sameScope(expected: MapSkyReturnScope, current: MapSkyReturnScope) {
  return expected.accountOwnerId === current.accountOwnerId &&
    expected.mapResetVersion === current.mapResetVersion &&
    expected.selectedSpotId === current.selectedSpotId &&
    expected.spotOpenRequestVersion === current.spotOpenRequestVersion;
}

/** One return presentation, never a second owner for camera, Context or cached data. */
export function createMapSkyReturnState() {
  let saved: { scope: MapSkyReturnScope; panel: MapSkyReturnPanel } | null = null;
  let unsubscribe: (() => void) | null = null;
  const clear = () => { saved = null; unsubscribe?.(); unsubscribe = null; };
  return {
    save(scope: MapSkyReturnScope, panel: MapSkyReturnPanel,
      observeScope?: (changed: (scope: MapSkyReturnScope) => void) => () => void) {
      clear();
      const ticket = {
        scope: { accountOwnerId: scope.accountOwnerId, mapResetVersion: scope.mapResetVersion,
          selectedSpotId: scope.selectedSpotId, spotOpenRequestVersion: scope.spotOpenRequestVersion },
        panel: { ...panel, position: panel.position ? { ...panel.position } : null },
      };
      saved = ticket;
      unsubscribe = observeScope?.(current => {
        if (saved === ticket && !sameScope(ticket.scope, current)) clear();
      }) ?? null;
      return ticket;
    },
    discard(ticket?: unknown) { if (ticket === undefined || saved === ticket) clear(); },
    invalidate(scope: MapSkyReturnScope) { if (saved && !sameScope(saved.scope, scope)) clear(); },
    take(scope: MapSkyReturnScope) {
      const candidate = saved;
      clear();
      if (!candidate || !sameScope(candidate.scope, scope)) return null;
      // A private panel cannot be restored without its still-current account.
      if (candidate.panel.proposal && !scope.accountOwnerId) return null;
      if (candidate.panel.selected?.spotId !== (scope.selectedSpotId ?? undefined) && !candidate.panel.proposal) return null;
      return candidate.panel;
    },
  };
}

export const mapSkyReturnState = createMapSkyReturnState();
