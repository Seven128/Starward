import { skyArtworkViewParameters, type SkyArtworkRegistration, type SkyArtworkView } from "./sky-artwork-registration";

/** Framebuffer-pixel scissor of the existing image's whole spherical cap.
 * Curved stereographic edges stay inside it; source pixels/UVs are unchanged.
 * A cap containing the projection antipode is unbounded and keeps the full
 * viewport. This is a raster bound, never coverage, visibility or picking. */
export function skyArtworkRasterBounds(registration: SkyArtworkRegistration, view: SkyArtworkView,
  width: number, height: number, bufferWidth: number, bufferHeight: number) {
  const parameters = skyArtworkViewParameters(view, width, height);
  if (!parameters || ![bufferWidth, bufferHeight].every(value => Number.isInteger(value) && value > 0)) return null;
  const { center, radius } = registration.bounds;
  if (![...center, radius, registration.determinant].every(Number.isFinite) || radius < 0) return null;
  // The inverse source plane and camera uniforms use float32. Widen the cap
  // rather than treating ill-conditioned registrations as exact boundaries;
  // near-singular/wide uncertainty naturally falls back to the full viewport.
  const expandedRadius = radius + 64 * 2 ** -23 / Math.abs(registration.determinant);
  if (!(expandedRadius < Math.PI / 2)) return null;
  const dot = (axis: readonly number[]) => center.reduce((sum, value, index) => sum + value * axis[index]!, 0);
  const denominator = dot(view.basis.forward) + Math.cos(expandedRadius);
  if (denominator <= 1e-6) return null;
  // dot(ray,capCenter)>=cos(radius) becomes a circle under stereographic
  // projection: center=(cx,cy)/(cz+cos(radius)), r=sin(radius)/denominator.
  const x = parameters.center.x + parameters.scale * dot(view.basis.right) / denominator;
  const y = parameters.center.y - parameters.scale * dot(view.basis.up) / denominator;
  const r = parameters.scale * Math.sin(expandedRadius) / denominator;
  if (![x, y, r].every(Number.isFinite)) return null;
  const scaleX = bufferWidth / width, scaleY = bufferHeight / height;
  // Round outwards in actual buffer pixels, including two boundary pixels.
  // Use the real dimensions: rounded backing stores need not equal CSS*DPR.
  const edge = (value: number, extent: number) => Math.max(0, Math.min(extent, value));
  const left = edge(Math.floor((x - r) * scaleX) - 2, bufferWidth);
  const right = edge(Math.ceil((x + r) * scaleX) + 2, bufferWidth);
  const top = edge(Math.floor((y - r) * scaleY) - 2, bufferHeight);
  const bottom = edge(Math.ceil((y + r) * scaleY) + 2, bufferHeight);
  if (left === 0 && top === 0 && right === bufferWidth && bottom === bufferHeight) return null;
  // WebGL's box origin is lower-left; the scene's logical origin is top-left.
  return { x: left, y: bufferHeight - bottom, width: right - left, height: bottom - top };
}
