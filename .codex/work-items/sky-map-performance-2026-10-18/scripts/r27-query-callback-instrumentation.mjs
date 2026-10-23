// TASK ONLY finite source additions. Original function objects, Query calls,
// React state, closure bodies and component lexical blocks remain unchanged.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), ts = require('../../../../apps/wechat-miniapp/node_modules/typescript');
const prefixes = {
  page: 'import { r27PageRenderBegin, r27PageRenderEnd, r27PageQueryCallback } from "./r25-memory-lifetime-adapter";\n',
  resourceQuery: 'import { r27QueryWrapper, r27QueryOwner } from "@/features/sky/r25-memory-lifetime-adapter";\n',
};
const sharedQueryPrefix = 'import { r27QueryWrapper, r27QueryOwner } from "./r27-query-callback-ports";\n';
const begin = '\n  r27PageRenderBegin();';
const owner = '\n  r27QueryOwner(queryFn, client, queryKey);';
function one(source, before, after, count, label) {
  if (source.split(before).length !== count + 1) throw Error('r27_callback_boundary_changed:' + label);
  return source.split(before).join(after);
}
const ast = source => ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function declaration(source, name, functionOnly = false) {
  const file = ast(source), found = [];
  function visit(node) {
    if (functionOnly ? ts.isFunctionDeclaration(node) && node.name?.text === name
      : ts.isVariableDeclaration(node) && node.name.getText(file) === name) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (found.length !== 1) throw Error('r27_callback_declaration_changed:' + name);
  return { file, node: found[0] };
}
function property(node, name, file) {
  const entries = node.initializer?.arguments?.[0]?.properties?.filter(value => ts.isPropertyAssignment(value)
    && value.name.getText(file) === name) ?? [];
  if (entries.length !== 1 || !ts.isArrowFunction(entries[0].initializer)) throw Error('r27_callback_property_changed:' + name);
  return entries[0].initializer;
}
function edits(source, values) {
  for (const edit of values.sort((a, b) => b.start - a.start))
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  return source;
}
function instrumentPage(source) {
  const { file, node } = declaration(source, 'SpotSkyPage', true), returns = [];
  function visit(value) {
    if (value !== node && ts.isFunctionLike(value)) return;
    if (ts.isReturnStatement(value) && value.expression) returns.push(value.expression);
    ts.forEachChild(value, visit);
  }
  visit(node);
  // Loading, recovery and the normal nonempty page are three real returns.
  if (!node.body || returns.length !== 3) throw Error('r27_callback_page_return_changed');
  const fine = declaration(source, 'fineTarget'), callback = property(fine.node, 'queryFn', fine.file);
  return prefixes.page + edits(source, [
    { start: node.body.getStart(file) + 1, end: node.body.getStart(file) + 1, text: begin },
    ...returns.map(result => ({ start: result.getStart(file), end: result.getEnd(), text: `r27PageRenderEnd(${result.getText(file)})` })),
    { start: callback.getStart(fine.file), end: callback.getEnd(), text: `r27PageQueryCallback(${callback.getText(fine.file)})` },
  ]);
}
function instrumentQuery(source, sharedQueryPorts) {
  const { file, node } = declaration(source, 'result'), callback = property(node, 'queryFn', file);
  if (node.initializer?.expression?.getText(file) !== 'useQuery') throw Error('r27_callback_query_owner_changed');
  const statement = node.parent?.parent;
  if (!statement || !ts.isVariableStatement(statement)) throw Error('r27_callback_query_statement_changed');
  return (sharedQueryPorts ? sharedQueryPrefix : prefixes.resourceQuery) + edits(source, [
    { start: callback.getStart(file), end: callback.getEnd(), text: `r27QueryWrapper(queryFn, ${callback.getText(file)})` },
    { start: statement.getEnd(), end: statement.getEnd(), text: owner },
  ]);
}
export function addR27QueryCallbackSources({ page, resourceQuery }, { sharedQueryPorts = false } = {}) {
  for (const source of [page, resourceQuery]) if (typeof source !== 'string' || source.includes('r27Page') || source.includes('r27Query'))
    throw Error('r27_callback_uninstrumented_source_required');
  return { page: instrumentPage(page), resourceQuery: instrumentQuery(resourceQuery, sharedQueryPorts) };
}
export function stripR27QueryCallbackSource(source, kind) {
  if (!Object.hasOwn(prefixes, kind)) throw Error('r27_callback_source_kind_required');
  const prefix = kind === 'resourceQuery' && source.startsWith(sharedQueryPrefix) ? sharedQueryPrefix : prefixes[kind];
  source = one(source, prefix, '', 1, kind + ':import');
  source = one(source, kind === 'page' ? begin : owner, '', 1, kind + ':marker');
  const file = ast(source), replacements = [];
  function visit(node) {
    if (ts.isCallExpression(node) && ['r27PageRenderEnd', 'r27PageQueryCallback', 'r27QueryWrapper'].includes(node.expression.getText(file))) {
      const name = node.expression.getText(file), value = node.arguments[name === 'r27QueryWrapper' ? 1 : 0];
      if (!value || node.arguments.length !== (name === 'r27QueryWrapper' ? 2 : 1)) throw Error('r27_callback_strip_arguments');
      replacements.push({ start: node.getStart(file), end: node.getEnd(), text: value.getText(file) });
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (replacements.length !== (kind === 'page' ? 4 : 1)) throw Error('r27_callback_strip_markers');
  return edits(source, replacements);
}
export function addR27QueryCallbackAdapter(adapter, { sharedQueryPorts = false } = {}) {
  adapter = 'import { createR27QueryCallbackLinks } from "./r27-query-callback-links";\n' + adapter;
  if (sharedQueryPorts) adapter = 'import { registerR27QueryCallbackPorts } from "../../hooks/r27-query-callback-ports";\n' + adapter;
  adapter = one(adapter, 'const ownerLinks = createR26MemoryOwnerLinks(value => owners.aggregateId(value));',
    'const ownerLinks = createR26MemoryOwnerLinks(value => owners.aggregateId(value));\nconst callbackLinks = createR27QueryCallbackLinks(value => owners.aggregateId(value));' +
      (sharedQueryPorts ? '\nregisterR27QueryCallbackPorts(callbackLinks.queryWrapper, callbackLinks.queryOwner);' : ''), 1, 'same_weak_ids');
  adapter = one(adapter, 'ownerLinks.stopTracking();', 'ownerLinks.stopTracking(); callbackLinks.stopTracking();', 1, 'same_pause');
  adapter = one(adapter, 'ownerLinks.start();', 'ownerLinks.start(); callbackLinks.start();', 1, 'same_start');
  adapter = one(adapter, 'ownerLinks.release();', 'ownerLinks.release(); callbackLinks.release();', 2, 'same_release');
  adapter = one(adapter, 'if (tracking) owners.observeAggregate(aggregate, entries);',
    'if (tracking) { owners.observeAggregate(aggregate, entries); callbackLinks.aggregate(aggregate); }', 1, 'same_creation');
  adapter = one(adapter, 'export function r25MemoryStatus()',
    'export const r27PageRenderBegin = callbackLinks.beginRender;\n' +
    'export const r27PageRenderEnd = callbackLinks.finishRender;\n' +
    'export const r27PageQueryCallback = callbackLinks.pageCallback;\n' +
    'export const r27QueryWrapper = callbackLinks.queryWrapper;\n' +
    'export const r27QueryOwner = callbackLinks.queryOwner;\n' +
    'export function r25MemoryStatus()', 1, 'identity_ports');
  adapter = one(adapter, 'schemaVersion: "starward-r26-memory-checkpoint-v1"',
    'schemaVersion: "starward-r27-memory-checkpoint-v1"', 1, 'extended_schema');
  return one(adapter, 'ownerLinks: ownerLinks.snapshot(phase, observation.clock.elapsedMs) });',
    'ownerLinks: ownerLinks.snapshot(phase, observation.clock.elapsedMs), queryCallbacks: callbackLinks.snapshot(phase, observation.clock.elapsedMs) });', 1, 'same_checkpoints');
}
