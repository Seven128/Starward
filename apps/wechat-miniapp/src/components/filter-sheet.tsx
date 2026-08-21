import { Button, ScrollView, Text, View } from "@tarojs/components";
import {
  FILTER_GROUPS,
  FILTER_OPTIONS,
  countAppliedFilters,
} from "@starward/miniapp-contracts";
import { useAppStore } from "@/state/app-store";
import { SoftButton } from "./soft-button";
import "./filter-sheet.scss";

/** The Finder-owned editor. It is a bounded surface inside SourceLift. */
export function FilterSheet({
  onClose,
}: {
  avoidSystemTabBar?: boolean;
  onClose?: () => void;
}) {
  const draft = useAppStore((state) => state.draftFilters);
  const toggle = useAppStore((state) => state.toggleDraftFilter);
  const reset = useAppStore((state) => state.resetDraftFilters);
  const cancel = useAppStore((state) => state.cancelFilters);
  const apply = useAppStore((state) => state.applyFilters);
  const count = countAppliedFilters(draft);
  const close = () => {
    cancel();
    onClose?.();
  };

  return (
    <View
      className="filter-sheet"
      data-od-id="spot-finder-filter-overlay"
      role="region"
      aria-label="Finder 筛选条件"
    >
      <View className="filter-sheet__header">
        <View>
          <Text className="type-label">筛选条件</Text>
          <Text className="type-caption">
            18 项终端筛选 · 首层 10 · 进阶 8 · 草稿 {count} 项
          </Text>
        </View>
        <View data-od-id="spot-finder-filter-revert">
          <SoftButton variant="ghost" label="撤销筛选草稿" onClick={close}>
            撤销
          </SoftButton>
        </View>
      </View>
      <ScrollView
        scrollY
        className="filter-sheet__scroll"
        enhanced
        showScrollbar={false}
        aria-label="18 项筛选条件"
      >
        {(["FIRST_LEVEL", "ADVANCED"] as const).map((tier) => {
          const groups = FILTER_GROUPS.filter(
            (group) =>
              FILTER_OPTIONS.find((option) => option.group === group.key)
                ?.tier === tier,
          );
          return (
            <View
              className="filter-sheet__tier"
              key={tier}
              data-od-id={
                tier === "FIRST_LEVEL"
                  ? "spot-finder-filter-first-level"
                  : "spot-finder-filter-advanced"
              }
            >
              <Text className="type-section">
                {tier === "FIRST_LEVEL" ? "首层筛选" : "进阶筛选"}
              </Text>
              <View className="filter-sheet__grid">
                {groups.map((group) => {
                  const option = FILTER_OPTIONS.find(
                    (item) => item.group === group.key,
                  );
                  if (!option) return null;
                  const selected = draft[group.key].includes(option.id);
                  return (
                    <Button
                      className={`filter-option focus-ring${selected ? " filter-option--selected" : ""}`}
                      data-od-id="spot-finder-filter-choice"
                      key={option.id}
                      aria-pressed={selected}
                      aria-label={`${option.label}，${selected ? "已选择" : "未选择"}`}
                      onClick={() => toggle(option.id)}
                    >
                      <View className="filter-option__star" aria-hidden="true">
                        <Text>★</Text>
                      </View>
                      <Text>{option.label}</Text>
                    </Button>
                  );
                })}
              </View>
            </View>
          );
        })}
        <View className="filter-sheet__disclosure">
          <Text className="type-caption">
            未接入实时天气、驾车或天象供应商的条件会明确显示为暂无匹配，不会把未知值当成满足。
          </Text>
        </View>
      </ScrollView>
      <View className="filter-sheet__footer safe-bottom">
        <SoftButton label="重置筛选草稿" onClick={reset}>
          重置
        </SoftButton>
        <View data-od-id="spot-finder-filter-commit">
          <SoftButton
            variant="primary"
            label={`应用筛选，共 ${count} 项`}
            onClick={() => {
              apply();
              onClose?.();
            }}
          >
            应用筛选 · {count}
          </SoftButton>
        </View>
      </View>
    </View>
  );
}
