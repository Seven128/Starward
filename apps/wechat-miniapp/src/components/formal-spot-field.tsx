import { Button, Input, Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import { useResourceQuery } from "../hooks/use-resource-query";
import { getSpotOverview, searchPlaces } from "../services/api-client";
import { StatusPanel } from "./status-panel";

export function FormalSpotField({ value, knownSpot, disabled, contextId, onChange, id }: {
  id?: string;
  knownSpot?: { spotId: string; name: string };
  value: string; disabled: boolean; contextId?: string | undefined; onChange: (spotId: string, spotName: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selection, setSelection] = useState<{ id: string; name: string } | null>(null);
  const savedSpot = useResourceQuery({
    queryKey: ["formal-spot-identity", value, contextId],
    queryFn: (signal) => getSpotOverview(value, contextId!, signal),
    enabled: Boolean(value && contextId && selection?.id !== value),
  });
  const savedIdentity = savedSpot.data?.data.spot;
  const selectedName = selection?.id === value ? selection.name
    : savedIdentity?.spotId === value ? savedIdentity.name
      : knownSpot?.spotId === value ? knownSpot.name : null;
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const result = useResourceQuery({
    queryKey: ["formal-spot-field", debouncedQuery],
    queryFn: (signal) => searchPlaces(debouncedQuery, signal),
    enabled: !disabled && Boolean(debouncedQuery),
    staleTime: 60_000,
  });
  const currentResults = query.trim() === debouncedQuery;
  return (
    <View className="form-group import-field-group" data-od-id={id}>
      <Text className="type-label">正式观星点</Text>
      <Text className="type-caption">
        {value ? selectedName ? `已选择：${selectedName}` : "已保留地点关联，名称暂不可用" : "搜索并选择内容实际对应的地点"}
      </Text>
      <Input className="field" value={query} disabled={disabled} maxlength={100}
        ariaLabel="搜索正式观星点" placeholder="输入地点名称" onInput={(event) => setQuery(event.detail.value)} />
      {!disabled && query.trim() && currentResults && result.refreshError ? (
        <StatusPanel state="STALE" detail="搜索结果尚未更新，暂时显示上次结果。原有关联已保留。"
          recoveryLabel="重试搜索" onRecover={() => void result.refetch()} />
      ) : null}
      {!disabled && query.trim() && currentResults ? (
        result.isError ? <StatusPanel state="ERROR" detail="地点搜索暂不可用，原有关联已保留。" recoveryLabel="重试搜索" onRecover={() => void result.refetch()} />
          : result.isPending ? <Text className="type-caption">正在查找正式观星点…</Text>
            : result.data.data.formalSpots.length ? result.data.data.formalSpots.map((spot) => (
              <Button compileMode key={spot.spotId} className="soft-button focus-ring" ariaLabel={`选择${spot.name}`} aria-pressed={value === spot.spotId}
                onClick={() => { setSelection({ id: spot.spotId, name: spot.name }); onChange(spot.spotId, spot.name); setQuery(""); }}>
                {spot.name}
              </Button>
            )) : <Text className="type-caption">没有找到对应的正式观星点，可修改关键词或建立地点提议。</Text>
      ) : null}
    </View>
  );
}
