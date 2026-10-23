import Taro, { useDidShow, useDidHide } from "@tarojs/taro";
import { Text } from "@tarojs/components";
import { SharedButton as Button } from "@/components/shared-button-press";
import { useEffect, useRef, useState } from "react";
import type { SpotId } from "@starward/miniapp-contracts";
import { useAccountPlans } from "@/hooks/use-account-plans";
import { useAccountOperation } from "@/hooks/use-account-operation";
import { getPlans } from "@/services/api-client";
import { LoadingIndicator } from "@/components/loading-indicator";
import { spotPlanRoute } from "./spot-plan-route";
import "./spot-plan-entry.scss";

export function SpotPlanEntry({ spotId, onLayoutChange, requireAccount }: {
  spotId: SpotId;
  onLayoutChange?: (() => void) | undefined;
  requireAccount: ReturnType<typeof import("@/hooks/use-wechat-login").useWechatLogin>["requireAccount"];
}) {
  const active = useRef(true);
  const currentSpot = useRef(spotId); currentSpot.current = spotId;
  const [opening, setOpening] = useState(false), [failed, setFailed] = useState(false);
  const operations = useAccountOperation(`spot-plan:${spotId}`, setOpening);
  const { owner, query } = useAccountPlans({ staleTime: 15_000 });
  useDidShow(() => { active.current = true; if (owner) void query.refetch(); });
  useDidHide(() => { active.current = false; });
  useEffect(() => () => { active.current = false; }, []);
  const route = query.data ? spotPlanRoute(spotId, query.data.data.plans) : null;
  const unavailable = owner && (query.isError || query.refreshError || failed);
  useEffect(() => { onLayoutChange?.(); }, [spotId, route?.label, route?.count, unavailable, opening, onLayoutChange]);
  const open = async (authenticatedOwner: string) => {
    const operation = operations.begin();
    if (!operation) return;
    setFailed(false);
    try {
      const response = await getPlans(undefined, authenticatedOwner);
      operation.assertCurrent();
      await Taro.navigateTo({ url: spotPlanRoute(spotId, response.data.plans).url });
    } catch { if (operation.isCurrent()) setFailed(true); }
    finally { operation.release(); }
  };
  const label = !owner ? "去这观星" : unavailable ? "计划暂不可用，点击重试" : route?.label ?? "正在读取计划";
  return <Button className="spot-plan-entry" disabled={opening} onClick={() => requireAccount(id => void open(id),
    () => active.current && currentSpot.current === spotId)} aria-label={label}>
    <Text>↗　{label}</Text>
    {opening ? <LoadingIndicator kind="arc" /> : <Text>{route?.count ? `${route.count} 个计划　›` : "›"}</Text>}
  </Button>;
}
