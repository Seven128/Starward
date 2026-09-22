import assert from 'node:assert/strict';
import test from 'node:test';
import { createScrollSettlement } from './scroll-settlement';

test('empty touches cannot authorize late or programmatic scroll submission', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const values: number[] = [], s = createScrollSettlement(v => values.push(v));
  s.begin(); s.update(40); s.cancel(); s.begin(); s.release();
  assert.equal(s.active, false);
  s.update(40); s.end(); t.mock.timers.tick(1000);
  assert.deepEqual(values, []);
});

test('holding, momentum, regrab and cancel each retain one settlement owner', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const values: number[] = [], s = createScrollSettlement(v => values.push(v));
  s.begin(); s.update(10); s.end(); t.mock.timers.tick(1000);
  assert.deepEqual(values, []);
  s.release(); t.mock.timers.tick(100); s.update(20); t.mock.timers.tick(100);
  s.begin(); s.update(5); t.mock.timers.tick(1000); assert.deepEqual(values, []);
  s.release(); t.mock.timers.tick(150); assert.deepEqual(values, [5]);
  s.end(); s.release(); t.mock.timers.tick(1000); assert.deepEqual(values, [5]);
});

test('old native end after regrab cannot overwrite the new position or submit early',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const values:number[]=[];
 const s=createScrollSettlement(v=>values.push(v));
 s.begin();s.update(40);s.release();s.begin();s.update(10);s.release();
 s.end();assert.deepEqual(values,[]);t.mock.timers.tick(150);assert.deepEqual(values,[10]);
});
