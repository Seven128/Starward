import { skyHorizontalDirection, skyProjectionScale, projectSkyDirectionUnclipped, type SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";
import type { SkySolarLight } from "./sky-solar-light";

export interface SkyAngularDisc {
  readonly x: number;
  readonly y: number;
  readonly radiusPx: number;
}

export interface SkyPhaseDisc extends SkyAngularDisc {
  readonly illuminatedFraction: number;
  /** Sunward unit tangent in screen x/right, y/down coordinates. */
  readonly sunward: readonly [number, number];
}

const dot = (a: readonly number[], b: readonly number[]) => a.reduce((sum, value, index) => sum + value * b[index]!, 0);

/** One observer-centred angular scale for solar, lunar and planetary discs. */
export function projectSkyAngularDisc(input: {azimuthDeg:number;altitudeDeg:number;angularDiameterDeg:number},
  basis:SkyViewBasis,width:number,height:number,verticalFovDeg:number,center?:SkyProjectionCenter):SkyAngularDisc|null{
  const direction=skyHorizontalDirection(input.azimuthDeg,input.altitudeDeg);
  const projection=projectSkyDirectionUnclipped(input.azimuthDeg,input.altitudeDeg,basis,width,height,verticalFovDeg,center);
  const scale=skyProjectionScale(height,verticalFovDeg);
  if(!direction||!projection||scale===null||!Number.isFinite(input.angularDiameterDeg)||input.angularDiameterDeg<=0)return null;
  const denominator=1+dot(direction,basis.forward);
  if(denominator<=1e-9)return null;
  const radiusPx=scale/denominator*input.angularDiameterDeg*Math.PI/360;
  if(!Number.isFinite(radiusPx)||radiusPx<=0||projection.x+radiusPx<0||projection.x-radiusPx>width||
    projection.y+radiusPx<0||projection.y-radiusPx>height)return null;
  return {x:projection.x,y:projection.y,radiusPx};
}

/** Shared conformal projection for Moon and planetary globes; only the data source differs. */
export function projectSkyPhaseDisc(input: {
  azimuthDeg: number; altitudeDeg: number; angularDiameterDeg: number; illuminatedFraction: number;
}, sun: SkySolarLight, basis: SkyViewBasis, width: number, height: number,
verticalFovDeg: number, center?: SkyProjectionCenter): SkyPhaseDisc | null {
  const direction = skyHorizontalDirection(input.azimuthDeg,input.altitudeDeg);
  const disc = projectSkyAngularDisc(input,basis,width,height,verticalFovDeg,center);
  if (!direction || !disc) return null;
  const denominator = 1 + dot(direction,basis.forward);
  const along = dot(sun.direction,direction);
  const tangent = sun.direction.map((value,index)=>value-along*direction[index]!) as [number,number,number];
  const derivative = (axis: readonly number[], ySign: number) =>
    ySign * (dot(tangent,axis)*denominator-dot(direction,axis)*dot(tangent,basis.forward));
  const lightX = derivative(basis.right,1), lightY = derivative(basis.up,-1);
  const lightLength = Math.hypot(lightX,lightY);
  return { ...disc, illuminatedFraction: input.illuminatedFraction,
    sunward: lightLength > 1e-12 ? [lightX/lightLength,lightY/lightLength] : [1,0] };
}
