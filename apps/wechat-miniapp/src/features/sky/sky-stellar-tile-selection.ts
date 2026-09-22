import { assertStellarGeometryFrame, type StellarGeometryFrame, type StellarGeometryObserver, type SaoTileReference } from '@starward/miniapp-contracts';
import { skyStarAppearance } from './sky-star-appearance';
import { skyProjectionScale, validBasis, type SkyViewBasis } from './sky-view-projection';
import type { SkyProjectionCenter } from './sky-viewport';

/** Bounds belong to an integrity-validated static publication, in EQJ at J2000.
 * Selection never treats a tile center as an actual star or a camera heading.
 */
export type StellarTileBounds = Pick<SaoTileReference,'id'|'centerEqj'|'radiusRad'|'maxMotionRadPerYear'|'minMagnitude'>;

export function selectSkyStellarTiles<T extends StellarTileBounds>(tiles: readonly T[], input: {
  frame: StellarGeometryFrame;
  expected: { catalog: {catalogVersion:string;catalogHash:string}; at:string; observer:StellarGeometryObserver };
  basis: SkyViewBasis;
  width: number;
  height: number;
  verticalFovDeg: number;
  center?: SkyProjectionCenter;
}): readonly T[] {
  assertStellarGeometryFrame(input.frame,input.expected);
  const {width,height,verticalFovDeg,basis}=input;
  if(!validBasis(basis)||!Number.isFinite(width)||width<=0) throw Error('stellar_tile_view_invalid');
  const scale=skyProjectionScale(height,verticalFovDeg);
  const center=input.center??{x:width/2,y:height/2};
  if(scale===null||![center.x,center.y].every(Number.isFinite)) throw Error('stellar_tile_view_invalid');
  const radius=Math.max(...[[0,0],[width,0],[0,height],[width,height]].map(([x,y])=>Math.hypot(x!-center.x,y!-center.y)));
  const angularRadius=2*Math.atan(radius/scale);
  const m=input.frame.equatorialToEnu, f=basis.forward;
  // Inverse of the validated rotation is its transpose. The report matrix maps
  // EQJ -> ENU; applying it again would point at a different region of the sky.
  const eqjForward=[m[0]*f[0]+m[3]*f[1]+m[6]*f[2],m[1]*f[0]+m[4]*f[1]+m[7]*f[2],m[2]*f[0]+m[5]*f[1]+m[8]*f[2]];
  return tiles.filter(tile=>{
    if(!skyStarAppearance(tile.minMagnitude,verticalFovDeg)) return false;
    // Linear tangent motion changes a unit direction by atan(|v| * |years|).
    // Derive from the current frame instead of imposing the trial's +/-100y cap.
    const bound=Math.min(Math.PI,angularRadius+tile.radiusRad+Math.atan(tile.maxMotionRadPerYear*Math.abs(input.frame.julianYears)));
    const alignment=tile.centerEqj.reduce((sum,v,i)=>sum+v*eqjForward[i]!,0);
    return alignment>=Math.cos(bound)-1e-12;
  });
}
