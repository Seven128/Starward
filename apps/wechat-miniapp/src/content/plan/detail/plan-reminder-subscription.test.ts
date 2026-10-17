import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createPlanSubscriptionFlow } from "../../../services/plan-subscription-flow";

type Element = { type: unknown; props: Record<string, unknown>; children: unknown[] };
const settle = async () => { for (let n = 0; n < 12; n++) await Promise.resolve(); };
function mount() {
  let state: unknown, effectStarted = false, cleanup: (() => void) | undefined, owner = "user:a";
  const reference = { current: null }, listeners = new Set<(state: { accountOwnerId: string }) => void>();
  const prompts: unknown[] = [], reports: unknown[] = [];
  let nativeResolve!: (result: unknown) => void;
  const source = readFileSync(new URL("./plan-reminder-subscription.tsx", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace("export function", "function");
  const Component = vm.runInNewContext(ts.transpileModule(source + "\nPlanReminderSubscription;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText, {
    Button: "button", Text: "text", View: "view", Date,
    React: { Fragment: "fragment", createElement: (type: unknown, props: Record<string, unknown>, ...children: unknown[]) => ({ type, props, children }) },
    useState: (initial: unknown) => { state ??= initial; return [state, (next: unknown) => { state = next; }]; },
    useRef: () => reference,
    useEffect: (setup: () => (() => void)) => { if (!effectStarted) { effectStarted = true; cleanup = setup(); } },
    currentDraftUserId: () => owner, createPlanSubscriptionFlow,
    useAppStore: { subscribe: (listener: (state: { accountOwnerId: string }) => void) => { listeners.add(listener); return () => listeners.delete(listener); } },
    planReminderSubscription: {
      prepare: async () => ({ data: { state: "READY", challengeId: "challenge", templateId: "template-test-only", scheduleVersion: "v", expiresAt: new Date(Date.now() + 60_000).toISOString() } }),
      report: async (...args: unknown[]) => { reports.push(args); return { data: { recorded: true } }; },
    },
    Taro: { requestSubscribeMessage: (options: unknown) => { prompts.push(options); return new Promise(resolve => { nativeResolve = resolve; }); } },
  }) as (props: object) => Element;
  function buttons(node: unknown): Element[] {
    if (!node || typeof node !== "object") return [];
    const element = node as Element;
    return [...(element.type === "button" ? [element] : []), ...(element.children ?? []).flatMap(buttons)];
  }
  return { prompts, reports, listeners,
    render: (redLight = false) => buttons(Component({ owner: "user:a", planId: "p", reminderId: "r", scheduleVersion: "v", redLight })),
    choose: (choice: string) => nativeResolve({ "template-test-only": choice }),
    switchAccount(next: string) { owner = next; for (const listener of listeners) listener({ accountOwnerId: next }); },
    unmount: () => cleanup?.(),
  };
}

test("the production dialog prepares first and its real button invokes native authorization synchronously", async t => {
  const h = mount(); t.after(h.unmount);
  assert.equal(h.render().length, 0); await settle();
  const action = h.render()[0]!; assert.equal(action.children[0], "授权本次提醒");
  (action.props.onClick as () => void)(); assert.equal(h.prompts.length, 1);
  h.choose("accept"); await settle(); assert.deepEqual(h.reports, [["user:a", "challenge", "accept"]]);
  assert.equal(h.render().length, 0);
});

test("hiding/unmounting the production dialog discards a late native choice and unsubscribes", async t => {
  const h = mount(); t.after(h.unmount); h.render(); await settle();
  (h.render()[0]!.props.onClick as () => void)(); h.unmount();
  h.choose("accept"); await settle(); assert.equal(h.reports.length, 0); assert.equal(h.listeners.size, 0);
});

test("an account change permanently retires the dialog even if the same account immediately returns", async t => {
  const h = mount(); t.after(h.unmount); h.render(); await settle();
  const action = h.render()[0]!;
  h.switchAccount("user:b"); h.switchAccount("user:a");
  (action.props.onClick as () => void)(); assert.equal(h.prompts.length, 0); assert.equal(h.render().length, 0);
});

test("red-light handoff requires an explicit continue click and closing remains safe", async t => {
  const h = mount(); t.after(h.unmount); h.render(true); await settle();
  assert.equal(h.render(true)[0]!.children[0], "继续微信授权"); assert.equal(h.prompts.length, 0);
  h.unmount(); assert.equal(h.prompts.length, 0);
  const continued = mount(); t.after(continued.unmount); continued.render(true); await settle();
  (continued.render(true)[0]!.props.onClick as () => void)(); assert.equal(continued.prompts.length, 1);
  continued.choose("reject"); await settle(); assert.deepEqual(continued.reports, [["user:a", "challenge", "reject"]]);
});
