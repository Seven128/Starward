import {projectStellarMotionDirection,stellarHorizontalPosition,type StellarMotion} from '@starward/astronomy-core/stellar-vectors';
import type {StellarGeometryFrame} from '@starward/miniapp-contracts';
import {prepareSkyDirection,type PreparedSkyDirection,type SkyVector,type SkyDirectionProjector,type SkyDirectionProjection} from './sky-view-projection';
import {skyStarDisplayTransmission} from './sky-star-appearance';

export type SkyStellarMotionBuffer=[number,number,number,number,number,number];
/** The optional output belongs to the synchronous caller, never to a catalog. */
export type SkyStellarMotionReader=(index:number,output?:SkyStellarMotionBuffer)=>StellarMotion;

/** Qualification for retaining derived drawing input, not geometry admission. */
export function immutableSkyStellarGeometry(value:StellarGeometryFrame):boolean {
  return Object.isFrozen(value)&&Object.isFrozen(value.observer)&&Object.isFrozen(value.equatorialToEnu);
}

/** One exact-time transform shared by BSC and SAO. Immutable motion rows live
 * with their publication; these lazy values live only with its current frame.
 * Viewport rejection reads the original vector first. Surviving consumers use
 * the original angles, projection and display formulas without a round-trip change. */
export function createSkyStellarTransform(count:number,motionAt:SkyStellarMotionReader,geometry:StellarGeometryFrame){
  // Copy only the requested row into one frame-local scratch. Projected rays
  // remain independently owned; no second catalog or historical time is kept.
  const motion:SkyStellarMotionBuffer=[0,0,0,0,0,0];
  const vectors:Array<SkyVector|undefined>=new Array(count);
  const positions:Array<ReturnType<typeof stellarHorizontalPosition>|undefined>=new Array(count);
  const directions:Array<PreparedSkyDirection|null|undefined>=new Array(count);
  const transmissions:Array<number|undefined>=new Array(count);
  const vector=(index:number)=>vectors[index]??=Object.freeze(projectStellarMotionDirection(
    motionAt(index,motion),geometry.julianYears,geometry.equatorialToEnu));
  const position=(index:number)=>positions[index]??=Object.freeze(stellarHorizontalPosition(vector(index)));
  const displayDirection=(index:number)=>{
    if(directions[index]===undefined){
      const at=position(index);directions[index]=prepareSkyDirection(at.azimuthDeg,at.altitudeDeg);
    }
    return directions[index]!;
  };
  const displayTransmission=(index:number)=>transmissions[index]??=skyStarDisplayTransmission(position(index).altitudeDeg);
  const forEachProjected=(projector:SkyDirectionProjector,limit:number,magnitudeAt:(index:number)=>number,
    visit:(index:number,projection:SkyDirectionProjection)=>void,magnitudeOrdered=false)=>{
    for(let index=0;index<count;index++){
      const magnitude=magnitudeAt(index);
      if(!Number.isFinite(magnitude))continue;
      if(magnitude>=limit){if(magnitudeOrdered)break;continue;}
      let direction=directions[index];
      // Warm camera gestures use the already prepared original direction
      // directly. The conservative vector test only admits unseen candidates.
      if(direction===undefined){
        if(!projector.mayProjectVector(vector(index)))continue;
        direction=displayDirection(index);
      }
      if(!direction)continue;
      const projection=projector.prepared(direction);
      if(projection)visit(index,projection);
    }
  };
  return {position,displayDirection,displayTransmission,forEachProjected};
}
