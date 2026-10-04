import { unprojectSkyPoint, type SkyVector } from "./sky-view-projection";
import { skyArtworkViewParameters, skyArtworkUvAtDirection, type SkyArtworkView, type SkyArtworkRegistration } from "./sky-artwork-registration";

const dot = (a: SkyVector, b: SkyVector) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

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
  const x=Math.max(Math.abs(parameters.center.x),Math.abs(width-parameters.center.x))/parameters.scale;
  const y=Math.max(Math.abs(parameters.center.y),Math.abs(height-parameters.center.y))/parameters.scale;
  const denominator=1-x*x-y*y;
  if (denominator<=1e-9) return null;
  return ([[-1,-1],[1,-1],[1,1],[-1,1]] as const).map(([sx,sy])=>{
    const ray=view.basis.forward.map((value,index)=>value+
      sx*2*x/denominator*view.basis.right[index]!+sy*2*y/denominator*view.basis.up[index]!) as unknown as SkyVector;
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

/** Conservative whole-image culling shared by requests and drawing. A surviving
 * cap is eligible, not proof of exact pixel coverage near a viewport corner. */
export function artworkIntersectsView(registration: SkyArtworkRegistration, view: SkyArtworkView,
  width: number, height: number): boolean {
  const viewport = skyArtworkViewBounds(view,width,height);
  if (!viewport) return false;
  const { center, radius } = registration.bounds;
  if (radius >= Math.PI/2) return true;
  // Never drop a partial image merely because its center/anchors left the view.
  if (Math.asin(Math.max(-1, Math.min(1, center[2]))) + radius < 0) return false;
  return viewport.radius + radius >= Math.PI || dot(center,view.basis.forward) >= Math.cos(viewport.radius + radius) - 1e-9;
}
