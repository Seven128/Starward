import assert from "node:assert/strict";
import test from "node:test";
import type { ObservationContext, SpotId } from "@starward/miniapp-contracts";
import { resolvePlanSaveSpotId } from "./plan-save-spot";

const selected = "spot:verified" as SpotId;

test("a server-restored formal context remains a valid plan owner while the map list loads", () => {
  assert.equal(
    resolvePlanSaveSpotId({
      selectedSpotId: selected,
      formalSpotIds: [],
      activePlanSpotId: null,
      contextLocation: {
        kind: "FORMAL_SPOT",
        spotId: selected,
      } as ObservationContext["location"],
    }),
    selected,
  );
});

test("a map point cannot authorize an unlisted formal spot", () => {
  assert.equal(
    resolvePlanSaveSpotId({
      selectedSpotId: selected,
      formalSpotIds: [],
      activePlanSpotId: null,
      contextLocation: {
        kind: "MAP_POINT",
        displayName: "当前地图中心",
        wgs84: {
          system: "WGS84",
          latitude: 22.54,
          longitude: 114.05,
        },
        source: "MAP_VIEWPORT",
      } as ObservationContext["location"],
    }),
    null,
  );
});
