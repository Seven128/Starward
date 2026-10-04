import type { SkyArtworkRegistration, SkyArtworkView } from "./sky-artwork-registration";
import type { SkySolarLight } from "./sky-solar-light";
import type { SkyGalacticBand } from "./sky-galactic-band";
import type { SkyMoonDisc } from "./sky-moon-disc";
import type { SkyPlanetDisc } from "./sky-planet-disc";
import type { SkyPhaseDisc } from "./sky-phase-disc";
import type { SkyAngularDisc } from "./sky-phase-disc";
import type { SkyLandscapePanorama } from "./sky-landscape-mask";
/** Logical canvas pixels. Astronomy and picking remain independent of GPU resources. */
export type SkyImageTransform = readonly [number, number, number, number, number, number];
export type SkyLineSegment = readonly [number, number, number, number];
export interface SkyRenderSurface {
  begin(width: number, height: number, background: string): void;
  /** Draws a solar-direction cue below independent stars/images. False preserves the base sky. */
  solarLight(view: SkyArtworkView, sun: SkySolarLight): boolean;
  /** Original simulated ground below the geometric horizon; never site obstruction data. */
  landscape(view: SkyArtworkView, sun: SkySolarLight, observationMode: boolean, panorama?: SkyLandscapePanorama | null, opacity?: number): boolean;
  /** Registered historical infrared panorama when available; schematic fallback. */
  galacticBand(view: SkyArtworkView, band: SkyGalacticBand, image?: object | null): boolean;
  /** Observer-sized self-luminous solar photosphere, independent of twilight shader. */
  sun(disc: SkyAngularDisc, view: SkyArtworkView, observationMode: boolean): boolean;
  /** Observer-sized lunar phase; false keeps the independent scene usable. */
  moon(disc: SkyMoonDisc, view: SkyArtworkView, observationMode: boolean, texture?: object | null): boolean;
  /** Same physical phase mask for resolved planetary globes. */
  planet(disc: SkyPlanetDisc, view: SkyArtworkView, tint: string, observationMode: boolean, texture?: object | null): boolean;
  /** Continuous projected bands; false falls back to the bounded arc representation. */
  saturnRings(disc: SkyPlanetDisc, view: SkyArtworkView, tint: string, observationMode: boolean): boolean;
  image(image: object, transform: SkyImageTransform, opacity: number): boolean;
  /** HEALPix/other curved-sky triangles in screen x,y and original image u,v. */
  skyImageMesh(image: object, triangles: readonly number[], view: SkyArtworkView, opacity: number): boolean;
  /** Cutouts soften display edges; infrared also softens its pedestal. Neither is a data-validity mask. */
  artwork(image: object, registration: SkyArtworkRegistration, view: SkyArtworkView, opacity: number, tint: string,
    composite?: "additive" | "source-over" | "infrared-cutout" | "optical-cutout"): boolean;
  segments(lines: readonly SkyLineSegment[], color: string, opacity?: number): void;
  /** Stars/unresolved planets share a soft display profile; symbols keep solid discs/rings.
   * Radius/opacity still come from the shared magnitude owner, not physical angular size. */
  disc(x: number, y: number, radius: number, color: string, opacity: number, strokeWidth?: number,
    profile?: "disc" | "star"): void;
  finish(): void;
}
