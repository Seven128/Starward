import { Button, ScrollView, Text, View } from "@tarojs/components";
import { FILTER_OPTIONS, countAppliedFilters, type FilterCategoryId, type MapSceneData } from "@starward/miniapp-contracts";
import { useEffect, useState } from "react";
import { useAppStore } from "@/state/app-store";
import { SemanticIcon } from "./semantic-asset";
import { SelectedCardStar } from "./selected-card-star";
import "./filter-sheet.scss";

const CATEGORIES: ReadonlyArray<{ id: FilterCategoryId; label: string }> = [
  { id: "OBSERVATION", label: "观测条件" }, { id: "ARRIVAL", label: "到达方式" },
  { id: "FACILITIES", label: "设施配套" }, { id: "PLACE", label: "场地偏好" },
  { id: "FRESHNESS", label: "资料更新" },
];

export function FilterSheet({ capabilities, initialCategory = "OBSERVATION" }: {
  capabilities?: MapSceneData["filterCapabilities"]["byGroup"];
  initialCategory?: FilterCategoryId;
}) {
  const draft = useAppStore((state) => state.draftFilters);
  const toggle = useAppStore((state) => state.toggleDraftFilter);
  const clear = useAppStore((state) => state.clearDraftFilters);
  const cancel = useAppStore((state) => state.cancelFilters);
  const apply = useAppStore((state) => state.applyFilters);
  const [category, setCategory] = useState<FilterCategoryId>(initialCategory);
  const count = countAppliedFilters(draft);
  useEffect(() => setCategory(initialCategory), [initialCategory]);
  const selectedInCategory = (id: FilterCategoryId) => FILTER_OPTIONS.some((option) => option.category === id && draft[option.group].includes(option.id));
  const options = FILTER_OPTIONS.filter((option) => option.category === category);

  return <View className="filter-sheet-layer" data-control="spot-search-filter-overlay" onClick={cancel}>
    <View className="filter-sheet" role="region" aria-label="搜索筛选条件" onClick={(event) => event.stopPropagation()}>
      <View className="filter-sheet__handle" />
      <View className="filter-sheet__heading"><Text>筛选</Text><Button className="filter-sheet__close" ariaLabel="关闭并取消更改" onClick={cancel}><SemanticIcon name="close" /></Button></View>
      <View className="filter-sheet__layout">
        <View className="filter-sheet__categories">{CATEGORIES.map((item) => { const hasSelection = selectedInCategory(item.id); return <Button key={item.id} id={`filter-category-${item.id.toLowerCase()}`} className={`filter-sheet__category${category === item.id ? " filter-sheet__category--active" : ""}${hasSelection ? " filter-sheet__category--selected" : ""}`} ariaLabel={`${item.label}${hasSelection ? "，有已选条件" : ""}`} onClick={() => setCategory(item.id)}>{item.label}</Button>; })}</View>
        <ScrollView scrollY enhanced showScrollbar={false} className="filter-sheet__options"><View className="filter-sheet__grid">
          {options.map((option) => {
            const selected = draft[option.group].includes(option.id);
            const capability = capabilities?.[option.group];
            const unavailable = capability?.state === "UNAVAILABLE";
            return <Button key={option.id} className={`filter-option${selected ? " filter-option--selected" : ""}`} ariaLabel={`${option.label}${selected ? "，已选择" : "，未选择"}`} disabled={unavailable && !selected} onClick={() => toggle(option.id)}><Text>{option.label}</Text>{selected ? <SelectedCardStar /> : null}</Button>;
          })}
        </View></ScrollView>
      </View>
      <View className="filter-sheet__footer"><Button onClick={clear}>清空</Button><Button className="filter-sheet__apply" onClick={() => apply()}>确定<Text>{count}</Text></Button></View>
    </View>
  </View>;
}
