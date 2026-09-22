export interface SkyViewportInsets { readonly top: number; readonly bottom: number }
export interface SkyProjectionCenter { readonly x: number; readonly y: number }
export interface SkyScreenRect { readonly top: number; readonly bottom: number; readonly height: number }
export const NO_SKY_INSETS: SkyViewportInsets = { top: 0, bottom: 0 };

/** Native bounding rectangles share window coordinates. Keep measurements in
 * logical pixels; the canvas backing-store DPR is a separate rendering concern. */
export function skyInsetsFromControls(canvas: SkyScreenRect, topControls: readonly SkyScreenRect[], bottomControls: SkyScreenRect): SkyViewportInsets | null {
  const valid = (rect: SkyScreenRect) => [rect.top, rect.bottom, rect.height].every(Number.isFinite) && rect.height >= 0 && rect.bottom >= rect.top;
  if (!valid(canvas) || canvas.height <= 0 || !valid(bottomControls)) return null;
  const top = Math.max(canvas.top, ...topControls.filter(rect => valid(rect) && rect.height > 0).map(rect => rect.bottom));
  return { top: Math.max(0, top - canvas.top + 8), bottom: Math.max(0, canvas.bottom - bottomControls.top + 8) };
}

export function skyVisibleViewport(width: number, height: number, insets: SkyViewportInsets = NO_SKY_INSETS) {
  if (![width, height, insets.top, insets.bottom].every(Number.isFinite) || width <= 0 || height <= 0 || insets.top < 0 || insets.bottom < 0) return null;
  const availableHeight = height - insets.top - insets.bottom;
  if (availableHeight <= 0) return null;
  return { width, height: availableHeight, center: { x: width / 2, y: insets.top + availableHeight / 2 }, shortSide: Math.min(width, availableHeight) };
}

/** Keep the existing full-screen local composition; only a widened view moves
 * continuously towards the unobscured region's center. Background stays full-screen. */
export function skyViewportCenter(width: number, height: number, progress: number, insets: SkyViewportInsets = NO_SKY_INSETS): SkyProjectionCenter {
  const viewport = skyVisibleViewport(width, height, insets);
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const amount = p * p * (3 - 2 * p);
  return { x: width / 2, y: height / 2 + ((viewport?.center.y ?? height / 2) - height / 2) * amount };
}
