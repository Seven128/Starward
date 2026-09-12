import { Button, Input, ScrollView, Text, View } from "@tarojs/components";
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
  const setDrivingRange = useAppStore((state) => state.setDraftDrivingRange);
  const clear = useAppStore((state) => state.clearDraftFilters);
  const cancel = useAppStore((state) => state.cancelFilters);
  const apply = useAppStore((state) => state.applyFilters);
  const [category, setCategory] = useState<FilterCategoryId>(initialCategory);
  const [rangeValue, setRangeValue] = useState(() => String(draft.drivingRange.mode === "TIME" ? draft.drivingRange.maxMinutes : draft.drivingRange.maxDistanceKm));
  const numericRange = Number(rangeValue);
  const rangeValid = Number.isInteger(numericRange) && (draft.drivingRange.mode === "TIME" ? numericRange >= 30 && numericRange <= 360 : numericRange >= 1 && numericRange <= 1000);
  const count = countAppliedFilters(draft);

  useEffect(() => setRangeValue(String(draft.drivingRange.mode === "TIME" ? draft.drivingRange.maxMinutes : draft.drivingRange.maxDistanceKm)), [draft.drivingRange]);
  useEffect(() => setCategory(initialCategory), [initialCategory]);
  const setMode = (mode: "TIME" | "DISTANCE") => setDrivingRange({ ...draft.drivingRange, mode });
  const commitRange = () => {
    if (!rangeValid) return;
    setDrivingRange(draft.drivingRange.mode === "TIME" ? { ...draft.drivingRange, maxMinutes: numericRange } : { ...draft.drivingRange, maxDistanceKm: numericRange });
  };
  const currentRange = () => draft.drivingRange.mode === "TIME"
    ? { ...draft.drivingRange, maxMinutes: numericRange }
    : { ...draft.drivingRange, maxDistanceKm: numericRange };
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
            if (option.id === "distanceDriveTime") return <View key={option.id} className="drive-config" data-enabled={selected}>
              <Button id="filter-option-distance-drive-time" className={`filter-option${selected ? " filter-option--selected" : ""}`} ariaLabel={`驾车范围${selected ? "，已选择" : "，未选择"}`} onClick={() => toggle(option.id)}><Text>驾车范围</Text>{selected ? <SelectedCardStar /> : null}</Button>
              <View className="drive-mode" role="group" aria-label="驾车筛选依据"><Button id="drive-mode-time" className={draft.drivingRange.mode === "TIME" ? "drive-mode--active" : ""} ariaLabel={`时间${draft.drivingRange.mode === "TIME" ? "，已选择" : ""}`} onClick={() => setMode("TIME")}>时间</Button><Button id="drive-mode-distance" className={draft.drivingRange.mode === "DISTANCE" ? "drive-mode--active" : ""} ariaLabel={`距离${draft.drivingRange.mode === "DISTANCE" ? "，已选择" : ""}`} onClick={() => setMode("DISTANCE")}>距离</Button></View>
              <View className="drive-input-row"><Input id="drive-range-value" className="drive-input" type="number" value={rangeValue} aria-label={draft.drivingRange.mode === "TIME" ? "驾车时长分钟数" : "驾车距离公里数"} onInput={(event) => setRangeValue(event.detail.value)} onBlur={commitRange} /><Text>{draft.drivingRange.mode === "TIME" ? "分钟以内" : "公里以内"}</Text></View>
              {!rangeValid ? <Text className="drive-error">{draft.drivingRange.mode === "TIME" ? "请输入30—360之间的整数" : "请输入1—1000之间的整数"}</Text> : null}
              {unavailable ? <Text className="filter-option__reason">{capability.reason}</Text> : null}
            </View>;
            return <Button key={option.id} className={`filter-option${selected ? " filter-option--selected" : ""}`} ariaLabel={`${option.label}${selected ? "，已选择" : "，未选择"}`} disabled={unavailable && !selected} onClick={() => toggle(option.id)}><Text>{option.label}</Text>{selected ? <SelectedCardStar /> : null}</Button>;
          })}
        </View></ScrollView>
      </View>
      <View className="filter-sheet__footer"><Button onClick={clear}>清空</Button><Button className="filter-sheet__apply" disabled={!rangeValid} onClick={() => apply(currentRange())}>确定<Text>{count}</Text></Button></View>
    </View>
  </View>;
}
