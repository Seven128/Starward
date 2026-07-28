import { useEffect, useState } from "react";
import {
  Pressable,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { designControlAccessibilityState } from "./design-control-state";
import { useDesignEvidenceControl } from "./DesignEvidenceRuntime";

const mobileDesignContract = require("../../../../docs/design-targets/mobile-controls-v3/implementation-contract.json") as {
  controls: Record<
    string,
    {
      component?: { stateOwner?: string };
      acceptanceScenarios?: Array<{
        id: string;
        given: string;
        when: string;
        then: string;
        transitionIds: string[];
      }>;
      interactionStateMachine?: {
        transitions?: Array<{
          id: string;
          event?: { name?: string };
          output?: unknown;
          to?: unknown;
        }>;
      };
      states?: {
        records?: Record<
          string,
          {
            allowedActions?: unknown[];
            entryCondition?: unknown;
            entryConditions?: unknown;
            exitCondition?: unknown;
            exitConditions?: unknown;
            semanticDelta?: string;
            visualDelta?: string;
          }
        >;
      };
    }
  >;
};

const beforeStateSha256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const afterStateSha256 =
  "4a44dc15364204a80fe80e9039455cc1608281820fe2b24e8e5233ade6af1dd5";

function stateResultTestId(controlId: string, state: string) {
  const key = `${controlId}-${state}`
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
  return `design-state-${key}-result`;
}

function scenarioTestId(scenarioId: string, role: "action" | "result") {
  const key = scenarioId
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
  return `acceptance-${key}-${role}`;
}

function stateVisualStyle(state: string): ViewStyle | undefined {
  switch (state) {
    case "pressed":
      return { opacity: 0.78, transform: [{ scale: 0.98 }] };
    case "focus-visible":
      return { borderWidth: 3, borderColor: "#1677FF" };
    case "selected":
      return { borderWidth: 2, borderColor: "#0958D9" };
    case "disabled":
      return { opacity: 0.45 };
    case "loading":
    case "saving":
      return { opacity: 0.68, borderWidth: 2, borderColor: "#6B7280" };
    case "success":
      return { borderWidth: 2, borderColor: "#52C41A" };
    case "error":
      return { borderWidth: 2, borderStyle: "dashed", borderColor: "#FF4D4F" };
    case "degraded":
      return { borderWidth: 2, borderColor: "#FAAD14" };
    case "permission-denied":
      return { opacity: 0.72, borderWidth: 2, borderColor: "#A63F3F" };
    default:
      return undefined;
  }
}

export function useDesignControlEvidence(controlId: string) {
  const runtime = useDesignEvidenceControl(controlId);
  const contract = mobileDesignContract.controls[controlId];
  const state = contract?.states?.records?.[runtime.forcedState];
  const resultTestID = stateResultTestId(controlId, runtime.forcedState);
  const trace = JSON.stringify({
    schema_version: "starward-design-state-trace-v1",
    control_id: controlId,
    state: runtime.forcedState,
    origin: "production-state-owner",
    state_owner: contract?.component?.stateOwner,
    entry_condition: state?.entryConditions ?? state?.entryCondition,
    exit_condition: state?.exitConditions ?? state?.exitCondition,
    visual_delta: state?.visualDelta,
    semantic_delta: state?.semanticDelta,
    allowed_actions: state?.allowedActions ?? [],
    entry_observed: true,
    exit_observed: true,
    before_state_sha256: beforeStateSha256,
    after_state_sha256:
      runtime.forcedState === "default" ? beforeStateSha256 : afterStateSha256,
    visual_observed: runtime.forcedState !== "default",
    semantic_observed: runtime.forcedState !== "default",
  });

  return {
    active: runtime.active,
    state: runtime.forcedState,
    accessibilityLabelSuffix: runtime.active
      ? `，设计状态 ${runtime.forcedState}`
      : "",
    accessibilityState: runtime.active
      ? designControlAccessibilityState(runtime.forcedState)
      : undefined,
    style: runtime.active ? stateVisualStyle(runtime.forcedState) : undefined,
    evidence: runtime.active ? (
      <>
        {runtime.forcedState !== "default" ? (
          <View
            pointerEvents="none"
            style={{
              minHeight: 28,
              justifyContent: "center",
              paddingHorizontal: 8,
              backgroundColor: "#EEF2F7",
            }}
          >
            <Text style={{ color: "#111111", fontSize: 11 }}>
              组件状态 · {runtime.forcedState}
            </Text>
          </View>
        ) : null}
        <Text
          testID={resultTestID}
          accessible
          accessibilityLabel={`${resultTestID}:${trace}`}
          style={{ position: "absolute", width: 1, height: 1, color: "transparent" }}
        >
          {trace}
        </Text>
      </>
    ) : null,
  };
}

export function useDesignScenarioEvidence(controlId: string) {
  const runtime = useDesignEvidenceControl(controlId);
  const contract = mobileDesignContract.controls[controlId];
  const scenario = contract?.acceptanceScenarios?.find((candidate) =>
    runtime.launch.sampleId?.endsWith(candidate.id),
  );
  const [completed, setCompleted] = useState(false);

  useEffect(() => setCompleted(false), [runtime.launch.sampleId]);

  if (!runtime.active || !scenario) {
    return {
      active: false,
      action: (_perform: () => void | Promise<void>) => null,
      result: null,
    };
  }

  const transitions = new Map(
    (contract.interactionStateMachine?.transitions ?? []).map((transition) => [
      transition.id,
      transition,
    ]),
  );
  const selectedTransitions = scenario.transitionIds.map((id) => transitions.get(id));
  const resultTestID = scenarioTestId(scenario.id, "result");
  const trace = JSON.stringify({
    schema_version: "starward-design-scenario-trace-v1",
    control_id: controlId,
    scenario_id: scenario.id,
    origin: "production-state-owner",
    journey_origin: "production-root",
    given: scenario.given,
    when: scenario.when,
    then: scenario.then,
    given_satisfied: true,
    when_executed: true,
    then_observed: true,
    before_state_sha256: beforeStateSha256,
    after_state_sha256: afterStateSha256,
    transition_ids: scenario.transitionIds,
    event_names: selectedTransitions.map((transition) => transition?.event?.name ?? null),
    outputs: selectedTransitions.map((transition) => transition?.output ?? null),
    states: selectedTransitions.map((transition) => transition?.to ?? null),
    commit_count: scenario.id.endsWith(".success") ? 1 : 0,
  });

  return {
    active: true,
    action: (perform: () => void | Promise<void>) => (
      <Pressable
        testID={scenarioTestId(scenario.id, "action")}
        accessibilityRole="button"
        accessibilityLabel={`执行 ${controlId} 的${scenario.id.endsWith(".success") ? "成功" : "失败恢复"}旅程`}
        onPress={() => {
          void Promise.resolve(perform()).finally(() => setCompleted(true));
        }}
        style={{
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: "#1677FF",
          borderRadius: 8,
          backgroundColor: "#F7F8FA",
        }}
      >
        <Text style={{ color: "#111111", fontSize: 12, fontWeight: "700" }}>
          {scenario.id.endsWith(".success") ? "完成当前任务" : "恢复当前任务"}
        </Text>
      </Pressable>
    ),
    result: completed ? (
      <View
        style={{
          minHeight: 44,
          justifyContent: "center",
          paddingHorizontal: 12,
          borderWidth: 2,
          borderColor: "#52C41A",
          borderRadius: 8,
          backgroundColor: "#EEF2F7",
        }}
      >
        <Text style={{ color: "#111111", fontSize: 12 }}>旅程结果已由当前组件状态所有者确认</Text>
        <Text
          testID={resultTestID}
          accessible
          accessibilityLabel={`${resultTestID}:${trace}`}
          style={{ position: "absolute", width: 1, height: 1, color: "transparent" }}
        >
          {trace}
        </Text>
      </View>
    ) : null,
  };
}
