import { pixcoord2VecNest } from "healpix-ts";
import { assertStellarRotation, type SkyObservationFrame } from "@starward/miniapp-contracts";
import { createSkyDirectionProjector, type SkyVector } from "./sky-view-projection";
import { skyEquatorialDirectionToEnu } from "./sky-observation-frame";
import type { SkyArtworkView } from "./sky-artwork-registration";

/** IVOA HiPS tiles use NESTED HEALPix pixels. JPEG/PNG tile image coordinates
 * use (column=nw,row=ne) in-face HEALPix axes; this is not a TAN image plane.
 * FITS rows have the opposite storage direction from JPEG/PNG. */
export interface SkyHipsTileGeometry {
  readonly order: number;
  readonly pixel: number;
  readonly divisions: number;
  /** Image row-major (ne,nw) grid; each vertex is an ICRS/EQJ unit direction. */
  readonly directions: readonly SkyVector[];
}

export function skyHipsTilePath(order: number, pixel: number, format: "jpeg" | "png"): string | null {
  if (!Number.isInteger(order) || order < 0 || order > 11 || !Number.isInteger(pixel) ||
    pixel < 0 || pixel >= 12 * 4**order) return null;
  return `Norder${order}/Dir${Math.floor(pixel/10_000)*10_000}/Npix${pixel}.${format === "jpeg" ? "jpg" : "png"}`;
}

/** Static sphere geometry is safe to reuse across time, observer and camera changes. */
export function prepareSkyHipsTile(order: number, pixel: number, divisions = 8): SkyHipsTileGeometry | null {
  if (!skyHipsTilePath(order,pixel,"png") || !Number.isInteger(divisions) || divisions < 2 || divisions > 16) return null;
  const directions: SkyVector[] = [];
  const nside = 2**order;
  for (let ne = 0; ne <= divisions; ne++) for (let nw = 0; nw <= divisions; nw++) {
    const vector = pixcoord2VecNest(nside,pixel,ne/divisions,nw/divisions);
    if (!Array.isArray(vector) || vector.length !== 3 || !vector.every(Number.isFinite) ||
      Math.abs(Math.hypot(...vector)-1) > 1e-6) return null;
    directions.push(Object.freeze(vector as SkyVector));
  }
  return Object.freeze({order,pixel,divisions,directions:Object.freeze(directions)});
}

/** Convert the current exact report frame to the single native sky camera.
 * Returned triangles are [screen x,y,image u,v]. The GPU clips the final
 * camera ray against the horizon, so a crossing cell keeps its visible part.
 */
export function projectSkyHipsTileMesh(
  tile: SkyHipsTileGeometry,
  equatorialToEnu: SkyObservationFrame["equatorialToEnu"],
  view: SkyArtworkView,
  width: number,
  height: number,
): number[] | null {
  if (!tile || !Number.isInteger(tile.divisions) || tile.divisions < 2 || tile.divisions > 16 ||
    tile.directions.length !== (tile.divisions+1)**2 || !Number.isFinite(width) || width <= 0 ||
    !Number.isFinite(height) || height <= 0) return null;
  try { assertStellarRotation(equatorialToEnu); } catch { return null; }
  const projector = createSkyDirectionProjector(view.basis,width,height,view.verticalFovDeg,view.center);
  if (!projector) return null;
  const div = tile.divisions;
  const points = tile.directions.map((q,index) => {
    const [east,north,up]=skyEquatorialDirectionToEnu(equatorialToEnu,q);
    const azimuth=(Math.atan2(east,north)*180/Math.PI+360)%360;
    const altitude=Math.asin(Math.max(-1,Math.min(1,up)))*180/Math.PI;
    const p=projector.unclipped(azimuth,altitude);
    return p ? {x:p.x,y:p.y,u:(index%(div+1))/div,v:Math.floor(index/(div+1))/div,up} : null;
  });
  const triangles:number[]=[];
  const push=(a:NonNullable<typeof points[number]>,b:NonNullable<typeof points[number]>,c:NonNullable<typeof points[number]>) => {
    if (a.up<=0 && b.up<=0 && c.up<=0) return;
    if (Math.max(a.x,b.x,c.x)<0 || Math.min(a.x,b.x,c.x)>width ||
      Math.max(a.y,b.y,c.y)<0 || Math.min(a.y,b.y,c.y)>height) return;
    triangles.push(a.x,a.y,a.u,a.v,b.x,b.y,b.u,b.v,c.x,c.y,c.u,c.v);
  };
  for(let row=0;row<div;row++)for(let column=0;column<div;column++){
    const i=row*(div+1)+column;
    const a=points[i],b=points[i+1],c=points[i+div+1],d=points[i+div+2];
    if(a&&b&&c)push(a,b,c);
    if(b&&d&&c)push(b,d,c);
  }
  return triangles;
}
