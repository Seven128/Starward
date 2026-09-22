import { unprojectSkyPoint, type SkyVector } from "./sky-view-projection";
import { skyArtworkViewParameters, type SkyArtworkView, type SkyArtworkRegistration } from "./sky-artwork-registration";

/** Initial visual tuning: default naked-eye view and full dome remain clear.
 * Intent alone never bypasses the zoom threshold. Tune against native frames. */
export function constellationVisibility(verticalFovDeg: number, enabled: boolean): number {
  if (!enabled || !Number.isFinite(verticalFovDeg) || verticalFovDeg <= 0) return 0;
  const t=Math.max(0,Math.min(1,(40-verticalFovDeg)/15));
  return t*t*(3-2*t);
}
const dot=(a:SkyVector,b:SkyVector)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export function artworkIntersectsView(registration: SkyArtworkRegistration,view: SkyArtworkView,width:number,height:number):boolean {
  if (!skyArtworkViewParameters(view,width,height)) return false;
  const {center,radius}=registration.bounds;
  if (radius>=Math.PI/2) return true;
  // Whole image, including shared figures whose label/anchors are outside.
  if (Math.asin(Math.max(-1,Math.min(1,center[2])))+radius < 0) return false;
  const corners=[[0,0],[width,0],[0,height],[width,height]].map(([x,y])=>
    unprojectSkyPoint(x!,y!,view.basis,width,height,view.verticalFovDeg,view.center)!);
  const viewRadius=Math.max(...corners.map(ray=>Math.acos(Math.max(-1,Math.min(1,dot(ray,view.basis.forward))))));
  return viewRadius+radius >= Math.PI || dot(center,view.basis.forward) >= Math.cos(viewRadius+radius)-1e-9;
}
