import assert from "node:assert/strict";
import test from "node:test";
import * as documents from "../utils/source-document";
import { sourceNavigationForTest } from "./source-navigation-test-support";

function harness() {
  const state = { accountOwnerId: null as string | null, selectedSpotId: null, mapResetVersion: 0, observationContext: null };
  const calls: any[] = [], delivered: any[] = [];
  let finish: () => void = () => {}, reject: (error: Error) => void = () => {};
  const page = { route: "pages/map/index" };
  const owner = sourceNavigationForTest({ getCurrentPages: () => [page], navigateTo(options) {
      calls.push(options);
      return new Promise<void>((resolve, fail) => { finish = () => { options.success({ eventChannel: { emit: (...args) => { delivered.push(args); } } }); resolve(); }; reject = fail; });
    } }, () => state);
  return { state, calls, delivered, open: owner.navigateToSource, finish: () => finish(), fail: () => reject(new Error("native failed")) };
}

test("one native source page receives its reading via its own channel, and repeated taps cannot stack destinations", async () => {
  const h = harness();
  const document = { title: "影像来源", sources: [], sections: [{ kind: "facts", items: [{ label: "拍摄", value: "未提供" }] }] } satisfies documents.SourceDocument;
  const attempt = h.open({ url: documents.SOURCE_READING_ROUTE, document });
  await h.open({ url: documents.SOURCE_READING_ROUTE, document });
  assert.equal(h.calls.length, 1);
  assert.equal(h.delivered.length, 0);
  assert.equal(h.calls[0].url, "/spot/data-source/index?reading=1");
  assert.ok(!h.calls[0].url.includes(document.title));
  h.finish(); await attempt;
  assert.equal(h.delivered[0][0], documents.SOURCE_READING_EVENT);
  assert.deepEqual(h.delivered[0][1].document, document);
});

test("native navigation failure releases admission and account changes suppress late private delivery", async () => {
  const h = harness();
  const document = { title: "当前来源", sources: [] };
  const first = h.open({ url: documents.SOURCE_READING_ROUTE, document });
  h.fail(); await assert.rejects(first, /native failed/u);
  const second = h.open({ url: documents.SOURCE_READING_ROUTE, document });
  assert.equal(h.calls.length, 2);
  h.state.accountOwnerId = "another";
  h.finish(); await second;
  assert.deepEqual(h.delivered, []);
});
