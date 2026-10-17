import type { Dispatch, SetStateAction } from "react";

/** UI command readback before React commits. Context, public time, camera and
 * selection remain with their existing domain owners. Every consumer of a
 * bridged UI value writes through this setter, including functional updates. */
export function skyCommandStateSetter<T>(current: { current: T }, write: Dispatch<SetStateAction<T>>) {
  return (update: SetStateAction<T>) => {
    const next = typeof update === "function" ? (update as (previous: T) => T)(current.current) : update;
    current.current = next;
    write(() => next);
  };
}
