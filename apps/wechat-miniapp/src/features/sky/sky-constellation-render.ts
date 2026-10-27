import type { ConstellationFrame } from "./sky-constellation-scene";
import type { SkyArtworkRegistration, SkyArtworkView } from "./sky-artwork-registration";
import { skyArtworkViewParameters } from "./sky-artwork-registration";
import { constellationLineVisibility, constellationVisibility } from "./sky-constellation-visibility";
import { createSkyArtworkViewCuller, skyArtworkViewBounds } from "./sky-artwork-visibility";
import type { SkyRenderSurface, SkyLineSegment } from "./sky-render-surface";
import type { SkyVector } from "./sky-view-projection";
import { clipSkyLineCoordinatesToViewport } from "./sky-line-clip";
import { drawSkyReadyArtwork } from "./sky-ready-artwork";
import type { SkyReadyImageFrame } from "./sky-ready-presentation";

export interface SkyConstellationLayer {
  frame: ConstellationFrame | null;
  images: ReadonlyMap<string, object>;
  enabled: boolean;
  failed(image: object): void;
}
const dot = (a: SkyVector, b: SkyVector) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const normalized = (x: number, y: number, z: number): SkyVector => {
  const length = Math.hypot(x,y,z);
  return [x/length,y/length,z/length];
};

/** Clip an actual minor great-circle arc against a hemisphere. The crossing
 * lies on its chord's plane intersection; normalization returns it to the sphere. */
function hemisphere(a: SkyVector, b: SkyVector, normal: SkyVector): readonly [SkyVector,SkyVector] | null {
  const da=dot(a,normal),db=dot(b,normal);
  if (da<0 && db<0) return null;
  if (da>=0 && db>=0) return [a,b];
  const t=da/(da-db);
  const crossing=normalized(a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2]));
  return da<0 ? [crossing,b] : [a,crossing];
}

interface ConstellationArc {
  readonly a:SkyVector; readonly b:SkyVector; readonly mid:SkyVector; readonly cosine:number;
  radius?:number; children?:readonly [ConstellationArc,ConstellationArc];
}
const constellationArcFrames=new WeakMap<ConstellationFrame['lines'],Array<ConstellationArc|undefined>>();
function constellationArc(a:SkyVector,b:SkyVector):ConstellationArc {
  return {a,b,mid:normalized(a[0]+b[0],a[1]+b[1],a[2]+b[2]),cosine:dot(a,b)};
}

/** Spherical minor arcs at every scale. A narrow view may clip the rear
 * hemisphere early; full-sky views keep it and cull against the actual cap.
 * Adaptive subdivision separates invisible antipodal arcs before 2D clipping. */
