// Task-only, insertion-only R19 observation. This module never reads/writes the
// product source, builds, starts a tool, or talks to the device. Root owns those.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const miniRequire = createRequire(new URL('../../../../apps/wechat-miniapp/package.json', import.meta.url));
const ts = miniRequire('typescript');
const sha256 = text => createHash('sha256').update(text, 'utf8').digest('hex');

export const expectedSourceSha256 = '0ca49aa6b0c2544bcfd57a5d7655441ab7225bb646a8ac820c73c4b0cca46534';
const sourcePath = 'apps/wechat-miniapp/src/pages/map/index.tsx';
const setterSites = [
  ['formal-open', 'FO', 'openDetail', 'setPanelExtent("medium")'],
  ['private-open', 'PO', 'onMarkerTap', 'setPanelExtent("medium")'],
  ['layer-toggle-restore', 'LT', 'openLayerSheet', 'setPanelExtent(previous.extent)'],
  ['layer-close-restore', 'LC', 'closeLayerSheet', 'setPanelExtent(previous.extent)'],
  ['shared-animate', 'AN', 'animatePanelExtent', 'setPanelExtent(target)'],
  ['extent-control-fallback', 'EF', 'onPanelExtent', 'setPanelExtent(target)'],
  ['native-back-extent', 'BE', 'handleMapPresentationSystemBack', 'setPanelExtent(previousExtent)'],
  ['submitted-open', 'SO', 'jsx:onSubmitted', 'setPanelExtent("medium")'],
];
const insertionKeys = ['helpers', 'ref-and-state', ...setterSites.map(site => site[0]), 'native-back-entry', 'overlay'];
const marker = (edge, key, jsx = false) => {
  const comment = `/* R19_PANEL_RETURN_PROBE_${edge}:${key} */`;
  return jsx ? `{${comment}}` : comment;
};

/** Remove exactly this probe's 12 additions; no newline or source normalization. */
export function stripPanelReturnProbe(instrumentedSource) {
  assert.equal(typeof instrumentedSource, 'string');
  let restored = instrumentedSource;
  for (const key of insertionKeys) {
    const begin = marker('BEGIN', key, key === 'overlay');
    const end = marker('END', key, key === 'overlay');
    const start = restored.indexOf(begin);
    assert.ok(start >= 0, `Missing probe begin marker: ${key}`);
    assert.equal(restored.indexOf(begin, start + begin.length), -1, `Duplicate probe marker: ${key}`);
    const finish = restored.indexOf(end, start + begin.length);
    assert.ok(finish >= 0, `Missing probe end marker: ${key}`);
    assert.equal(restored.indexOf(end, finish + end.length), -1, `Duplicate probe end marker: ${key}`);
    restored = restored.slice(0, start) + restored.slice(finish + end.length);
  }
  assert.ok(!restored.includes('R19_PANEL_RETURN_PROBE_'), 'Unexpected remaining probe marker');
  return restored;
}

