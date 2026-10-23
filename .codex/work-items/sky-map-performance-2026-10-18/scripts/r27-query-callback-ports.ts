// TASK ONLY shared entrance. Fixed diagnostic methods register once when the
// Sky adapter loads; active/tracking/drain/release stay with that same owner.
// This module retains no product value, Query key, sample, timer or cache.
type WrapperPort = <T extends Function>(pageFn: Function, wrapper: T) => T;
type OwnerPort = (pageFn: Function, client: unknown, queryKey: readonly unknown[]) => void;
let wrapperPort: WrapperPort | null = null, ownerPort: OwnerPort | null = null;

export function registerR27QueryCallbackPorts(wrapper: WrapperPort, owner: OwnerPort): void {
  if (wrapperPort !== null && (wrapperPort !== wrapper || ownerPort !== owner))
    throw Error("r27_query_callback_ports_already_registered");
  wrapperPort = wrapper; ownerPort = owner;
}
export function r27QueryWrapper<T extends Function>(pageFn: Function, wrapper: T): T {
  wrapperPort?.(pageFn, wrapper);
  return wrapper;
}
export function r27QueryOwner(pageFn: Function, client: unknown, queryKey: readonly unknown[]): void {
  ownerPort?.(pageFn, client, queryKey);
}
