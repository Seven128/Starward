import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import { minify } from "terser";
import ts from "typescript";

// Keep each complete owner in the same bundle scope as a render. The failing
// production case is introduced by compression, not by the uncompiled module.
// Controlled external data and a Node collection witness prove only this JS
// ownership boundary; they do not establish WeChat/native memory retirement.
function bundleSource(file: string) {
  const javascript = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.ESNext },
  }).outputText;
  const module = ts.createSourceFile(file, javascript, ts.ScriptTarget.ESNext, true);
  return module.statements.filter(node => !ts.isImportDeclaration(node) && !ts.isExportDeclaration(node))
    .map(node => node.getText(module).replace(/^export\s+/, "")).join("\n");
}

function objectProperty(node: ts.ObjectLiteralExpression, name: string) {
  const property = node.properties.find(value => ts.isPropertyAssignment(value) && value.name.getText() === name);
  assert(property && ts.isPropertyAssignment(property) && ts.isObjectLiteralExpression(property.initializer));
  return property.initializer;
}

function compressionOptions() {
  const require = createRequire(import.meta.url);
  const runner = dirname(require.resolve("@tarojs/webpack5-runner/package.json"));
  const base = ts.createSourceFile("runner.js", readFileSync(join(runner, "dist/webpack/MiniBaseConfig.js"), "utf8"), ts.ScriptTarget.Latest, true);
  const project = ts.createSourceFile("config.ts", readFileSync(new URL("../../../config/index.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  let defaults: ReturnType<typeof vm.runInNewContext>;
  let overrides: ReturnType<typeof vm.runInNewContext>;
  const visitBase = (node: ts.Node) => {
    if (ts.isBinaryExpression(node) && node.left.getText(base) === "this.defaultTerserOptions")
      defaults = vm.runInNewContext(`(${node.right.getText(base)})`);
    ts.forEachChild(node, visitBase);
  };
  const visitProject = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(project) === "terser" && ts.isObjectLiteralExpression(node.initializer))
      overrides = vm.runInNewContext(`(${objectProperty(node.initializer, "config").getText(project)})`);
    ts.forEachChild(node, visitProject);
  };
  visitBase(base); visitProject(project);
  assert(defaults && overrides, "use the installed Taro defaults and current project compression");
  return { ...defaults, ...overrides, compress: { ...defaults.compress, ...overrides.compress },
    output: { ...defaults.output, ...overrides.output } };
}

const probe = String.raw`
  const assert = require('node:assert/strict'), vm = require('node:vm');
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', async () => {
    try {
      const { code, kind } = JSON.parse(input);
      const selection = { observationContext: { contextId: 'ctx:a', revision: 1, contextFingerprint: 'same' },
        selectedSpotId: 'spot:a', mapResetVersion: 0, spotOpenRequestVersion: 0 };
      const publication = { catalogVersion: 'test', catalogHash: 'a'.repeat(64), magnitudeLimit: 6,
        sources: [], rows: [['one', 'one', 1, 0, 1, 2, 3, 4, 5, 6], ['two', 'two', 2, 0, 7, 8, 9, 10, 11, 12]] };
      const geometry = Object.freeze({ at: '2000-01-01T12:00:00.000Z', julianYears: 0,
        observer: Object.freeze({ latitude: 0, longitude: 0, elevationM: 0 }),
        equatorialToEnu: Object.freeze([1, 0, 0, 0, 1, 0, 0, 0, 1]) });
      const report = { skyScene: { state: 'AVAILABLE', catalog: { catalogVersion: 'test', catalogHash: publication.catalogHash },
        publication, observer: geometry.observer, frames: [{ at: geometry.at, state: 'AVAILABLE', geometry }] } };
      const supplement = { publicationHash: 'tile-publication', index: {
        baseCatalogVersion: 'test', baseAssetSha256: publication.catalogHash, catalogHash: 'sao', catalogVersion: 'sao' } };
      const tiles = [{ publicationHash: supplement.publicationHash,
        tile: { catalogHash: 'sao', rows: [['SAO1', 1, 0, 1, 0, 0, 0, 0]] } }];
      const nativeCalls = { compassStart: 0, compassStop: 0, motionStart: 0, motionStop: 0 };
      const platformPort = {
        onCompassChange() {}, offCompassChange() {},
        async startCompass() { nativeCalls.compassStart++; },
        async stopCompass() { nativeCalls.compassStop++; },
        onDeviceMotionChange() {}, offDeviceMotionChange() {},
        startDeviceMotionListening(options) { nativeCalls.motionStart++; options.success(); },
        async stopDeviceMotionListening() { nativeCalls.motionStop++; },
      };
      const context = vm.createContext({
        useMemo: read => read(), readSelection: () => selection,
        sameContextVersion: (a, b) => a?.contextId === b?.contextId && a?.revision === b?.revision,
        canApplyContextRestore: () => true,
        assertStellarCatalogReference() {}, assertStellarCatalogPublication() {},
        isAdmittedStellarCatalogPublication: () => true, skyStarDisplayColor: () => '#fff',
        assertStellarGeometryFrame() {}, exactSkyTimeFrame: (frames, at) => frames.find(frame => frame.at === at),
        immutableSkyStellarGeometry: () => true, isAdmittedSaoIndexPublication: () => true,
        isAdmittedSaoTilePublication: () => true,
        createSkyStellarTransform: () => ({ position: () => ({ azimuthDeg: 0, altitudeDeg: 45 }),
          displayDirection: () => null, displayTransmission: () => 1, forEachProjected() {} }),
        platformPort, setTimeout, clearTimeout, reportRuntimeError() {},
        deviceMotionAngleUnit: () => 'radians',
        createDeviceOrientationViewTracker: () => ({ reset() {} }),
        createDirectionAlignment: () => ({ snapshot: () => ({ view: null, ready: false }),
          endReference() {}, startReference: () => 1 }),
      });
      vm.runInContext(code, context);
      const weak = (() => {
        const rendered = context.renderOwner(report, publication, supplement, tiles);
        const witness = new WeakRef(rendered.readRender());
        if (kind === 'compass') rendered.owner.dispose();
        else context.cachedOwner = rendered.owner;
        return witness;
      })();
      // No repeated deref keeps the witness alive between collection jobs.
      await new Promise(setImmediate); global.gc();
      await new Promise(setImmediate); global.gc();
      assert.equal(weak.deref(), undefined, kind + ' cached owner must not retain the discarded render');
      if (kind === 'context') {
        assert.equal(context.cachedOwner.contextId, 'ctx:a');
        assert(context.cachedOwner.canRequest(selection.observationContext));
        context.cachedOwner.hide(); assert.equal(context.cachedOwner.canRequest(selection.observationContext), false);
        context.cachedOwner.show(); assert(context.cachedOwner.canRequest(selection.observationContext));
      } else if (kind === 'catalog') {
        const output = [0, 0, 0, 0, 0, 0];
        assert.equal(context.cachedOwner.motionAt(1, output), output);
        assert.deepEqual(output, [7, 8, 9, 10, 11, 12]);
        assert.equal(context.cachedOwner.entries.length, 2);
      } else if (kind === 'stellar-frame' || kind === 'supplement-frame') {
        assert.equal(context.cachedOwner.points.length, kind === 'stellar-frame' ? 2 : 1);
        assert.equal(context.cachedOwner.displayTransmission(0), 1);
        if (kind === 'supplement-frame') assert.equal(context.cachedOwner.pointForReference('SAO1')[0], 'SAO1');
      } else {
        // The live native port keeps the same coordinator eligible in its
        // WeakMap. A later controller must still use both native streams.
        const replacement = context.renderOwner().owner;
        await replacement.start();
        assert.equal(replacement.active, true);
        replacement.dispose();
        await new Promise(setImmediate);
        assert.equal(replacement.active, false);
        assert.deepEqual(nativeCalls, { compassStart: 1, compassStop: 1, motionStart: 1, motionStop: 1 });
      }
      console.log(JSON.stringify({ kind, renderCollected: true, cachedOwnerUsable: true }));
    } catch (error) { console.error(error); process.exitCode = 1; }
  });
`;

for (const kind of ["context", "catalog", "compass", "stellar-frame", "supplement-frame"] as const) {
  test(`compressed ${kind} cache owner releases the discarded render while remaining usable`, async () => {
    const owners = kind === "context" ? ["./sky-context-session.ts"] : kind === "catalog" || kind === "stellar-frame"
      ? ["./sky-stellar-scene.ts"] : kind === "supplement-frame" ? ["./sky-stellar-supplement-scene.ts"]
        : ["./compass-lifecycle.ts", "./sky-orientation-controller.ts"];
    const create = kind === "context"
      ? `useMemo(function () { return createSkyContextSession('ctx:a', readSelection); })`
      : kind === "catalog" ? `useMemo(function () { return attachSkyCatalog(report, publication); }).skyScene.catalog`
        : kind === "stellar-frame" ? `useMemo(function () { return resolveSkySceneFrame(
          attachSkyCatalog(report, publication).skyScene, report.skyScene.frames[0].at); })`
        : kind === "supplement-frame" ? `useMemo(function () { return resolveSkyStellarSupplement(
          supplement, tiles, report.skyScene, report.skyScene.frames[0].at); })`
        : `useMemo(function () { return createSkyOrientationController({ port: platformPort, platform: 'android',
          presented: function () { return renderPayload.basis; },
          changed: function (snapshot) { renderPayload.latest = snapshot; } }); })`;
    const source = `(function () { ${owners.map(bundleSource).join("\n")}
      globalThis.renderOwner = function (report, publication, supplement, tiles) {
        var renderPayload = { marker: 'discarded-render' };
        var owner = ${create};
        return { owner: owner, readRender: function () { return renderPayload; } };
      };
    })();`;
    const compiled = await minify(source, compressionOptions());
    assert(compiled.code);
    const result = spawnSync(process.execPath, ["--expose-gc", "-e", probe], {
      input: JSON.stringify({ code: compiled.code, kind }), encoding: "utf8", timeout: 20_000,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout || result.error?.message || "collection probe did not finish");
    assert.deepEqual(JSON.parse(result.stdout), { kind, renderCollected: true, cachedOwnerUsable: true });
  });
}
