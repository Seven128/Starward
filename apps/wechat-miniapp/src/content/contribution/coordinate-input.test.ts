import assert from "node:assert/strict";
import test from "node:test";
import { parseCoordinateInput } from "./coordinate-input";

test("blank coordinates cannot become zero while explicit decimal zero remains valid", () => {
  for (const missing of ["", " ", "\n\t", "0x10", "Infinity", "1,5", "1e2", "北纬22"]) {
    assert.ok(Number.isNaN(parseCoordinateInput(missing)), missing);
  }
  for (const [text, value] of [["0", 0], [" 0.000000 ", 0], ["-22.5", -22.5], ["+114.25", 114.25], [".5", 0.5]] as const) {
    assert.equal(parseCoordinateInput(text), value);
  }
});
