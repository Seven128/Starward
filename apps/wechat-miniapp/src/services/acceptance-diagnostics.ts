import Taro from "@tarojs/taro";

export const acceptanceDiagnosticStorageKey =
  "starward.acceptance.request-diagnostics.v1";

export type AcceptanceDiagnosticEvent = {
  sequence: number;
  key: string;
  event:
    | "query_state"
    | "query_fn"
    | "start"
    | "cancel"
    | "success"
    | "failure"
    | "timeout";
  detail: string;
};

export type AcceptanceSkySceneInspection = {
  state: "PENDING" | "READY" | "UNAVAILABLE" | "ERROR";
  spotId: string;
  frameAt: string;
  catalogVersion: string;
  starCount: number;
  drawRevision: number;
};

/**
 * A diagnostic publisher is scoped to one mounted sky route instance.  The
 * token is intentionally opaque so a late callback from an older instance
 * cannot publish over, or clear, the inspection owned by a newer instance.
 */
export type AcceptanceSkySceneInspectionOwner = {
  readonly instanceId: number;
};

let skySceneInspection: AcceptanceSkySceneInspection | null = null;
let nextSkySceneInspectionInstanceId = 0;
let activeSkySceneInspectionOwner: AcceptanceSkySceneInspectionOwner | null =
  null;

export function acquireAcceptanceSkySceneInspection():
  | AcceptanceSkySceneInspectionOwner
  | null {
  if (!__MINIAPP_ACCEPTANCE_DIAGNOSTICS__) return null;
  const owner: AcceptanceSkySceneInspectionOwner = {
    instanceId: ++nextSkySceneInspectionInstanceId,
  };
  activeSkySceneInspectionOwner = owner;
  skySceneInspection = null;
  return owner;
}

export function publishAcceptanceSkySceneInspection(
  owner: AcceptanceSkySceneInspectionOwner | null,
  inspection: AcceptanceSkySceneInspection,
) {
  if (
    !__MINIAPP_ACCEPTANCE_DIAGNOSTICS__ ||
    owner === null ||
    owner !== activeSkySceneInspectionOwner
  )
    return false;
  skySceneInspection = inspection;
  return true;
}

export function clearAcceptanceSkySceneInspection(
  owner: AcceptanceSkySceneInspectionOwner | null,
) {
  if (
    !__MINIAPP_ACCEPTANCE_DIAGNOSTICS__ ||
    owner === null ||
    owner !== activeSkySceneInspectionOwner
  )
    return false;
  skySceneInspection = null;
  activeSkySceneInspectionOwner = null;
  return true;
}

export function inspectAcceptanceSkyScene() {
  return __MINIAPP_ACCEPTANCE_DIAGNOSTICS__ ? skySceneInspection : null;
}

/**
 * Acceptance-only, non-authoritative diagnostics. This function must never
 * change product behavior, even on older Mini Program JavaScript engines or
 * when storage is unavailable.
 */
export function recordAcceptanceDiagnostic(
  key: string,
  event: AcceptanceDiagnosticEvent["event"],
  detail: string,
) {
  if (!__MINIAPP_ACCEPTANCE_DIAGNOSTICS__) return;
  try {
    const stored = Taro.getStorageSync<AcceptanceDiagnosticEvent[]>(
      acceptanceDiagnosticStorageKey,
    );
    const rows = Array.isArray(stored) ? stored : [];
    const previous = rows.length > 0 ? rows[rows.length - 1] : undefined;
    rows.push({ sequence: (previous?.sequence ?? 0) + 1, key, event, detail });
    Taro.setStorageSync(acceptanceDiagnosticStorageKey, rows.slice(-80));
  } catch {
    // Diagnostics are intentionally fail-open for the product candidate.
  }
}
