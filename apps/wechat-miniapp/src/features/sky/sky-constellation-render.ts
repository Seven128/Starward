import type { ConstellationFrame } from "./sky-constellation-scene";
import type { SkyArtworkView } from "./sky-artwork-registration";
import { skyArtworkViewParameters } from "./sky-artwork-registration";
import { constellationLineVisibility, constellationVisibility } from "./sky-constellation-visibility";
import { artworkIntersectsView, skyArtworkViewBounds } from "./sky-artwork-visibility";
import type { SkyRenderSurface, SkyLineSegment } from "./sky-render-surface";
import type { SkyVector } from "./sky-view-projection";
import { clipSkyLineToViewport } from "./sky-line-clip";

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

/** Detail-scale constellation arcs only. The complete viewport must fit within
 * the forward hemisphere, so clipping its antipodal half cannot remove a
 * visible arc. No name/label position participates in line visibility. */
export function constellationLineSegments(lines:ConstellationFrame['lines'],view:SkyArtworkView,width:number,height:number):SkyLineSegment[] {
  const params=skyArtworkViewParameters(view,width,height);
  if(!params)return [];
  const {scale,center}=params;
  if(Math.hypot(Math.max(center.x,width-center.x),Math.max(center.y,height-center.y))>=scale)return [];
  const viewport=skyArtworkViewBounds(view,width,height);
  if(!viewport)return [];
  const project=(ray:SkyVector):readonly [number,number]=>{
    const d=1+dot(ray,view.basis.forward);
    return [center.x+scale*dot(ray,view.basis.right)/d,center.y-scale*dot(ray,view.basis.up)/d];
  };
  const result:SkyLineSegment[]=[];
  const arc=(a:SkyVector,b:SkyVector,depth:number)=>{
    const mid=normalized([a[0]+b[0],a[1]+b[1],a[2]+b[2]]);
    const radius=Math.acos(Math.max(-1,Math.min(1,dot(a,b))))/2;
    // Every point of this minor arc lies in its midpoint cap. Within the
    // forward hemisphere that cap projects to a convex disc, so its chords
    // cannot cross the viewport either. Reject before fine tessellation; an
    // offscreen pair of endpoints alone cannot safely reject a curved arc.
    if(viewport.radius+radius<Math.PI &&
      dot(mid,viewport.center)<Math.cos(viewport.radius+radius)-1e-9)return;
    const pa=project(a),pb=project(b),pm=project(mid);
    // Subpixel chord error and <=2° steps, bounded even at maximum zoom.
    if(depth<16 && (dot(a,b)<Math.cos(Math.PI/90) || Math.hypot(pm[0]-(pa[0]+pb[0])/2,pm[1]-(pa[1]+pb[1])/2)>.35)){
      arc(a,mid,depth+1);arc(mid,b,depth+1);return;
    }
    const clipped=clipSkyLineToViewport(pa,pb,width,height);if(clipped)result.push(clipped);
  };
  for(const [a,b] of lines){
    const above=hemisphere(a,b,[0,0,1]);if(!above)continue;
    const front=hemisphere(above[0],above[1],view.basis.forward);if(front)arc(front[0],front[1],0);
  }
  return result;
}

export function drawSkyConstellations(surface:SkyRenderSurface,layer:SkyConstellationLayer,view:SkyArtworkView,
  width:number,height:number,observation:boolean){
  const lineOpacity=constellationLineVisibility(view.verticalFovDeg,layer.enabled);
  if(!layer.frame || lineOpacity===0)return;
  const opacity=constellationVisibility(view.verticalFovDeg,layer.enabled);
  for(const figure of opacity>0?layer.frame.images:[]){
    const image=layer.images.get(figure.source.id);
    if(image && artworkIntersectsView(figure.registration,view,width,height) &&
      !surface.artwork(image,figure.registration,view,.2*opacity,observation?'#D84A3C':'#C4CEDD'))layer.failed(image);
  }
  surface.segments(constellationLineSegments(layer.frame.lines,view,width,height),observation?'#D84A3C':'#9BADCA',.35*lineOpacity);
}
