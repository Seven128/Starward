import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { calendarDateInTimezone, clockTimeInTimezone } from "../../../apps/wechat-miniapp/src/utils/zoned-date.ts";
import { createScrollSettlement } from "../../../apps/wechat-miniapp/src/components/scroll-settlement.ts";

test("HTTP context and map preserve an off-cadence selected instant", async () => {
  const service = createTestMiniappService();
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const selectedAt = "2026-08-06T13:20:00.000Z";
    const resolved = await fetch(`${base}/v2/observation-contexts/resolve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-08-06", selectedAt }) });
    assert.ok(resolved.ok);
    const context = (await resolved.json()).data;
    const response = await fetch(`${base}/v2/map/scene?contextId=${encodeURIComponent(context.contextId)}&layer=CLOUD`);
    assert.equal(response.status, 200);
    const scene = (await response.json()).data;
    assert.equal(scene.context.selectedAtUtc, selectedAt);
    assert.equal(scene.timeFrames.filter((frame: { atUtc: string }) => frame.atUtc === selectedAt).length, 1);
    assert.ok(scene.timeFrames.some((frame: { atUtc: string }) => frame.atUtc === "2026-08-06T13:30:00.000Z"));
    // Execute the production component with the actual HTTP payload. Native
    // Taro layout and gestures remain a separate runtime verification lane.
    const componentSource = readFileSync(new URL("../../../apps/wechat-miniapp/src/pages/map/time-ruler.tsx", import.meta.url), "utf8")
      .replace(/^import .*;\r?\n/gm, "").replace("export function", "function");
    const frameSource = readFileSync(new URL("../../../apps/wechat-miniapp/src/pages/map/map-time-frame.ts", import.meta.url), "utf8");
    const ast = ts.createSourceFile("frames.ts", frameSource, ts.ScriptTarget.Latest, true);
    const nearest = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "nearestMapTimeFrameIndex");
    assert.ok(nearest);
    const scrollPositions: number[] = [];
    const component = vm.runInNewContext(ts.transpileModule(nearest.getText(ast).replace("export ", "") + "\n" + componentSource + "\nMapTimeRuler;", {
      compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
    }).outputText, {
      Button: "button", ScrollView: "scroll", Text: "text", View: "view",
      React: { createElement: (type: string, props: object, ...children: unknown[]) => ({ type, props, children: children.flat() }) },
      useState: (value: unknown) => [value, () => {}], useRef: (value: unknown) => ({ current: value }),
      useEffect() {}, useDidHide() {}, useDidShow() {}, createScrollSettlement,
      // Native selector/ScrollViewContext is outside this HTTP/component test.
      createRulerScrollPosition: () => ({ move: (left: number) => scrollPositions.push(left), cancel() {} }),
      calendarDateInTimezone, clockTimeInTimezone,
    });
    const committed: number[] = [];
    const tree = component({ frames: scene.timeFrames, selectedAt: scene.context.selectedAtUtc, timezone: scene.context.timezone, disabled: false, onPreview() {}, onCommit: (index: number) => committed.push(index), onCancel() {} });
    const buttons: Array<{ props: { ariaLabel: string; onClick: () => void } }> = [];
    function visit(node: any) {
      if (!node || typeof node !== "object") return;
      if (node.type === "button") buttons.push(node);
      for (const value of Object.values(node)) if (typeof value === "object") visit(value);
    }
    visit(tree);
    assert.deepEqual(buttons.filter(button => button.props.ariaLabel.includes("已选择")).map(button => button.props.ariaLabel), ["08/06 21:20，已选择"]);
    const adjacent = buttons.find(button => button.props.ariaLabel === "08/06 21:30");
    assert.ok(adjacent);
    adjacent.props.onClick();
    assert.equal(committed.length, 1);
    assert.equal(scene.timeFrames[committed[0]!].atUtc, "2026-08-06T13:30:00.000Z");
    assert.equal(scrollPositions.length, 1);
  } finally { await app.close(); }
});
