import {
  requireNativeModule,
  type NativeModule,
} from "expo-modules-core";
import { Platform } from "react-native";

export interface DesignEvidenceLaunchContext {
  conditionKey?: string | null;
  controlId?: string | null;
  sessionId?: string | null;
  mode?: string | null;
  outcome?: string | null;
  sampleId?: string | null;
}

export interface DesignStateEvent {
  controlId: string;
  state: string;
}

export interface DesignContextEvent {
  conditionKey: string;
  controlId: string;
  sessionId: string;
  mode: string;
  outcome: string;
  sampleId: string;
}

type DesignEvidenceEvents = {
  onDesignContext(event: DesignContextEvent): void;
  onDesignState(event: DesignStateEvent): void;
};

type NativeDesignEvidenceModule = NativeModule<DesignEvidenceEvents> & {
  getLaunchContext(): DesignEvidenceLaunchContext;
  logWitness(payload: string, groupHint: string): boolean;
};

const nativeModule =
  Platform.OS === "android"
    ? requireNativeModule<NativeDesignEvidenceModule>("StarwardDesignEvidence")
    : null;
const nativeEvents = nativeModule as unknown as {
  addListener(
    eventName: keyof DesignEvidenceEvents,
    listener:
      | DesignEvidenceEvents["onDesignContext"]
      | DesignEvidenceEvents["onDesignState"],
  ): { remove(): void };
} | null;

export const designEvidenceNative = {
  getLaunchContext(): DesignEvidenceLaunchContext {
    return nativeModule?.getLaunchContext() ?? {};
  },
  logWitness(payload: string, groupHint: string): boolean {
    return nativeModule?.logWitness(payload, groupHint) ?? false;
  },
  addDesignContextListener(listener: (event: DesignContextEvent) => void) {
    return nativeEvents?.addListener("onDesignContext", listener) ?? {
      remove() {},
    };
  },
  addDesignStateListener(listener: (event: DesignStateEvent) => void) {
    return nativeEvents?.addListener("onDesignState", listener) ?? {
      remove() {},
    };
  },
};
