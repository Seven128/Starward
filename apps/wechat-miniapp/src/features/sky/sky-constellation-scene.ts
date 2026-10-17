import { assertStellarGeometryFrame, type ConstellationCatalogPublication, type ConstellationArtwork,
  type SkyScene } from "@starward/miniapp-contracts";
import { createStellarMotion, stellarDirectionAt, rotateStellarDirection, type StellarMotion } from "@starward/astronomy-core/stellar-vectors";
import { exactSkyTimeFrame } from "./sky-time-frame";
import { registerSkyArtwork, type SkyArtworkRegistration } from "./sky-artwork-registration";
import type { SkyVector } from "./sky-view-projection";

export interface ConstellationFrame {
  readonly at: string;
  readonly lines: readonly (readonly [SkyVector,SkyVector])[];
  readonly images: readonly { readonly source: ConstellationArtwork; readonly registration: SkyArtworkRegistration }[];
  readonly labels: readonly { readonly iau: string; readonly nameEn: string; readonly nameZh: string; readonly direction: SkyVector }[];
}
/** Publication-static membership and UVs share the existing weak lifetime.
 * Exact-time directions and registration are still rebuilt for every instant. */
function prepareConstellationCatalog(catalog: ConstellationCatalogPublication) {
  return {
    motions: new Map<number,StellarMotion>(catalog.stars.map(s=>[s[0],createStellarMotion({raDeg:s[1],decDeg:s[2],
      pmRaCosDecArcsecYr:s[3]/1000,pmDecArcsecYr:s[4]/1000})])),
    lines: catalog.constellations.flatMap(c=>c.lines),
    labels: catalog.constellations.map(definition=>({definition,ids:[...new Set(definition.lines.flat())]})),
    images: catalog.images.map(source=>({source,anchors:source.anchors.map(a=>({hip:a.hip,
      uv:[a.pixel[0]/source.width,a.pixel[1]/source.height] as const}))})),
  };
}
const models = new WeakMap<ConstellationCatalogPublication, ReturnType<typeof prepareConstellationCatalog>>();
// Per report, retain only the current instant. Gestures reuse astronomy; moving
// the time ruler never retains 49 copies of every constellation point.
const frames = new WeakMap<SkyScene,{catalog:ConstellationCatalogPublication; frame:ConstellationFrame}>();

/** The caller supplies the original report scene, so failure to load the separate
 * BSC photometry payload cannot erase otherwise valid observation geometry. */
export function resolveConstellationFrame(catalog: ConstellationCatalogPublication | undefined,
  scene: SkyScene | undefined, at: string | undefined): ConstellationFrame | null {
  if (!catalog || !scene?.catalog || !scene.observer || !at) return null;
  const frame = exactSkyTimeFrame(scene.frames,at);
  if (frame?.state !== "AVAILABLE" || !frame.geometry) return null;
  try {
    assertStellarGeometryFrame(frame.geometry,{catalog:scene.catalog,observer:scene.observer,at});
    const cached=frames.get(scene);
    if (cached?.catalog === catalog && cached.frame.at === at) return cached.frame;
    let model=models.get(catalog);
    if (!model) {
      model=prepareConstellationCatalog(catalog);
      models.set(catalog,model);
    }
    // Propagate from the publication epoch; both catalog and frame now use J2000.
    const years=frame.geometry.julianYears+(2000-catalog.astrometry.epochJulianYear);
    const directions=new Map<number,SkyVector>();
    for (const [hip,motion] of model.motions) directions.set(hip,Object.freeze(rotateStellarDirection(
      stellarDirectionAt(motion,years),frame.geometry.equatorialToEnu)));
    const lines=model.lines.map(([a,b])=>Object.freeze([directions.get(a)!,directions.get(b)!] as const));
    // Each identity gets its own label even when several definitions share an
    // illustration. Use its unique line stars rather than an image midpoint.
    const labels: ConstellationFrame["labels"][number][]=[];
    for (const {definition:c,ids} of model.labels) {
      const sum:[number,number,number]=[0,0,0];
      for (const id of ids) {
        const ray=directions.get(id)!;
        sum[0]+=ray[0];sum[1]+=ray[1];sum[2]+=ray[2];
      }
      const length=Math.hypot(...sum);
      if (!(length>1e-6)) continue;
      labels.push(Object.freeze({iau:c.iau,nameEn:c.nameEn,nameZh:c.nameZh,
        direction:Object.freeze([sum[0]/length,sum[1]/length,sum[2]/length] as SkyVector)}));
    }
    const images: ConstellationFrame["images"][number][]=[];
    for (const {source,anchors} of model.images) {
      const registration=registerSkyArtwork(anchors.map(a=>({uv:a.uv,direction:directions.get(a.hip)!})));
      if (!registration) throw new Error("constellation_registration_invalid");
      images.push(Object.freeze({source,registration}));
    }
    const result=Object.freeze({at,lines:Object.freeze(lines),images:Object.freeze(images),labels:Object.freeze(labels)});
    frames.set(scene,{catalog,frame:result});
    return result;
  } catch { return null; }
}
