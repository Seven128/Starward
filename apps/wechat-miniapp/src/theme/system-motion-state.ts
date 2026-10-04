import { create } from "zustand";
import { createSystemMotionReader, type SystemMotion } from "./system-motion";

// Installation/process input, deliberately outside persisted account preferences.
export const useSystemMotionStore = create<{ value: SystemMotion }>(() => ({ value: "unknown" }));
export const systemMotionReader = createSystemMotionReader(value => {
  useSystemMotionStore.setState({ value });
});
