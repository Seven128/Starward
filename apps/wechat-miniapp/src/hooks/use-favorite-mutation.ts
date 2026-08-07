import Taro from "@tarojs/taro";
import { useMutation } from "@tanstack/react-query";
import type { SpotId } from "@starward/miniapp-contracts";
import {
  errorMessage,
  setFavoriteRelation,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";

export function useFavoriteMutation() {
  const mutation = useMutation({
    mutationFn: (input: { spotId: SpotId; favorite: boolean }) =>
      setFavoriteRelation(input.spotId, input.favorite),
  });

  const toggleFavorite = async (spotId: SpotId) => {
    const store = useAppStore.getState();
    const before = [...store.favoriteIds];
    const favorite = store.toggleFavorite(spotId);
    try {
      const response = await mutation.mutateAsync({ spotId, favorite });
      useAppStore
        .getState()
        .replaceFavoriteIds(
          response.data.favorites.map((spot) => spot.spotId),
        );
      useAppStore
        .getState()
        .setToast(favorite ? "已收藏并同步。" : "已取消收藏并同步。");
      return true;
    } catch (error) {
      useAppStore.getState().replaceFavoriteIds(before);
      const detail = `收藏未保存，已恢复操作前状态：${errorMessage(error)}。可检查连接后重试。`;
      useAppStore.getState().setToast(detail);
      await Taro.showToast({ title: "收藏失败，已回滚", icon: "none" });
      return false;
    }
  };

  return { toggleFavorite, isPending: mutation.isPending };
}
