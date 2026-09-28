import assert from "node:assert/strict";
import test from "node:test";
import type Taro from "@tarojs/taro";
import { drawSharePoster } from "./share-poster-drawing";

test("each poster redraw restores title/body/credits styles and the fixed 640px export surface", () => {
  const texts: { text: string; font: string; color: string; x: number; y: number }[] = [];
  const transforms: number[][] = [];
  const context = {
    fillStyle: "old-credits", strokeStyle: "", font: "11px sans-serif", lineWidth: 1,
    textAlign: "center", textBaseline: "top",
    setTransform: (...matrix: number[]) => transforms.push(matrix),
    fillRect: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, stroke: () => {},
    fillText(text: string, x: number, y: number) {
      texts.push({ text, font: this.font, color: this.fillStyle, x, y });
    },
  };
  const canvas = { width: 1, height: 1, getContext: () => context } as unknown as Taro.Canvas;
  const layout = { heading: ["公开观星点"], body: [["开放 18:00", "安全 注意台阶"]],
    credits: [["正式来源", "许可和公开URL"]], bodyTop: 123, divider: 221, creditsTop: 265, height: 325 };
  for (const colors of [
    { background: "#fffdf8", accent: "#4859b8", text: "#282b29", divider: "#d9dce7", muted: "#5c6473" },
    { background: "#170000", accent: "#a63f3f", text: "#ff9b9b", divider: "#a63f3f", muted: "#e77474" },
  ]) {
    texts.length = 0;
    drawSharePoster(canvas, layout, colors);
    assert.deepEqual([canvas.width, canvas.height], [640, 650]);
    assert.deepEqual(texts.map(({ text, font, color }) => ({ text, font, color })), [
      { text: "今晚去观星", font: "16px sans-serif", color: colors.text },
      { text: "公开观星点", font: "22px sans-serif", color: colors.text },
      { text: "开放 18:00", font: "13px sans-serif", color: colors.text },
      { text: "安全 注意台阶", font: "13px sans-serif", color: colors.text },
      { text: "资料与许可", font: "11px sans-serif", color: colors.muted },
      { text: "正式来源", font: "11px sans-serif", color: colors.muted },
      { text: "许可和公开URL", font: "11px sans-serif", color: colors.muted },
    ]);
    assert.equal(context.textAlign, "left"); assert.equal(context.textBaseline, "alphabetic");
    assert(texts.every(row => row.x === 22 && row.y < layout.height), "all projected rows stay inside the export surface");
  }
  assert.deepEqual(transforms, [[2, 0, 0, 2, 0, 0], [2, 0, 0, 2, 0, 0]], "repeated draw must not multiply scale");
});
