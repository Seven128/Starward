import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

export interface NativePermissionActivityModule {
  prepare(): Promise<unknown>;
  read(): unknown;
  addListener(event: "onActivityVisibility", listener: (event: unknown) => void): { remove(): void };
}

// Older binaries or other platforms cannot supply this fact. They must remain
// unavailable instead of inventing Activity identity or zero lifecycle epochs.
export const permissionActivityNative: NativePermissionActivityModule | null = (() => {
  if (Platform.OS !== "android") return null;
  try {
    return requireOptionalNativeModule<NativePermissionActivityModule>("StarwardPermissionHandoff");
  } catch {
    return null;
  }
})();
