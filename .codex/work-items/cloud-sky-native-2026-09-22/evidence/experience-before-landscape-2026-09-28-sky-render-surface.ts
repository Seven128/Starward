import type { SkyArtworkRegistration, SkyArtworkView } from "./sky-artwork-registration";
import type { SkySolarLight } from "./sky-solar-light";
import type { SkyGalacticBand } from "./sky-galactic-band";
import type { SkyMoonDisc } from "./sky-moon-disc";
import type { SkyPlanetDisc } from "./sky-planet-disc";
import type { SkyPhaseDisc } from "./sky-phase-disc";
import type { SkyAngularDisc } from "./sky-phase-disc";
/** Logical canvas pixels. Astronomy and picking remain independent of GPU resources. */
export type SkyImageTransform = readonly [number, number, number, number, number, number];
export type SkyLineSegment = readonly [number, number, number, number];
export interface SkyRenderSurface {
  begin(width: number, height: number, background: string): void;
  /** Draws a solar-direction cue below independent stars/images. False preserves the base sky. */
  solarLight(view: SkyArtworkView, sun: SkySolarLight): boolean;
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
  /** Decorative light adds to the sky; opaque survey products preserve their source pixels. */
  artwork(image: object, registration: SkyArtworkRegistration, view: SkyArtworkView, opacity: number, tint: string,
    composite?: "additive" | "source-over"): boolean;
  segments(lines: readonly SkyLineSegment[], color: string, opacity?: number): void;
  disc(x: number, y: number, radius: number, color: string, opacity: number, strokeWidth?: number): void;
  finish(): void;
}
