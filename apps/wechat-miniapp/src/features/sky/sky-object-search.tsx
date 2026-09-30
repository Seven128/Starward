import { Button, Input, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { searchCelestialObjects } from "@/services/api-client";
import { SKY_LUMINARY_CATALOG_VERSION } from "@starward/miniapp-contracts";
import { skyObjectKindLabel, type SkyObjectIdentity } from "./sky-object-picking";

/** Mounted only while the visible page discloses its object list. Query's
 * subscription owns cancellation, including the debounce gap after an edit. */
export function SkyObjectSearch({ children, onSelect }: {
  children: ReactNode;
  onSelect: (object: SkyObjectIdentity) => void;
}) {
  const [query, setQuery] = useState("");
  const [settledQuery, setSettledQuery] = useState("");
  // Native input can display the next value before React removes an old row.
  // Check the live text at commit so that row cannot select the wrong object.
  const currentQuery = useRef("");
  const updateQuery = (value: string) => {
    currentQuery.current = value.trim();
    setQuery(value);
  };
  const trimmedQuery = query.trim();
  useEffect(() => {
    const timer = setTimeout(() => setSettledQuery(trimmedQuery), 250);
    return () => clearTimeout(timer);
  }, [trimmedQuery]);
  return <View className="sky-object-search">
    <Text className="type-label">搜索日月、行星、恒星与深空天体</Text>
    <Input className="field sky-object-search__input" value={query} maxlength={80}
      ariaLabel="搜索日月、行星、恒星与深空天体，输入名称或目录编号"
      placeholder="名称或编号，如织女星、M31、SAO 1" confirmType="search"
      onInput={event => updateQuery(event.detail.value)}
      onConfirm={event => {
        // Native confirmation can arrive before the last input render commits.
        updateQuery(event.detail.value);
        setSettledQuery(event.detail.value.trim());
      }} />
    {trimmedQuery ? <>
      <Text className="type-caption">目录匹配不代表在所选地点与时刻可见。</Text>
      {trimmedQuery === settledQuery
        ? <SkySearchResults key={settledQuery} query={settledQuery} onSelect={object => {
            if (currentQuery.current !== settledQuery) return;
            void Taro.hideKeyboard().catch(() => undefined);
            onSelect(object);
          }} />
        : <View role="status" aria-live="polite" className="type-caption">正在查找…</View>}
    </> : children}
  </View>;
}

function SkySearchResults({ query, onSelect }: {
  query: string;
  onSelect: (object: SkyObjectIdentity) => void;
}) {
  const result = useResourceQuery({
    queryKey: ["celestial-search", SKY_LUMINARY_CATALOG_VERSION, query],
    queryFn: signal => searchCelestialObjects(query, signal),
    staleTime: 60_000,
    gcTime: 60_000,
  });
  const retry = () => void result.refetch();
  if (result.isPending) return <View role="status" aria-live="polite" className="type-caption">正在查找…</View>;
  if (result.isError || result.data.dataState === "UNAVAILABLE" || result.data.dataState === "EXPIRED")
    return <StatusPanel state="ERROR" detail="天体搜索暂不可用，请重试或修改关键词。"
      recoveryLabel="重试搜索" onRecover={retry} />;
  const { results, truncated, unavailableCatalogs } = result.data.data;
  const partial = result.data.dataState === "PARTIAL" || unavailableCatalogs.length > 0;
  const stale = Boolean(result.refreshError) || result.data.dataState === "STALE_USABLE";
  return <View className="sky-object-search__results" role="list" aria-label="天体搜索结果">
    {partial ? <StatusPanel state="PARTIAL" detail="部分目录暂不可用，当前结果不完整。"
      recoveryLabel="重试搜索" onRecover={retry} /> : null}
    {stale ? <StatusPanel state="STALE" detail="搜索结果尚未更新，暂时显示上次结果。"
      recoveryLabel="重试搜索" onRecover={retry} /> : null}
    <View role="status" aria-live="polite" className="type-caption">
      {results.length ? `找到 ${results.length} 个${truncated ? "以上" : ""}匹配天体`
        : partial || stale ? "当前可用结果中没有匹配项，可重试或修改关键词。"
          : "已接入的目录中没有匹配项，可尝试其他别名或目录编号。"}
    </View>
    {results.map(object => <Button key={object.reference} className="sky-catalog-row sky-object-search__result"
      ariaLabel={`${object.displayName}，${object.reference.replace(":", " ")}，查看资料`}
      onClick={() => onSelect(object)}>
      <Text>{object.displayName}</Text>
      <Text>{skyObjectKindLabel(object.kind)} · {object.reference.replace(":", " ")} · 匹配 {object.matchedAlias}</Text>
    </Button>)}
    {truncated ? <Text className="type-caption">仅显示前 {results.length} 项，请补全名称或编号缩小范围。</Text> : null}
  </View>;
}
