import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createSkyEntryTransition, SKY_ENTRY_FADE_MS, SKY_ENTRY_RECOVERY_MS } from "./sky-entry-transition";
import { pendingProposalContextLocation, samePendingProposalIntent } from "./private-contribution-transition";

function pendingSubmission() {
  return { submissionId: "owned:proposal", revision: 2, preciseLocationConsent: true,
    kind: "NEW_SPOT_PROPOSAL", submissionState: "PENDING_REVIEW", publicationImpact: "CANDIDATE_UPDATED",
    attempts: [{ attemptId: "contribution-attempt:one", baseRevision: 1,
      snapshot: { preciseLocationConsent: true, candidateLocation: { displayName: "candidate" } } }] };
}

const settle = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
function setup() {
  const timers = new Map<number, {at: number; callback: () => void}>();
  const frames: (number | null)[] = [];
  let now = 0, serial = 0, scope: string | null = "owner:context:revision:selection";
  const entry = createSkyEntryTransition({getScope: () => scope, onPresentation: id => frames.push(id),
    schedule(callback, delay) {
      const id = ++serial; timers.set(id, {at: now + delay, callback});
      return () => {timers.delete(id);};
    }});
  return {entry, frames, timers, setScope(value: string | null) {scope = value;},
    present() {const id = frames.at(-1); assert.equal(typeof id, "number"); entry.presented(id!); return id!;},
    advance(ms: number) {
      now += ms;
      for (const [id, timer] of timers) if (timer.at <= now) {timers.delete(id); timer.callback();}
    }};
}

test("source black frame is committed before one native navigation; returning clears its shield", async () => {
  const h = setup(); let navigations = 0;
  const options = {reducedMotion: false, navigate: async () => {navigations++; return true;}, onTimeout() {assert.fail("normal entry");}};
  assert.equal(h.entry.start(options), true);
  assert.equal(h.entry.start(options), false, "same-frame repeat cannot start a second route");
  h.advance(1000); await settle(); assert.equal(navigations, 0, "no timer runs ahead of the committed source frame");
  const id = h.present();
  h.advance(SKY_ENTRY_FADE_MS - 1); await settle(); assert.equal(navigations, 0);
  h.entry.finishFade(id); await settle();
  assert.equal(navigations, 1);
  h.entry.finishFade(id); await settle(); assert.equal(navigations, 1);
  assert.equal(h.frames.at(-1), id, "native success must not flash Map before hide");
  h.entry.hide(); h.entry.show();
  assert.equal(h.frames.at(-1), null); assert.equal(h.timers.size, 0);
  assert.equal(h.entry.start(options), true, "the same preserved Map can enter again after Back");
  h.entry.dispose(); assert.equal(h.timers.size, 0);
});

test("Back, background, unmount and changed identity retire a not-yet-issued Sky route", async () => {
  for (const reason of ["back", "hide", "dispose", "scope"] as const) {
    const h = setup(); let navigations = 0;
    h.entry.start({reducedMotion: false, navigate: async () => {navigations++; return true;}, onTimeout() {assert.fail(reason);}});
    const id = h.present(), lateTimer = [...h.timers.values()][0]!.callback;
    if (reason === "back") h.entry.cancel();
    if (reason === "hide") h.entry.hide();
    if (reason === "dispose") h.entry.dispose();
    if (reason === "scope") h.setScope("another account/context/revision/selection");
    lateTimer(); h.entry.finishFade(id); h.advance(SKY_ENTRY_RECOVERY_MS); await settle();
    assert.equal(navigations, 0, reason); assert.equal(h.entry.isActive(), false); assert.equal(h.timers.size, 0);
  }
});

