import { useMutation } from "@tanstack/react-query";
import type { SpotId } from "@starward/miniapp-contracts";
import {
  errorMessage,
  currentDraftUserId,
  setFavoriteRelation,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";

const pendingFavorites = new Set<string>();

export function useFavoriteMutation() {
  const mutation = useMutation({
    mutationFn: (input: { spotId: SpotId; favorite: boolean; owner: string | null }) =>
      setFavoriteRelation(input.spotId, input.favorite, input.owner ?? undefined),
  });

  const toggleFavorite = async (spotId: SpotId) => {
    const owner = currentDraftUserId();
    const key = JSON.stringify([owner, spotId]);
    if (pendingFavorites.has(key)) return false;
    pendingFavorites.add(key);
    const store = useAppStore.getState();
    const before = store.favoriteIds.includes(spotId);
    const favorite = store.toggleFavorite(spotId);
    try {
      const response = await mutation.mutateAsync({ spotId, favorite, owner });
      if (owner !== null && currentDraftUserId() !== owner) return false;
      const saved = response.data.favorites.some((spot) => spot.spotId === spotId);
      const ids = useAppStore.getState().favoriteIds.filter((id) => id !== spotId);
      useAppStore.getState().replaceFavoriteIds(saved ? [...ids, spotId] : ids);
      const current = useAppStore.getState();
      for (const notice of current.notifications) {
        if (notice.owner === "favorites" && notice.dedupeKey === `favorite-failed-${spotId}`)
          current.dismissNotification(notice.id);
      }
      return true;
    } catch (error) {
      if (currentDraftUserId() !== owner) return false;
      const ids = useAppStore.getState().favoriteIds.filter((id) => id !== spotId);
      useAppStore.getState().replaceFavoriteIds(before ? [...ids, spotId] : ids);
      const detail = `收藏未保存，已恢复操作前状态：${errorMessage(error)}。可检查连接后重试。`;
      useAppStore.getState().notify({
        owner: "favorites",
        placement: "floating",
        tone: "error",
        title: "收藏失败，已回滚",
        body: detail,
        dismissible: true,
        dedupeKey: `favorite-failed-${spotId}`,
      });
      return false;
    } finally {
      pendingFavorites.delete(key);
    }
  };

  return { toggleFavorite, isPending: mutation.isPending };
}
