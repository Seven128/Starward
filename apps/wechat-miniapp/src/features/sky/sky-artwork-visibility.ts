import { unprojectSkyPoint, type SkyVector } from "./sky-view-projection";
import { skyArtworkViewParameters, skyArtworkUvAtDirection, type SkyArtworkView, type SkyArtworkRegistration } from "./sky-artwork-registration";
import { skyArtworkRasterBounds } from "./sky-artwork-raster-bounds";
import { skyImageDisplayEmptyRanges, type SkyImageDisplaySupport } from "@starward/miniapp-contracts";

const dot = (a: SkyVector, b: SkyVector) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

/** A convex ray cone lies in every inward edge half-space. Separating either
 * cone on one such plane proves disjointness, including long narrow images
 * whose circular bounds overlap. An edge crossing remains eligible. */
function conesSeparated(a: readonly SkyVector[], b: readonly SkyVector[]): boolean {
  const centre = a.reduce((sum, ray) => sum.map((value, i) => value + ray[i]!) as [number, number, number], [0, 0, 0]);
  return a.some((ray, i) => {
    const next = a[(i + 1) % a.length]!;
    const normal: SkyVector = [ray[1]*next[2]-ray[2]*next[1], ray[2]*next[0]-ray[0]*next[2], ray[0]*next[1]-ray[1]*next[0]];
    const length = Math.hypot(...normal), orientation = Math.sign(dot(normal, centre));
    return length > 1e-10 && orientation !== 0 && b.every(point => orientation * dot(normal, point) < -1e-9 * length);
  });
}

/** The viewport lies inside this circular stereographic footprint, including
 * an offset projection center. This cap is a bound, not its rectangular edge. */
export function skyArtworkViewBounds(view: SkyArtworkView, width: number, height: number) {
  if (!skyArtworkViewParameters(view,width,height)) return null;
  const corners = [[0,0], [width,0], [0,height], [width,height]].map(([x,y]) =>
    unprojectSkyPoint(x!,y!,view.basis,width,height,view.verticalFovDeg,view.center)!);
  return {center:view.basis.forward,radius:Math.max(...corners.map(ray =>
    Math.acos(Math.max(-1,Math.min(1,dot(ray,view.basis.forward))))))};
}

/** Enclose a <90° viewport by a rectangle on its forward tangent plane.
 * Stereographic rays have tangent coordinates 2q/(1-|q|²); bounding both
 * numerators and their minimum positive denominator includes curved edges,
 * not just the four viewport corners. Wider views remain uncertified. */
export function skyArtworkViewRayHull(view:SkyArtworkView,width:number,height:number):readonly SkyVector[]|null {
  const parameters=skyArtworkViewParameters(view,width,height);
  if (!parameters) return null;
  const x=[-parameters.center.x/parameters.scale,(width-parameters.center.x)/parameters.scale] as const;
  const y=[(parameters.center.y-height)/parameters.scale,parameters.center.y/parameters.scale] as const;
  const maxSquared=(axis:readonly number[])=>Math.max(...axis.map(value=>value*value));
  const minSquared=(axis:readonly number[])=>axis[0]!<=0&&axis[1]!>=0?0:Math.min(...axis.map(value=>value*value));
  const denominatorMin=1-maxSquared(x)-maxSquared(y),denominatorMax=1-minSquared(x)-minSquared(y);
  if (denominatorMin<=1e-9) return null;
  // Bound each signed side separately. Mirroring an offset viewport around its
  // center needlessly includes source color outside the actual local view.
  const range=(axis:readonly [number,number])=>{
    const lo=2*axis[0]/(axis[0]<0?denominatorMin:denominatorMax);
    const hi=2*axis[1]/(axis[1]>0?denominatorMin:denominatorMax);
    // Keep boundary rays inside despite local-plane inverse round-off and the
    // shader's float32 camera uniforms: four ulps at unit-vector scale.
    const padding=4*2**-23*Math.max(1,Math.abs(lo),Math.abs(hi));
    return [lo-padding,hi+padding] as const;
  };
  const tx=range(x),ty=range(y);
  return ([[tx[0],ty[0]],[tx[1],ty[0]],[tx[1],ty[1]],[tx[0],ty[1]]] as const).map(([right,up])=>{
    const ray=view.basis.forward.map((value,index)=>value+
      right*view.basis.right[index]!+up*view.basis.up[index]!) as unknown as SkyVector;
    const length=Math.hypot(...ray);
    return ray.map(value=>value/length) as unknown as SkyVector;
  });
}

/** The registered UV half-spaces are convex ray cones. Containing all hull
 * corners proves full coverage, with a margin for float boundary uncertainty. */
export function artworkCoversRayHull(registration:SkyArtworkRegistration,directions:readonly SkyVector[]|null):boolean {
  return Boolean(directions?.length && directions.every(ray=>{
    const uv=skyArtworkUvAtDirection(registration,ray);
    return uv && uv.every(value=>value>1e-8&&value<1-1e-8);
  }));
}

