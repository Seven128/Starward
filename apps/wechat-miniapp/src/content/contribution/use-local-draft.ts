import Taro, { useDidHide } from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";
import { currentDraftUserId } from "@/services/api-client";
import { contributionDraftKey } from "@/services/local-draft-keys";
import { parseLocalContributionDraft, type LocalContributionDraft } from "./local-draft";

export function useLocalContributionDraft(value: LocalContributionDraft, routeSpotId: string, suspended: boolean) {
  const owner = useRef(currentDraftUserId());
  const currentOwner = currentDraftUserId();
  if (!owner.current && currentOwner) owner.current = currentOwner;
  const key = owner.current === currentOwner ? contributionDraftKey(currentOwner, routeSpotId || null) : null;
  const loaded = useRef<string | null>(null);
  const initial = useRef(JSON.stringify(value));
  const saved = useRef<string | null>(null);
  const latest = useRef({ value, key, suspended });
  latest.current = { value, key, suspended };
  const [recovery, setRecovery] = useState<LocalContributionDraft | null>(null);
  const recoveryRef = useRef(recovery);
  recoveryRef.current = recovery;
  const [storageError, setStorageError] = useState(false);
  const persist = (reportError: boolean) => {
    const item = latest.current;
    if (!item.key || item.suspended || recoveryRef.current || loaded.current !== item.key || currentDraftUserId() !== owner.current) return;
    const input = item.value;
    try {
      const hasContent = input.detail || input.candidateName || input.latitude || input.longitude || input.baseSubmissionId;
      if (JSON.stringify(input) === saved.current || (!hasContent && JSON.stringify(input) === initial.current)) Taro.removeStorageSync(item.key);
      else Taro.setStorageSync(item.key, input);
      if (reportError) setStorageError(false);
    } catch { if (reportError) setStorageError(true); }
  };
  const serialized = JSON.stringify(value);
  useEffect(() => {
    if (!key) return;
    if (loaded.current !== key) {
      loaded.current = key;
      try {
        const stored = parseLocalContributionDraft(Taro.getStorageSync(key));
        if (stored) { recoveryRef.current = stored; setRecovery(stored); return; }
      } catch { setStorageError(true); }
    }
    const timer = setTimeout(() => persist(true), 250);
    return () => clearTimeout(timer);
  }, [key, serialized, suspended, recovery]);
  useDidHide(() => persist(false));
  useEffect(() => () => persist(false), []);

  const clear = () => {
    if (!key || currentDraftUserId() !== owner.current) return false;
    try { Taro.removeStorageSync(key); } catch { setStorageError(true); return false; }
    recoveryRef.current = null;
    setRecovery(null);
    return true;
  };
  const markSaved = (snapshot: LocalContributionDraft) => {
    if (!key || currentDraftUserId() !== owner.current) return;
    saved.current = JSON.stringify(snapshot);
    clear();
  };
  const advanceSavedRevision = (submissionId: string, revision: number) => {
    if (!key || currentDraftUserId() !== owner.current || !saved.current) return;
    const baseline = JSON.parse(saved.current) as LocalContributionDraft;
    if (baseline.baseSubmissionId !== submissionId || revision < (baseline.baseRevision ?? 0)) return;
    saved.current = JSON.stringify({ ...baseline, baseRevision: revision });
  };
  return { recovery, storageError, clear, markSaved, advanceSavedRevision,
    hasUnsavedChanges: serialized !== (saved.current ?? initial.current),
    owner: owner.current, accept: () => { recoveryRef.current = null; setRecovery(null); } };
}
