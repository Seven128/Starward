import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import Quaternion from 'quaternion';
import { calculateMiniappNightSky } from '../../../../workers/miniapp-api/src/astronomy-engine-adapter.ts';
import { bsc5pHorizontalFrame } from '../../../../packages/astronomy-core/src/bsc5p-catalog.ts';
import { Body, Observer, Equator, Horizon } from '../../../../packages/astronomy-core/src/astronomy-engine-runtime.ts';
import { skyHorizontalDirection } from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';

const output = '.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-time-body-probe-2026-09-29.json';
await assert.rejects(fs.access(output), { code: 'ENOENT' });
const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const baseline = JSON.parse(await fs.readFile('.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-time-motion-probe-2026-09-29.json', 'utf8'));
const context = JSON.parse(execFileSync('pwsh', ['-NoProfile', '-Command', `
 $r=(& 'E:/微信web开发者工具/wechatide.cmd' -c codex automation_evaluate --project 'E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v33-0929' --fn-source "function(){var s=wx.getStorageSync('starward.wechat-miniapp.state.current');return s&&s.observationContext;}")|ConvertFrom-Json;
 if(-not $r.ok){throw 'Native Context read failed'};$v=$r.result;
 while($v -is [pscustomobject] -and $v.PSObject.Properties.Name -contains 'result'){$v=$v.result};$v|ConvertTo-Json -Depth 8 -Compress;
`], { encoding: 'utf8', windowsHide: true }));
assert.equal(digest(context.contextId), baseline.contextSha256);
const response = await fetch('http://127.0.0.1:8791/v2/spots/spot%3Atest-published/sky?contextId=' + encodeURIComponent(context.contextId) + '&catalogVersion=' + baseline.catalogVersion,
  { headers: { 'x-starward-measurement-probe': '1' }, signal: AbortSignal.timeout(15000) });
assert.equal(response.status, 200);
const report = (await response.json()).data;
const start = '2026-09-29T13:00:00.000Z', end = '2026-09-29T13:30:00.000Z';
const seconds = [0, 1, 10, 60, 300, 600, 900, 1200, 1500, 1799, 1800];
const times = seconds.map(value => new Date(Date.parse(start) + value * 1000).toISOString());
const computed = calculateMiniappNightSky({ ...baseline.observer, timezone: 'Asia/Shanghai', nightDate: '2026-09-29',
  target: 'moon', cadenceMinutes: 120, additionalTimes: times });
