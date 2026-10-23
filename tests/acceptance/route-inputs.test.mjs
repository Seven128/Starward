import assert from "node:assert/strict";
import test from "node:test";
import { resolveAcceptanceCase, resolveAcceptanceControl, resolveAcceptanceRoute } from "./route-inputs.mjs";

test("spot acceptance resolves the prepared identity and never defaults to another place", () => {
  assert.equal(resolveAcceptanceRoute("/spot/[spotId]", "osm-123"), "/spot/osm-123");
  assert.equal(resolveAcceptanceRoute("/sky", ""), "/sky");
  for (const input of ["", "../other", "spot/b", "spot?current", " "]) {
    assert.throws(() => resolveAcceptanceRoute("/spot/[spotId]", input), /acceptance_spot_id_required/u);
  }
});

test("shared Android/iOS case resolves the actual Map control and cross-surface identity before launch", () => {
  const definition = {
    route: "/spot/[spotId]", root_journey: ["shell-open-map-tab", "map-spot-[spotId]", "map-open-selected-spot-detail"],
    cross_surfaces: [{ route: "/spot/[spotId]", test_id: "decision-context-revision" }, { ops_route: "/ops", route: "/kept" }],
  };
  const input = resolveAcceptanceCase(definition, "osm-42");
  assert.equal(input.route, "/spot/osm-42");
  assert.deepEqual(input.root_journey, ["shell-open-map-tab", "map-spot-osm-42", "map-open-selected-spot-detail"]);
  assert.equal(input.cross_surfaces[0].route, "/spot/osm-42");
  assert.equal(input.cross_surfaces[1], definition.cross_surfaces[1]);
  assert.equal(definition.route, "/spot/[spotId]");
  assert.throws(() => resolveAcceptanceCase(definition, ""), /acceptance_spot_id_required/u);
  assert.throws(() => resolveAcceptanceControl("map-spot-[spotId]", ""), /acceptance_spot_id_required/u);
});
