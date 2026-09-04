import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {
  dismissNotification,
  enqueueNotification,
  selectNotification,
  type NotificationIntent,
  type NotificationRecord,
} from "./notification";

test("notification arbitration is error before warning before info before success", () => {
  let queue = enqueueNotification(
    [],
    {
      owner: "map",
      tone: "success",
      placement: "inline",
      title: "已恢复",
      body: "地图已恢复",
    },
    1,
  );
  queue = enqueueNotification(
    queue,
    {
      owner: "map",
      tone: "warning",
      placement: "inline",
      title: "数据过期",
      body: "可继续查看静态点位",
    },
    2,
  );
  queue = enqueueNotification(
    queue,
    {
      owner: "map",
      tone: "error",
      placement: "inline",
      title: "供应商不可用",
      body: "保留当前地图与恢复动作",
    },
    3,
  );
  const selection = selectNotification(queue, "inline", "map");
  assert.equal(selection.current?.tone, "error");
  assert.equal(selection.residualCount, 2);
});

test("repeated notifications deduplicate while preserving an occurrence count", () => {
  const intent = {
    owner: "settings",
    tone: "info" as const,
    placement: "floating" as const,
    title: "显示模式已更新",
    body: "页面上下文保持不变",
    dedupeKey: "mode-updated",
  };
  let queue = enqueueNotification([], intent, 1);
  queue = enqueueNotification(queue, intent, 2);
  assert.equal(queue.length, 1);
  assert.equal(queue[0]?.occurrences, 2);
  assert.deepEqual(dismissNotification(queue, queue[0]!.id), []);
});

test("actual Settings callbacks use control state feedback and preserve unrelated errors", () => {
  // Execute the page-owned callbacks, not copied notification fixtures. Platform
  // and mode mutations are explicit ports; arbitration is the production owner.
  const source = ts.createSourceFile(
    "settings.tsx",
    ["index.tsx", "settings-sections.tsx"]
      .map((file) =>
        readFileSync(new URL(`../content/settings/${file}`, import.meta.url), "utf8"),
      )
      .join("\n"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const names = new Set([
    "DISPLAY_MODE_LABEL",
    "chooseDisplayMode",
    "toggleObservation",
  ]);
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && names.has(node.name.getText(source)))
      declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(declarations.length, names.size);

  let queue: NotificationRecord[] = [];
  let clock = 0;
  let mode = "NIGHT";
  let priorMode = "NIGHT";
  const runtime = {
    get mode() {
      return mode;
    },
    updatePreference() {},
    setMode(next: string) {
      mode = next;
    },
    enterObservation() {
      priorMode = mode;
      mode = "OBSERVATION";
    },
    exitObservation() {
      mode = priorMode;
    },
    notify(intent: NotificationIntent) {
      queue = enqueueNotification(queue, intent, ++clock);
    },
    useAppStore: {
      getState: () => ({
        notifications: queue,
        dismissNotification(id: string) {
          queue = dismissNotification(queue, id);
        },
      }),
    },
  };
  const callbacks = vm.runInNewContext(
    ts.transpileModule(
      declarations.join("\n") + "\n({ chooseDisplayMode, toggleObservation });",
      { compilerOptions: { target: ts.ScriptTarget.ES2020 } },
    ).outputText,
    runtime,
    { timeout: 1000 },
  ) as {
    chooseDisplayMode(mode: "DAY" | "NIGHT"): void;
    toggleObservation(): void;
  };

  for (let repeat = 0; repeat < 3; repeat += 1) {
    callbacks.toggleObservation();
    assert.equal(mode, "OBSERVATION");
    assert.equal(selectNotification(queue, "inline", "settings").current, null);
    callbacks.toggleObservation();
    const visible = selectNotification(queue, "inline", "settings");
    assert.equal(mode, "NIGHT");
    assert.equal(visible.current, null);
    assert.equal(visible.residualCount, 0);
  }
  runtime.notify({
    id: "settings-sync-error",
    owner: "settings",
    placement: "inline",
    tone: "error",
    title: "偏好同步失败",
    body: "稍后重试",
  });
  runtime.notify({
    id: "map-error",
    owner: "map",
    placement: "inline",
    tone: "error",
    title: "地图错误",
    body: "保持原位",
  });
  for (const target of ["DAY", "NIGHT"] as const) {
    callbacks.toggleObservation();
    callbacks.chooseDisplayMode(target);
    assert.equal(mode, target);
    assert.deepEqual(
      queue.filter((item) => item.placement === "inline").map((item) => item.id).sort(),
      ["map-error", "settings-sync-error"],
    );
    assert.equal(selectNotification(queue, "floating", "settings").current, null);
  }
});