/** Input: untouched UTF-8 source as a JS string. Output is never applied here. */
export function instrumentPanelReturnProbe(originalSource) {
  assert.equal(typeof originalSource, 'string');
  assert.equal(sha256(originalSource), expectedSourceSha256, 'Source drift: review the current AST before changing this task-only probe');
  assert.ok(!originalSource.includes('R19_PANEL_RETURN_PROBE_'));
  assert.ok(!originalSource.includes('r19PanelReturnProbe'));
  const eol = originalSource.includes('\r\n') ? '\r\n' : '\n';
  const parse = source => {
    const file = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.equal(file.parseDiagnostics.length, 0, 'TSX parse diagnostics');
    return file;
  };
  const file = parse(originalSource);
  const collect = (root, predicate) => {
    const nodes = [];
    function walk(node) { if (predicate(node)) nodes.push(node); ts.forEachChild(node, walk); }
    walk(root);
    return nodes;
  };
  const unique = (nodes, label) => { assert.equal(nodes.length, 1, `Expected one ${label}`); return nodes[0]; };
  const map = unique(file.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'MapPage'), 'MapPage');
  const functionNames = node => {
    const names = [];
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (!ts.isFunctionLike(parent)) continue;
      if (parent.name && ts.isIdentifier(parent.name)) names.push(parent.name.text);
      else if (ts.isVariableDeclaration(parent.parent) && ts.isIdentifier(parent.parent.name)) names.push(parent.parent.name.text);
      else if (ts.isJsxExpression(parent.parent) && ts.isJsxAttribute(parent.parent.parent)) names.push(`jsx:${parent.parent.parent.name.getText(file)}`);
    }
    return names;
  };
  const setters = collect(map, node => ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'setPanelExtent');
  assert.equal(setters.length, 8, 'Expected all 8 existing extent setters');
  const insertions = [];
  const before = (node, key, code, jsx = false) => {
    const offset = node.getStart(file);
    const lineStart = originalSource.lastIndexOf('\n', offset - 1) + 1;
    const indent = originalSource.slice(lineStart, offset).match(/^[\t ]*/)[0];
    const normalizedAddition = code.replace(/\r?\n/g, eol);
    const text = marker('BEGIN', key, jsx) + normalizedAddition + eol + indent + marker('END', key, jsx);
    insertions.push({ key, offset, line: file.getLineAndCharacterOfPosition(offset).line + 1, text });
  };

  // Helpers live outside MapPage and receive only the bounded scalar ref. No
  // function, render closure, Context, account, location, data or time is saved.
  const helpers = String.raw`
type R19PanelReturnProbeEvent = { n: number; tag: string; extent: SpotPanelExtent; phase: string; floor: number };
type R19PanelReturnProbe = { events: R19PanelReturnProbeEvent[]; next: number; extent: SpotPanelExtent; phase: string; floor: number };
function r19PanelReturnProbeRecord(probe: R19PanelReturnProbe, tag: string, extent = probe.extent, phase = probe.phase) {
  probe.events.push({ n: probe.next++, tag, extent, phase, floor: probe.floor });
  if (probe.events.length > 24) probe.events.shift();
}
function r19PanelReturnProbeObserve(probe: R19PanelReturnProbe, extent: SpotPanelExtent, phase: string, floor: number) {
  if (probe.events.length && probe.extent === extent && probe.phase === phase && probe.floor === floor) return;
  probe.extent = extent; probe.phase = phase; probe.floor = floor;
  r19PanelReturnProbeRecord(probe, "ST");
}
function r19PanelReturnProbeText(probe: R19PanelReturnProbe) {
  const phase: Record<string, string> = { closed: "c", opening: "i", open: "o", closing: "x" };
  return "R19P tag e/p/f\n" + probe.events.map(event =>
    event.n + ":" + event.tag + " " + event.extent[0] + "/" + phase[event.phase] + "/" + event.floor).join("\n");
}
`;
  before(map, 'helpers', helpers);

  const heightStatement = unique(map.body.statements.filter(node => ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'panelIdentityHeight')), 'panelIdentityHeight statement');
  assert.equal(heightStatement.getText(file), 'const panelIdentityHeight = panelIdentityLayout?.identity === panelGeometryIdentity ? panelIdentityLayout.height : 0;');
  const layoutStatement = map.body.statements[map.body.statements.indexOf(heightStatement) + 1];
  assert.equal(layoutStatement.getText(file), 'const [panelLayoutVersion, setPanelLayoutVersion] = useState(0);');
  before(layoutStatement, 'ref-and-state', `const r19PanelReturnProbe = useRef<R19PanelReturnProbe | null>(null);
  if (r19PanelReturnProbe.current === null) r19PanelReturnProbe.current = { events: [], next: 1, extent: panelExtent, phase: primaryNavigation.presentation.phase, floor: panelIdentityHeight };
  r19PanelReturnProbeObserve(r19PanelReturnProbe.current, panelExtent, primaryNavigation.presentation.phase, panelIdentityHeight);`);

  const siteManifest = [];
  for (const [key, tag, owner, expression] of setterSites) {
    const call = unique(setters.filter(node => functionNames(node).includes(owner)), `setter owned by ${owner}`);
    assert.equal(call.getText(file), expression, `Changed setter expression in ${owner}`);
    assert.ok(ts.isExpressionStatement(call.parent) && ts.isBlock(call.parent.parent), `Setter is no longer a direct block statement: ${owner}`);
    before(call.parent, key, `r19PanelReturnProbeRecord(r19PanelReturnProbe.current!, "${tag}");`);
    siteManifest.push({ tag, owner, originalLine: file.getLineAndCharacterOfPosition(call.getStart(file)).line + 1, originalExpression: expression });
  }

  const boundary = unique(collect(map, node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'NativeBackBoundary'), 'Map NativeBackBoundary');
  const back = unique(boundary.attributes.properties.filter(node => ts.isJsxAttribute(node) && node.name.getText(file) === 'onBack'), 'NativeBackBoundary.onBack');
  assert.ok(ts.isJsxExpression(back.initializer) && ts.isArrowFunction(back.initializer.expression));
  const callback = back.initializer.expression;
  assert.ok(ts.isBlock(callback.body) && callback.body.statements.length > 0);
  assert.ok(callback.body.statements[0].getText(file).startsWith('if (primaryNavigation.controller.getSnapshot().phase !== "closed")'));
  before(callback.body.statements[0], 'native-back-entry', 'r19PanelReturnProbeRecord(r19PanelReturnProbe.current!, "NB", panelExtentRef.current, primaryNavigation.controller.getSnapshot().phase);');

  const portal = unique(collect(map, node => ts.isJsxElement(node) && node.openingElement.tagName.getText(file) === 'RootPortal'), 'existing My RootPortal');
  assert.ok(portal.getText(file).includes('map-my-presentation--${primaryNavigation.presentation.phase}'));
  before(portal, 'overlay', `<RootPortal><View style={{ position: "fixed", top: "90Px", left: "84Px", right: "76Px", zIndex: 2147483646, pointerEvents: "none", background: "rgba(0,0,0,0.78)", padding: "3Px" }}>
        <Text style={{ color: "#ffffff", fontSize: "8Px", lineHeight: "10Px", whiteSpace: "pre-wrap", pointerEvents: "none" }}>{r19PanelReturnProbeText(r19PanelReturnProbe.current!)}</Text>
      </View></RootPortal>`, true);

  assert.equal(insertions.length, 12);
  assert.equal(new Set(insertions.map(item => item.offset)).size, insertions.length, 'Overlapping insertion positions');
  let source = originalSource;
  for (const insertion of [...insertions].sort((a, b) => b.offset - a.offset))
    source = source.slice(0, insertion.offset) + insertion.text + source.slice(insertion.offset);
  const instrumented = parse(source);
  const retainedSetters = collect(instrumented, node => ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'setPanelExtent');
  assert.deepEqual(retainedSetters.map(node => node.getText(instrumented)), setters.map(node => node.getText(file)), 'Original setters changed');
  const restored = stripPanelReturnProbe(source);
  assert.equal(restored, originalSource, 'Probe stripping changed original characters');
  assert.ok(Buffer.from(restored, 'utf8').equals(Buffer.from(originalSource, 'utf8')), 'Probe stripping changed original UTF-8 bytes');
  return {
    source,
    manifest: {
      schema: 'starward-r19-panel-return-probe-v1', sourcePath,
      sourceSha256: sha256(originalSource), instrumentedSha256: sha256(source), restoredSha256: sha256(restored),
      parserVersion: ts.version, eol: eol === '\r\n' ? 'CRLF' : 'LF',
      eventLimit: 24, insertionCount: 12, setterCount: retainedSetters.length,
      insertions: insertions.map(({ key, offset, line }) => ({ key, offset, originalLine: line })),
      setters: siteManifest,
      tags: { ST: 'distinct rendered extent/My phase/existing content floor sample', NB: 'actual Map NativeBackBoundary onBack entry; live controller phase and extent ref',
        FO: 'formal open', PO: 'private marker open', LT: 'layer toggle restore', LC: 'layer close restore', AN: 'shared animation setter; caller may be drag or extent control',
        EF: 'extent control without valid geometry', BE: 'Map Back extent decrement', SO: 'editor submitted open' },
      phases: { c: 'closed', i: 'opening', o: 'open', x: 'closing' },
      exactByteRestorationVerified: true, originalSetterExpressionsUnchanged: true, tsxParseVerified: true,
      limitations: ['ST samples occur during existing renders and are not a separate commit observer.',
        'Event-only writes appear on the next existing render; the probe never schedules one.',
        'floor is the existing rendered panelIdentityHeight; no rulers/height or extra geometry are collected.',
        '24-event ring; ordinal gaps mean earlier events were evicted.',
        'Observation overlay is excluded from adopted-design conformance and product acceptance.'],
    },
  };
}

export default instrumentPanelReturnProbe;
