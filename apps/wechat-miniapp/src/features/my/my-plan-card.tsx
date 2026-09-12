import { Button, Image, Text, View } from "@tarojs/components";
import type { ObservationPlan, SpotSummary } from "@starward/miniapp-contracts";
import { SemanticIcon } from "@/components/semantic-asset";
import { myPlanTimeLabel, selectPlanEntry } from "./plan-entry";
import "./my-plan-card.scss";

export function MyPlanCard({ plans, spots, now, loading, unavailable, onOpen, onOpenAll }: {
  plans: readonly ObservationPlan[];
  spots: readonly Pick<SpotSummary, "spotId" | "name">[];
  now: Date;
  loading: boolean;
  unavailable: boolean;
  onOpen(plan: ObservationPlan): void;
  onOpenAll(): void;
}) {
  const { entries, hasMore } = selectPlanEntry(plans, now);
  return <View className="liquid-glass-surface my-plan-card" role="group" aria-label="观星计划" data-material="liquid-glass">
    <Button className="my-plan-card__header focus-ring" onClick={onOpenAll}
      aria-label="打开全部观星计划" data-control="my-plan-entry" data-od-id="my-plan-entry">
      <View className="my-plan-card__title"><Image src="/assets/icons/my-plan-suv.svg" className="my-plan-card__suv" mode="aspectFit" aria-hidden /><Text>观星计划</Text></View><SemanticIcon name="chevron-right" />
    </Button>
    {entries.map(({ plan, ongoing }) => <Button className="my-plan-card__row focus-ring" key={plan.planId}
      onClick={() => onOpen(plan)} aria-label={`打开${spots.find((spot) => spot.spotId === plan.spotId)?.name ?? "观星点"}的计划`}>
      <View className="my-plan-card__dot" aria-hidden="true" />
      <View className="my-plan-card__copy">
        <Text className="my-plan-card__name">{spots.find((spot) => spot.spotId === plan.spotId)?.name ?? "点位资料暂不可用"}</Text>
        <View className="my-plan-card__time">
          {ongoing ? <Text className="my-plan-card__ongoing">进行中</Text> : null}
          <Text>{myPlanTimeLabel(plan, now, ongoing).when}</Text>
          {!ongoing ? <Text>{myPlanTimeLabel(plan, now, ongoing).relative}</Text> : null}
        </View>
      </View>
      <SemanticIcon name="chevron-right" />
    </Button>)}
    {!entries.length ? <Text className="my-plan-card__empty">{loading ? "正在读取观星计划" : unavailable ? "计划暂不可用，请重试同步" : "暂无临近的观星计划"}</Text> : null}
    {hasMore ? <Button className="my-plan-card__more focus-ring" onClick={onOpenAll} aria-label="查看其余观星计划">
      <View aria-hidden="true" /><View aria-hidden="true" /><View aria-hidden="true" />
    </Button> : null}
  </View>;
}
