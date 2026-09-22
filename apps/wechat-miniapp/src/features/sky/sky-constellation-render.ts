import type { ConstellationFrame } from "./sky-constellation-scene";
import type { SkyArtworkView } from "./sky-artwork-registration";
import { skyArtworkViewParameters } from "./sky-artwork-registration";
import { artworkIntersectsView, constellationVisibility } from "./sky-constellation-visibility";
import type { SkyRenderSurface, SkyLineSegment } from "./sky-render-surface";
import type { SkyVector } from "./sky-view-projection";

export interface SkyConstellationLayer {
  frame: ConstellationFrame | null;
  images: ReadonlyMap<string, object>;
  enabled: boolean;
  failed(image: object): void;
}
const dot = (a: SkyVector, b: SkyVector) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const normalized = (a: SkyVector): SkyVector => {
  const length = Math.hypot(...a);
  return [a[0]/length,a[1]/length,a[2]/length];
};

/** Clip an actual minor great-circle arc against a hemisphere. The crossing
 * lies on its chord's plane intersection; normalization returns it to the sphere. */
function hemisphere(a: SkyVector, b: SkyVector, normal: SkyVector): readonly [SkyVector,SkyVector] | null {
  const da=dot(a,normal),db=dot(b,normal);
  if (da<0 && db<0) return null;
  if (da>=0 && db>=0) return [a,b];
  const t=da/(da-db);
  const crossing=normalized([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2])]);
  return da<0 ? [crossing,b] : [a,crossing];
}

/** Liang–Barsky clipping preserves a crossing whose two endpoints are offscreen. */
function viewport(a: readonly [number,number], b: readonly [number,number], width:number,height:number):SkyLineSegment|null {
  const dx=b[0]-a[0],dy=b[1]-a[1];let start=0,end=1;
  for(const [p,q] of [[-dx,a[0]],[dx,width-a[0]],[-dy,a[1]],[dy,height-a[1]]] as const){
    if(p===0){if(q<0)return null;continue;}
    const t=q/p;if(p<0)start=Math.max(start,t);else end=Math.min(end,t);
    if(start>end)return null;
  }
  return [a[0]+start*dx,a[1]+start*dy,a[0]+end*dx,a[1]+end*dy];
}

/** Detail-scale constellation arcs only. The complete viewport must fit within
 * the forward hemisphere, so clipping its antipodal half cannot remove a
 * visible arc. No name/label position participates in line visibility. */
export function constellationLineSegments(lines:ConstellationFrame['lines'],view:SkyArtworkView,width:number,height:number):SkyLineSegment[] {
  const params=skyArtworkViewParameters(view,width,height);
  if(!params)return [];
  const {scale,center}=params;
  if(Math.hypot(Math.max(center.x,width-center.x),Math.max(center.y,height-center.y))>=scale)return [];
  const project=(ray:SkyVector):readonly [number,number]=>{
    const d=1+dot(ray,view.basis.forward);
    return [center.x+scale*dot(ray,view.basis.right)/d,center.y-scale*dot(ray,view.basis.up)/d];
  };
  const result:SkyLineSegment[]=[];
  const arc=(a:SkyVector,b:SkyVector,depth:number)=>{
    const pa=project(a),pb=project(b),mid=normalized([a[0]+b[0],a[1]+b[1],a[2]+b[2]]),pm=project(mid);
    // Subpixel chord error and <=2° steps, bounded even at maximum zoom.
    if(depth<16 && (dot(a,b)<Math.cos(Math.PI/90) || Math.hypot(pm[0]-(pa[0]+pb[0])/2,pm[1]-(pa[1]+pb[1])/2)>.35)){
      arc(a,mid,depth+1);arc(mid,b,depth+1);return;
    }
    const clipped=viewport(pa,pb,width,height);if(clipped)result.push(clipped);
  };
  for(const [a,b] of lines){
    const above=hemisphere(a,b,[0,0,1]);if(!above)continue;
    const front=hemisphere(above[0],above[1],view.basis.forward);if(front)arc(front[0],front[1],0);
  }
  return result;
}

export function drawSkyConstellations(surface:SkyRenderSurface,layer:SkyConstellationLayer,view:SkyArtworkView,
  width:number,height:number,observation:boolean){
  const opacity=constellationVisibility(view.verticalFovDeg,layer.enabled);
  if(!layer.frame || opacity===0)return;
  for(const figure of layer.frame.images){
    const image=layer.images.get(figure.source.id);
    if(image && artworkIntersectsView(figure.registration,view,width,height) &&
      !surface.artwork(image,figure.registration,view,.2*opacity,observation?'#D84A3C':'#C4CEDD'))layer.failed(image);
  }
  surface.segments(constellationLineSegments(layer.frame.lines,view,width,height),observation?'#D84A3C':'#9BADCA',.35*opacity);
}
