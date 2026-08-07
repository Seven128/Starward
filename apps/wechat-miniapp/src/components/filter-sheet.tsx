import { Button, ScrollView, Text, View } from "@tarojs/components";
import {
  FILTER_GROUPS,
  FILTER_OPTIONS,
  countAppliedFilters,
} from "@starward/miniapp-contracts";
import { useAppStore } from "@/state/app-store";
import { SoftButton } from "./soft-button";
import "./filter-sheet.scss";

export function FilterSheet({ avoidSystemTabBar = false }: { avoidSystemTabBar?: boolean }) {
  const draft = useAppStore((state) => state.draftFilters);
  const toggle = useAppStore((state) => state.toggleDraftFilter);
  const reset = useAppStore((state) => state.resetDraftFilters);
  const cancel = useAppStore((state) => state.cancelFilters);
  const apply = useAppStore((state) => state.applyFilters);
  const count = countAppliedFilters(draft);
  return (
    <View
      className={`sheet-backdrop${avoidSystemTabBar ? " sheet-backdrop--avoid-tabbar" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="筛选观星点"
    >
      <View className="filter-sheet theme-day">
        <View className="filter-sheet__handle" aria-hidden="true" />
        <View className="filter-sheet__header">
          <View>
            <Text className="type-page-title">筛选观星点</Text>
            <Text className="type-caption">
              27 个选项全部平铺 · 当前草稿 {count} 项
            </Text>
          </View>
          <SoftButton variant="ghost" label="取消筛选修改" onClick={cancel}>
            关闭
          </SoftButton>
        </View>
        <ScrollView
          scrollY
          className="filter-sheet__scroll"
          enhanced
          showScrollbar={false}
          aria-label="全部筛选条件"
        >
          {FILTER_GROUPS.map((group, index) => (
            <View className="filter-group" key={group.key}>
              {index === 0 ||
              FILTER_GROUPS[index - 1]?.section !== group.section ? (
                <Text className="filter-group__section type-section">
                  {group.section}
                </Text>
              ) : null}
              <Text className="filter-group__title type-label">
                {group.title} ·{" "}
                {group.mode === "CANCELABLE_SINGLE" ? "可取消单选" : "可多选"}
              </Text>
              <View className="filter-group__grid">
                {FILTER_OPTIONS.filter(
                  (option) => option.group === group.key,
                ).map((option) => {
                  const selected = draft[group.key].includes(option.id);
                  return (
                    <Button
                      className={`chip focus-ring${selected ? " chip--selected" : ""}`}
                      key={option.id}
                      aria-pressed={selected}
                      aria-label={`${option.label}，${selected ? "已选择" : "未选择"}`}
                      onClick={() => toggle(option.id)}
                    >
                      <Text>{option.label}</Text>
                    </Button>
                  );
                })}
              </View>
            </View>
          ))}
          <View className="filter-sheet__disclosure">
            <Text className="type-caption">
              光害等级、遮挡比例与光害方向是候选筛选语义；当前 Demo
              中未核验值不会被当作 0 或肯定事实。
            </Text>
          </View>
        </ScrollView>
        <View className="filter-sheet__footer safe-bottom">
          <SoftButton label="重置筛选草稿" onClick={reset}>
            重置
          </SoftButton>
          <SoftButton
            variant="primary"
            label={`应用筛选，共 ${count} 项`}
            onClick={apply}
          >
            应用筛选 · {count}
          </SoftButton>
        </View>
      </View>
    </View>
  );
}