test("missing animation endpoint has a finite fallback; failure and timeout both release Map", async () => {
  const failed = setup(); let failureCalls = 0;
  failed.entry.start({reducedMotion: false, navigate: async () => {failureCalls++; return false;}, onTimeout() {assert.fail("settled failure");}});
  failed.present(); failed.advance(SKY_ENTRY_FADE_MS + 32); await settle();
  assert.equal(failureCalls, 1); assert.equal(failed.entry.isActive(), false);
  assert.equal(failed.frames.at(-1), null); assert.equal(failed.timers.size, 0);

  const h = setup(); let finish!: (value: boolean) => void, warnings = 0, newerCalls = 0;
  const unresolved = new Promise<boolean>(resolve => {finish = resolve;});
  h.entry.start({reducedMotion: true, navigate: () => unresolved, onTimeout: () => {warnings++;}});
  const oldId = h.present(); h.advance(0); await settle();
  h.advance(SKY_ENTRY_RECOVERY_MS); await settle();
  assert.equal(warnings, 1); assert.equal(h.frames.at(-1), null);
  h.entry.start({reducedMotion: false, navigate: async () => {newerCalls++; return true;}, onTimeout() {assert.fail("new entry");}});
  const newId = h.present(); assert.notEqual(newId, oldId);
  finish(true); await settle(); h.entry.finishFade(oldId); await settle();
  assert.equal(newerCalls, 0, "late SDK completion or old CSS endpoint cannot consume a newer fade");
  assert.equal(h.frames.at(-1), newId);
  h.advance(SKY_ENTRY_FADE_MS + 32); await settle(); assert.equal(newerCalls, 1);
  h.entry.hide(); assert.equal(h.timers.size, 0);
});

test("a late native failure after hide cannot disturb the next source-page visit", async () => {
  const h = setup(); let finish!: (value: boolean) => void;
  h.entry.start({reducedMotion: true, navigate: () => new Promise(resolve => {finish = resolve;}), onTimeout() {assert.fail("hidden");}});
  h.present(); h.advance(0); await settle(); h.entry.hide(); h.entry.show();
  h.entry.start({reducedMotion: false, navigate: async () => true, onTimeout() {assert.fail("new");}});
  const id = h.present(); finish(false); await settle();
  assert.equal(h.frames.at(-1), id); assert.equal(h.entry.isActive(), true);
  h.entry.cancel(); assert.equal(h.timers.size, 0);
});

