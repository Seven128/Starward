import assert from "node:assert/strict";
import test from "node:test";
import { createDocumentScrollTracker, visibleDocumentChapter, type DocumentGeometry } from "./spot-document-navigation";

const geometry = (offset: number, height = 2800): DocumentGeometry => ({ viewport: { top: 120, height: 600 }, content: { top: 120 - offset, height }, sections:
  ["place", "access", "facilities", "notes"].map((chapter, index) => ({ id: `formal-feedback-${chapter}`, top: 120 + [0, 220, 1200, 2000][index]! - offset })) });

test("real viewport selects chapters in both directions and short final chapter at document end", () => {
  for (const [offset, chapter] of [[0, "place"], [230, "access"], [1300, "facilities"], [2000, "notes"], [250, "access"], [0, "place"]] as const)
    assert.equal(visibleDocumentChapter(geometry(offset)), chapter);
  assert.equal(visibleDocumentChapter(geometry(1900, 2500)), "notes");
  assert.equal(visibleDocumentChapter({ ...geometry(0), sections: [] }), null);
  assert.equal(visibleDocumentChapter({ ...geometry(0), viewport: { top: 0, height: 0 } }), null);
});

test("coalesces scroll requests without starving live chapter updates, and ignores callbacks after hide", () => {
  const measurements: ((value: DocumentGeometry | null) => void)[] = [], published: string[] = [];
  const tracker = createDocumentScrollTracker(done => measurements.push(done), chapter => published.push(chapter));
  tracker.request();
  tracker.request();
  tracker.request();
  assert.equal(measurements.length, 1);
  measurements[0]!(geometry(0));
  assert.deepEqual(published, ["place"]);
  assert.equal(measurements.length, 2);
  tracker.request();
  measurements[1]!(geometry(1300));
  assert.deepEqual(published, ["place", "facilities"]);
  measurements[2]!(geometry(2000));
  tracker.request(); measurements[3]!(null);
  tracker.request(); tracker.dispose(); measurements[4]!(geometry(250)); tracker.request();
  assert.equal(measurements.length, 5);
  assert.deepEqual(published, ["place", "facilities", "notes"]);
});

test("layout refresh does not reuse the previous document's bottom after upstream content grows", () => {
  const measurements: ((value: DocumentGeometry | null) => void)[] = [], published: string[] = [];
  const tracker = createDocumentScrollTracker(done => measurements.push(done), chapter => published.push(chapter));
  tracker.request();
  measurements[0]!(geometry(1900, 2500));
  assert.deepEqual(published, ["notes"]);
  tracker.request();
  measurements[1]!(geometry(1300));
  assert.deepEqual(published, ["notes", "facilities"]);
});
