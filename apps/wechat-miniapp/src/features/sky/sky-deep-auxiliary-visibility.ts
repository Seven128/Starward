import type {SkyArtworkLocalObservation} from "./sky-artwork-level-composition";
/** The actual scalar used before a catalog ring, bound by its completed Scene
 * snapshot. It is a presentation decision, not a source/readability receipt. */
export interface SkyDeepAuxiliaryDecision {
  readonly reference: string;
  readonly opacity: number;
}

const emptyDecisions: readonly SkyDeepAuxiliaryDecision[] = Object.freeze([]);

export function copySkyDeepAuxiliaryDecisions(decisions?: readonly SkyDeepAuxiliaryDecision[] | null):
  readonly SkyDeepAuxiliaryDecision[] {
  return decisions?.length ? Object.freeze(decisions.map(({ reference, opacity }) =>
    Object.freeze({ reference, opacity }))) : emptyDecisions;
}

/** A missing/ambiguous/invalid decision cannot be reconstructed from later
 * source credit. Legacy snapshots can still serve their independent picking. */
export function skyDeepAuxiliaryDecisionOpacity(decisions: readonly SkyDeepAuxiliaryDecision[] | undefined,
  reference: string): number | null {
  let match: SkyDeepAuxiliaryDecision | undefined;
  for (const decision of decisions ?? []) if (decision.reference === reference) {
    if (match) return null;
    match = decision;
  }
  return match && Number.isFinite(match.opacity) && match.opacity >= 0 && match.opacity <= 1 ? match.opacity : null;
}

export function sameSkyDeepAuxiliaryDecisions(a?: readonly SkyDeepAuxiliaryDecision[],
  b?: readonly SkyDeepAuxiliaryDecision[]): boolean {
  if (!a || !b) return !a && !b;
  return a.length === b.length && a.every((decision, index) =>
    decision.reference === b[index]!.reference && decision.opacity === b[index]!.opacity);
}

/** Retained legacy presentation tuning for catalog rings and names. Successful
 * image painting and angular footprint control this curve; neither certifies
 * local image readability. Missing images or dimensions preserve the aid. */
export function deepSkyAuxiliaryOpacity(verticalFovDeg: number, viewportHeight: number,
  majorAxisArcmin: number | null, imagePainted: boolean): number {
  if (!imagePainted || !Number.isFinite(verticalFovDeg) || verticalFovDeg <= 0 || verticalFovDeg >= 90 ||
    !Number.isFinite(viewportHeight) || viewportHeight <= 0 || majorAxisArcmin === null ||
    !Number.isFinite(majorAxisArcmin) || majorAxisArcmin <= 0) return 1;
  const diameterPx = viewportHeight * Math.tan(majorAxisArcmin * Math.PI / (60 * 360)) /
    Math.tan(verticalFovDeg * Math.PI / 360);
  const t = Math.max(0, Math.min(1, (diameterPx - 24) / 72));
  return 1 - t * t * (3 - 2 * t);
}

/** Aid eligibility in the renderer's catalog-region shader model. This does
 * not certify physical ICRS accuracy, scientific quality or recognition.
 * The retained legacy scale curve is presentation tuning, not a quality limit. */
export interface SkyDeepAuxiliaryDisplayFacts {
  readonly reference: string;
  readonly regionReference: string | null;
  readonly submitted: boolean;
  readonly finePrepared: boolean;
  readonly coarseExpected: boolean;
  readonly coarsePrepared: boolean;
  readonly nativeCurrent: boolean;
  readonly local: SkyArtworkLocalObservation;
}
export function skyDeepAuxiliaryModelOpacity(verticalFovDeg:number,viewportHeight:number,
  majorAxisArcmin:number|null,facts:SkyDeepAuxiliaryDisplayFacts|null):number {
  if(!facts || facts.regionReference!==facts.reference || !facts.submitted || !facts.finePrepared ||
    (facts.coarseExpected&&!facts.coarsePrepared) || !facts.nativeCurrent ||
    facts.local.scope!=="frozen-highp-shader-pixel-centers" || facts.local.signalRevision===null) return 1;
  let selected=0;
  for(const slot of [facts.local.fine,facts.local.coarse]) {
    // not-selected was authorized by the exact expected/prepared/current caller,
    // never inferred from zero local samples, retirement or registration failure.
    if(slot.selection==="not-selected") continue;
    if(slot.selection!=="has" || slot.photo!=="positive") return 1;
    selected++;
  }
  return selected>0 ? deepSkyAuxiliaryOpacity(verticalFovDeg,viewportHeight,majorAxisArcmin,true) : 1;
}
