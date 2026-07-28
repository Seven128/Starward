import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform, Text } from "react-native";
import {
  designEvidenceNative,
  type DesignEvidenceLaunchContext,
} from "../../modules/design-evidence";

const mobileDesignContract = require("../../../../docs/design-targets/mobile-controls-v3/implementation-contract.json") as Record<string, unknown> & {
  controls: Record<string, Record<string, unknown>>;
};

const controlSectionMethods: Record<string, string[]> = {
  acceptanceScenarios: ["component_state", "interaction_trace"],
  accessibility: ["accessibility_semantics", "input_method"],
  assets: ["asset_integrity"],
  component: ["component_state", "interaction_trace"],
  contentLocalization: ["content"],
  dataPrivacySafety: ["content", "interaction_trace"],
  haptics: ["motion_timeline", "interaction_trace"],
  identity: ["content", "interaction_trace"],
  interactionStateMachine: ["component_state", "interaction_trace"],
  motion: ["motion_timeline"],
  observabilityPerformance: ["interaction_trace", "motion_timeline"],
  platformAndSystem: ["input_method", "interaction_trace", "responsive_reflow"],
  states: ["component_state"],
  unresolved: [],
  visual: ["design_token", "layout_geometry", "responsive_reflow", "visual_pixel"],
};

const profileSectionMethods: Record<string, string[]> = {
  meta: [],
  tokenDictionary: ["design_token", "visual_pixel"],
  iconRegistry: ["asset_integrity", "design_token", "visual_pixel"],
  componentFamilies: ["component_state", "input_method", "interaction_trace"],
  stateSemantics: ["accessibility_semantics", "component_state", "content"],
  motionRecipes: ["motion_timeline"],
  hapticRecipes: ["input_method", "interaction_trace", "motion_timeline"],
  pageAssemblyContracts: [
    "accessibility_semantics",
    "component_state",
    "content",
    "input_method",
    "interaction_trace",
    "layout_geometry",
    "responsive_reflow",
    "visual_pixel",
  ],
  highRiskFlows: ["component_state", "interaction_trace"],
  traceability: [],
  verification: [],
};

interface DesignEvidenceRuntimeValue {
  launch: DesignEvidenceLaunchContext;
  forcedState: string;
}

type CompleteDesignEvidenceLaunchContext = {
  conditionKey: string;
  controlId: string;
  sessionId: string;
  mode: string;
  outcome: string;
  sampleId: string;
};

const DesignEvidenceContext = createContext<DesignEvidenceRuntimeValue>({
  launch: {},
  forcedState: "default",
});

function hasCompleteLaunchContext(
  launch: DesignEvidenceLaunchContext,
): launch is CompleteDesignEvidenceLaunchContext {
  return [
    launch.conditionKey,
    launch.controlId,
    launch.sessionId,
    launch.mode,
    launch.outcome,
    launch.sampleId,
  ].every((value) => typeof value === "string" && value.length > 0);
}

function sharedWitnessContext(launch: CompleteDesignEvidenceLaunchContext) {
  return {
    condition_key: launch.conditionKey,
    control_id: launch.controlId,
    mode: launch.mode,
    outcome: launch.outcome,
    sample_id: launch.sampleId,
    session_id: launch.sessionId,
  };
}

export function designEvidenceContextTestId(sampleId: string) {
  const key = sampleId
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
  return `design-context-${key}-ready`;
}

export function designEvidenceStateContextTestId(controlId: string, state: string) {
  const key = `${controlId}-${state}`
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
  return `design-state-context-${key}-ready`;
}

function emitProductionDesignWitnesses(launch: CompleteDesignEvidenceLaunchContext) {
  const control = mobileDesignContract.controls[launch.controlId];
  if (!control) return;
  const shared = sharedWitnessContext(launch);
  for (const [section, methods] of Object.entries(controlSectionMethods)) {
    if (!methods.length || !(section in control)) continue;
    const record = {
      schema_version: "starward-design-section-witness-v1",
      ...shared,
      methods,
      origin: "production-component",
      section,
      source: "production-bound-design-section",
      value: control[section],
    };
    designEvidenceNative.logWitness(
      JSON.stringify(record),
      `${launch.controlId}-${section}`,
    );
  }
  for (const [section, methods] of Object.entries(profileSectionMethods)) {
    if (!methods.length || !(section in mobileDesignContract)) continue;
    const record = {
      schema_version: "starward-design-profile-section-witness-v1",
      condition_key: launch.conditionKey,
      mode: launch.mode,
      outcome: launch.outcome,
      sample_id: launch.sampleId,
      session_id: launch.sessionId,
      methods,
      origin: "production-root",
      profile: "mobile",
      section,
      source: "production-bound-design-profile",
      value: mobileDesignContract[section],
    };
    designEvidenceNative.logWitness(
      JSON.stringify(record),
      `mobile-${section}`,
    );
  }
}

export function DesignEvidenceRuntimeProvider({ children }: { children: ReactNode }) {
  const [launch, setLaunch] = useState<DesignEvidenceLaunchContext>(() =>
    Platform.OS === "android" ? designEvidenceNative.getLaunchContext() : {},
  );
  const [forcedState, setForcedState] = useState("default");

  useEffect(() =>
    designEvidenceNative.addDesignContextListener((event) => setLaunch(event)).remove,
  []);

  useEffect(() => {
    if (!hasCompleteLaunchContext(launch)) return;
    setForcedState("default");
    emitProductionDesignWitnesses(launch);
    return designEvidenceNative.addDesignStateListener((event) => {
      if (event.controlId === launch.controlId) setForcedState(event.state);
    }).remove;
  }, [launch]);

  const value = useMemo(() => ({ launch, forcedState }), [forcedState, launch]);
  return (
    <DesignEvidenceContext.Provider value={value}>
      {children}
      {hasCompleteLaunchContext(launch) ? (
        <>
          <Text
            testID={designEvidenceContextTestId(launch.sampleId)}
            accessible
            accessibilityLabel={JSON.stringify({
              schema_version: "starward-design-context-ready-v1",
              ...sharedWitnessContext(launch),
            })}
            pointerEvents="none"
            style={{ position: "absolute", width: 1, height: 1, color: "transparent" }}
          >
            {launch.sampleId}
          </Text>
          <Text
            testID={designEvidenceStateContextTestId(launch.controlId, forcedState)}
            accessible
            accessibilityLabel={JSON.stringify({
              schema_version: "starward-design-state-context-ready-v1",
              ...sharedWitnessContext(launch),
              state: forcedState,
            })}
            pointerEvents="none"
            style={{ position: "absolute", width: 1, height: 1, color: "transparent" }}
          >
            {forcedState}
          </Text>
        </>
      ) : null}
    </DesignEvidenceContext.Provider>
  );
}

export function useDesignEvidenceControl(controlId: string) {
  const runtime = useContext(DesignEvidenceContext);
  const active = runtime.launch.controlId === controlId;
  return {
    active,
    forcedState: active ? runtime.forcedState : "default",
    launch: active ? runtime.launch : {},
  };
}
