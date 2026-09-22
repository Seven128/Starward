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
