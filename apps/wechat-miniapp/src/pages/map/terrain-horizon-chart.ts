import type { DisplayMode, TerrainHorizonData } from "@starward/miniapp-contracts";

type Model = NonNullable<TerrainHorizonData["model"]>;
type Point = { x: number; y: number };
export type TerrainHorizonChart = ReturnType<typeof terrainHorizonChart>;

/** Straight segments retain native-sector maxima. Unknown sectors split both
 * the stroke and fill; negative angles are plotted below the zero baseline. */
export function terrainHorizonChart(model: Model) {
  const angles = model.sectors.flatMap(sector => sector.elevationDegrees === null ? [] : [sector.elevationDegrees]);
  const minimum = Math.min(0, ...angles), maximum = Math.max(20, ...angles);
  const step = [10, 20, 30, 45, 90].find(value => value >= (maximum - minimum) / 3) ?? 90;
  const lower = Math.floor(minimum / step) * step, upper = Math.ceil(maximum / step) * step;
  const left = lower < 0 ? 34 : 24, right = 316, top = 30, bottom = 100;
  const x = (bearing: number) => left + bearing / 360 * (right - left);
  const y = (angle: number) => bottom - (angle - lower) / (upper - lower) * (bottom - top);
  const segments: Point[][] = [];
  let segment: Point[] = [];
  for (let bearing = 0; bearing <= 360; bearing++) {
    const angle = model.sectors[bearing % 360]!.elevationDegrees;
    if (angle === null) { if (segment.length) segments.push(segment); segment = []; }
    else segment.push({ x: x(bearing), y: y(angle) });
  }
  if (segment.length) segments.push(segment);
  const ranges: { start: number; end: number }[] = [];
  model.sectors.forEach((sector, index) => {
    if (sector.elevationDegrees !== null) return;
    ranges.push({ start: Math.max(0, index - 0.5), end: index + 0.5 });
    if (index === 0) ranges.push({ start: 359.5, end: 360 });
  });
  ranges.sort((a, b) => a.start - b.start);
  const missing: { left: number; right: number }[] = [];
  for (const range of ranges) {
    const previous = missing.at(-1);
    if (previous && x(range.start) <= previous.right) previous.right = Math.max(previous.right, x(range.end));
    else missing.push({ left: x(range.start), right: x(range.end) });
  }
  const ticks = Array.from({ length: Math.round((upper - lower) / step) + 1 }, (_, index) => {
    const angle = lower + index * step;
    return { angle, y: y(angle) };
  });
  return { segments, missing, ticks, left, right, top, bottom, baseline: y(0),
    directions: ["北", "东", "南", "西", "北"].map((label, index) => ({ label, x: x(index * 90) })),
    minimumAngle: angles.length ? Math.min(...angles) : null, maximumAngle: angles.length ? Math.max(...angles) : null };
}

const COLORS = {
  DAY: { line: "#5e8c73", fill: "rgba(94,140,115,.16)", grid: "#edf1ee", axis: "#d6dfda", text: "#6d746d", direction: "#5e655f", hatch: "#cfdbd5" },
  NIGHT: { line: "#7ed7a1", fill: "rgba(126,215,161,.14)", grid: "#343830", axis: "#495344", text: "#989e94", direction: "#bec2b8", hatch: "#495344" },
  OBSERVATION: { line: "#ff6b58", fill: "rgba(216,74,60,.14)", grid: "#591b17", axis: "#7a1e18", text: "#d84a3c", direction: "#ff6b58", hatch: "#7a1e18" },
} satisfies Record<DisplayMode, object>;

export function drawTerrainHorizon(context: CanvasRenderingContext2D, chart: TerrainHorizonChart, mode: DisplayMode) {
  const colors = COLORS[mode];
  context.clearRect(0, 0, 326, 120);
  context.font = "12px sans-serif";
  context.lineWidth = 1;
  context.textAlign = "left";
  for (const tick of chart.ticks) {
    context.beginPath(); context.setLineDash(tick.angle === 0 ? [] : [2, 3]);
    context.strokeStyle = tick.angle === 0 ? colors.axis : colors.grid;
    context.moveTo(chart.left, tick.y); context.lineTo(chart.right, tick.y); context.stroke();
    context.fillStyle = colors.text; context.fillText(`${tick.angle}°`, tick.angle === 0 && chart.left === 24 ? 4 : 0, tick.y + 4);
  }
  context.setLineDash([]);
  for (const gap of chart.missing) {
    context.save(); context.beginPath(); context.rect(gap.left, chart.top, gap.right - gap.left, chart.bottom - chart.top); context.clip();
    context.strokeStyle = colors.hatch;
    for (let offset = gap.left - 70; offset < gap.right; offset += 8) {
      context.beginPath(); context.moveTo(offset, chart.bottom); context.lineTo(offset + 70, chart.top); context.stroke();
    }
    context.restore();
    if (gap.right - gap.left > 30) {
      context.fillStyle = colors.text; context.textAlign = "center"; context.fillText("未知", (gap.left + gap.right) / 2, 66);
    }
  }
  context.lineCap = "round"; context.lineJoin = "round";
  for (const segment of chart.segments) {
    const first = segment[0]!, last = segment.at(-1)!;
    if (segment.length > 1) {
      context.beginPath(); context.moveTo(first.x, chart.baseline);
      segment.forEach(point => context.lineTo(point.x, point.y));
      context.lineTo(last.x, chart.baseline); context.closePath(); context.fillStyle = colors.fill; context.fill();
      context.beginPath(); context.moveTo(first.x, first.y); segment.slice(1).forEach(point => context.lineTo(point.x, point.y));
      context.lineWidth = 1.75; context.strokeStyle = colors.line; context.stroke();
    } else {
      context.beginPath(); context.arc(first.x, first.y, 1.25, 0, Math.PI * 2); context.fillStyle = colors.line; context.fill();
    }
  }
  context.fillStyle = colors.direction; context.textAlign = "center";
  for (const direction of chart.directions) context.fillText(direction.label, direction.x, 116);
}
