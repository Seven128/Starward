import Taro from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";
import { currentDraftUserId } from "@/services/api-client";
import { createProfileDraftSession, emptyProfileDraft, type ProfileDraft } from "./local-draft";

export function useProfileDraft(owner: string | null) {
  const session = useRef<ReturnType<typeof createProfileDraftSession> | null>(null);
  const [state, setState] = useState({ value: emptyProfileDraft(), recovery: null as ProfileDraft | null, error: false, unreadable: false, owner: null as string | null });
  useEffect(() => {
    if (owner && !session.current) {
      session.current = createProfileDraftSession(Taro, owner, currentDraftUserId);
      setState(session.current.snapshot());
    }
  }, [owner]);
  return {
    ...state,
    blocked: !owner || state.owner !== owner || !!state.recovery || state.unreadable,
    change<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
      if (session.current) setState(session.current.change({ ...session.current.snapshot().value, [key]: value }));
    },
    restore() { if (session.current) setState(session.current.restore()); },
    discard() { if (session.current) setState(session.current.discard()); },
    saved() { if (session.current) setState(session.current.saved()); },
  };
}
