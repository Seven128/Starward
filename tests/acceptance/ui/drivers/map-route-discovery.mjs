import { runFrozenUiCase } from "../engine.mjs";

export function runAcceptanceCase({ page, baseUrl, assertion }) {
  return runFrozenUiCase({ page, baseUrl, assertion, outcome: "map-route-discovery", waitForApi: "/v1/map/spots" });
}
