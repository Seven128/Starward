export type PanelCssMotion = { style: Record<string, string> };
/** Resample the bounded trajectory once; CSS owns all intervening frames. */
export function panelSpringStyle(frames: readonly { height: number; offset: number }[], duration: number, sequence: number): Record<string, string> {
  const style: Record<string, string> = { "--panel-spring-duration": `${duration}ms`, "--panel-spring-name": `panel-spring-${sequence % 2}` };
  let right = 1;
  for (let index = 0; index <= 40; index++) {
    const offset = index / 40;
    while (right < frames.length - 1 && frames[right]!.offset < offset) right++;
    const a = frames[Math.max(0, right - 1)]!, b = frames[right] ?? a;
    const fraction = b.offset === a.offset ? 1 : Math.max(0, Math.min(1, (offset - a.offset) / (b.offset - a.offset)));
    style[`--panel-spring-${index}`] = `${a.height + (b.height - a.height) * fraction}px`;
  }
  return style;
}
