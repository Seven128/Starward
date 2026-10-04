import { writeFile } from "node:fs/promises";
import { calculateMiniappNightSky } from "../../../workers/miniapp-api/src/astronomy-engine-adapter.ts";
import { skyProjectionScale } from "../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";

// Fixed local trial near this task's 2026-09-23 date. Production date picker
// permits seven civil days before and fifteen after today.
const instants: string[] = [];
for (let day = -7; day <= 15; day++) {
  for (let hour = 0; hour < 24; hour++) {
    instants.push(new Date(Date.UTC(2026, 8, 23 + day, hour)).toISOString());
  }
}
const rows = calculateMiniappNightSky({ latitude: 22.5, longitude: 114.5, elevationM: 20,
  timezone: "Asia/Shanghai", nightDate: "2026-09-23", target: "mars", additionalTimes: instants }).samples;
const localDate = (at: string) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai",
    year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(at));
  const value = (part: string) => parts.find(item => item.type === part)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
};
const selected = rows.filter(row => instants.includes(row.at) && localDate(row.at) >= "2026-09-16" &&
  localDate(row.at) <= "2026-10-08").map(row => {
  const mars = row.planets.find(planet => planet.body === "MARS");
  if (!mars) throw Error(`missing Mars at ${row.at}`);
  return { at: row.at, altitudeDeg: mars.altitudeDeg, angularDiameterArcsec: mars.angularDiameterDeg * 3600 };
});
const visible = selected.filter(row => row.altitudeDeg > 0);
const largest = visible.reduce((a, b) => a.angularDiameterArcsec >= b.angularDiameterArcsec ? a : b);
const canvasHeightPx = 920, minFovDeg = 0.25, textureThresholdRadiusPx = 4;
const scale = skyProjectionScale(canvasHeightPx, minFovDeg);
if (scale === null) throw Error("projection unavailable");
// At the center direction, stereographic denominator is 2.
const bestCenteredRadiusPx = scale / 2 * (largest.angularDiameterArcsec / 3600) * Math.PI / 360;
const evidence = { boundary: "local_calculation_not_native_pixels_or_device_verification",
  datePickerDays: { past: 7, future: 15 }, samples: selected.length, location: { latitude: 22.5, longitude: 114.5, elevationM: 20 },
  largestVisible: largest, canvasHeightPx, minFovDeg, textureThresholdRadiusPx, bestCenteredRadiusPx,
  conclusion: bestCenteredRadiusPx < textureThresholdRadiusPx ? "texture_loader_not_reached_in_sampled_window" : "texture_loader_possible_in_sampled_window" };
await writeFile(new URL("./evidence/mars-selectable-window-2026-09-23.json", import.meta.url), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence));
