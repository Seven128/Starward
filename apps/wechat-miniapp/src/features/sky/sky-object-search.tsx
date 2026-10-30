import { ScrollView, Text, View } from "@tarojs/components";
import { SharedButton as Button } from "@/components/shared-button-press";
import Taro from "@tarojs/taro";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SkyStatusPanel as StatusPanel } from "@/features/sky/sky-status-panel";
import { SemanticIcon } from "@/components/semantic-asset";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { searchCelestialObjects } from "@/services/sky-celestial-client";
import { SKY_LUMINARY_CATALOG_VERSION } from "@starward/miniapp-contracts";
import { skyObjectKindLabel, type SkyObjectIdentity } from "./sky-object-picking";
import { SkySearchRow } from "./sky-search-row";
import { SkyControlledInput } from "./sky-controlled-input";

/** The retained search owns its text debounce and query cancellation; covering
 * or closing it revokes active work without losing the native scroll subtree. */
export function SkyObjectSearch({ children, footer, onSelect, query, onQueryChange, active = true }: {
  active?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  onSelect: (object: SkyObjectIdentity) => void;
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const [settledQuery, setSettledQuery] = useState(query.trim());
  // Native input can display the next value before React removes an old row.
  // Check the live text at commit so that row cannot select the wrong object.
  const currentQuery = useRef(query.trim());
  const updateQuery = (value: string) => {
    if (!active) return;
    currentQuery.current = value.trim();
    onQueryChange(value);
  };
  const trimmedQuery = query.trim();
  // Native scroll commands must change even when a new query returns to the
  // same text later. Keep the ScrollView itself stable for append and Back.
  const scrollIntent = useRef({query: trimmedQuery, revision: 0});
  if (scrollIntent.current.query !== trimmedQuery)
    scrollIntent.current = {query: trimmedQuery, revision: scrollIntent.current.revision + 1};
  const scrollAnchor = `sky-search-start-${scrollIntent.current.revision}`;
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setSettledQuery(trimmedQuery), 250);
    return () => clearTimeout(timer);
  }, [trimmedQuery, active]);
  return <View className="sky-object-search">
    <View className="sky-object-search__field">
    <SemanticIcon name="sky-search" />
    <SkyControlledInput active={active} className="sky-object-search__input" value={query} maxlength={80}
      ariaLabel="搜索天体名称或编号"
      placeholder="名称或编号，如织女星、M31" confirmType="search"
      onInput={event => updateQuery(event.detail.value)}
      onConfirm={event => {
        if (!active) return;
        // Native confirmation can arrive before the last input render commits.
        updateQuery(event.detail.value);
        setSettledQuery(event.detail.value.trim());
      }} />
    {query ? <Button pressVariant="icon" className="sky-object-search__clear focus-ring" aria-label="清空搜索"
      onClick={() => { updateQuery(""); setSettledQuery(""); }}><SemanticIcon name="sky-cancel" /></Button> : null}
    </View>
    <ScrollView scrollY enhanced showScrollbar={false} className="sky-search-scroll" scrollIntoView={scrollAnchor} scrollWithAnimation={false}>
    <View id={scrollAnchor} />
    {trimmedQuery ? <>
      {trimmedQuery === settledQuery
        ? <SkySearchResults active={active} key={settledQuery} query={settledQuery} onSelect={object => {
            if (!active || currentQuery.current !== settledQuery) return;
            void Taro.hideKeyboard().catch(() => undefined);
            onSelect(object);
          }} />
        : <View role="status" aria-live="polite" className="type-caption">正在查找…</View>}
    </> : children}
    {footer}
    </ScrollView>
  </View>;
}

function SkySearchResults({ query, onSelect, active }: {
  active: boolean;
  query: string;
  onSelect: (object: SkyObjectIdentity) => void;
}) {
  const result = useResourceQuery({
    queryKey: ["celestial-search", SKY_LUMINARY_CATALOG_VERSION, query],
    queryFn: searchCelestialObjects.bind(null, query),
    enabled: active,
    staleTime: 60_000,
    gcTime: 60_000,
  });
  const retry = () => { if (active) void result.refetch(); };
  if (result.isPending) return <View role="status" aria-live="polite" className="type-caption">正在查找…</View>;
  if (result.isError || result.data.dataState === "UNAVAILABLE" || result.data.dataState === "EXPIRED")
    return <StatusPanel state="ERROR" detail="搜索失败，请重试"
      recoveryLabel="重试" onRecover={retry} />;
  const { results, truncated, unavailableCatalogs } = result.data.data;
  const partial = result.data.dataState === "PARTIAL" || unavailableCatalogs.length > 0;
  const stale = Boolean(result.refreshError) || result.data.dataState === "STALE_USABLE";
  return <View className="sky-object-search__results" role="list" aria-label="天体搜索结果">
    {partial ? <StatusPanel state="PARTIAL" detail="部分星表未加载，结果可能不全"
      recoveryLabel="重试" onRecover={retry} /> : null}
    {stale ? <StatusPanel state="STALE" detail="更新失败，显示上次结果"
      recoveryLabel="重试" onRecover={retry} /> : null}
    <View role="status" aria-live="polite" className="sky-search-hint">
      {results.length ? `${results.length}${truncated ? "+" : ""} 个结果`
        : partial || stale ? "现有结果中未找到，可重试或换个名称"
          : "未找到，试试别名或编号"}
    </View>
    {results.map((object, index) => <SkySearchRow key={object.reference} name={object.displayName}
      kind={skyObjectKindLabel(object.kind)} ordinal={index} onSelect={() => onSelect(object)} />)}
    {truncated ? <Text className="sky-search-hint">结果较多，可补全名称或编号</Text> : null}
  </View>;
}
