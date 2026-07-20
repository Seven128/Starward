import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PreferenceRuntimeStorage } from "@starward/domain/preferences/runtime";

const WEB_STATE_KEY = "starward-preferences-runtime-web-v1";

export async function createPreferenceStorage(): Promise<PreferenceRuntimeStorage> {
  return {
    kind: "web-key-value",
    read: (key) => AsyncStorage.getItem(`${WEB_STATE_KEY}:${key}`),
    write: (key, value) => AsyncStorage.setItem(`${WEB_STATE_KEY}:${key}`, value),
  };
}
