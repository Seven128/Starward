import assert from "node:assert/strict";
import test from "node:test";
import {
  dismissNotification,
  enqueueNotification,
  selectNotification,
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