const engineObserver = new Observer(baseline.observer.latitude, baseline.observer.longitude, baseline.observer.elevationM);
type Vector = readonly number[];
const unit = (v: Vector) => { const length = Math.hypot(...v); assert(length > 0); return v.map(value => value / length); };
const cross = (a: Vector, b: Vector) => [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
const transform = (m: Vector, v: Vector) => [0, 1, 2].map(row => v.reduce((sum, value, col) => sum + m[row * 3 + col]! * value, 0));
const inverse = (m: Vector, v: Vector) => [0, 1, 2].map(col => v.reduce((sum, value, row) => sum + m[row * 3 + col]! * value, 0));
const quaternion = (m: Vector) => Quaternion.fromMatrix([[m[0]!, m[1]!, m[2]!], [m[3]!, m[4]!, m[5]!], [m[6]!, m[7]!, m[8]!]]).normalize();
const matrix = (rotation: Quaternion) => {
  const columns = [[1,0,0], [0,1,0], [0,0,1]].map(v => rotation.rotateVector(v));
  return [0,1,2].flatMap(row => columns.map(column => column[row]!));
};
const angle = (a: Vector, b: Vector) => Math.atan2(Math.hypot(...cross(a, b)), a.reduce((sum, value, i) => sum + value * b[i]!, 0));
const arcsec = (radians: number) => radians * 180 / Math.PI * 3600;
const pixel = (radians: number) => 844 / (4 * Math.tan(.05 * Math.PI / 720)) * 2 * Math.tan(radians / 2);
const anchors = [start, end].map(at => {
  const row = report.hourly.find((value: any) => value.at === at);
  const frame = report.observationFrames.find((value: any) => value.at === at);
  assert(row && frame); assert.equal(row.planets.length, 7);
  return { row, matrix: frame.equatorialToEnu };
});
const bodies = ['SUN', 'MOON', ...anchors[0]!.row.planets.map((body: any) => body.body)];
const bodyFields = (row: any, body: string) => body === 'SUN'
  ? { azimuthDeg: row.sunAzimuthDeg, altitudeDeg: row.sunAltitudeDeg, diameter: row.sunAngularDiameterDeg }
  : body === 'MOON'
  ? { azimuthDeg: row.moonAzimuthDeg, altitudeDeg: row.moonAltitudeDeg, diameter: row.moonAngularDiameterDeg,
      illuminatedFraction: row.moonIllumination, bodyFrame: row.moonBodyFrame }
  : { ...row.planets.find((value: any) => value.body === body), diameter: row.planets.find((value: any) => value.body === body).angularDiameterDeg };
const directions = bodies.map(body => ({ body, anchors: anchors.map(anchor => inverse(anchor.matrix,
  skyHorizontalDirection(bodyFields(anchor.row, body).azimuthDeg, bodyFields(anchor.row, body).altitudeDeg)!)) }));
const axesRotation = (fields: any, rotation: Vector) => {
  if (!fields.bodyFrame) return null;
  const prime = unit(inverse(rotation, fields.bodyFrame.primeMeridianEnu));
  const pole = unit(inverse(rotation, fields.bodyFrame.poleEnu));
  const east = unit(cross(pole, prime));
  const columns = [prime, east, unit(cross(prime, east))];
  return quaternion([0,1,2].flatMap(row => columns.map(column => column[row]!)));
};
const startRotation = quaternion(anchors[0]!.matrix), endRotation = quaternion(anchors[1]!.matrix);
const samples = seconds.map((offset, index) => {
  const amount = offset / 1800, at = times[index]!;
  const truth = computed.samples.find(row => row.at === at); assert(truth);
  const exactRotation = bsc5pHorizontalFrame({ ...baseline.observer, at });
  const modelRotation = matrix(startRotation.slerp(endRotation)(amount).normalize());
  return { at, seconds: offset, bodies: directions.map(({body, anchors: vectors}) => {
    const model = transform(modelRotation, unit(vectors[0]!.map((v, i) => v + (vectors[1]![i]! - v) * amount)));
    const fields = bodyFields(truth, body), left = bodyFields(anchors[0]!.row, body), right = bodyFields(anchors[1]!.row, body);
    let exact = skyHorizontalDirection(fields.azimuthDeg, fields.altitudeDeg)!;
    // Measure the current published Sun/Moon rounding against the existing
    // server dependency's unrounded topocentric direction, not against itself.
    if (body === 'SUN' || body === 'MOON') {
      const date = new Date(at), engineBody = body === 'SUN' ? Body.Sun : Body.Moon;
      const equator = Equator(engineBody, date, engineObserver, true, true);
      const horizontal = Horizon(date, engineObserver, equator.ra, equator.dec, '');
      exact = skyHorizontalDirection(horizontal.azimuth, horizontal.altitude)!;
    }
    const error = angle(model, exact);
    const leftAxes = axesRotation(left, anchors[0]!.matrix), rightAxes = axesRotation(right, anchors[1]!.matrix);
    let bodyAxesErrorArcsec: number | null = null;
    if (leftAxes && rightAxes && fields.bodyFrame) {
      const interpolated = leftAxes.slerp(rightAxes)(amount).normalize();
      const prime = transform(modelRotation, interpolated.rotateVector([1,0,0]));
      const pole = transform(modelRotation, interpolated.rotateVector([0,0,1]));
      bodyAxesErrorArcsec = arcsec(Math.max(angle(prime, fields.bodyFrame.primeMeridianEnu), angle(pole, fields.bodyFrame.poleEnu)));
    }
    let ringAxesErrorArcsec: number | null = null;
    if (left.ringPoleEnu && right.ringPoleEnu && fields.ringPoleEnu) {
      const poles = [inverse(anchors[0]!.matrix, left.ringPoleEnu), inverse(anchors[1]!.matrix, right.ringPoleEnu)];
      const pole = transform(modelRotation, unit(poles[0]!.map((v, i) => v + (poles[1]![i]! - v) * amount)));
      ringAxesErrorArcsec = arcsec(angle(pole, fields.ringPoleEnu));
    }
    return { body, directionErrorArcsec: arcsec(error), centeredErrorCssPxAtMinFov: pixel(error),
      publishedCoordinateErrorArcsec: arcsec(angle(skyHorizontalDirection(fields.azimuthDeg, fields.altitudeDeg)!, exact)),
      diameterErrorDeg: Math.abs(left.diameter + (right.diameter - left.diameter) * amount - fields.diameter),
      phaseFractionError: fields.illuminatedFraction === undefined ? null : Math.abs(left.illuminatedFraction +
        (right.illuminatedFraction - left.illuminatedFraction) * amount - fields.illuminatedFraction),
      bodyAxesErrorArcsec, ringAxesErrorArcsec,
      exactRotationAt: exactRotation.at };
  }) };
});
const maxima = bodies.map(body => {
  const rows = samples.map(sample => sample.bodies.find(row => row.body === body)!);
  return { body, directionErrorArcsec: Math.max(...rows.map(row => row.directionErrorArcsec)),
    centeredErrorCssPxAtMinFov: Math.max(...rows.map(row => row.centeredErrorCssPxAtMinFov)),
    publishedCoordinateErrorArcsec: Math.max(...rows.map(row => row.publishedCoordinateErrorArcsec)),
    diameterErrorDeg: Math.max(...rows.map(row => row.diameterErrorDeg)),
    phaseFractionError: Math.max(...rows.map(row => row.phaseFractionError ?? 0)),
    bodyAxesErrorArcsec: Math.max(...rows.map(row => row.bodyAxesErrorArcsec ?? 0)),
    ringAxesErrorArcsec: Math.max(...rows.map(row => row.ringAxesErrorArcsec ?? 0)) };
});
const inputs = ['workers/miniapp-api/src/astronomy-engine-adapter.ts', 'packages/astronomy-core/src/astronomy-engine-runtime.ts',
  'packages/astronomy-core/src/observation-frame.ts', 'packages/miniapp-contracts/src/types.ts', 'node_modules/quaternion/dist/quaternion.mjs'];
const record = { scope: 'Research only: actual published 30-minute body anchors, EQJ de-rotation and existing shortest rotation interpolation versus the current server calculator.',
  contextSha256: baseline.contextSha256, observer: baseline.observer, algorithmVersion: computed.algorithmVersion,
  interval: { start, end }, samples, maxima,
  inputs: await Promise.all(inputs.map(async file => ({ file, sha256: digest(await fs.readFile(file)) }))),
  limits: ['One actual observer/date/half-hour. No production time model, HTTP fine-frame support or native playback is established.',
    'Sun/Moon truth uses the existing unrounded server dependency; other scalar/axis truth retains existing adapter publication precision.',
    'Center pixel error at0.05° is a geometry proxy, not a whole-viewport quality limit or device performance measurement.',
    'Body-frame interpolation is a bounded capability trial, not an authorization to borrow adjacent frames, relabel a coarse row or move stars with stale bodies/details.'] };
assert(!JSON.stringify(record).includes(context.contextId));
await fs.writeFile(output, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, sha256: digest(await fs.readFile(output)), maxima }));
