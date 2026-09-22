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
}
const motions = new WeakMap<ConstellationCatalogPublication, ReadonlyMap<number,StellarMotion>>();
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
    let catalogMotions=motions.get(catalog);
    if (!catalogMotions) {
      catalogMotions=new Map(catalog.stars.map(s=>[s[0],createStellarMotion({raDeg:s[1],decDeg:s[2],
        pmRaCosDecArcsecYr:s[3]/1000,pmDecArcsecYr:s[4]/1000})]));
      motions.set(catalog,catalogMotions);
    }
    // Propagate from the publication epoch; both catalog and frame now use J2000.
    const years=frame.geometry.julianYears+(2000-catalog.astrometry.epochJulianYear);
    const directions=new Map<number,SkyVector>();
    for (const [hip,motion] of catalogMotions) directions.set(hip,Object.freeze(rotateStellarDirection(
      stellarDirectionAt(motion,years),frame.geometry.equatorialToEnu)));
    const lines=catalog.constellations.flatMap(c=>c.lines.map(([a,b])=>Object.freeze([directions.get(a)!,directions.get(b)!] as const)));
    const images: ConstellationFrame["images"][number][]=[];
    for (const source of catalog.images) {
      const registration=registerSkyArtwork(source.anchors.map(a=>({uv:[a.pixel[0]/source.width,a.pixel[1]/source.height] as const,
        direction:directions.get(a.hip)!})));
      if (!registration) throw new Error("constellation_registration_invalid");
      images.push(Object.freeze({source,registration}));
    }
    const result=Object.freeze({at,lines:Object.freeze(lines),images:Object.freeze(images)});
    frames.set(scene,{catalog,frame:result});
    return result;
  } catch { return null; }
}
