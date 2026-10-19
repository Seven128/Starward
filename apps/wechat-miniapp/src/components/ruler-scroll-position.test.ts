import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

test('native snap repeats identical positions and discards stale queries after regrab or hide', () => {
  const pending: Array<(values: unknown[]) => void> = [], moves: number[] = [];
  const source = readFileSync(new URL('./ruler-scroll-position.ts', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export function', 'function');
  const create = vm.runInNewContext(ts.transpileModule(source+'\ncreateRulerScrollPosition;', {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, { Taro: { createSelectorQuery: () => ({ select: () => ({ node: () => ({ exec: (cb: any) => pending.push(cb) }) }) }) } });
  const position = create('ruler');
  const result = [{ node: { scrollTo: ({left}: {left: number}) => moves.push(left) } }];
  position.move(0); pending.shift()!(result);
  position.move(0); pending.shift()!(result);
  assert.deepEqual(moves, [0,0]);
  position.move(10); position.cancel(); pending.shift()!(result);
  position.move(20); position.move(30); pending.shift()!(result); pending.shift()!(result);
  assert.deepEqual(moves, [0,0,30]);
});

test('native positioning reads actual offsets after supported commands, bounds missing-node retry and retires stale observations', () => {
  const nodes: Array<(values: unknown[]) => void> = [], offsets: Array<(values: unknown[]) => void> = [], ticks: Array<() => void> = [];
  const source = readFileSync(new URL('./ruler-scroll-position.ts', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export function', 'function');
  const platform = { nextTick: (run: () => void) => ticks.push(run), createSelectorQuery: () => {
    let node = false;
    const q = { select: () => q, node: () => { node = true; return q; }, scrollOffset: () => q,
      exec: (callback: (values: unknown[]) => void) => (node ? nodes : offsets).push(callback) };
    return q;
  } };
  const create = vm.runInNewContext(ts.transpileModule(source+'\ncreateRulerScrollPosition;', {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, { Taro: platform });
  const position = create('ruler'), observed: Array<number | null> = [], commands: object[] = [];
  const result = [{ node: { scrollTo: (options: object) => commands.push(options) } }];
  position.move(561.5, false, (left: number | null) => observed.push(left));
  nodes.shift()!([]); assert.equal(ticks.length, 1); assert.equal(observed.length, 0);
  ticks.shift()!(); nodes.shift()!(result);
  assert.deepEqual({ ...commands[0] }, { left: 561.5, animated: false }, 'the documented options are sent to the real node boundary');
  assert.equal(observed.length, 0, 'returning from scrollTo is not an actual-position receipt');
  offsets.shift()!([{ scrollLeft: 574.5777587890625 }]);
  assert.deepEqual([...observed], [574.5777587890625], 'the old actual offset is preserved, not replaced with the target');
  position.readOffset((left: number | null) => observed.push(left)); position.cancel();
  offsets.shift()!([{ scrollLeft: 561.4222412109375 }]); assert.equal(observed.length, 1);
  position.move(578.5, true); nodes.shift()!(result);
  assert.deepEqual({ ...commands[1] }, { left: 578.5, animated: true }, 'same-window native motion stays available');
  position.move(561.5, false, (left: number | null) => observed.push(left)); nodes.shift()!([]);
  ticks.shift()!(); nodes.shift()!([]);
  assert.deepEqual([...observed], [574.5777587890625, null]); assert.equal(ticks.length, 0, 'missing nodes do not start a polling loop');
});

test('a missing offset is retried once while an early valid offset remains a valid observation', () => {
  const pending: Array<(values: unknown[]) => void> = [], ticks: Array<() => void> = [];
  const source = readFileSync(new URL('./ruler-scroll-position.ts', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export function', 'function');
  const create = vm.runInNewContext(ts.transpileModule(source+'\ncreateRulerScrollPosition;', {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, { Taro: { nextTick: (run: () => void) => ticks.push(run),
    createSelectorQuery: () => { const q = { select: () => q, scrollOffset: () => q,
      exec: (callback: (values: unknown[]) => void) => pending.push(callback) }; return q; } } });
  const position = create('ruler'), observed: Array<number | null> = [];
  position.readOffset((left: number | null) => observed.push(left)); pending.shift()!([]);
  assert.equal(observed.length, 0); ticks.shift()!(); pending.shift()!([{ scrollLeft: 561.42 }]);
  assert.deepEqual([...observed], [561.42]);
  position.readOffset((left: number | null) => observed.push(left)); pending.shift()!([]);
  ticks.shift()!(); pending.shift()!([]); assert.deepEqual([...observed], [561.42, null]);
  assert.equal(ticks.length, 0);
});

test('settling travels from the live position for 220ms, can be interrupted, and reduced motion is immediate', () => {
  let now = 0;
  let nextTimer = 0;
  const timers = new Map<number, { at: number; run: () => void }>();
  const pending: Array<(values: unknown[]) => void> = [];
  const moves: number[] = [], presented: number[] = [];
  const source = readFileSync(new URL('./ruler-scroll-position.ts', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export function', 'function');
  const create = vm.runInNewContext(ts.transpileModule(source+'\ncreateRulerScrollPosition;', {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    Date: { now: () => now },
    setTimeout: (run: () => void, delay: number) => { const id = ++nextTimer; timers.set(id, { at: now + delay, run }); return id; },
    clearTimeout: (id: number) => timers.delete(id),
    Taro: { createSelectorQuery: () => ({ select: () => ({ node: () => ({ exec: (cb: any) => pending.push(cb) }) }) }) },
  });
  const advance = (end: number) => {
    while (timers.size) {
      const [id, job] = [...timers].sort((a,b) => a[1].at-b[1].at)[0]!;
      if (job.at > end) break;
      now = job.at; timers.delete(id); job.run();
    }
    now = end;
  };
  const result = [{ node: { scrollTo: ({left, animated}: {left: number; animated: boolean}) => { assert.equal(animated, false); moves.push(left); } } }];
  const position = create('ruler');
  position.settle(31,66,false,(left: number)=>presented.push(left)); pending.shift()!(result);
  assert.equal(moves[0],31);
  advance(110);
  assert.ok(moves.length > 4 && moves.at(-1)! > 31 && moves.at(-1)! < 66);
  advance(219); assert.ok(moves.at(-1)! < 66);
  advance(220); assert.equal(moves.at(-1),66); assert.deepEqual(presented,moves);
  position.settle(66,132,false,(left: number)=>presented.push(left)); pending.shift()!(result);
  advance(260); const interrupted = moves.at(-1)!; position.cancel(); const count = moves.length;
  advance(500); assert.equal(moves.length,count);
  position.settle(interrupted,0,true,(left: number)=>presented.push(left)); pending.shift()!(result);
  assert.equal(moves.at(-1),0); assert.equal(timers.size,0);
  position.settle(0,132,false,()=>{}); position.cancel(); pending.shift()!(result);
  assert.equal(moves.at(-1),0); assert.equal(timers.size,0);
});
