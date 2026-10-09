import { panelHeightProgress, type PanelSnapGeometry } from "./panel-snap";

export type PanelCssMotion = { style: Record<string, string>; duration: number; sequence: number; started?(): void; chrome: { at: number; hidden: boolean }[] };
export const PANEL_CSS_STEPS = 40;
const unit = (value: number) => Math.min(1, Math.max(0, value));

/** One height projection for direct manipulation and every release consumer. */
export function panelPresentationAtProgress(progress: number, hasMedia: boolean, active = true) {
  const reveal = hasMedia && active ? unit((progress - 0.5) / 0.28) : 0;
  const chrome = active ? unit(1 - unit((progress - 0.82) / 0.12)) : 1;
  return { reveal, chrome, style: {
    "--map-chrome-opacity": String(chrome),
    "--map-chrome-offset": `${-10 * (1 - chrome)}rpx`,
    "--panel-media-reveal": String(reveal),
    "--panel-media-height": `${160 * reveal}px`,
    "--panel-handle-band-height": `${Math.round(40 * (1 - reveal))}rpx`,
    "--panel-media-image-offset": `${Math.round(-18 * (1 - reveal))}rpx`,
    "--panel-media-image-scale": String(1.02 - 0.02 * reveal),
  } };
}
/** Resample the bounded trajectory once; CSS owns all intervening frames. */
export function panelSpringStyle(frames: readonly { height: number; offset: number }[], duration: number, sequence: number,
  presentation: { geometry: PanelSnapGeometry; hasMedia: boolean }): Record<string, string> {
  const variant = sequence % 2;
  const style: Record<string, string> = { "--psd": `${duration}ms`,
    "--phn": `panel-spring-${variant}`,
    "--pmn": `panel-media-spring-${variant}`,
    "--pin": `panel-image-spring-${variant}`,
    "--pcn": `panel-chrome-spring-${variant}` };
  let right = 1;
  for (let index = 0; index <= PANEL_CSS_STEPS; index++) {
    const offset = index / PANEL_CSS_STEPS;
    while (right < frames.length - 1 && frames[right]!.offset < offset) right++;
    const a = frames[Math.max(0, right - 1)]!, b = frames[right] ?? a;
    const fraction = b.offset === a.offset ? 1 : Math.max(0, Math.min(1, (offset - a.offset) / (b.offset - a.offset)));
    const height = a.height + (b.height - a.height) * fraction;
    const projected = panelPresentationAtProgress(panelHeightProgress(presentation.geometry, height), presentation.hasMedia);
    style[`--ph${index}`] = `${height}px`;
    // Short private slots bound WXSS and bridge payload; the projection above
    // owns their meaning: media height/reveal, image offset/scale, chrome.
    style[`--pmh${index}`] = projected.style["--panel-media-height"];
    style[`--pmr${index}`] = String(projected.reveal);
    style[`--pio${index}`] = projected.style["--panel-media-image-offset"];
    style[`--pis${index}`] = projected.style["--panel-media-image-scale"];
    style[`--pc${index}`] = String(projected.chrome);
  }
  return style;
}

/** The native opacity track and semantic/hit retirement share its crossings. */
export function panelChromeTimeline(style: Record<string, string>, duration: number): PanelCssMotion["chrome"] {
  const result = [{ at: 0, hidden: Number(style["--pc0"]) <= 0.08 }];
  for (let index = 1; index <= PANEL_CSS_STEPS; index++) {
    const a = Number(style[`--pc${index - 1}`]), b = Number(style[`--pc${index}`]);
    const hidden = b <= 0.08;
    if (hidden !== result.at(-1)!.hidden)
      result.push({ at: (index - 1 + (0.08 - a) / (b - a)) / PANEL_CSS_STEPS * duration, hidden });
  }
  return result;
}
