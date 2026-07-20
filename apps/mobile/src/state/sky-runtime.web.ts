import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { createSkyRuntime, type SkyRuntimeStorage } from "../features/sky/runtime";

let instance: Promise<Awaited<ReturnType<typeof createSkyRuntime>>> | null = null;

async function runtime() {
  instance ??= (async () => {
    const storage: SkyRuntimeStorage = {
      kind: "web-key-value",
      read: (key) => AsyncStorage.getItem(`starward-sky:${key}`),
      write: (key, value) => AsyncStorage.setItem(`starward-sky:${key}`, value),
    };
    return createSkyRuntime({
      storage,
      digest: (value) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value),
      releaseProfile: { id: "individual-personal-trial", externalServicesBudgetCny: 200, productionTrafficAllowed: false },
      boundary: { async invoke(request) { return { status: "observed", kind: request.kind, token: request.payload.token }; } },
    });
  })();
  return instance;
}

export async function persistSkyResolution(payload: Record<string, unknown> & { token: string; at: string; algorithmVersion: string }) {
  return (await runtime()).execute({ outcome: "sky-orientation-ar", actorId: "personal-trial-owner", operation: "sky.resolve", idempotencyKey: `sky:${payload.at}:${payload.algorithmVersion}:${payload.token}`, payload });
}
