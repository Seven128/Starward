import {createSkyPanoramaMask} from "./sky-landscape-mask";
import {unprojectSkyPoint,type SkyViewBasis} from "./sky-view-projection";
import type {SkyLandscapeManifestData,SkyLandscapeResource} from "@starward/miniapp-contracts";

/** A real source-alpha patch inside a specified screen window. No image asset,
 * reconstructed label rule or rendered success is supplied by this fixture. */
export function labelInteriorForeground(width:number,height:number,
  view:{basis:SkyViewBasis;verticalFovDeg:number},x:number,y:number){
  const sw=1024,sh=512,ray=unprojectSkyPoint(x,y,view.basis,width,height,view.verticalFovDeg)!;
  const u=(Math.atan2(ray[0],ray[1])/(2*Math.PI)+1)%1,v=.5-Math.asin(ray[2])/Math.PI;
  const alpha=new Uint8Array(sw*sh),px=Math.floor(u*sw),py=Math.floor(v*sh);
  for(let row=py-1;row<=py+1;row++)for(let column=px-1;column<=px+1;column++)
    alpha[row*sw+(column+sw)%sw]=255;
  return createSkyPanoramaMask({projection:{seamAzimuthDeg:0}} as SkyLandscapeManifestData,
    {image:{width:sw,height:sh}} as SkyLandscapeResource,alpha);
}
