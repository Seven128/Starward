import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { useEffect, useRef } from "react";
import { currentDraftUserId } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { createAccountOperationOwner } from "./account-operation";

/** Account-scoped UI operations; business requests, storage and retry ledgers stay with their owners. */
export function useAccountOperation(target: string, onBusy: (busy: boolean) => void) {
  const latest = useRef({ target, onBusy });
  latest.current = { target, onBusy };
  const owner = useRef<ReturnType<typeof createAccountOperationOwner>>();
  if (!owner.current) owner.current = createAccountOperationOwner(() => {
    const userId = currentDraftUserId();
    const state = useAppStore.getState();
    let page: unknown;
    try { page = Taro.getCurrentPages().at(-1); } catch { /* Unknown stack cannot authorize an effect. */ }
    return { userId, ownerId: state.accountOwnerId, reset: state.mapResetVersion, page, target: latest.current.target };
  }, busy => latest.current.onBusy(busy));
  const operations = owner.current;
  useDidHide(operations.hide);
  useDidShow(operations.show);
  useEffect(() => useAppStore.subscribe(operations.observe), [operations]);
  useEffect(() => { operations.observe(); }, [operations, target]);
  useEffect(() => () => operations.dispose(), [operations]);
  return operations;
}
