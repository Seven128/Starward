const outcomesWithObservedBoundaries = new Set([
  "tonight-decision",
  "forecast-and-astronomy",
  "map-route-discovery",
  "spot-detail-and-trust",
  "sky-orientation-ar",
  "shooting-assistant",
  "community-contribution",
  "notifications-and-toolbox",
  "quality-release-observability",
]);

export function structuredEvidenceCapabilities({ outcome, assertion }) {
  if (assertion.key === "carrier-integrity") {
    const capabilities = [
      "state_delta",
      "durable_readback",
      "external_side_effect",
      "failure_injection",
      "input_variation",
    ];
    if (outcomesWithObservedBoundaries.has(outcome)) capabilities.push("boundary_invocation");
    return capabilities;
  }

  if (assertion.surface === "implementation_structure") return ["presence"];
  if (assertion.polarity === "negative") return ["failure_injection", "input_variation"];
  return ["state_delta", "input_variation"];
}
