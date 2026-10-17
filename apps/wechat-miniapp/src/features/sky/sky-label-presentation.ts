import type { ResolvedSkyReport as SkyReport } from "./sky-stellar-scene";
import { resolveSkyDeepSkyScene } from "./sky-stellar-scene";
import type { SkyPickSnapshot, PaintedSkyObject } from "./sky-object-picking";
import { paintedSkyPointVisible } from "./sky-object-picking";
import { createSkyDirectionProjector } from "./sky-view-projection";
import { skyObjectNameOpacity } from "./sky-selection-marker";
import { skyDeepAuxiliaryDecisionOpacity } from "./sky-deep-auxiliary-visibility";
import { projectSkyTarget } from "./sky-scene-projection";
import { skyTargetLabelSuppressed } from "./sky-body-label-presentation";
import { projectConstellationLabels } from "./sky-constellation-labels";
import type { ConstellationFrame } from "./sky-constellation-scene";
import { NO_SKY_INSETS, type SkyViewportInsets } from "./sky-viewport";

type LabelView = Pick<SkyPickSnapshot, "view" | "width" | "height">;
const NO_RETAINED_NAMES: ReadonlySet<string> = new Set();
export type SkyNamedCatalogObject = PaintedSkyObject & { auxiliaryOpacity: number };

function labelOcclusionOpacity(y:number,height:number,insets:SkyViewportInsets,wholeLayout=false):number {
  const opacity=Math.max(0,Math.min(1,(y-insets.top-12)/16,(height-insets.bottom-12-y)/16));
  // Ordinary measured names use their accepted time envelope for retirement;
  // the point's old spatial ramp must not spend that alpha before exit starts.
  return wholeLayout ? opacity===1 ? 1 : 0 : opacity;
}

/** One presentation policy for native controls and same-copy decorative names.
 * The caller supplies actual completed points, aids, mask and camera; requested
 * catalog rows and exiting render-only remnants do not grant a star name. */
export function projectSkyCatalogNames(scene: SkyReport["skyScene"] | undefined, at: string | undefined,
  snapshot: LabelView | null, namedStars: SkyPickSnapshot["namedStars"],
  decisions: SkyPickSnapshot["deepSkyAuxiliaryDecisions"], insets: SkyViewportInsets,
  wholeLayout = false, retainedReferences: ReadonlySet<string> = NO_RETAINED_NAMES): SkyNamedCatalogObject[] {
  if (!snapshot?.view || snapshot.width <= 0 || snapshot.height <= 0) return [];
  const { view, width, height } = snapshot;
  const projector = createSkyDirectionProjector(view.basis, width, height, view.verticalFovDeg, view.center);
  const nameDetail = skyObjectNameOpacity(view.verticalFovDeg);
  if(nameDetail<=.01 && !retainedReferences.size)return [];
  const stars: SkyNamedCatalogObject[] = (namedStars ?? []).flatMap(star => {
    const opacity = nameDetail * star.opacity;
    return (opacity > .01 || retainedReferences.has(star.reference) && star.opacity > .01) && paintedSkyPointVisible(snapshot, star.x, star.y)
      ? [{ ...star, auxiliaryOpacity: opacity }] : [];
  });
  const deepScene = resolveSkyDeepSkyScene(scene, at);
  const catalog = deepScene?.catalog, frame = deepScene?.frame;
  const deep: SkyNamedCatalogObject[] = !catalog || frame?.state !== "AVAILABLE" || !frame.points ? [] :
    frame.points.flatMap(([catalogIndex, azimuth, altitude]) => {
      const entry = catalog.entries[catalogIndex];
      const projection = entry ? projector?.project(azimuth, altitude) : null;
      const opacity = entry ? skyDeepAuxiliaryDecisionOpacity(decisions, entry.objectRef) : null;
      return entry && projection && opacity !== null && (opacity > .08 || retainedReferences.has(entry.objectRef)) &&
        paintedSkyPointVisible(snapshot, projection.x, projection.y)
        ? [{ reference: entry.objectRef, displayName: entry.displayName, kind: entry.kind,
          magnitude: entry.magnitude, x: projection.x, y: projection.y, auxiliaryOpacity: opacity*nameDetail }] : [];
    });
  const candidates = [...deep, ...stars].sort((left, right) => (left.magnitude ?? 99) - (right.magnitude ?? 99));
  const retained: SkyNamedCatalogObject[] = [];
  for (const candidate of candidates) {
    const edgeOpacity = labelOcclusionOpacity(candidate.y,height,insets,wholeLayout);
    const opacity = candidate.auxiliaryOpacity * edgeOpacity;
    if (opacity <= .01 && !retainedReferences.has(candidate.reference)) continue;
    // The ordinary same-copy consumer measures complete glyph/hit rectangles.
    // The deferred red-light native path retains its existing point layout.
    if (wholeLayout) { retained.push({...candidate,auxiliaryOpacity:opacity});continue; }
    if (retained.every(current => Math.hypot(current.x - candidate.x, current.y - candidate.y) > 46))
      retained.push({ ...candidate, auxiliaryOpacity: opacity });
    if (retained.length === 8) break;
  }
  return retained;
}

export function projectSkyTargetLabels(targets: readonly SkyReport["targets"][number][], snapshot: LabelView | null,
  resolved: readonly string[] = [], suppressed: readonly string[] = [], insets:SkyViewportInsets=NO_SKY_INSETS,
  retained: ReadonlySet<string> = NO_RETAINED_NAMES,wholeLayout=false) {
  if (!snapshot?.view) return [];
  const { view, width, height } = snapshot;
  return targets.flatMap(target => {
    if (skyTargetLabelSuppressed(target, resolved, suppressed)) return [];
    const projection = projectSkyTarget(target, null, null, width, height, view.verticalFovDeg, view.basis, view.center);
    const opacity=projection?labelOcclusionOpacity(projection.y,height,insets,wholeLayout):0;
    return projection && (opacity>.01 || retained.has(target.targetId)) && paintedSkyPointVisible(snapshot, projection.x, projection.y) ? [{ target, projection,opacity }] : [];
  });
}

export function projectSkyConstellationNames(frame: ConstellationFrame | null | undefined, at: string | undefined,
  snapshot: LabelView | null, enabled: boolean, obstacles: readonly { x: number; y: number }[],
  insets:SkyViewportInsets=NO_SKY_INSETS,wholeLayout=false,retained:ReadonlySet<string>=NO_RETAINED_NAMES) {
  if (!frame || frame.at !== at || !snapshot?.view) return [];
  return projectConstellationLabels(frame, snapshot.view, snapshot.width, snapshot.height, enabled,
    obstacles.map(object => [object.x, object.y] as const),wholeLayout,retained)
    .map(label=>({...label,opacity:label.opacity*labelOcclusionOpacity(label.y,snapshot.height,insets,wholeLayout)}))
    .filter(label => (label.opacity>.01 || retained.has(label.iau)) && paintedSkyPointVisible(snapshot, label.x, label.y));
}
