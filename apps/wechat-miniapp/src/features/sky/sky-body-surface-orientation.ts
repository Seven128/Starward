import { validSkyBodyFrame, type SkyBodyFrame } from "@starward/miniapp-contracts";
import { skyHorizontalDirection, unprojectSkyPoint, type SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";

export interface SkyBodySurfaceOrientation {
  observerBody:readonly [number,number,number];
  rightBody:readonly [number,number,number];
  downBody:readonly [number,number,number];
}

const dot=(a:readonly number[],b:readonly number[])=>a.reduce((sum,v,i)=>sum+v*b[i]!,0);
const cross=(a:readonly number[],b:readonly number[]):readonly [number,number,number]=>
  [a[1]!*b[2]!-a[2]!*b[1]!,a[2]!*b[0]!-a[0]!*b[2]!,a[0]!*b[1]!-a[1]!*b[0]!];
const unit=(v:readonly number[]):readonly [number,number,number]|null=>{
  const length=Math.hypot(...v);return length>1e-12?v.map(x=>x/length) as [number,number,number]:null;
};

export function skyDirectionInBodyFrame(frame:SkyBodyFrame,
  direction:readonly [number,number,number]):readonly [number,number,number]{
  const east=cross(frame.poleEnu,frame.primeMeridianEnu);
  return [dot(direction,frame.primeMeridianEnu),dot(direction,east),dot(direction,frame.poleEnu)];
}

/** Inverse stereographic camera supplies local tangents even off the view centre. */
export function skyBodySurfaceOrientation(frame:SkyBodyFrame|unknown,
  azimuthDeg:number,altitudeDeg:number,disc:{x:number;y:number},basis:SkyViewBasis,
  width:number,height:number,verticalFovDeg:number,center?:SkyProjectionCenter):SkyBodySurfaceOrientation|null{
  const direction=skyHorizontalDirection(azimuthDeg,altitudeDeg);
  if(!validSkyBodyFrame(frame)||!direction)return null;
  const rightRay=unprojectSkyPoint(disc.x+.01,disc.y,basis,width,height,verticalFovDeg,center);
  const downRay=unprojectSkyPoint(disc.x,disc.y+.01,basis,width,height,verticalFovDeg,center);
  const tangent=(ray:readonly number[]|null)=>ray&&unit(ray.map((v,i)=>v-dot(ray,direction)*direction[i]!));
  const right=tangent(rightRay),down=tangent(downRay);
  if(!right||!down)return null;
  return {observerBody:skyDirectionInBodyFrame(frame,direction.map(v=>-v) as [number,number,number]),
    rightBody:skyDirectionInBodyFrame(frame,right),downBody:skyDirectionInBodyFrame(frame,down)};
}

/** A latitude-only profile needs the measured pole, but makes no longitude claim. */
export function skyAxisymmetricBodyFrame(pole:readonly [number,number,number]|null,
  azimuthDeg:number,altitudeDeg:number):SkyBodyFrame|null{
  const direction=skyHorizontalDirection(azimuthDeg,altitudeDeg);
  if(!pole||!direction||pole.some(value=>!Number.isFinite(value))||
    Math.abs(Math.hypot(...pole)-1)>.001)return null;
  const observer=direction.map(value=>-value);
  const equatorial=unit(observer.map((value,index)=>value-dot(observer,pole)*pole[index]!));
  const reference=Math.abs(pole[2])<.9?[0,0,1]:[1,0,0];
  const meridian=equatorial??unit(cross(reference,pole));
  if(!meridian)return null;
  return {primeMeridianEnu:meridian,poleEnu:pole};
}
