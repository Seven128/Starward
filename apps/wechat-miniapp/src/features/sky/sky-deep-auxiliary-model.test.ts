import assert from "node:assert/strict";
import test from "node:test";
import { skyDeepAuxiliaryModelOpacity, type SkyDeepAuxiliaryDisplayFacts } from "./sky-deep-auxiliary-visibility";
import { unknownSkyArtworkLocalObservation, type SkyArtworkLocalObservation } from "./sky-artwork-level-composition";

// Controlled model facts test the display responsibility only. They do not
// assert a rendered pixel, physical registration or adopted quality threshold.
const positive = Object.freeze({ selection: "has" as const, photo: "positive" as const });
const neutral = Object.freeze({ selection: "not-selected" as const, photo: "unknown" as const });
const black = Object.freeze({ selection: "has" as const, photo: "unknown" as const });
const uncertain = Object.freeze({ selection: "unknown" as const, photo: "positive" as const });
const local: SkyArtworkLocalObservation = Object.freeze({ scope: "frozen-highp-shader-pixel-centers",
  precision: "unknown", signalRevision: 7, fine: positive, coarse: positive });
const facts: SkyDeepAuxiliaryDisplayFacts = Object.freeze({ reference: "M:51", regionReference: "M:51",
  submitted: true, finePrepared: true, coarseExpected: true, coarsePrepared: true, nativeCurrent: true, local });
const opacity = (value: SkyDeepAuxiliaryDisplayFacts | null, fov = 2.8) => skyDeepAuxiliaryModelOpacity(fov, 844, 13.71, value);

test("selected slots independently guard scale fade; bright coarse never substitutes for black or unknown fine", () => {
  assert(Math.abs(opacity(facts) - .3190884173395092) < 1e-15);
  for (const fine of [black, uncertain]) assert.equal(opacity({ ...facts, local: { ...local, fine } }), 1);
  for (const coarse of [black, uncertain]) assert.equal(opacity({ ...facts, local: { ...local, coarse } }), 1);
  assert.equal(opacity({ ...facts, local: { ...local, fine: neutral, coarse: neutral } }), 1,
    "zero selected slots supplies no display eligibility");
  assert.equal(opacity({ ...facts, coarseExpected: false, coarsePrepared: false,
    local: { ...local, coarse: neutral } }), opacity(facts), "a real absent parent is neutral");
});

test("missing model domain, incomplete expected preparation and retired sources restore aid", () => {
  for (const value of [null, { ...facts, regionReference: null }, { ...facts, regionReference: "M:63" },
    { ...facts, submitted: false }, { ...facts, finePrepared: false }, { ...facts, coarsePrepared: false },
    { ...facts, nativeCurrent: false }, { ...facts, local: unknownSkyArtworkLocalObservation }])
    assert.equal(opacity(value), 1);
});

test("the shared scalar returns on zoom out and preserves unknown restoration independently of scale", () => {
  assert.deepEqual([10, 2.8, 1.8, 2.8, 10].map(fov => opacity(facts, fov)),
    [1, .3190884173395092, 0, .3190884173395092, 1]);
  assert.equal(opacity({ ...facts, local: { ...local, fine: black } }, 1.8), 1);
});
