import { useDidHide, useDidShow } from "@tarojs/taro";
import { useState } from "react";
import type { TerrainHorizonRequest } from "@starward/miniapp-contracts";
import { getTerrainHorizon } from "@/services/api-client";
import { checkedTerrainHorizon } from "@/services/terrain-horizon-response";
import { useResourceQuery } from "./use-resource-query";

/** Static terrain has one point-bound query, independent of the image radius,
 * observation time and the terrain/night-light display switches. */
export function useTerrainHorizon(input: TerrainHorizonRequest, enabled: boolean) {
  const [foreground, setForeground] = useState(true);
  useDidHide(() => setForeground(false));
  useDidShow(() => setForeground(true));
  return useResourceQuery({
    queryKey: ["terrain-horizon", input.center.latitude.toFixed(7), input.center.longitude.toFixed(7)],
    queryFn: async signal => {
      const response = await getTerrainHorizon(input, signal);
      const data = checkedTerrainHorizon(response.data, input);
      // Query's existing bounded transport retry also covers a total read
      // failure delivered in an envelope. Valid partial sectors stay visible.
      if (data.state === "UNAVAILABLE" && data.failureCode) throw new Error(data.failureCode);
      return response;
    },
    enabled: enabled && foreground,
    staleTime: response => !response || response.data.failureCode ? 0
      : response.data.state === "AVAILABLE" ? 24 * 60 * 60_000 : 60_000,
  });
}
