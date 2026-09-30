import { SKY_PLANET_ORDER, validSkyPlanetGeometry, type SkyGeometryRow, type SkyPlanetBody } from "@starward/miniapp-contracts";
import { exactSkyTimeFrame } from "./sky-time-frame";
import { skySolarLightAt } from "./sky-solar-light";
import { projectSkyPhaseDisc, type SkyPhaseDisc } from "./sky-phase-disc";
import { skyHorizontalDirection, type SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";
import type { SkyLineSegment } from "./sky-render-surface";
import {skyAxisymmetricBodyFrame,skyBodySurfaceOrientation,skyDirectionInBodyFrame,
  type SkyBodySurfaceOrientation} from "./sky-body-surface-orientation";
import {SATURN_BANDS,SATURN_EQUATORIAL_RADIUS_KM,SATURN_POLAR_RADIUS_KM,
  SATURN_REFERENCE_RADIUS_KM,saturnGlobeShadowsRingPoint} from "./sky-saturn-rings";

export interface SkySaturnRingProjection {
  readonly opening: number;
  readonly majorScreen: readonly [number,number];
  readonly minorScreen: readonly [number,number];
  readonly majorEnu: readonly number[];
  readonly planeMinorEnu: readonly number[];
  readonly poleEnu: readonly number[];
  readonly sunEnu: readonly number[] | null;
}

export interface SkySaturnRing {
  readonly back: readonly SkyLineSegment[];
  readonly front: readonly SkyLineSegment[];
  readonly shadowBack: readonly SkyLineSegment[];
  readonly shadowFront: readonly SkyLineSegment[];
  readonly opacity: number;
  readonly band: "C" | "B" | "A";
}

export interface SkyOblateDisc {
  /** Equatorial radius and projected polar radius in logical canvas pixels. */
  readonly majorRadiusPx: number;
  readonly minorRadiusPx: number;
  readonly minorDirection: readonly [number, number];
  /** Intrinsic 1-bar axis ratio for the texture intersection, independent of view angle. */
  readonly polarRatio: number;
}

export interface SkyPlanetDisc extends SkyPhaseDisc {
  readonly body: SkyPlanetBody;
  readonly altitudeDeg: number;
  readonly angularDiameterDeg: number;
  readonly visualMagnitude: number;
  readonly rings: readonly SkySaturnRing[];
  readonly ringProjection?: SkySaturnRingProjection | null;
  readonly oblate: SkyOblateDisc | null;
  readonly surfaceOrientation: SkyBodySurfaceOrientation|null;
  /** Saturn sunlight in the same longitude-neutral body frame as its surface. */
  readonly ringSunBody: readonly [number,number,number]|null;
}

const dot = (a: readonly number[], b: readonly number[]) => a.reduce((sum,value,index)=>sum+value*b[index]!,0);
const cross = (a: readonly number[], b: readonly number[]) => [a[1]!*b[2]!-a[2]!*b[1]!,
  a[2]!*b[0]!-a[0]!*b[2]!,a[0]!*b[1]!-a[1]!*b[0]!] as const;
// NSSDCA Jupiter Fact Sheet, 1-bar axes and volumetric mean radius.
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html
const JUPITER_REFERENCE_RADIUS_KM=69911;
const JUPITER_EQUATORIAL_RADIUS_KM=71492;
const JUPITER_POLAR_RADIUS_KM=66854;
// NSSDCA Uranus/Neptune Fact Sheets: 1-bar axes and volumetric mean radii.
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html
const OBLATE_RADII:Partial<Record<SkyPlanetBody,readonly [number,number,number]>>={
  JUPITER:[JUPITER_REFERENCE_RADIUS_KM,JUPITER_EQUATORIAL_RADIUS_KM,JUPITER_POLAR_RADIUS_KM],
  SATURN:[SATURN_REFERENCE_RADIUS_KM,SATURN_EQUATORIAL_RADIUS_KM,SATURN_POLAR_RADIUS_KM],
  URANUS:[25362,25559,24973],NEPTUNE:[24622,24764,24341],
};

function screenTangent(direction:readonly number[],axis:readonly number[],basis:SkyViewBasis,
  height:number,fov:number):readonly [number,number]|null{
  const denominator=1+dot(direction,basis.forward);
  const scale=height/(2*Math.tan(fov*Math.PI/720));
  if(!(denominator>1e-9)||!Number.isFinite(scale))return null;
  const x=scale*(dot(axis,basis.right)*denominator-dot(direction,basis.right)*dot(axis,basis.forward))/(denominator*denominator);
  const y=-scale*(dot(axis,basis.up)*denominator-dot(direction,basis.up)*dot(axis,basis.forward))/(denominator*denominator);
  const length=Math.hypot(x,y);
  return length>0?[x/length,y/length]:null;
}

function oblatePlanetDisc(p:import("@starward/miniapp-contracts").SkyPlanetGeometry,
  disc:SkyPhaseDisc,basis:SkyViewBasis,height:number,fov:number):SkyOblateDisc|null{
  const pole=p.body==="SATURN"?p.ringPoleEnu:p.bodyFrame?.poleEnu;
  const radii=OBLATE_RADII[p.body];
  if(!pole||!radii)return null;
  const [referenceRadius,equatorialRadius,polarRadius]=radii;
  const direction=skyHorizontalDirection(p.azimuthDeg,p.altitudeDeg);
  if(!direction)return null;
  const opening=Math.abs(dot(pole,direction));
  const poleTangent=pole.map((value,index)=>value-dot(pole,direction)*direction[index]!) as [number,number,number];
  const minorDirection=screenTangent(direction,poleTangent,basis,height,fov)??[0,1];
  const majorRadiusPx=disc.radiusPx*equatorialRadius/referenceRadius;
  const minorRadiusPx=disc.radiusPx*Math.sqrt(
    polarRadius**2*(1-opening**2)+equatorialRadius**2*opening**2,
  )/referenceRadius;
  return {majorRadiusPx,minorRadiusPx,minorDirection,polarRatio:polarRadius/equatorialRadius};
}

function insideSaturnSilhouette(x:number,y:number,shape:SkyOblateDisc):boolean{
  const minor=x*shape.minorDirection[0]+y*shape.minorDirection[1];
  const major=-x*shape.minorDirection[1]+y*shape.minorDirection[0];
  return (major/shape.majorRadiusPx)**2+(minor/shape.minorRadiusPx)**2<1;
}

/** Screen-sampled main-ring radial bands from the globe's observer angle and camera Jacobian. */
function saturnRingProjection(p: import("@starward/miniapp-contracts").SkyPlanetGeometry,
  disc: SkyPhaseDisc,basis:SkyViewBasis,height:number,fov:number,
  ):SkySaturnRingProjection|null{
  if(p.body!=="SATURN"||!p.ringPoleEnu||disc.radiusPx<1.2)return null;
  const direction=skyHorizontalDirection(p.azimuthDeg,p.altitudeDeg);
  if(!direction)return null;
  const pole=p.ringPoleEnu,opening=-dot(pole,direction);
  const poleTangent=pole.map((value,index)=>value-dot(pole,direction)*direction[index]!) as [number,number,number];
  const tangentLength=Math.hypot(...poleTangent);
  if(tangentLength<1e-6||Math.abs(opening)<.025)return null;
  const major=cross(direction,pole).map(value=>value/tangentLength);
  const minor=poleTangent.map(value=>value/tangentLength);
  const planeMinor=cross(pole,major).map(value=>value*Math.sign(opening));
  const majorScreen=screenTangent(direction,major,basis,height,fov);
  const minorScreen=screenTangent(direction,minor,basis,height,fov);
  if(!majorScreen||!minorScreen)return null;
  return {opening,majorScreen,minorScreen,majorEnu:major,planeMinorEnu:planeMinor,
    poleEnu:pole,sunEnu:p.ringSunEnu??null};
}

function saturnRingSegments(disc:SkyPhaseDisc, oblate:SkyOblateDisc|null,
  projection:SkySaturnRingProjection|null):readonly SkySaturnRing[]{
  if(!projection)return [];
  const {opening,majorScreen,minorScreen,majorEnu:major,planeMinorEnu:planeMinor,sunEnu}=projection;
  // A fixed 48-chord ellipse leaves >12 logical-pixel facets at the 0.05°
  // phone limit. Resolve the outer edge in screen space, with a hard CPU/GPU
  // ceiling for unusually large projected discs.
  const outerRadiusPx=disc.radiusPx*SATURN_BANDS[SATURN_BANDS.length-1]!.outerKm/SATURN_REFERENCE_RADIUS_KM;
  const steps=Math.min(256,Math.max(48,Math.ceil(2*Math.PI*outerRadiusPx/3)));
  return SATURN_BANDS.map(({band,innerKm,outerKm,opacity})=>{
    const back:SkyLineSegment[]=[],front:SkyLineSegment[]=[],
      shadowBack:SkyLineSegment[]=[],shadowFront:SkyLineSegment[]=[];
    const projectedWidth=disc.radiusPx*(outerKm-innerKm)/SATURN_REFERENCE_RADIUS_KM;
    // One-pixel strokes tile a resolved band; a narrow band retains its centre
    // line. Bound work at extreme zoom without silently stretching the radii.
    const radialSamples=Math.min(48,Math.max(1,Math.ceil(projectedWidth/.8)));
    for(let radial=0;radial<radialSamples;radial++){
      const radiusKm=innerKm+(outerKm-innerKm)*(radial+.5)/radialSamples;
      const radius=disc.radiusPx*radiusKm/SATURN_REFERENCE_RADIUS_KM;
      const points=Array.from({length:steps+1},(_,index)=>{
        const angle=2*Math.PI*index/steps;
        const majorPx=radius*Math.cos(angle),minorPx=radius*Math.sin(angle)*Math.abs(opening);
        return [disc.x+majorPx*majorScreen[0]+minorPx*minorScreen[0],
          disc.y+majorPx*majorScreen[1]+minorPx*minorScreen[1]] as const;
      });
      for(let index=0;index<steps;index++){
        const a=points[index]!,b=points[index+1]!;
        const segment=[a[0],a[1],b[0],b[1]] as const;
        const angle=2*Math.PI*(index+.5)/steps;
        // planeMinor is the signed projection of the physical ring-plane axis;
        // the sector opposite its opening sign points toward the observer.
        const near=Math.sin(angle)*Math.sign(opening)<0;
        // The globe occludes the far side; draw visible arcs after a successful globe.
        const middleX=(a[0]+b[0])/2-disc.x,middleY=(a[1]+b[1])/2-disc.y;
        if(!near&&oblate&&insideSaturnSilhouette(middleX,middleY,oblate))continue;
        const shadow=sunEnu ? saturnGlobeShadowsRingPoint(
          major.map((v,i)=>radiusKm/SATURN_EQUATORIAL_RADIUS_KM*
            (v*Math.cos(angle)+planeMinor[i]!*Math.sin(angle))) as [number,number,number],
          sunEnu as [number,number,number]) : false;
        (shadow?(near?shadowFront:shadowBack):(near?front:back)).push(segment);
      }
    }
    return {band,opacity,back,front,shadowBack,shadowFront};
  });
}

/** All seven records must agree on one instant; malformed/retired rows render no invented planets. */
export function skyPlanetDiscsAt(rows: readonly SkyGeometryRow[] | undefined, at: string | undefined,
  basis: SkyViewBasis, width: number, height: number, verticalFovDeg: number,
  center?: SkyProjectionCenter, onlyBody?: SkyPlanetBody): SkyPlanetDisc[] | null {
  const row = exactSkyTimeFrame(rows,at);
  const sun = skySolarLightAt(rows,at);
  if (!row || !sun || !Array.isArray(row.planets) || row.planets.length !== SKY_PLANET_ORDER.length ||
    row.planets.some((p,index)=>!validSkyPlanetGeometry(p,index))) return null;
  return row.planets.flatMap(p => {
    // Texture eligibility needs one body, while the scene painter needs all seven.
    // Validate the complete ephemeris first, then avoid unrelated ring geometry.
    if (onlyBody && p.body !== onlyBody) return [];
    // The outer A ring can remain above the horizon after Saturn's globe sets.
    const axes=OBLATE_RADII[p.body as SkyPlanetBody];
    const extent=axes&&(p.body==="SATURN"||p.bodyFrame)?axes[1]/axes[0]:1;
    if (p.altitudeDeg < -(p.body==="SATURN"?1.2:extent/2)*p.angularDiameterDeg) return [];
    // A Saturn ring arc may enter the viewport after the globe has left it.
    // Use the outer A ring for culling, then restore the actual globe radius.
    const projectionExtent=p.body==="SATURN"?SATURN_BANDS[2].outerKm/SATURN_REFERENCE_RADIUS_KM:extent;
    const projected=projectSkyPhaseDisc({...p,angularDiameterDeg:p.angularDiameterDeg*projectionExtent},
      sun,basis,width,height,verticalFovDeg,center);
    if(!projected)return [];
    const disc=projectionExtent!==1?{...projected,radiusPx:projected.radiusPx/projectionExtent}:projected;
    const oblate=oblatePlanetDisc(p,disc,basis,height,verticalFovDeg);
    const ringProjection=saturnRingProjection(p,disc,basis,height,verticalFovDeg);
    const rings=saturnRingSegments(disc,oblate,ringProjection);
    if(p.altitudeDeg < -p.angularDiameterDeg*extent/2&&rings.length===0)return [];
    const saturnFrame=p.body==="SATURN"?skyAxisymmetricBodyFrame(p.ringPoleEnu,
      p.azimuthDeg,p.altitudeDeg):null;
    const surfaceOrientation=saturnFrame?skyBodySurfaceOrientation(saturnFrame,
      p.azimuthDeg,p.altitudeDeg,disc,basis,width,height,verticalFovDeg,center):
      p.body==="MARS"||p.body==="MERCURY"||p.body==="JUPITER"||
      p.body==="URANUS"||p.body==="NEPTUNE"?skyBodySurfaceOrientation(p.bodyFrame,
        p.azimuthDeg,p.altitudeDeg,disc,basis,width,height,verticalFovDeg,center):null;
    return [{...disc,body:p.body,altitudeDeg:p.altitudeDeg,
      angularDiameterDeg:p.angularDiameterDeg,visualMagnitude:p.visualMagnitude,
      rings,ringProjection,oblate,surfaceOrientation,
      ringSunBody:saturnFrame&&surfaceOrientation&&p.ringSunEnu
        ?skyDirectionInBodyFrame(saturnFrame,p.ringSunEnu):null}];
  });
}
