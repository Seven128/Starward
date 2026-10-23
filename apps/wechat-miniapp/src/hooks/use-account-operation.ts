import Taro from "@tarojs/taro";
import { useEffect, useRef } from "react";
import { currentDraftUserId } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { createAccountOperationOwner } from "./account-operation";
import { usePresentedPageLifecycle } from "@/navigation/page-presentation";
import { readPagePresentationIdentity } from "@/navigation/primary-page-navigation";

/** Account-scoped UI operations; business requests, storage and retry ledgers stay with their owners. */
export function useAccountOperation(target: string, onBusy: (busy: boolean) => void) {
  const presentationRef = useRef<ReturnType<typeof usePresentedPageLifecycle>>();
  const latest = useRef({ target, onBusy });
  latest.current = { target, onBusy };
  const owner = useRef<ReturnType<typeof createAccountOperationOwner>>();
  if (!owner.current) owner.current = createAccountOperationOwner(() => {
    const userId = currentDraftUserId();
    const state = useAppStore.getState();
    let page: unknown;
    try {
      const nativePage = Taro.getCurrentPages().at(-1);
      const presentation = presentationRef.current;
      const identity = presentation?.identity();
      // A known native handoff suspends foreground permission, not its retained owner.
      // A different native Page or logical activation still retires the operation.
      page = identity != null && readPagePresentationIdentity(nativePage, presentation?.route) === identity
        ? identity : nativePage;
    } catch { /* Unknown stack cannot authorize an effect. */ }
    return { userId, ownerId: state.accountOwnerId, reset: state.mapResetVersion, page, target: latest.current.target };
  }, busy => latest.current.onBusy(busy));
  const operations = owner.current;
  const presentation = usePresentedPageLifecycle({ hide: operations.hide, show: operations.show });
  presentationRef.current = presentation;
  useEffect(() => useAppStore.subscribe(operations.observe), [operations]);
  useEffect(() => { operations.observe(); }, [operations, target]);
  useEffect(() => () => operations.dispose(), [operations]);
  const guarded = useRef<typeof operations>();
  if (!guarded.current) guarded.current = { ...operations, begin: options =>
    presentationRef.current?.isCurrent() ? operations.begin(options) : undefined };
  return guarded.current;
}
