import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import Quaternion from 'quaternion';
import { Body, Observer, Equator, Horizon } from '../../../../packages/astronomy-core/src/astronomy-engine-runtime.ts';
import { observationHorizontalFrame } from '../../../../packages/astronomy-core/src/observation-frame.ts';
import { skyHorizontalDirection } from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';

const output = '.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-time-vector-probe-2026-09-29.json';
await assert.rejects(fs.access(output), { code: 'ENOENT' });
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const baseline = JSON.parse(await fs.readFile('.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-time-motion-probe-2026-09-29.json', 'utf8'));
const bodies = [Body.Sun, Body.Moon, Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune];
const cases = [
  { label: 'Actual published Shenzhen observer, current observation night', ...baseline.observer, start: '2026-09-29T04:00:00.000Z' },
  { label: 'Bounded numeric check at high northern latitude; not a field measurement', latitude: 78.2232, longitude: 15.6469, elevationM: 0, start: '2026-10-01T00:00:00.000Z' },
  { label: 'Bounded southern numeric check across a UTC day; not a field measurement', latitude: -33.8688, longitude: 151.2093, elevationM: 0, start: '2026-10-10T02:00:00.000Z' },
];
type Vector = readonly number[];
const unit = (v: Vector) => { const length = Math.hypot(...v); return v.map(x => x / length); };
const cross = (a: Vector, b: Vector) => [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
const angle = (a: Vector, b: Vector) => Math.atan2(Math.hypot(...cross(a,b)), a.reduce((sum, value, i) => sum + value * b[i]!, 0));
const transform = (m: Vector, v: Vector) => [0,1,2].map(row => v.reduce((sum, value, col) => sum + m[row*3+col]! * value, 0));
const quaternion = (m: Vector) => Quaternion.fromMatrix([[m[0]!,m[1]!,m[2]!],[m[3]!,m[4]!,m[5]!],[m[6]!,m[7]!,m[8]!]]).normalize();
const matrix = (q: Quaternion) => { const cols = [[1,0,0],[0,1,0],[0,0,1]].map(v => q.rotateVector(v)); return [0,1,2].flatMap(row => cols.map(col => col[row]!)); };
const hermite = (a: Vector, va: Vector, b: Vector, vb: Vector, amount: number) => {
  const square=amount*amount, cube=square*amount;
  return unit(a.map((value, index) => (2*cube-3*square+1)*value + (cube-2*square+amount)*1800*va[index]! +
    (-2*cube+3*square)*b[index]! + (cube-square)*1800*vb[index]!));
};
const records = [];
const started = performance.now();
for (const input of cases) {
  const observer = new Observer(input.latitude, input.longitude, input.elevationM);
  const point = { latitude: input.latitude, longitude: input.longitude, elevationM: input.elevationM };
  const direction = (body: typeof Body.Sun, at: number) => {
    const result = Equator(body, new Date(at), observer, false, true).vec;
    return unit([result.x,result.y,result.z]);
  };
  const snapshot = (at: number) => ({ at, rotation: quaternion(observationHorizontalFrame({ ...point, at: new Date(at) }).equatorialToEnu),
    bodies: bodies.map(body => ({ body, direction: direction(body,at), velocity: direction(body,at+1000).map((v,i) => (v-direction(body,at-1000)[i]!)/2) })) });
  const knots = Array.from({length:49},(_,index) => snapshot(Date.parse(input.start)+index*1800000));
  const maxima = bodies.map(body => ({ body, maxAngularErrorArcsec: 0, at: '', centeredErrorCssPxAtMinFov: 0 }));
  let maxRotationErrorArcsec=0;
  for (let index=0; index<48; index++) {
    const left=knots[index]!, right=knots[index+1]!;
    for (const seconds of [0,1,300,600,900,1200,1500,1799,1800]) {
      const at=left.at+seconds*1000, amount=seconds/1800;
      const rotation=matrix(left.rotation.slerp(right.rotation)(amount).normalize());
      const exactRotation=observationHorizontalFrame({...point,at:new Date(at)}).equatorialToEnu;
      for(const axis of [[1,0,0],[0,1,0],[0,0,1]]) maxRotationErrorArcsec=Math.max(maxRotationErrorArcsec,angle(transform(rotation,axis),transform(exactRotation,axis))*180/Math.PI*3600);
      bodies.forEach((body,bodyIndex) => {
        const a=left.bodies[bodyIndex]!, b=right.bodies[bodyIndex]!;
        const model=transform(rotation,hermite(a.direction,a.velocity,b.direction,b.velocity,amount));
        // Independent existing horizontal consumer: EQ-of-date + Horizon.
        const eq=Equator(body,new Date(at),observer,true,true), horizontal=Horizon(new Date(at),observer,eq.ra,eq.dec,'');
        const exact=skyHorizontalDirection(horizontal.azimuth,horizontal.altitude)!;
        const radians=angle(model,exact), error=radians*180/Math.PI*3600;
        const record=maxima[bodyIndex]!;
        if(error>record.maxAngularErrorArcsec){record.maxAngularErrorArcsec=error;record.at=new Date(at).toISOString();record.centeredErrorCssPxAtMinFov=844/(4*Math.tan(.05*Math.PI/720))*2*Math.tan(radians/2);}
      });
    }
  }
  records.push({ input, intervals:48, sampleInstantsPerInterval:9, bodiesPerInstant:9, maxRotationErrorArcsec, maxima });
}
const inputs = ['packages/astronomy-core/src/astronomy-engine-runtime.ts','packages/astronomy-core/src/observation-frame.ts','node_modules/quaternion/dist/quaternion.mjs'];
const record = { scope: 'Bounded existing-server dependency trial of unrounded apparent EQJ directions plus derivative Hermite and actual observer rotation anchors; no production model adopted.',
  contextSha256: baseline.contextSha256, anchorSeconds:1800, derivativeSeconds:1, records, researchRunWallMs:performance.now()-started,
  inputs: await Promise.all(inputs.map(async file => ({file,sha256:sha(await fs.readFile(file))}))),
  limits:['Three numerical observers/dates, including one actual current publication observer; not an all-date/all-location proof or target acceptance.',
    'Existing versioned model/coverage and one shared presentation time remain required. These vectors do not establish phase/body-axis/weather/target/opportunity/selection/imagery/lifecycle behavior.',
    'Research wall time includes truth comparisons and redundant calculator calls; it is not a production compute budget, endpoint latency, bill or device performance.'] };
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,sha256:sha(await fs.readFile(output)),records,wallMs:record.researchRunWallMs}));
