import type Taro from "@tarojs/taro";

export const POSTER_WIDTH = 320;
// Keep the existing 640px file contract independently of device pixel density.
export const POSTER_EXPORT_SCALE = 2;
export interface PosterPalette { background: string; accent: string; text: string; divider: string; muted: string }
interface PosterLayout {
  heading: string[]; body: string[][]; credits: string[][];
  bodyTop: number; divider: number; creditsTop: number; height: number;
}

/** Preview and export use the same synchronous native 2D surface. */
export function drawSharePoster(canvas: Taro.Canvas, layout: PosterLayout, colors: PosterPalette) {
  // Resizing resets pixels and drawing state; repeated saves cannot inherit the
  // previous credits font/color or accumulate a scale transform.
  canvas.width = POSTER_WIDTH * POSTER_EXPORT_SCALE;
  canvas.height = layout.height * POSTER_EXPORT_SCALE;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  if (!ctx || typeof ctx.fillText !== "function" || typeof ctx.setTransform !== "function")
    throw new Error("poster_2d_context_unavailable");
  ctx.setTransform(POSTER_EXPORT_SCALE, 0, 0, POSTER_EXPORT_SCALE, 0, 0);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, POSTER_WIDTH, layout.height);
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, POSTER_WIDTH, 8);
  ctx.fillStyle = colors.text;
  ctx.font = "16px sans-serif";
  ctx.fillText("今晚去观星", 22, 42);
  ctx.font = "22px sans-serif";
  for (const [index, row] of layout.heading.entries()) ctx.fillText(row, 22, 83 + index * 28);
  let y = layout.bodyTop;
  ctx.font = "13px sans-serif";
  for (const lines of layout.body) {
    for (const row of lines) { ctx.fillText(row, 22, y); y += 21; }
    y += 8;
  }
  ctx.strokeStyle = colors.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(22, layout.divider);
  ctx.lineTo(POSTER_WIDTH - 22, layout.divider);
  ctx.stroke();
  ctx.fillStyle = colors.muted;
  ctx.font = "11px sans-serif";
  ctx.fillText("资料与许可", 22, layout.divider + 22);
  let sourceY = layout.creditsTop;
  for (const rows of layout.credits) {
    for (const row of rows) { ctx.fillText(row, 22, sourceY); sourceY += 16; }
    sourceY += 5;
  }
}
