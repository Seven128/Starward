import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { zonedLocalToUtc } from "@starward/miniapp-contracts";
import { calendarDateInTimezone } from "../utils/zoned-date";

function clockHarness() {
  const ast = ts.createSourceFile("clock.ts", readFileSync(new URL("./use-calendar-day.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const source = ast.statements.filter(ts.isFunctionDeclaration).map(node => node.getText(ast).replace(/^export /, "")).join("\n");
  let state: any, deps: unknown[] | undefined, effect: (() => (() => void) | undefined) | undefined, cleanup: (() => void) | undefined;
  const scope = vm.runInNewContext(ts.transpileModule(source + "; ({useCalendarDay,nextCalendarDayDelay});", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    Date, setTimeout, clearTimeout, calendarDateInTimezone, zonedLocalToUtc,
    useState(initial: any) { state ??= typeof initial === "function" ? initial() : initial; return [state, (next: any) => { state = typeof next === "function" ? next(state) : next; }]; },
    useEffect(fn: () => (() => void) | undefined, next: unknown[]) {
      if (!deps || next.some((value, index) => value !== deps![index])) { cleanup?.(); effect = fn; deps = next; }
    },
  });
  return { delay: scope.nextCalendarDayDelay, close: () => cleanup?.(), render(timezone: string, active = true) {
    let day = scope.useCalendarDay(timezone, active);
    if (effect) { cleanup = effect(); effect = undefined; day = scope.useCalendarDay(timezone, active); }
    return day as string;
  } };
}

test("regional midnight changes the real query identity; a late previous-day response cannot replace it", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.parse("2026-09-15T15:59:59Z") });
  const clock = clockHarness();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const requests: string[] = [];
  const resolvers = new Map<string, (value: string) => void>();
  const options = (day: string) => ({ queryKey: ["spot-recent-weather", "spot:a", day], queryFn: () => {
    requests.push(day); return new Promise<string>(resolve => resolvers.set(day, resolve));
  } });
  const observer = new QueryObserver(client, options(clock.render("Asia/Shanghai")));
  const received: string[] = [];
  const unsubscribe = observer.subscribe(value => { if (value.data) received.push(value.data); });
  try {
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.deepEqual(requests, ["2026-09-15"]);
    t.mock.timers.tick(1_021);
    const today = clock.render("Asia/Shanghai");
    assert.equal(today, "2026-09-16");
    observer.setOptions(options(today));
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.deepEqual(requests, ["2026-09-15", "2026-09-16"]);
    resolvers.get("2026-09-16")!("new day evidence");
    await new Promise<void>(resolve => setImmediate(resolve));
    resolvers.get("2026-09-15")!("old late evidence");
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(observer.getCurrentResult().data, "new day evidence");
    assert.ok(!received.includes("old late evidence"));
    clock.render("Asia/Shanghai", false);
    t.mock.timers.tick(2 * 86_400_000);
    assert.equal(clock.render("Asia/Shanghai", false), "2026-09-16", "no background polling");
    assert.equal(clock.render("Asia/Shanghai", true), "2026-09-18", "show resamples current region calendar");
  } finally { clock.close(); unsubscribe(); client.clear(); }
});

test("next calendar midnight follows the timezone rather than adding a fixed 24 hours", () => {
  const clock = clockHarness();
  assert.equal(clock.delay(Date.parse("2026-03-28T23:00:00Z"), "Europe/Berlin"), 23 * 3_600_000 + 20);
  assert.equal(clock.delay(Date.parse("2026-10-24T22:00:00Z"), "Europe/Berlin"), 25 * 3_600_000 + 20);
});
