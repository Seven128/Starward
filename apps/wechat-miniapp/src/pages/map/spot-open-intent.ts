/** A Search selection is an action even when the selected spot ID is unchanged. */
export function shouldOpenSpotForSelection(input: {
  explicitOpenRequested: boolean;
  bottomPresentation: string;
  detailContextReady: boolean;
  contextKind: string | null;
  contextSpotId: string | null;
  selectedSpotId: string;
}) {
  return input.explicitOpenRequested ||
    input.bottomPresentation !== "spot-panel" ||
    !input.detailContextReady ||
    input.contextKind !== "FORMAL_SPOT" ||
    input.contextSpotId !== input.selectedSpotId;
}
