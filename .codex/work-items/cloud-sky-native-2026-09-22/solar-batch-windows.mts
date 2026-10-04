import { writeFileSync } from 'node:fs';
import { calculateMiniappNightSky } from '../../../workers/miniapp-api/src/astronomy-engine-adapter.ts';
import { projectSkyAngularDisc } from '../../../apps/wechat-miniapp/src/features/sky/sky-phase-disc.ts';
import { createSkyViewBasis } from '../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';

// Existing documented MEMORY_TEST sample, not device location or surveyed site.
const date = '2026-09-28';
const times = Array.from({ length: 24 }, (_, hour) =>
  new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+08:00`).toISOString());
const samples = calculateMiniappNightSky({ latitude: 22.4826799, longitude: 114.5557147,
  elevationM: 0, timezone: 'Asia/Shanghai', nightDate: date, target: 'moon',
  additionalTimes: times }).samples.filter(sample => times.includes(sample.at));
const bodies = samples.flatMap(sample => [
  { body: 'SUN', at: sample.at, altitudeDeg: sample.sunAltitudeDeg,
    azimuthDeg: sample.sunAzimuthDeg, angularDiameterDeg: sample.sunAngularDiameterDeg, illuminatedFraction: 1 },
  { body: 'MOON', at: sample.at, altitudeDeg: sample.moonAltitudeDeg,
    azimuthDeg: sample.moonAzimuthDeg, angularDiameterDeg: sample.moonAngularDiameterDeg, illuminatedFraction: sample.moonIllumination },
  ...sample.planets.map(planet => ({ ...planet, at: sample.at })),
]);
const targets = ['SUN','MOON','MERCURY','VENUS','MARS','JUPITER'];
const result = targets.map(body => {
  const visible = bodies.filter(row => row.body === body && row.altitudeDeg >= 15);
  const best = visible.toSorted((a,b) => b.altitudeDeg-a.altitudeDeg)[0];
  if (!best) return { body, available: false };
  const fov = body === 'SUN' || body === 'MOON' ? 1 : 0.05;
  const disc = projectSkyAngularDisc(best, createSkyViewBasis(best.azimuthDeg,90+best.altitudeDeg,0)!,
    390,844,fov)!;
  return { body, localTime: new Date(Date.parse(best.at)+8*3600_000).toISOString().slice(0,16),
    altitudeDeg: best.altitudeDeg, azimuthDeg: best.azimuthDeg,
    angularDiameterDeg: best.angularDiameterDeg, illuminatedFraction: best.illuminatedFraction,
    fovDeg: fov, diameterFractionOfCanvasHeight: 2*disc.radiusPx/844,
    visibleHours: visible.map(row => new Date(Date.parse(row.at)+8*3600_000).getUTCHours()) };
});
const output = { scope: 'Model-only device exercise planning at documented test site; not phone or field evidence',
  date, timezone: 'Asia/Shanghai', result };
writeFileSync(new URL('./evidence/b2-batch-windows-2026-09-28.json', import.meta.url), JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output));
