import assert from "node:assert/strict";
import test from "node:test";
import { planSpotRiskMessage } from "./public-share-copy";

test("public trip warns for a closed spot and for older responses without current status", () => {
  assert.equal(planSpotRiskMessage("PUBLISHED"), null);
  assert.match(planSpotRiskMessage("TEMPORARILY_CLOSED") ?? "", /暂时关闭/u);
  assert.match(planSpotRiskMessage(undefined) ?? "", /开放状态暂未确认/u);
});
