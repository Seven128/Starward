import { useMutation } from "@tanstack/react-query";
import type { SpotId } from "@starward/miniapp-contracts";
import {
  errorMessage,
  currentDraftUserId,
  ensureFavoriteOwner,
  setFavoriteRelation,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";

const pendingFavorites = new Map<string, { owner: string; spotId: SpotId; cancelled: boolean; desired: boolean; version: number; completion: Promise<boolean> }>();

/** A refetched Map snapshot cannot erase a newer, still-uncommitted intention. */
export function reconcileFavoriteSnapshot(ids: readonly SpotId[]): SpotId[] {
  const next = new Set(ids), owner = currentDraftUserId();
  for (const job of pendingFavorites.values()) {
    if (job.owner !== owner || job.cancelled) continue;
    if (job.desired) next.add(job.spotId); else next.delete(job.spotId);
  }
  return [...next];
}

export function useFavoriteMutation() {
  const mutation = useMutation({
    mutationFn: (input: { spotId: SpotId; favorite: boolean; owner: string | null }) =>
      setFavoriteRelation(input.spotId, input.favorite, input.owner ?? undefined),
  });

  const toggleFavorite = async (spotId: SpotId): Promise<boolean> => {
    let owner = currentDraftUserId();
    if (!owner) {
      try { owner = await ensureFavoriteOwner(); }
      catch (error) {
        useAppStore.getState().notify({ owner: "favorites", placement: "floating", tone: "error",
          title: "收藏未保存", body: `${errorMessage(error)}。请重试。`, dismissible: true,
          dedupeKey: `favorite-failed-${spotId}` });
        return false;
      }
    }
    if (currentDraftUserId() !== owner) return false;
    const key = JSON.stringify([owner, spotId]);
    const pending = pendingFavorites.get(key);
    if (pending?.cancelled) {
      await pending.completion;
      return currentDraftUserId() === owner ? toggleFavorite(spotId) : false;
    }
    const store = useAppStore.getState();
    const before = store.favoriteIds.includes(spotId);
    const favorite = store.toggleFavorite(spotId);
    if (pending) {
      pending.desired = favorite;
      pending.version++;
      return pending.completion;
    }
    const job = { owner, spotId, cancelled: false, desired: favorite, version: 0, completion: Promise.resolve(false) };
    pendingFavorites.set(key, job);
    const unsubscribe = useAppStore.subscribe(state => {
      if (state.accountOwnerId !== owner) job.cancelled = true;
    });
    const apply = (saved: boolean) => {
      const ids = useAppStore.getState().favoriteIds.filter((id) => id !== spotId);
      useAppStore.getState().replaceFavoriteIds(saved ? [...ids, spotId] : ids);
    };
    const clearFailure = () => {
      const current = useAppStore.getState();
      for (const notice of current.notifications) {
        if (notice.owner === "favorites" && notice.dedupeKey === `favorite-failed-${spotId}`)
          current.dismissNotification(notice.id);
      }
    };
    job.completion = (async () => {
      let confirmed = before;
      try {
        // At most one request per account/spot. Intervening taps coalesce into
        // the latest explicit intent without replaying an obsolete receipt.
        for (;;) {
          if (job.cancelled || currentDraftUserId() !== owner) return false;
          const version = job.version;
          try {
            const response = await mutation.mutateAsync({ spotId, favorite: job.desired, owner });
            if (job.cancelled || currentDraftUserId() !== owner) return false;
            confirmed = response.data.favorites.some((spot) => spot.spotId === spotId);
            if (version !== job.version && job.desired !== confirmed) continue;
            apply(confirmed);
            clearFailure();
            return true;
          } catch (error) {
            if (job.cancelled || currentDraftUserId() !== owner) return false;
            // The failed request may have committed. Explicitly write the new
            // intent instead of assuming the prior relation still exists.
            if (version !== job.version) continue;
            apply(confirmed);
            useAppStore.getState().notify({
              owner: "favorites", placement: "floating", tone: "error",
              title: "收藏失败，已回滚",
              body: `收藏未保存，已恢复已确认状态：${errorMessage(error)}。可检查连接后重试。`,
              dismissible: true, dedupeKey: `favorite-failed-${spotId}`,
            });
            return false;
          }
        }
      } finally {
        unsubscribe();
        pendingFavorites.delete(key);
      }
    })();
    return job.completion;
  };

  return { toggleFavorite, isPending: mutation.isPending };
}
