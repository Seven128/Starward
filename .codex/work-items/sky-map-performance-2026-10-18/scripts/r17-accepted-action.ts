// TASK ONLY. Full accepted record/null and immediate command semantics remain intact.
// The finite builder replaces the final action at build time, never at runtime.
import type { Dispatch, SetStateAction } from "react";

export const R17_ACCEPTED_ACTION_MODE = "__ACCEPTED_ACTION_MODE__" as const;
export const R17_ACCEPTED_ACTION_LABEL = "CPU/text-cache · frozen · synthetic · __ACCEPTED_ACTION_MODE__";

export function r17AcceptedActionSetter<T extends object | null>(
  current: { current: T }, write: Dispatch<SetStateAction<T>>,
) {
  return (update: SetStateAction<T>) => {
    const next = typeof update === "function" ? (update as (previous: T) => T)(current.current) : update;
    current.current = next;
    write(__ACCEPTED_ACTION_VALUE__);
  };
}
