import { unprojectSkyPoint, type SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter, SkyCanvasBounds } from "./sky-viewport";
import { skyLandscapeMaskOccludes, skyLandscapeWindowAlphaBound, type SkyLandscapeMask } from "./sky-landscape-mask";
import type { SkyDeepAuxiliaryDecision } from "./sky-deep-auxiliary-visibility";
import type { SkySceneFrameIdentity } from "./sky-scene-frame";

export interface SkyObjectIdentity {
  reference: string;
  displayName: string;
  kind: "STAR" | "MOON" | "GALAXY" | "NEBULA" | "PLANET";
}

export function skyObjectKindLabel(kind: SkyObjectIdentity["kind"] | "MILKY_WAY") {
  return { STAR: "恒星", MOON: "月球", PLANET: "行星", GALAXY: "星系", NEBULA: "星云", MILKY_WAY: "银河" }[kind];
}

/** Public catalogue numbers aid recognition. Solar-system transport IDs do not;
 * the original reference still owns every key, selection and source request. */
export function skyObjectIdentityLabel(object: { kind: SkyObjectIdentity["kind"] | "MILKY_WAY"; reference: string }) {
  const kind = skyObjectKindLabel(object.kind);
  return /^(?:PLANET|SOLAR):/.test(object.reference)
    ? kind : `${kind} · ${object.reference.replace(":", " ")}`;
}

export interface PaintedSkyObject extends SkyObjectIdentity {
  magnitude: number | null;
  magnitudeBand?: 'V'|'VISUAL';
  x: number;
  y: number;
  /** Actual resolved globe silhouette and submitted ring strokes, if present. */
  hitDisc?: { majorRadiusPx: number; minorRadiusPx: number; minorDirection: readonly [number, number] };
  hitSegments?: readonly (readonly [number, number, number, number])[];
}

export function skyObjectMagnitudeLabel(object:Pick<PaintedSkyObject,'magnitude'|'magnitudeBand'>){
  if(object.magnitude===null)return '目录未提供视星等';
  return `${object.magnitudeBand==='VISUAL'?'视觉星等':'V 波段视星等'} ${object.magnitude.toFixed(2)}`;
}

export interface SkyPickSnapshot {
  /** Production Scene receipt. Pure geometry consumers may construct a
   * snapshot without native Canvas/resource admission. */
  readonly identity?: SkySceneFrameIdentity;
  catalogVersion: string;
  catalogHash: string;
  frameAt: string;
  width: number;
  height: number;
  view?: { basis: SkyViewBasis; verticalFovDeg: number; center?: SkyProjectionCenter;
    /** The actual successful landscape pass, bound to this completed camera. */
    landscape?: SkyLandscapeMask | null };
  objects: readonly PaintedSkyObject[];
  /** Automatic bright-star labels use these actual current points, including
   * their display fade. Exit remnants are deliberately absent. */
  namedStars?: readonly (PaintedSkyObject & { opacity: number })[];
  /** Valid bodies whose unresolved point is below the same display/pick threshold
   * as stars, bound to this completed frame. Not missing geometry or GPU failure. */
  suppressedBodyReferences?: readonly string[];
  /** Actual pre-aid scalars, not recomputed from the final source receipt. */
  deepSkyAuxiliaryDecisions?: readonly SkyDeepAuxiliaryDecision[];
}

/** Stars are submitted before the solid solar-system globes. Only successful
 * globe silhouettes can withdraw a covered star from the completed hit/name
 * receipt. Keep the translucent limb: both phase and textured globe shaders
 * have an opaque core within normalized squared radius .96. Rings do not
 * certify opaque coverage, and an unavailable globe supplies no silhouette. */
export function filterSkyBodyOccludedStars(objects: readonly PaintedSkyObject[],
  namedStars: NonNullable<SkyPickSnapshot["namedStars"]>) {
  const globes = objects.filter(object => object.hitDisc &&
    (object.reference === "SOLAR:SUN" || object.kind === "MOON" || object.kind === "PLANET") &&
    object.hitDisc.majorRadiusPx > 0 && object.hitDisc.minorRadiusPx > 0);
  if (!globes.length) return { objects, namedStars };
  const visible = (star: Pick<PaintedSkyObject, "x" | "y">) => !globes.some(globe => {
    const disc = globe.hitDisc!, dx = star.x - globe.x, dy = star.y - globe.y;
    const minor = (dx * disc.minorDirection[0] + dy * disc.minorDirection[1]) / disc.minorRadiusPx;
    const major = (-dx * disc.minorDirection[1] + dy * disc.minorDirection[0]) / disc.majorRadiusPx;
    return minor * minor + major * major <= .96;
  });
  return {
    objects: objects.filter(object => object.kind !== "STAR" || object.reference === "SOLAR:SUN" || visible(object)),
    namedStars: namedStars.filter(visible),
  };
}

