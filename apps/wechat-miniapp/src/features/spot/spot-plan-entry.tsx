import Taro, { useDidShow, useDidHide } from "@tarojs/taro";
import { Button, Text } from "@tarojs/components";
import { useEffect, useId, useRef, useState } from "react";
import type { SpotId } from "@starward/miniapp-contracts";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { currentDraftUserId, getPlans } from "@/services/api-client";
import { spotPlanRoute } from "./spot-plan-route";
import "./spot-plan-entry.scss";

export function SpotPlanEntry({ spotId }: { spotId: SpotId }) {
  const mount = useId(), busy = useRef(false);
  const active = useRef(true);
  const [opening, setOpening] = useState(false), [failed, setFailed] = useState(false);
  const [, refresh] = useState(0);
  const owner = currentDraftUserId();
  const query = useResourceQuery({ queryKey: ["plans", owner ?? `spot-plan:${mount}`],
    queryFn: signal => getPlans(signal, owner ?? undefined), staleTime: 15_000 });
  useDidShow(() => { active.current = true; refresh(value => value + 1); void query.refetch(); });
  useDidHide(() => { active.current = false; });
  useEffect(() => () => { active.current = false; }, []);
  const route = query.data ? spotPlanRoute(spotId, query.data.data.plans) : null;
  const unavailable = query.isError || query.refreshError || failed;
  const open = async () => {
    if (busy.current) return;
    busy.current = true; setOpening(true); setFailed(false);
    try {
      const response = await getPlans(undefined, owner ?? undefined);
      if (!active.current) return;
      if (owner && currentDraftUserId() !== owner) throw new Error("account_changed");
      await Taro.navigateTo({ url: spotPlanRoute(spotId, response.data.plans).url });
    } catch { setFailed(true); }
    finally { busy.current = false; setOpening(false); }
  };
  return <Button className="spot-plan-entry" disabled={opening} onClick={() => { void open(); }}
    aria-label={unavailable ? "计划暂不可用，点击重试" : route?.label ?? "读取观星计划"}>
    <Text>↗　{unavailable ? "计划暂不可用，点击重试" : route?.label ?? "正在读取计划"}</Text>
    <Text>{opening ? "正在打开" : route?.count ? `${route.count} 个计划　›` : "›"}</Text>
  </Button>;
}