export function constellationLineSegments(lines:ConstellationFrame['lines'],view:SkyArtworkView,width:number,height:number):SkyLineSegment[] {
  const params=skyArtworkViewParameters(view,width,height);
  if(!params)return [];
  const {scale,center}=params;
  const forwardOnly=Math.hypot(Math.max(center.x,width-center.x),Math.max(center.y,height-center.y))<scale;
  const viewport=skyArtworkViewBounds(view,width,height);
  if(!viewport)return [];
  const viewportCosine=Math.cos(viewport.radius),minSegmentCosine=Math.cos(Math.PI/90);
  // Only exact-time immutable frame geometry is reusable. The weak key retains
  // no historical frame; camera projections/clipping and subpixel refinement
  // stay local. Store children only for the existing <=2 degree angular split,
  // so zooming cannot accumulate a camera-specific fine subdivision tree.
  let prepared=Object.isFrozen(lines)?constellationArcFrames.get(lines):undefined;
  if(!prepared&&Object.isFrozen(lines)&&lines.every(pair=>Object.isFrozen(pair)&&pair.every(Object.isFrozen))){
    prepared=new Array(lines.length);constellationArcFrames.set(lines,prepared);
  }
  const result:SkyLineSegment[]=[];
  const arc=(node:ConstellationArc,depth:number,
    ax?:number,ay?:number,bx?:number,by?:number)=>{
    const {a,b,mid,cosine:ab}=node,midpointDot=dot(mid,viewport.center);
    if(midpointDot<viewportCosine){
      const radius=node.radius??=Math.acos(Math.max(-1,Math.min(1,ab)))/2;
      if(viewport.radius+radius<Math.PI&&midpointDot<Math.cos(viewport.radius+radius)-1e-9)return;
    }
    // Descendants receive their already projected endpoints by value. No
    // scratch storage can be overwritten by the sibling recursion.
    if(ax===undefined||ay===undefined){
      const d=1+dot(a,view.basis.forward);
      ax=center.x+scale*dot(a,view.basis.right)/d;
      ay=center.y-scale*dot(a,view.basis.up)/d;
    }
    if(bx===undefined||by===undefined){
      const d=1+dot(b,view.basis.forward);
      bx=center.x+scale*dot(b,view.basis.right)/d;
      by=center.y-scale*dot(b,view.basis.up)/d;
    }
    const d=1+dot(mid,view.basis.forward);
    const mx=center.x+scale*dot(mid,view.basis.right)/d;
    const my=center.y-scale*dot(mid,view.basis.up)/d;
    const angularSplit=ab<minSegmentCosine;
    if(depth<16&&(angularSplit||Math.hypot(mx-(ax+bx)/2,my-(ay+by)/2)>.35)){
      const children=angularSplit
        ?node.children??=( [constellationArc(a,mid),constellationArc(mid,b)] as const)
        :[constellationArc(a,mid),constellationArc(mid,b)] as const;
      arc(children[0],depth+1,ax,ay,mx,my);arc(children[1],depth+1,mx,my,bx,by);return;
    }
    const clipped=clipSkyLineCoordinatesToViewport(ax,ay,bx,by,width,height);if(clipped)result.push(clipped);
  };
  for(let index=0;index<lines.length;index++){
    const [a,b]=lines[index]!;
    const front=forwardOnly?hemisphere(a,b,view.basis.forward):[a,b] as const;
    if(!front)continue;
    // A hemisphere crossing depends on this camera; never reuse it as if it
    // were an original catalogue arc.
    const node=prepared&&front[0]===a&&front[1]===b
      ?prepared[index]??=constellationArc(a,b):constellationArc(front[0],front[1]);
    arc(node,0);
  }
  return result;
}

export interface SkyConstellationArtworkDraw { readonly image: object; readonly registration: SkyArtworkRegistration }

/** Select once from this exact frame/view; allocation protection and drawing
 * consume the same ready, visible artwork rather than the loader's whole map. */
export function prepareSkyConstellationArtwork(layer:SkyConstellationLayer,view:SkyArtworkView,
  width:number,height:number): readonly SkyConstellationArtworkDraw[] {
  if (!layer.frame || constellationLineVisibility(view.verticalFovDeg,layer.enabled)===0 ||
    constellationVisibility(view.verticalFovDeg,layer.enabled)===0) return [];
  const result: SkyConstellationArtworkDraw[] = [];
  let intersects: ReturnType<typeof createSkyArtworkViewCuller> | undefined;
  for(const figure of layer.frame.images){
    const image=layer.images.get(figure.source.id);
    if(image && (intersects ??= createSkyArtworkViewCuller(view,width,height))(figure.registration))
      result.push({image,registration:figure.registration});
  }
  return result;
}

export function drawSkyConstellations(surface:SkyRenderSurface,layer:SkyConstellationLayer,view:SkyArtworkView,
  width:number,height:number,observation:boolean,prepared?:readonly SkyConstellationArtworkDraw[],ready?:SkyReadyImageFrame){
  const lineOpacity=constellationLineVisibility(view.verticalFovDeg,layer.enabled);
  if(!layer.frame || lineOpacity===0)return;
  const opacity=constellationVisibility(view.verticalFovDeg,layer.enabled);
  for(const {image,registration} of prepared ?? prepareSkyConstellationArtwork(layer,view,width,height)){
    if(drawSkyReadyArtwork(surface,image,registration,view,.2*opacity,observation?'#D84A3C':'#C4CEDD',undefined,ready)==="FAILED")layer.failed(image);
  }
  surface.segments(constellationLineSegments(layer.frame.lines,view,width,height),observation?'#D84A3C':'#9BADCA',.35*lineOpacity);
}
