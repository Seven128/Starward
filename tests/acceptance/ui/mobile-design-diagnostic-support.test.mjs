import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  mobileWebDiagnosticOutputRoot,
  mobileWebDiagnosticSelection,
} from "./mobile-design-diagnostic-support.mjs";

test("mobile Web diagnostic selection preserves Outcome, Control, Mode and Condition identity", () => {
  const selection = mobileWebDiagnosticSelection({
    STARWARD_WEB_DIAGNOSTIC_CONDITION: "mobile-android-390-full",
    STARWARD_WEB_DIAGNOSTIC_CONTROL: "decision-hero",
    STARWARD_WEB_DIAGNOSTIC_MODE: "planning,night",
    STARWARD_WEB_DIAGNOSTIC_OUTCOME: "tonight-decision",
  });
  assert.deepEqual(selection.population.map((entry) => ({
    condition: entry.condition.key,
    controls: entry.controls,
    mode: entry.mode,
    outcome: entry.outcome,
    route: entry.route,
  })), [
    {
      condition: "mobile-android-390-full",
      controls: ["decision-hero"],
      mode: "planning",
      outcome: "tonight-decision",
      route: "/tonight",
    },
    {
      condition: "mobile-android-390-full",
      controls: ["decision-hero"],
      mode: "night",
      outcome: "tonight-decision",
      route: "/tonight",
    },
  ]);
  assert.throws(
    () => mobileWebDiagnosticSelection({
      STARWARD_WEB_DIAGNOSTIC_CONTROL: "foreign-control",
      STARWARD_WEB_DIAGNOSTIC_OUTCOME: "tonight-decision",
    }),
    /mobile_web_diagnostic_control_unknown:foreign-control/u,
  );
});

test("mobile Web diagnostic output stays below the repository", () => {
  const resolved = mobileWebDiagnosticOutputRoot(
    "artifacts/verification/mobile-web-diagnostics/custom",
  );
  assert.equal(
    resolved.endsWith(path.join("artifacts", "verification", "mobile-web-diagnostics", "custom")),
    true,
  );
  assert.throws(
    () => mobileWebDiagnosticOutputRoot(".."),
    /mobile_web_diagnostic_output_outside_repository/u,
  );
  assert.throws(
    () => mobileWebDiagnosticOutputRoot("."),
    /mobile_web_diagnostic_output_outside_repository/u,
  );
});
