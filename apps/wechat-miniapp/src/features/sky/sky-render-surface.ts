import type { SkyArtworkRegistration, SkyArtworkView } from "./sky-artwork-registration";
/** Logical canvas pixels. Astronomy and picking remain independent of GPU resources. */
export type SkyImageTransform = readonly [number, number, number, number, number, number];
export type SkyLineSegment = readonly [number, number, number, number];
export interface SkyRenderSurface {
  begin(width: number, height: number, background: string): void;
  image(image: object, transform: SkyImageTransform, opacity: number): boolean;
  artwork(image: object, registration: SkyArtworkRegistration, view: SkyArtworkView, opacity: number, tint: string): boolean;
  segments(lines: readonly SkyLineSegment[], color: string, opacity?: number): void;
  disc(x: number, y: number, radius: number, color: string, opacity: number, strokeWidth?: number): void;
  finish(): void;
}
