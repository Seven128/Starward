// TASK ONLY. Fixed-field scalar observations; product identities are weak keys.
import { r17Probe } from "./r17-phone-probe-runtime";
import { createR17GeometryStages } from "./r17-geometry-stage-runtime";
import { r17ProbePayloadBytes, r17ProbeBoundedReceipt } from "./r17-ruler-entry-runtime";

type Stamp = ReturnType<typeof r17Probe.now>;
type Time = { at: string; presentationGeneration: number; editingGeneration: number; editing: readonly string[];
  previewFromAt: string | null; previewAt: string | null; mode: string };
type Row = (number | null)[];
type Link = { input: number | null; intent: number | null; token: number | null; scope: number | null;
  generation: number | null; at: number | null };
const CAPACITY = 256, IDENTITY_LIMIT = 256, MAX = 1e12;
const geometry = createR17GeometryStages(r17Probe.now);
let scopes = new WeakMap<object, number>(), scopeEntries = 0, scopeSequence = 0, currentScope: number | null = null;
let visible = false, armedScope: number | null = null, started = false, saved = true;
let start: Stamp | null = null, inputSequence = 0, observed = 0, invalid = 0, identityRotations = 0;
let lastEditing: string | null = null;
let publishingInput: number | null = null, stateEntries = 0;
let stateInputs = new WeakMap<object, number | null>();
let rows: Row[] = [], presentations = new WeakMap<object, Link>(), frames = new WeakMap<object, Link>();
let presentationEntries = 0, frameEntries = 0;
let violations = { scope: 0, timeGeneration: 0, canvasGeneration: 0, bounds: 0, backwards: 0, unlinked: 0 };
let previousAccepted: { at: number; scope: number | null; generation: number | null } | null = null;
let sealed: ReturnType<typeof receipt> | null = null;
const plus = (value: number) => Math.min(MAX, value + 1);
const integer = (value: unknown): number | null => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= MAX ? value : null;
const instant = (value: unknown): number | null => typeof value === "string" && Number.isSafeInteger(Date.parse(value)) ? Date.parse(value) : null;
const object = (value: unknown): value is object => value !== null && typeof value === "object";
const recording = () => started && r17Probe.status() === "recording";
const optional = (work: () => void) => { try { work(); } catch { invalid = plus(invalid); } };
function scopeId(value: unknown): number | null {
  if (!object(value)) return null;
  const prior = scopes.get(value); if (prior !== undefined) return prior;
  if (scopeSequence >= MAX) return null;
  if (scopeEntries >= IDENTITY_LIMIT) { scopes = new WeakMap(); scopeEntries = 0; identityRotations = plus(identityRotations); }
  const id = ++scopeSequence; scopes.set(value, id); scopeEntries++; return id;
}
function relative(stamp: Stamp): number | null {
  if (!start || start.value === null || stamp.value === null || stamp.epoch !== start.epoch ||
    stamp.windowId !== start.windowId || stamp.value < start.value || stamp.value - start.value > 60000) return null;
  return stamp.value - start.value;
}
function record(event: number, link: Partial<Link> = {}, target: number | null = null, frame: number | null = null,
  canvas: number | null = null, editing: number | null = null, detail = 0, stamp = r17Probe.now(), currentGeneration: number | null = null) {
  if (!recording()) return;
  const row: Row = [++observed, event, relative(stamp), stamp.epoch, link.input ?? null, link.intent ?? null,
    link.token ?? null, link.scope ?? currentScope, link.generation ?? null, canvas, target, frame, editing, detail, currentGeneration];
  // Preserve the beginning and the latest events. Missing middle is explicit.
  if (rows.length < CAPACITY) rows.push(row);
  else rows.splice(CAPACITY / 2, 1), rows.push(row);
}
function remember(kind: "presentation" | "frame", key: object, link: Link) {
  if (kind === "presentation") {
    if (!presentations.has(key) && presentationEntries >= IDENTITY_LIMIT) {
      presentations = new WeakMap(); presentationEntries = 0; identityRotations = plus(identityRotations);
    }
    if (!presentations.has(key)) presentationEntries++;
    presentations.set(key, link);
  } else {
    if (!frames.has(key) && frameEntries >= IDENTITY_LIMIT) {
      frames = new WeakMap(); frameEntries = 0; identityRotations = plus(identityRotations);
    }
    if (!frames.has(key)) frameEntries++;
    frames.set(key, link);
  }
}
function stop() { armedScope = null; r17Probe.stop(); }
r17Probe.observeStop(() => geometry.stop());
function receipt() {
  const core = r17Probe.snapshot();
  const chain = (kept: Row[]) => ({ schemaVersion: "starward-d2-time-chain-v1", capacity: CAPACITY,
    identityLimit: IDENTITY_LIMIT, inputCount: inputSequence, observed, dropped: observed - rows.length,
    exportOmitted: rows.length - kept.length, overflow: observed > CAPACITY, invalid, identityRotations, violations: { ...violations },
    entries: kept.map(value => [...value]) });
  const base = { schemaVersion: "starward-d2-time-observation-v1", variant: core.variant, runId: core.runId,
    binding: core.binding, clock: core.clock, window: core.window, linkage: core.linkage,
    acceptedGap: core.timing.acceptedGapMs,
    coverage: "legal-preview-input-preparation-request-copy-and-publish-not-pixels-cpu-or-resource-population",
    timeChain: chain(rows) };
  // Existing byte budget and linkage omission policy. Export only; the run is sealed.
  // Keep the bounded geometry sequence before trimming middle time-chain rows:
  // losing the actual window crossing would defeat this observation's purpose.
  let value = r17ProbeBoundedReceipt({ ...base, ...geometry.attach({}) });
  while (r17ProbePayloadBytes(JSON.stringify(value)) > 32768 && value.timeChain.entries.length > 16) {
    const keep = value.timeChain.entries.length - 2;
    value = { ...value, timeChain: chain([...rows.slice(0, Math.ceil(keep / 2)), ...rows.slice(-Math.floor(keep / 2))]) };
  }
  return value;
}
export const d2Time = {
  scope(scope: object, active: boolean) {
    optional(() => {
      const next = scopeId(scope);
      if ((currentScope !== next || !active) && (armedScope !== null || recording())) {
        record(8, {}, null, null, null, null, !active ? 1 : 2); stop();
      }
      currentScope = next; visible = active;
    });
  },
  hide() { optional(() => { visible = false; record(8, {}, null, null, null, null, 1); stop(); }); },
  arm(scope: object) {
    if (!visible || currentScope !== scopeId(scope) || armedScope !== null || recording() || started && !saved) return false;
    armedScope = currentScope; return armedScope !== null;
  },
  input<T extends Time>(scope: object, at: string, work: () => T): T {
    optional(() => {
      if (armedScope !== null && visible && armedScope === currentScope && scopeId(scope) === currentScope) {
        armedScope = null; r17Probe.start("wide-time"); start = r17Probe.recordingStart(); started = true; saved = false;
        inputSequence = observed = invalid = identityRotations = 0; lastEditing = null;
        rows = []; presentations = new WeakMap(); frames = new WeakMap(); presentationEntries = frameEntries = 0; sealed = null;
        stateInputs = new WeakMap(); stateEntries = 0; publishingInput = null;
        violations = { scope: 0, timeGeneration: 0, canvasGeneration: 0, bounds: 0, backwards: 0, unlinked: 0 }; previousAccepted = null;
        geometry.start(start);
      }
    });
    const active = recording(), stamp = active ? r17Probe.now() : null;
    const input = active && inputSequence < MAX ? ++inputSequence : null;
    optional(() => { if (input !== null && stamp) geometry.intent(input, at, stamp); });
    let result: T;
    const priorPublishing = publishingInput;
    publishingInput = input;
    try { result = work(); } // The original return value and exceptions are unchanged.
    catch (error) {
      optional(() => { if (input !== null && stamp) record(1, { input, scope: scopeId(scope) }, instant(at), null, null, null, 2, stamp); });
      throw error;
    }
    finally { publishingInput = priorPublishing; }
    optional(() => {
      if (!active || !recording() || input === null || !stamp) return;
      record(1, { input, intent: r17Probe.intentSequence(result), scope: scopeId(scope), generation: integer(result.presentationGeneration) },
        instant(at), instant(result.previewAt ?? result.at), null, integer(result.editingGeneration), result.editing.includes("fields") ? 1 : 0, stamp);
    });
    return result;
  },
  state(state: Time, prior?: Time) {
    optional(() => {
      if (!recording()) return;
      r17Probe.intent(state);
      // A delayed preparation can consume an older state after another input.
      // Internal ticks/edit-release inherit only an unchanged target and time
      // generation. A no-op input must never rewrite an existing state owner.
      const inherited = prior && prior.at === state.at && prior.presentationGeneration === state.presentationGeneration
        ? stateInputs.get(prior) ?? null : null;
      const input = publishingInput ?? inherited;
      if (!stateInputs.has(state) && stateEntries >= IDENTITY_LIMIT) {
        stateInputs = new WeakMap(); stateEntries = 0; identityRotations = plus(identityRotations);
      }
      if (!stateInputs.has(state)) { stateInputs.set(state, input); stateEntries++; }
      const key = `${state.editingGeneration}:${state.editing.includes("fields") ? 1 : 0}:${state.editing.includes("ruler") ? 1 : 0}`;
      if (key === lastEditing) return;
      lastEditing = key;
      record(5, { input: stateInputs.get(state) ?? null, intent: r17Probe.intentSequence(state), generation: integer(state.presentationGeneration) },
        instant(state.at), instant(state.previewAt ?? state.at), null, integer(state.editingGeneration),
        (state.editing.includes("fields") ? 1 : 0) | (state.editing.includes("ruler") ? 2 : 0));
    });
  },
  prepare<T>(work: () => T, state: Time, requestedAt: string, presentationAt: string, scope: object): T {
    let link: Link | null = null;
    optional(() => {
      if (!recording()) return;
      const intent = r17Probe.intentSequence(state);
      link = { input: stateInputs.get(state) ?? null, intent, token: r17Probe.prepareStarted(intent), scope: scopeId(scope),
        generation: integer(state.presentationGeneration), at: instant(presentationAt) };
    });
    let completed = false;
    try {
      const value = work(); completed = true;
      optional(() => { if (link && object(value)) remember("presentation", value, link); });
      return value;
    } finally {
      optional(() => {
        if (!link) return;
        r17Probe.prepareFinished(link.token, completed);
        record(2, link, instant(requestedAt), instant(presentationAt), null, integer(state.editingGeneration), completed ? 1 : 0);
      });
    }
  },
  request(frame: any, presentation: unknown) {
    optional(() => {
      if (!recording() || !object(frame)) return;
      const observed = object(presentation) ? presentations.get(presentation) : undefined;
      const link = observed && observed.scope === scopeId((frame as any).timePresentationScope) &&
        observed.at === instant((frame as any).frameAt) && observed.generation === integer((frame as any).timeGeneration) ? observed : null;
      r17Probe.request(frame, link?.token ?? null, link?.intent ?? null);
      const facts: Link = link ?? { input: null, intent: null, token: null, scope: scopeId((frame as any).timePresentationScope),
        generation: integer((frame as any).timeGeneration), at: instant((frame as any).frameAt) };
      remember("frame", frame, facts);
      record(3, facts, null, facts.at, integer((frame as any).nativeImageGeneration));
    });
  },
  inherit(resolved: unknown, original: unknown) {
    optional(() => {
      if (!recording() || !object(resolved) || !object(original)) return;
      r17Probe.inheritFrame(resolved, original);
      const link = frames.get(original); if (link && resolved !== original) remember("frame", resolved, { ...link });
    });
  },
  prepared(frame: unknown) { optional(() => r17Probe.prepared(frame)); },
  paintStarted(frame: unknown) { optional(() => r17Probe.paintStarted(frame)); },
  callback(frame: unknown) { optional(() => r17Probe.callback(frame)); },
  accepted(frame: any, state: Time, canvas: number) {
    optional(() => {
      if (!recording()) return;
      r17Probe.accepted(frame, null);
      const link = object(frame) ? frames.get(frame) : undefined;
      const at = instant(frame?.frameAt), target = instant(state.at), from = instant(state.previewFromAt);
      if (!link?.token) violations.unlinked = plus(violations.unlinked);
      if (link && link.scope !== null && link.scope !== currentScope) violations.scope = plus(violations.scope);
      if (integer(frame?.timeGeneration) !== integer(state.presentationGeneration)) violations.timeGeneration = plus(violations.timeGeneration);
      if (integer(frame?.nativeImageGeneration) !== integer(canvas)) violations.canvasGeneration = plus(violations.canvasGeneration);
      if (at !== null && target !== null && from !== null && (at < Math.min(from, target) || at > Math.max(from, target))) violations.bounds = plus(violations.bounds);
      if (at !== null && target !== null && from !== null && previousAccepted && link?.scope === previousAccepted.scope && link?.generation === previousAccepted.generation &&
        (target >= from ? at < previousAccepted.at : at > previousAccepted.at)) violations.backwards = plus(violations.backwards);
      if (at !== null) previousAccepted = { at, scope: link?.scope ?? null, generation: link?.generation ?? null };
      record(4, link ?? {}, target, at, integer(canvas), integer(state.editingGeneration), frame?.sceneReady ? 1 : 0,
        r17Probe.now(), integer(state.presentationGeneration));
    });
  },
  rejected(reason: 1 | 2 | 3 | 4, frame: any, state: Time, canvas: number) {
    optional(() => record(6, object(frame) ? frames.get(frame) ?? {} : {}, instant(state.at), instant(frame?.frameAt),
      integer(canvas), integer(state.editingGeneration), reason, r17Probe.now(), integer(state.presentationGeneration)));
  },
  geometryRequest(at: string, windowAt: string, serial: number, phase: string, scope: unknown, signal?: AbortSignal) {
    if (!recording()) return null;
    let result: ReturnType<typeof geometry.request> = null;
    optional(() => {
      // A prior render may dispatch after another input. Target time alone
      // cannot identify A -> B -> A; retain the real request identity without
      // claiming a user-input association that this hook does not supply.
      result = geometry.request(at, windowAt, null, signal);
      record(7, { input: null, scope: scopeId(scope) }, instant(at), instant(windowAt), null, integer(serial), phase === "fetching" ? 1 : 0);
    });
    return result;
  },
  geometryWatch: geometry.watch,
  geometryRejected: geometry.rejected,
  geometryAdmitted(response: object, at: string, windowAt: string, serial: number, phase: string, scope: unknown) {
    optional(() => {
      if (!recording()) return;
      geometry.admitted(response, at, windowAt, null);
      record(7, { input: null, scope: scopeId(scope) }, instant(at), instant(windowAt), null, integer(serial), phase === "fetching" ? 2 : 3);
    });
  },
  snapshot() { if (armedScope !== null || !started) return null; return sealed ??= receipt(); },
  markSaved(runId: string) { if (sealed?.runId === runId) saved = true; },
  status() { return armedScope !== null ? "等待真实时间输入" : recording() ? "正在观察真实时间输入" : started && !saved ? "观察已结束，待保存" : saved && started ? "已保存" : "尚未开始"; },
};
