import type Taro from "@tarojs/taro";
import { publicShareCredits, publicSharePresentation, type PublicShare } from "./public-share-presentation";
import { POSTER_EXPORT_SCALE, POSTER_WIDTH, wrapPosterText } from "./share-poster-drawing";

interface Box { x: number; y: number; width: number; height: number }
interface Run { text: string; x: number; y: number; size: number; color: string; weight: number; right: boolean; spacing?: number }
export type PosterIcon = "favorite-star" | "meteor" | "place-pin";
export function adoptedSharePosterLayout(data: PublicShare) {
  const card = publicSharePresentation(data), plan = card.kind === "PLAN";
  const runs: Run[] = [];
  let y = plan ? 280 : 240;
  const x = plan ? 24 : 44, width = POSTER_WIDTH - 2 * x;
  const text = (value: string, left: number, top: number, size: number, available: number,
    color = "#223440", weight = 400, line = size * 1.6, right = false) => {
    const rows = wrapPosterText(value, available, size);
    rows.forEach((row, index) => runs.push({ text: row, x: left + (right ? available : 0), y: top + index * line, size, color, weight, right }));
    return rows.length * line;
  };
  if (plan) {
    text("STARWARD", 54, 43, 13, 120, "#223440", 800);
    runs.at(-1)!.spacing = 2.34;
    text("向星而行 · 行程纪念", 166, 43, 12, 130, "#728391");
    text(card.date, 24, 92, 13, 272, "#a48443", 600);
    runs.at(-1)!.spacing = 1.56;
    text("向星而行", 24, 134, 32, 272, "#1a2933", 700, 40);
    y += text(card.name, x, y, 22, width, "#223440", 700, 29.7);
    y += text(card.region, x, y, 13, width, "#728391") + 12;
  } else {
    y += text(card.region, x, y, 13, width, "#728391") + 4;
    y += text(card.name, x, y, 22, width, "#223440", 700, 29.7);
    if (card.address) y += text(card.address, x, y + 4, 13, width, "#728391") + 4;
    y += 12;
  }
  const facts: Box | null = plan ? null : { x, y: y - 13, width, height: 0 };
  if (facts) y += 1;
  for (const fact of card.facts) {
    const left = x + (plan ? 0 : 16), valueX = left + (plan ? 92 : 84);
    const size = plan ? 15 : 14;
    const valueHeight = text(fact.value, valueX, y, size, x + width - (plan ? 0 : 16) - valueX, "#223440", 600, size * 1.6, !plan);
    const labelHeight = text(fact.label, left, y, plan ? 13 : 14, plan ? 84 : 70, "#8b9ea8");
    y += Math.max(valueHeight, labelHeight) + (plan ? 16 : 10);
  }
  if (facts) { y += 4; facts.height = y - facts.y; }
  let warning: Box | null = null;
  if (card.warnings.length) {
    y += 14;
    warning = { x, y: y - 13, width, height: 0 };
    if (!plan) y += text("进入与安全说明", x + 14, y + 5, 12.5, width - 28, "#8c733f", 700) + 5;
    for (const value of card.warnings) y += text(value, x + 14, y + 5, 12.5, width - 28, "#8c733f") + 4;
    y += 8; warning.height = y - warning.y;
  }
  y += 22;
  const sourceDivider = y - 14;
  y += text("资料来源与说明", x, y, 13, width, "#8899a6") + 10;
  for (const note of card.notes) y += text(note, x, y, 13, width, "#738491") + 8;
  for (const credit of publicShareCredits(card.sources)) y += text(credit, x, y, 13, width, "#738491") + 5;
  return { kind: card.kind, runs, facts, warning, sourceDivider, bodyX: x, bodyWidth: width, height: Math.ceil(y + 22) };
}

