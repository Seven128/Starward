import type { ConstellationFrame } from "./sky-constellation-scene";
import type { SkyArtworkView } from "./sky-artwork-registration";
import { skyArtworkViewParameters } from "./sky-artwork-registration";
import { constellationVisibility } from "./sky-constellation-visibility";
import type { SkyVector } from "./sky-view-projection";

export interface SkyConstellationLabel {
  readonly iau: string;
  readonly nameZh: string;
  readonly nameEn: string;
  readonly x: number;
  readonly y: number;
  readonly opacity: number;
}

const dot=(a:SkyVector,b:SkyVector)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

/** Presentation only. The frame owns identity/time and the same camera basis
 * owns lines, stars and names. Labels never substitute for object picking. */
export function projectConstellationLabels(frame:ConstellationFrame|null,view:SkyArtworkView,
  width:number,height:number,enabled:boolean,obstacles:readonly (readonly [number,number])[]=[]):SkyConstellationLabel[] {
  const opacity=constellationVisibility(view.verticalFovDeg,enabled);
  const params=skyArtworkViewParameters(view,width,height);
  if (!frame || !params || opacity<.14 || !Number.isFinite(height) || height<=0) return [];
  const {scale,center}=params;
  const candidates:SkyConstellationLabel[]=[];
  for (const label of frame.labels) {
    const ray=label.direction;
    const denominator=1+dot(ray,view.basis.forward);
    if (!(denominator>1e-9)) continue;
    const x=center.x+scale*dot(ray,view.basis.right)/denominator;
    const y=center.y-scale*dot(ray,view.basis.up)/denominator;
    const side=Math.max(32,label.nameZh.length*6+8);
    if (x<side || x>width-side || y<Math.max(100,height*.12) || y>height-125 ||
      (x<120 && y>height-215)) continue;
    candidates.push({iau:label.iau,nameZh:label.nameZh,nameEn:label.nameEn,x,y,opacity});
  }
  candidates.sort((a,b)=>Math.hypot(a.x-center.x,a.y-center.y)-Math.hypot(b.x-center.x,b.y-center.y) || a.iau.localeCompare(b.iau));
  const result:SkyConstellationLabel[]=[];
  for (const candidate of candidates) {
    if (obstacles.some(([x,y])=>Math.hypot(candidate.x-x,candidate.y-y)<60) ||
      result.some(label=>Math.hypot(label.x-candidate.x,label.y-candidate.y)<72)) continue;
    result.push(candidate);
    if(result.length===6)break;
  }
  return result;
}
