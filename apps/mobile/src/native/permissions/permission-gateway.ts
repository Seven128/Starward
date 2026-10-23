import * as Location from "expo-location";

export type PermissionDecision = "granted" | "denied" | "undetermined";

export interface ForegroundLocationResult {
  decision: PermissionDecision;
  canAskAgain: boolean;
}

export interface PermissionGateway {
  getForegroundLocationStatus(): Promise<ForegroundLocationResult>;
  requestForegroundLocation(): Promise<ForegroundLocationResult>;
}

function mapStatus(value: Location.PermissionResponse): ForegroundLocationResult {
  return {
    decision: value.granted ? "granted" : value.status === Location.PermissionStatus.UNDETERMINED ? "undetermined" : "denied",
    canAskAgain: value.canAskAgain,
  };
}

let foregroundRequest: Promise<ForegroundLocationResult> | null = null;

export const expoPermissionGateway: PermissionGateway = {
  async getForegroundLocationStatus() {
    return mapStatus(await Location.getForegroundPermissionsAsync());
  },
  requestForegroundLocation() {
    if (!foregroundRequest) {
      const attempt = Location.requestForegroundPermissionsAsync().then(mapStatus);
      foregroundRequest = attempt;
      void attempt.then(
        () => { if (foregroundRequest === attempt) foregroundRequest = null; },
        () => { if (foregroundRequest === attempt) foregroundRequest = null; },
      );
    }
    return foregroundRequest;
  },
};
