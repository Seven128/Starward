import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { skyFailureTestEpisodes } from './sky-failure-test-support';

// Execute the mounted page's actual status/effect decisions with controlled
// resource snapshots. These checks do not claim native visibility or timing.
const source = ts.createSourceFile('spot-sky-page.tsx', readFileSync(new URL('./spot-sky-page.tsx', import.meta.url), 'utf8'),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'SpotSkyPage') as ts.FunctionDeclaration;
const effects = new Map<string, string>();
let status = '';
function visit(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect') {
    const body = node.arguments[0]!.getText(source);
    for (const owner of ['report', 'catalog', 'supplement'])
      if (body.includes(`failureEpisodes.${owner}.observe`)) effects.set(owner, body);
  }
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'orientationDataStatus') status = node.initializer!.getText(source);
  ts.forEachChild(node, visit);
}
visit(page); assert.equal(effects.size, 3); assert.ok(status);
const compile = (code: string) => ts.transpileModule(`(${code})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

for (const owner of ['report', 'catalog', 'supplement'] as const) {
  test(`${owner} notification waits for a terminal result and reports only a new continuous failure`, () => {
    const notices: unknown[] = [], failureEpisodes = skyFailureTestEpisodes();
    const context: Record<string, any> = {
      failureEpisodes, notify: (notice: unknown) => notices.push(notice), pageVisible: true, contextComplete: true,
      contextMatches: true, carriedReport: undefined, routeContext: { spotId: 'spot:a', localDate: '2026-10-25' },
      activeContext: { contextId: 'ctx:a' }, reportRecovery: { reason: 'PROVIDER_UNAVAILABLE', detail: '更新失败，保留已加载的星图' },
      skyResourcesActive: true, stellarReference: { catalogVersion: 'v2', catalogHash: 'hash' },
      report: { isPending: false, isFetching: false, isError: true },
      stellarCatalog: { isPending: false, isFetching: false, isError: true },
      stellarSupplement: { loading: false, failed: true, interrupted: false, frame: null },
    };
    const resource = owner === 'report' ? context.report : owner === 'catalog' ? context.stellarCatalog : context.stellarSupplement;
    const pending = owner === 'supplement' ? 'loading' : 'isFetching';
    const failed = owner === 'supplement' ? 'failed' : 'isError';
    const invoke = () => vm.runInNewContext(compile(effects.get(owner)!), context)();
    resource[pending] = true; invoke(); assert.equal(notices.length, 0);
    resource[pending] = false; invoke(); invoke(); assert.equal(notices.length, 1);
    resource[pending] = true; invoke();
    resource[pending] = false; invoke(); assert.equal(notices.length, 1, 'automatic refresh is the same failure');
    context.pageVisible = false; resource[failed] = false; invoke();
    context.pageVisible = true; invoke(); resource[failed] = true; invoke();
    assert.equal(notices.length, 1, 'hidden or temporarily absent data is not successful recovery');
    resource[failed] = false;
    if (owner === 'supplement') { resource.interrupted = true; invoke(); resource.interrupted = false; resource.frame = {}; }
    else resource.data = { dataState: 'FRESH', warnings: [] };
    invoke(); resource[failed] = true; invoke(); assert.equal(notices.length, 2, 'positive current health closes the prior episode');
    failureEpisodes[owner].retry(); resource[pending] = true; invoke();
    resource[pending] = false; invoke(); assert.equal(notices.length, 3, 'explicit recovery failure can be reported');
  });
}

test('geometry preparation is loading; terminal failure, missing identity and expired supply remain errors', () => {
  const context: Record<string, any> = {
    carriedReport: undefined, report: { isPending: false, isError: false, data: { dataState: 'FRESH' } },
    orientationData: undefined, reportRecovery: { detail: '资料未加载' }, contextMatches: true, rawReportData: {},
    previewGeometry: { pending: true, failed: false }, reportData: undefined, row: undefined,
    stellarReference: null, stellarCatalog: {}, activeSkySceneFrame: undefined,
  };
  const read = () => vm.runInNewContext(compile(status), context);
  assert.equal(read().state, 'LOADING'); assert.match(read().detail, /正在加载此刻/);
  context.contextMatches = false; assert.equal(read().state, 'ERROR');
  context.contextMatches = true; context.previewGeometry.failed = true; assert.equal(read().state, 'ERROR');
  context.previewGeometry.failed = false; context.report.data.dataState = 'EXPIRED'; assert.equal(read().state, 'ERROR');
  context.report.data.dataState = 'FRESH'; context.report.isError = true; assert.equal(read().state, 'ERROR');
  context.report.isError = false; context.previewGeometry.pending = false; assert.equal(read().state, 'ERROR');
  context.reportData = { skyScene: { state: 'AVAILABLE', catalog: {} } }; context.row = {};
  context.activeSkySceneFrame = { state: 'AVAILABLE', pointCount: 1 }; assert.equal(read(), null);
});
