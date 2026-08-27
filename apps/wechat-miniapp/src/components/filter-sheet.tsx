import { Button, ScrollView, Text, View } from "@tarojs/components";
import {
  FILTER_GROUPS,
  FILTER_OPTIONS,
  countAppliedFilters,
  type FilterOption,
  type MapSceneData,
} from "@starward/miniapp-contracts";
import { useAppStore } from "@/state/app-store";
import { SelectedCardStar } from "./selected-card-star";
import "./filter-sheet.scss";

export function QuickFilterChip({
  option,
  selected,
  disabled = false,
  onClick,
}: {
  option: Pick<FilterOption, "id" | "label">;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className={`quick-filter-chip focus-ring${selected ? " quick-filter-chip--selected" : ""}`}
      data-od-id="spot-finder-quick-filter"
      aria-pressed={selected}
      aria-label={`${option.label}，${selected ? "已选择" : "未选择"}`}
      {...(disabled ? { disabled: true } : {})}
      onClick={onClick}
    >
      <Text>{option.label}</Text>
      {selected ? <SelectedCardStar /> : null}
    </Button>
  );
}

/** The Finder-owned editor. It is a bounded surface inside SourceLift. */
export function FilterSheet({
  capabilities,
}: {
  capabilities?: MapSceneData["filterCapabilities"]["byGroup"] | undefined;
}) {
  const draft = useAppStore((state) => state.draftFilters);
  const toggle = useAppStore((state) => state.toggleDraftFilter);
  const count = countAppliedFilters(draft);
  const limitedCapabilities = FILTER_GROUPS.flatMap((group) => {
    const capability = capabilities?.[group.key];
    return capability && capability.state !== "AVAILABLE"
      ? [{ label: group.title, ...capability }]
      : [];
  });
  const advancedGroups = FILTER_GROUPS.filter((group) =>
    FILTER_OPTIONS.some(
      (option) => option.group === group.key && option.tier === "ADVANCED",
    ),
  );
  return (
    <View
      className="filter-sheet"
      data-od-id="spot-finder-filter-overlay"
      role="region"
      aria-label="Finder 筛选条件"
    >
      <View className="filter-sheet__scroll-viewport">
        <ScrollView
          scrollY
          className="filter-sheet__scroll"
          data-od-id="spot-finder-filter-scroll"
          enhanced={true}
          showScrollbar={false}
          aria-label="8 项高级筛选条件"
        >
          <View className="filter-sheet__content">
          <View
            className="filter-sheet__tier"
            data-od-id="spot-finder-filter-advanced"
          >
            <Text className="type-section">进阶筛选</Text>
            <View className="filter-sheet__grid">
              {advancedGroups.map((group) => {
                const option = FILTER_OPTIONS.find(
                  (item) => item.group === group.key,
                );
                if (!option) return null;
                const selected = draft[group.key].includes(option.id);
                const capability = capabilities?.[group.key];
                const unavailable = capability?.state === "UNAVAILABLE";
                const disabled = unavailable && !selected;
                return (
                  <Button
                    className={`filter-option focus-ring${selected ? " filter-option--selected" : ""}${unavailable ? " filter-option--unavailable" : capability?.state === "PARTIAL" ? " filter-option--partial" : ""}`}
                    data-od-id="spot-finder-filter-choice"
                    key={option.id}
                    {...(disabled ? { disabled: true } : {})}
                    aria-pressed={selected}
                    aria-label={`${option.label}，${selected ? "已选择" : "未选择"}${capability?.state === "UNAVAILABLE" ? `，当前不可用：${capability.reason}${selected ? "，可点击移除" : ""}` : capability?.state === "PARTIAL" ? `，部分可用：${capability.reason}` : ""}`}
                    onClick={() => toggle(option.id)}
                  >
                    <View className="filter-option__copy">
                      <Text>{option.label}</Text>
                    </View>
                    {selected ? <SelectedCardStar /> : null}
                  </Button>
                );
              })}
            </View>
          </View>
          <View className="filter-sheet__disclosure">
            <Text className="type-caption filter-sheet__status">
              已选 {count} 项；应用后会同时更新想去与其他观星点
            </Text>
            {limitedCapabilities.length ? (
              <>
                <Text className="type-label">当前能力限制</Text>
                {limitedCapabilities.map((item) => (
                  <Text className="type-caption" key={item.label}>
                    · {item.label}：{item.reason}
                  </Text>
                ))}
              </>
            ) : (
              <Text className="type-caption">
                {capabilities
                  ? "当前 18 项筛选均已绑定可追溯字段或当前观测条件。"
                  : "正在确认实时天气、驾车与天象筛选能力；未知值不会当成满足。"}
              </Text>
            )}
          </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
