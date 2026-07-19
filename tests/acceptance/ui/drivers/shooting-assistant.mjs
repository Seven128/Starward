import { runFrozenUiCase } from "../engine.mjs";

export function runAcceptanceCase({ page, baseUrl, assertion }) {
  return runFrozenUiCase({ page, baseUrl, assertion, outcome: "shooting-assistant" });
}
