import { queryDiscInclusiveNest, vec2PixNest } from "healpix-ts";
import { assertStellarRotation, type SkyObservationFrame } from "@starward/miniapp-contracts";
import { skyArtworkViewParameters, type SkyArtworkView } from "./sky-artwork-registration";
import type { SkyVector } from "./sky-view-projection";
import { skyHipsTileIntersectsView } from "./sky-hips-tile-mesh";

export type SkyHipsTileSelection =
  | { state: "SELECTED"; order: number; pixels: readonly number[] }
  | { state: "ZOOM_IN" | "INVALID_VIEW" };

/** An inclusive spherical query may overfetch edge tiles. Keep the current
 * image layer within a bounded decoded 512² RGBA budget; the page can retain
 * coarser ready tiles while a higher order selection loads. */
export function selectSkyHipsTiles(input: {
  frame: SkyObservationFrame;
  view: SkyArtworkView;
  width: number;
  height: number;
  maxOrder: number;
  /** Existing optical clients start at order 1; bounded wide-field layers may
   * explicitly publish the twelve base faces at order 0. */
  minOrder?: 0 | 1;
  maxTiles?: number;
}): SkyHipsTileSelection {
  const { frame, view, width, height } = input;
  const minOrder=input.minOrder??1;
  const maxTiles=input.maxTiles ?? 12;
  if (!frame || !Number.isInteger(input.maxOrder) || input.maxOrder < minOrder || input.maxOrder > 11 ||
    !Number.isInteger(maxTiles) || maxTiles < 1 || maxTiles > 12) return {state:"INVALID_VIEW"};
  const parameters=skyArtworkViewParameters(view,width,height);
  if (!parameters) return {state:"INVALID_VIEW"};
  try { assertStellarRotation(frame.equatorialToEnu); }
  catch { return {state:"INVALID_VIEW"}; }
  const m=frame.equatorialToEnu;
  const toEqj=(q:SkyVector):[number,number,number]=>[
    m[0]*q[0]+m[3]*q[1]+m[6]*q[2],
    m[1]*q[0]+m[4]*q[1]+m[7]*q[2],
    m[2]*q[0]+m[5]*q[1]+m[8]*q[2],
  ];
  const center=toEqj(view.basis.forward);
  const radius=Math.min(Math.PI,2*Math.atan(Math.max(
    Math.hypot(parameters.center.x,parameters.center.y),
    Math.hypot(width-parameters.center.x,parameters.center.y),
    Math.hypot(parameters.center.x,height-parameters.center.y),
    Math.hypot(width-parameters.center.x,height-parameters.center.y),
  )/parameters.scale));
  if (!Number.isFinite(radius) || radius<=0) return {state:"INVALID_VIEW"};
  // healpix-ts inclusive disc queries require radius < 90 degrees. A wider
  // viewport is only bounded when this publication has all twelve base faces.
  if (radius>=Math.PI/2) return minOrder===0 && maxTiles===12
    ? {state:"SELECTED",order:0,pixels:Array.from({length:12},(_,index)=>index)}
    : {state:"ZOOM_IN"};
  // Spherical-cap area estimates a safe starting order without first asking
  // HEALPix to enumerate millions of fine pixels for a wide sky view.
  const areaFraction=(1-Math.cos(radius))/2;
  const estimated=Math.floor(.5*Math.log2(maxTiles/(12*areaFraction)));
  const start=Math.min(input.maxOrder,Math.max(minOrder,Number.isFinite(estimated)?estimated:minOrder));
  const query=(order:number)=>{
    const pixels:number[]=[];
    queryDiscInclusiveNest(2**order,center,radius,pixel=>{if(pixels.length<=maxTiles)pixels.push(pixel);});
    return pixels;
  };
  let accepted:{order:number;pixels:number[]}|null=null;
  for(let order=start;order>=minOrder;order--){
    const pixels=query(order);
    if(pixels.length<=maxTiles){accepted={order,pixels};break;}
  }
  if(!accepted)return {state:"ZOOM_IN"};
  // The area estimate is conservative near HEALPix cell boundaries. Try
  // progressively finer children while still respecting the same tile budget.
  for(let order=accepted.order+1;order<=input.maxOrder;order++){
    const pixels=query(order);
    if(pixels.length>maxTiles)break;
    accepted={order,pixels};
  }
  // Base-face publications keep their existing selection/consumer contract.
  // The optional W3 owner already suppresses its certified empty base faces.
  if(accepted.order>0){
    // A portrait viewport's conservative circular cap includes cells that the
    // current renderer cannot paint. Reuse its certified footprint before
    // spending image slots, retaining unknown geometry and the camera centre.
    const intersects=(order:number,pixel:number,middle:number)=>pixel===middle||
      skyHipsTileIntersectsView(order,pixel,frame.equatorialToEnu,view,width,height);
    const coarseOrder=accepted.order,coarseMiddle=vec2PixNest(2**coarseOrder,center);
    accepted.pixels=accepted.pixels.filter(pixel=>intersects(coarseOrder,pixel,coarseMiddle));
    // Probe only one level beyond the bounded cap result. This limits geometry
    // work even for extreme aspect ratios; no source-alpha or science mask is
    // used to withdraw demand, and the original twelve-image limit still owns it.
    if(accepted.order<input.maxOrder){
      const order=accepted.order+1,pixels:number[]=[],middle=vec2PixNest(2**order,center);
      queryDiscInclusiveNest(2**order,center,radius,pixel=>{
        if(pixels.length<=maxTiles&&intersects(order,pixel,middle))pixels.push(pixel);
      });
      if(pixels.length<=maxTiles)accepted={order,pixels};
    }
  }
  const middle=vec2PixNest(2**accepted.order,center);
  if(!accepted.pixels.includes(middle))return {state:"INVALID_VIEW"};
  accepted.pixels.sort((a,b)=>a-b);
  return {state:"SELECTED",order:accepted.order,pixels:accepted.pixels};
}
