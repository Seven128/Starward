// One actual adapter/transport fixture for the existing checkpoint revisions.
// Native I/O/clock/weak collection are controlled; runtime owners are loaded whole.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { addR26MemoryOwnerLinks } from './r26-memory-owner-instrumentation.mjs';
import { validateR26MemoryCheckpoint } from './r26-memory-checkpoint-protocol.mjs';
const require = createRequire(import.meta.url), ts = require('../../../../apps/wechat-miniapp/node_modules/typescript');
const baseNames = ['r25-memory-lifetime-observer', 'r25-stellar-owner-observer', 'r25-memory-lifetime-adapter',
  'r26-aggregate-use-observer', 'r26-fiber-owner-observer', 'r26-memory-owner-links'];
const baseSources = Object.fromEntries(await Promise.all(baseNames.map(async name => [name,
  await fs.readFile(new URL(name + '.ts', import.meta.url), 'utf8')])));

export async function memoryCheckpointHarness({ extraNames = [], transformAdapter = addR26MemoryOwnerLinks,
  validate = validateR26MemoryCheckpoint, imports: suppliedImports = {}, generation = 30, weakRefSupported = true } = {}) {
  const sources = { ...baseSources, ...Object.fromEntries(await Promise.all(extraNames.map(async name => [name,
    await fs.readFile(new URL(name + '.ts', import.meta.url), 'utf8')]))) };
  let elapsed = 0, nextTimer = 0, lookups = 0;
  const timers = new Map(), requests = [], nodes = new Map();
  class Reference { constructor(value) { this.value = value; } deref() { return this.value; } }
  const context = vm.createContext({ WeakRef: weakRefSupported ? Reference : undefined, __R25_BUILD_GENERATION__: generation, __MINIAPP_API_BASE__: 'http://127.0.0.1:8798',
    Date: class extends Date { static now() { return 1000000 + elapsed; } },
    setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, at: elapsed + delay }); return id; },
    clearTimeout(id) { timers.delete(id); } });
  const loaded = new Map();
  const imports = {
    '@tarojs/runtime': { eventSource: { get(id) { lookups++; return nodes.get(id); } } },
    '@tarojs/react': { internalInstanceKey: '__reactFiber$fixture' },
    '@tarojs/taro': { __esModule: true, default: { request(options) {
      requests.push(options); return Promise.resolve({ statusCode: 200, data: { stored: true } });
    } } },
    './r17-ruler-entry-runtime': { r17ProbePayloadBytes: text => Buffer.byteLength(text, 'utf8') },
    ...suppliedImports,
  };
  const load = name => {
    if (loaded.has(name)) return loaded.get(name);
    let source = sources[name]; assert.equal(typeof source, 'string', name);
    if (name === 'r25-memory-lifetime-adapter') source = transformAdapter(source);
    source = source.replaceAll('__R25_BUILD_SOURCE_HASH__', 'c'.repeat(64));
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true });
    assert.equal(compiled.diagnostics.filter(value => value.category === ts.DiagnosticCategory.Error).length, 0);
    const module = { exports: {} }; loaded.set(name, module.exports);
    vm.runInContext('(function(exports,require,module){' + compiled.outputText + '\n})', context)(module.exports,
      key => Object.hasOwn(imports, key) ? imports[key] : load(key.replace(/^\.\//, '')), module);
    return module.exports;
  };
  const api = load('r25-memory-lifetime-adapter');
  const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
  return { api, nodes, requests, lookups: () => lookups,
    async advance(to) {
      assert(to >= elapsed);
      for (let i = 0; i < 64; i++) {
        const next = [...timers].filter(([, timer]) => timer.at <= to).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) { elapsed = to; await flush(); return; }
        timers.delete(next[0]); elapsed = next[1].at; next[1].callback(); await flush();
      }
      throw Error('unbounded_timers');
    },
    receipt() { const value = JSON.parse(requests.at(-1).data); assert.equal(validate(value), true); return value; },
  };
}