function pointToSegmentDistance(x:number,y:number,[x0,y0,x1,y1]:readonly [number,number,number,number]):number{
  const dx=x1-x0,dy=y1-y0;
  const lengthSquared=dx*dx+dy*dy;
  const t=lengthSquared>0?Math.max(0,Math.min(1,((x-x0)*dx+(y-y0)*dy)/lengthSquared)):0;
  return Math.hypot(x-x0-t*dx,y-y0-t*dy);
}

function paintedDistance(object:PaintedSkyObject,x:number,y:number):number{
  const dx=x-object.x,dy=y-object.y;
  let distance=Math.hypot(dx,dy);
  if(object.hitDisc){
    const {majorRadiusPx,minorRadiusPx,minorDirection}=object.hitDisc;
    const minor=dx*minorDirection[0]+dy*minorDirection[1];
    const major=-dx*minorDirection[1]+dy*minorDirection[0];
    const normalized=Math.hypot(major/majorRadiusPx,minor/minorRadiusPx);
    distance=normalized<=1?0:distance*(1-1/normalized);
  }else if(object.hitSegments){
    // A ring may remain visible after the globe's centre has set.
    distance=Infinity;
  }
  for(const segment of object.hitSegments??[])
    distance=Math.min(distance,pointToSegmentDistance(x,y,segment));
  return distance;
}

/** Labels and picking consult the same completed camera and geometry. */
export function paintedSkyPointVisible(snapshot: Pick<SkyPickSnapshot,"view"|"width"|"height"> | null, x: number, y: number): boolean {
  if (!snapshot) return false;
  if (!snapshot.view) return true;
  const ray = unprojectSkyPoint(x, y, snapshot.view.basis, snapshot.width, snapshot.height,
    snapshot.view.verticalFovDeg, snapshot.view.center);
  return Boolean(ray && (!snapshot.view.landscape || !skyLandscapeMaskOccludes(snapshot.view.landscape, ray)));
}

/** Whole native glyph/hit rectangles use the same completed mask as picks.
 * Unknown geometry cannot certify a clear rectangle; partial foreground still
 * permits the sky fragments admitted by the original point visibility rule. */
export function paintedSkyBoundsVisible(snapshot:Pick<SkyPickSnapshot,'view'|'width'|'height'>|null,
  bounds:SkyCanvasBounds):boolean {
  if(!snapshot||![bounds.left,bounds.top,bounds.width,bounds.height,snapshot.width,snapshot.height].every(Number.isFinite)||
    bounds.width<=0||bounds.height<=0||bounds.left<0||bounds.top<0||
    bounds.left+bounds.width>snapshot.width||bounds.top+bounds.height>snapshot.height)return false;
  if(!snapshot.view||!unprojectSkyPoint(bounds.left+bounds.width/2,bounds.top+bounds.height/2,
    snapshot.view.basis,snapshot.width,snapshot.height,snapshot.view.verticalFovDeg,snapshot.view.center))return false;
  return !snapshot.view.landscape||skyLandscapeWindowAlphaBound(snapshot.view.landscape,snapshot.view,
    snapshot.width,snapshot.height,bounds)<254.5/255;
}

export function skyPickSnapshotIsCurrent(
  snapshot: SkyPickSnapshot | null,
  input: { x: number; y: number; frameAt: string; catalogVersion: string; catalogHash: string },
) {
  return Boolean(snapshot && snapshot.frameAt === input.frameAt &&
    snapshot.catalogVersion === input.catalogVersion && snapshot.catalogHash === input.catalogHash);
}

export function pickPaintedSkyObjects(
  snapshot: SkyPickSnapshot | null,
  input: { x: number; y: number; frameAt: string; catalogVersion: string; catalogHash: string },
  tolerancePx = 18,
) {
  if (!snapshot || !skyPickSnapshotIsCurrent(snapshot, input)) return [];
  if (!paintedSkyPointVisible(snapshot, input.x, input.y)) return [];
  return snapshot.objects
    .map((object) => ({ object, distance: paintedDistance(object,input.x,input.y) }))
    .filter(({ object, distance }) => {
      if (distance > tolerancePx) return false;
      if (!snapshot.view || paintedSkyPointVisible(snapshot, object.x, object.y)) return true;
      // A point behind the horizon or landscape cannot use a nearby open ray. A
      // partially exposed globe/ring remains selectable on its visible shape;
      // centre-distance tolerance cannot resurrect a hidden body.
      return Boolean((object.hitDisc || object.hitSegments?.length) && distance <= 1);
    })
    .sort((left, right) => left.distance - right.distance ||
      (left.object.magnitude ?? 99) - (right.object.magnitude ?? 99) ||
      left.object.reference.localeCompare(right.object.reference))
    .slice(0, 4)
    .map((candidate) => candidate.object);
}

export function isUnambiguousTapGesture(input: {
  startedWithTouches: number;
  maximumTouches: number;
  travelPx: number;
  cancelled: boolean;
}) {
  return !input.cancelled && input.startedWithTouches === 1 &&
    input.maximumTouches === 1 && input.travelPx <= 8;
}