function actualMapCommands(environment: Record<string, unknown>) {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ["openMapPage", "openSkyPage", "onPanelCloud", "onProposalCloud", "handleMapPresentationSystemBack"];
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source); assert.equal(declarations.length, names.length);
  return vm.runInNewContext(ts.transpileModule(`${declarations.join("\n")}\n({${names.join(",")}});`,
    {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText, {
      pendingProposalContextLocation, samePendingProposalIntent, currentDraftUserId: () => "user:owner",
      login: { open: false }, ...environment,
    });
}

test("formal Sky action uses the shared blackout while other Map routes remain immediate", async () => {
  for (const rejected of [false, true]) {
    const h = setup(), routes: string[] = [], notices: unknown[] = [], errors: unknown[] = [];
    const context = {contextId: "public:context", localDate: "2026-10-17", selectedAtUtc: "2026-10-17T12:34:56.789Z",
      timezone: "Asia/Shanghai", location: {kind: "FORMAL_SPOT", spotId: "spot:a"}};
    const commands = actualMapCommands({skyEntry: h.entry, selected: {spotId: "spot:a"}, activeContext: context,
      spotDetail: {decision: {inputDigest: "revision:a"}},
      useAppStore: {getState: () => ({preferences: {reducedMotion: false}, notifications: []})},
      Taro: {navigateTo: async ({url}: {url: string}) => {routes.push(url); if (rejected) throw new Error("private native text");}},
      notify: (notice: unknown) => notices.push(notice), reportRuntimeError: (...args: unknown[]) => errors.push(args),
    });
    commands.onPanelCloud(); commands.onPanelCloud();
    assert.equal(routes.length, 0); h.present(); h.advance(SKY_ENTRY_FADE_MS + 32); await settle();
    assert.equal(routes.length, 1);
    const url = new URL(routes[0]!, "https://fixture.invalid");
    assert.equal(url.pathname, "/sky/detail/index"); assert.equal(url.searchParams.get("contextId"), context.contextId);
    assert.equal(url.searchParams.get("selectedAt"), context.selectedAtUtc);
    assert.equal(notices.length, rejected ? 1 : 0); assert.equal(errors.length, rejected ? 1 : 0);
    if (rejected) {assert.equal(h.entry.isActive(), false); assert.equal(h.frames.at(-1), null);}
    else {h.entry.hide(); h.entry.show();}
    const frameCount = h.frames.length;
    await commands.openMapPage("/spot/search/index", "地点搜索", "search");
    assert.equal(routes.at(-1), "/spot/search/index"); assert.equal(h.frames.length, frameCount);
    h.entry.dispose(); assert.equal(h.timers.size, 0);
  }
});

test("native Back during a source fade cancels only the pending Sky entry", async () => {
  const h = setup(); let navigations = 0;
  const commands = actualMapCommands({skyEntry: h.entry});
  h.entry.start({reducedMotion: false, navigate: async () => {navigations++; return true;}, onTimeout() {assert.fail("Back");}});
  h.present(); await commands.handleMapPresentationSystemBack();
  h.advance(SKY_ENTRY_RECOVERY_MS); await settle();
  assert.equal(navigations, 0); assert.equal(h.entry.isActive(), false); assert.equal(h.frames.at(-1), null);
});

test("a private Sky entry reserves preparation before resolving Context and ignores queued repeats", async () => {
  const h = setup(), routes: string[] = [], accepted: string[] = [];
  let resolves = 0, finish!: (value: {dataState: string; data: any}) => void;
  let context = {contextId: "original", selectedAtUtc: "2026-10-17T12:00:00.789Z", localDate: "2026-10-17"};
  const submission = pendingSubmission();
  const commands = actualMapCommands({skyEntry: h.entry, navigationEpoch: {current: 0}, selectedProposalRef: {current: submission},
    useAppStore: {getState: () => ({observationContext: context, preferences: {reducedMotion: false}, notifications: []})},
    currentTimezoneHint: () => "Asia/Shanghai", localDateForNow: () => "2026-10-17",
    resolveObservationContext: () => {resolves++; return new Promise(resolve => {finish = resolve;});},
    setObservationContext: (next: typeof context) => {context = next; accepted.push(next.contextId); h.setScope(next.contextId);},
    Taro: {navigateTo: async ({url}: {url: string}) => {routes.push(url);}}, notify() {assert.fail("valid entry");},
  });
  const entering = commands.onProposalCloud(submission);
  await commands.onProposalCloud(submission);
  assert.equal(resolves, 1); assert.equal(h.entry.isActive(), true); assert.equal(h.frames.length, 0, "do not black out Map during Context preparation");
  finish({dataState: "FRESH", data: {...context, contextId: "resolved", timezone: "Asia/Shanghai",
    schemaVersion: "observation-context-v3", location: { kind: "PENDING_PROPOSAL", displayName: "candidate" },
    privateProposal: { ownerId: "user:owner", submissionId: submission.submissionId,
      attemptId: "contribution-attempt:one", attemptBaseRevision: 1 } }}); await entering;
  assert.deepEqual(accepted, ["resolved"]);
  await commands.onProposalCloud(submission); assert.equal(resolves, 1, "a queued tap during fade cannot write another Context");
  h.present(); h.advance(SKY_ENTRY_FADE_MS + 32); await settle();
  assert.equal(routes.length, 1); const query = new URL(routes[0]!, "https://fixture.invalid").searchParams;
  assert.equal(query.get("spotId"), submission.submissionId); assert.equal(query.get("contextId"), "resolved");
  assert.equal(query.get("selectedAt"), context.selectedAtUtc);
  h.entry.hide(); assert.equal(h.timers.size, 0);
});

test("Back, hide, identity change and failure during private preparation cannot accept a late Context or open Sky", async () => {
  for (const reason of ["back", "hide", "scope", "changed-proposal", "error"] as const) {
    const h = setup(), routes: string[] = []; let accepted = 0, notices = 0;
    let finish!: (value: {data: any}) => void, fail!: (error: unknown) => void;
    const submission = pendingSubmission();
    const selected = {current: submission};
    const commands = actualMapCommands({skyEntry: h.entry, navigationEpoch: {current: 0}, selectedProposalRef: selected,
      useAppStore: {getState: () => ({observationContext: null, preferences: {reducedMotion: false}, notifications: []})},
      currentTimezoneHint: () => "Asia/Shanghai", localDateForNow: () => "2026-10-17",
      resolveObservationContext: () => new Promise((resolve, reject) => {finish = resolve; fail = reject;}),
      setObservationContext: () => {accepted++;}, Taro: {navigateTo: async ({url}: {url: string}) => {routes.push(url);}},
      notify: () => {notices++;}, errorMessage: () => "unavailable", isMiniappRequestCancelled: () => false,
    });
    const entering = commands.onProposalCloud(submission);
    if (reason === "back") await commands.handleMapPresentationSystemBack();
    if (reason === "hide") h.entry.hide();
    if (reason === "scope") h.setScope("another account, selection, Context or Map reset");
    if (reason === "changed-proposal") selected.current = {...submission, submissionId: "another-proposal"};
    if (reason === "error") fail(new Error("fixture failed"));
    else finish({data: {contextId: "late", timezone: "Asia/Shanghai"}});
    await entering; h.advance(SKY_ENTRY_RECOVERY_MS); await settle();
    assert.equal(accepted, 0, reason); assert.equal(routes.length, 0, reason);
    assert.equal(h.frames.some(id => id !== null), false); assert.equal(h.entry.isActive(), false); assert.equal(h.timers.size, 0);
    assert.equal(notices, reason === "error" ? 1 : 0);
  }
});

test("AppHide retires Map's entry before PageHide and detaches its listener on unmount", async () => {
  const h = setup(); let navigations = 0, hide: (() => void) | undefined, detached = 0;
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect = "";
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0]?.getText(source).includes("Taro.onAppHide")) effect = node.arguments[0].getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(effect);
  const install = vm.runInNewContext(ts.transpileModule(`(${effect});`, {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText,
    {skyEntry: h.entry, Taro: {onAppHide(callback: () => void) {hide = callback;}, offAppHide(callback: () => void) {assert.equal(callback, hide); detached++;}}});
  const cleanup = install();
  h.entry.start({reducedMotion: false, navigate: async () => {navigations++; return true;}, onTimeout() {assert.fail("AppHide");}});
  const id = h.present(); hide!(); h.entry.finishFade(id); h.advance(SKY_ENTRY_RECOVERY_MS); await settle();
  assert.equal(navigations, 0); assert.equal(h.entry.isActive(), false);
  cleanup(); assert.equal(detached, 1); assert.equal(h.timers.size, 0);
});

test("a changed identity may enter immediately and an obsolete preparation cannot clear it", async () => {
  const h = setup(); let routes = 0;
  const old = h.entry.prepare()!; assert.ok(old);
  h.setScope("new selection and Context");
  const current = h.entry.prepare()!; assert.ok(current, "the old network request cannot lock another selected place");
  assert.equal(old.isCurrent(), false);
  current.start({reducedMotion: false, navigate: async () => {routes++; return true;}, onTimeout() {assert.fail("current");}});
  const id = h.present(); old.cancelPreparation();
  assert.equal(h.frames.at(-1), id); assert.equal(h.entry.isActive(), true);
  assert.equal(old.start({reducedMotion: false, navigate: async () => {assert.fail("retired");}, onTimeout() {}}), false);
  h.advance(SKY_ENTRY_FADE_MS + 32); await settle(); assert.equal(routes, 1);
  h.entry.hide(); assert.equal(h.timers.size, 0);
});