/** Reject only a certified color-empty crop before additive survey submission.
 * Source black remains valid data; it just cannot replace a catalog cue through
 * this display. Missing metadata/wide-view uncertainty stays eligible. The
 * shared ray hull encloses curved/rolled/offset viewport edges. One source
 * texel around its UV bounds retains LINEAR-filter neighbors and float margins.
 * Occupied cells are conservative eligibility, not proof of visible structure. */
export function artworkDisplaySupportIntersectsView(registration: SkyArtworkRegistration, view: SkyArtworkView,
  width: number, height: number, support?: SkyImageDisplaySupport): boolean {
  if (!support) return true;
  const hull = skyArtworkViewRayHull(view, width, height);
  if (!hull) return true;
  const points = hull.map(ray => skyArtworkUvAtDirection(registration, ray));
  if (points.some(point => !point || !point.every(Number.isFinite))) return true;
  const uv = points as Array<readonly [number, number]>;
  const centre = [0, 1].map(axis => uv.reduce((sum, point) => sum + point[axis]!, 0) / uv.length);
  const size = support.version === "encoded-rgb-support-v1" ? support.cellSize : 1;
  const cells = support.pixels / size;
  const min = [0, 1].map(axis => Math.max(0, Math.floor((Math.min(...uv.map(point => point[axis]!)) * support.pixels - 1) / size)));
  const max = [0, 1].map(axis => Math.min(cells - 1, Math.floor((Math.max(...uv.map(point => point[axis]!)) * support.pixels + 1) / size)));
  const intersects = (x0:number,x1:number,y0:number,y1:number) => {
    const left=(x0-1)/support.pixels,right=(x1+1)/support.pixels;
    const top=(y0-1)/support.pixels,bottom=(y1+1)/support.pixels;
    const corners=[[left,top],[right,top],[right,bottom],[left,bottom]];
    // UV is a projective map of the positive ray cone, hence convex here.
    // The AABB supplies rectangle separating axes; hull edge half-spaces
    // reject occupied cells outside a rolled viewport's slanted boundary.
    const outside=uv.some((point,i)=>{
      const next=uv[(i+1)%uv.length]!,dx=next[0]-point[0],dy=next[1]-point[1];
      const side=(target:readonly number[])=>dx*(target[1]!-point[1])-dy*(target[0]!-point[0]);
      const sign=Math.sign(side(centre)),length=Math.hypot(dx,dy);
      return sign!==0&&corners.every(corner=>sign*side(corner)<-1e-8*length);
    });
    return !outside;
  };
  if (support.version === "encoded-rgb-runs-v1") {
    const empty = skyImageDisplayEmptyRanges(support);
    let first = 0;
    for (let y=min[1]!;y<=max[1]!;y++) {
      const base=y*support.pixels,start=base+min[0]!,end=base+max[0]!+1;
      while (first<empty.length && empty[first]![1]<=start) first++;
      let cursor=start;
      for (let i=first;i<empty.length && empty[i]![0]<end;i++) {
        const [left,right]=empty[i]!;
        if (left>cursor && intersects(cursor-base,Math.min(left,end)-base,y,y+1)) return true;
        cursor=Math.max(cursor,right);
        if (cursor>=end) break;
      }
      if (cursor<end && intersects(cursor-base,end-base,y,y+1)) return true;
    }
  } else for (let y = min[1]!; y <= max[1]!; y++) for (let x = min[0]!; x <= max[0]!; x++) {
    const index = y * cells + x;
    if (Number.parseInt(support.occupiedHex[Math.floor(index / 4)]!, 16) & (1 << (3 - index % 4)) &&
      intersects(x*size,(x+1)*size,y*size,(y+1)*size)) return true;
  }
  return false;
}

/** Conservative whole-image culling shared by requests and drawing. A surviving
 * cap is eligible, not proof of exact pixel coverage near a viewport corner. */
export function artworkIntersectsView(registration: SkyArtworkRegistration, view: SkyArtworkView,
  width: number, height: number): boolean {
  const viewport = skyArtworkViewBounds(view,width,height);
  if (!viewport) return false;
  // The tangent-plane hull below intentionally over-encloses curved viewport
  // edges. Reuse the renderer's complete projected cap to reject a certified
  // empty rectangle before requests, decode retention or texture upload. Keep
  // its outward pixel/float margin; an unbounded cap stays eligible. The source
  // image, UVs and scientific coverage do not change.
  const raster = skyArtworkRasterBounds(registration,view,width,height,Math.ceil(width),Math.ceil(height));
  if (raster && (raster.width === 0 || raster.height === 0)) return false;
  const { center, radius } = registration.bounds;
  if (radius >= Math.PI/2) return true;
  // Never drop a partial image merely because its center/anchors left the view.
  if (viewport.radius + radius < Math.PI && dot(center,view.basis.forward) < Math.cos(viewport.radius + radius) - 1e-9) return false;
  const hull = skyArtworkViewRayHull(view, width, height);
  // This enclosure certifies only a forward-hemisphere local viewport. Wider
  // views keep the previous conservative cap, never a corner-only rejection.
  return !hull || !(conesSeparated(registration.corners, hull) || conesSeparated(hull, registration.corners));
}
