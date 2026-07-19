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

export const expoPermissionGateway: PermissionGateway = {
  async getForegroundLocationStatus() {
    return mapStatus(await Location.getForegroundPermissionsAsync());
  },
  async requestForegroundLocation() {
    return mapStatus(await Location.requestForegroundPermissionsAsync());
  },
};