function rounded(ctx: CanvasRenderingContext2D, box: Box, radius: number) {
  const { x, y, width: w, height: h } = box, r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

/** DAY adopts the paper ticket / inset place card; other modes retain their existing renderer. */
export function drawAdoptedSharePoster(canvas: Taro.Canvas, layout: ReturnType<typeof adoptedSharePosterLayout>, icons: Readonly<Record<PosterIcon, CanvasImageSource>>) {
  const w = POSTER_WIDTH, h = layout.height;
  canvas.width = w * POSTER_EXPORT_SCALE; canvas.height = h * POSTER_EXPORT_SCALE;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  if (!ctx || typeof ctx.setTransform !== "function") throw new Error("poster_2d_context_unavailable");
  ctx.setTransform(POSTER_EXPORT_SCALE, 0, 0, POSTER_EXPORT_SCALE, 0, 0);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  rounded(ctx, { x: .5, y: .5, width: w - 1, height: h - 1 }, 24);
  ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#ebedf0"; ctx.lineWidth = 1; ctx.stroke();
  ctx.save(); ctx.clip();
  const glow = ctx.createRadialGradient(w * .88, h * .08, 0, w * .88, h * .08, w * .9);
  glow.addColorStop(0, "rgba(200,168,102,.08)"); glow.addColorStop(1, "rgba(200,168,102,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  const footGlow = ctx.createRadialGradient(w * .12, h * .92, 0, w * .12, h * .92, w * .75);
  footGlow.addColorStop(0, "rgba(179,151,93,.05)"); footGlow.addColorStop(1, "rgba(179,151,93,0)");
  ctx.fillStyle = footGlow; ctx.fillRect(0, 0, w, h);
  if (layout.kind === "PLAN") {
    ctx.drawImage(icons["favorite-star"], 24, 26, 22, 22);
    ctx.strokeStyle = "#e4eaee"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(24, 62); ctx.lineTo(w - 24, 62); ctx.stroke();
    ctx.save(); ctx.translate(24, 153); ctx.scale((w - 48) / 310, 52 / 40);
    ctx.strokeStyle = "#d5dfe6"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(10, 32); ctx.bezierCurveTo(90, 28, 170, 12, 280, 6); ctx.stroke();
    const tail = ctx.createLinearGradient(120, 20, 275, 6); tail.addColorStop(0, "rgba(213,223,230,0)"); tail.addColorStop(1, "rgba(184,156,93,.9)");
    ctx.setLineDash([]); ctx.strokeStyle = tail; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(120, 20); ctx.bezierCurveTo(180, 14, 230, 9, 275, 6); ctx.stroke(); ctx.restore();
    ctx.drawImage(icons.meteor, w - 72, 153, 28, 28);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = "#dbe5ea"; ctx.beginPath(); ctx.moveTo(0, 229); ctx.lineTo(w, 229); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#f6f5f1"; for (const x of [0, w]) { ctx.beginPath(); ctx.arc(x, 229, 10, 0, Math.PI * 2); ctx.fill(); }
  } else {
    const gradient = ctx.createLinearGradient(24, 28, w - 24, 208); gradient.addColorStop(0, "#e4eff5"); gradient.addColorStop(1, "#d5e6ed");
    ctx.fillStyle = gradient; ctx.fillRect(24, 28, w - 48, 180);
    ctx.save(); ctx.translate(24, 28); ctx.scale((w - 48) / 358, 1); ctx.globalAlpha = .7;
    const rings = [[140, 70, "rgba(180,205,217,.5)", 1.5], [105, 50, "rgba(162,192,205,.6)", 1.5], [70, 34, "rgba(144,178,193,.7)", 1.8], [36, 18, "#7ea4b5", 1.5]] as const;
    for (const [rx, ry, color, line] of rings) { ctx.beginPath(); ctx.ellipse(179, 95, rx, ry, 0, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = line; if (rx === 36) { ctx.fillStyle = "rgba(195,219,230,.4)"; ctx.fill(); } ctx.stroke(); }
    ctx.restore(); ctx.drawImage(icons["place-pin"], w / 2 - 22, 95, 44, 44);
    ctx.fillStyle = "rgba(45,75,94,.22)"; ctx.beginPath(); ctx.ellipse(w / 2, 139, 9, 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const [box, fill, stroke, radius] of [[layout.facts, "#f8fafb", "#edf2f5", 16], [layout.warning, "#fcf9f0", "#f4ecd6", 10]] as const) {
    if (!box) continue; rounded(ctx, box, radius); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.setLineDash([]); ctx.strokeStyle = "#edf1f4"; ctx.beginPath(); ctx.moveTo(layout.bodyX, layout.sourceDivider); ctx.lineTo(layout.bodyX + layout.bodyWidth, layout.sourceDivider); ctx.stroke();
  for (const run of layout.runs) {
    ctx.textAlign = run.right ? "right" : "left"; ctx.fillStyle = run.color; ctx.font = `${run.weight} ${run.size}px sans-serif`;
    if (run.spacing) { let x = run.x; for (const char of run.text) { ctx.fillText(char, x, run.y); x += ctx.measureText(char).width + run.spacing; } }
    else ctx.fillText(run.text, run.x, run.y);
  }
  ctx.restore();
}
