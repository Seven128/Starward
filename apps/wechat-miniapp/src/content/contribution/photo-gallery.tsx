import { Button, Image, Text, View } from "@tarojs/components";
import { useDidHide, useDidShow } from "@tarojs/taro";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NativeBackBoundary } from "@/components/native-back-boundary";
import { SpotImageViewer, type SpotViewerMedia } from "@/components/spot-image-viewer";
import { StatusPanel } from "@/components/status-panel";
import { useRedLightHandoff } from "@/components/red-light-handoff";
import { CONTRIBUTION_PHOTO_LABELS as labels, photoGroupEntries, type ContributionPhotoGroup } from "./photo-groups";
import "./photo-gallery.scss";

/** Read-only photo evidence and old → new comparison; callers own data and authorization. */
export function ContributionPhotoGallery({ groups, paths, failedIds, scope, name, onRetry, onImageError }: {
  groups: readonly ContributionPhotoGroup[]; paths: Readonly<Record<string, string>>;
  failedIds: readonly string[]; scope: string; name: string; onRetry(): void; onImageError(id: string): void;
}) {
  const entries = useMemo(() => photoGroupEntries(groups), [groups]);
  const identity = JSON.stringify([scope, entries]);
  const [visible, setVisible] = useState(true);
  const [viewer, setViewer] = useState<{ identity: string; index: number } | null>(null);
  const live = useRef<string | null>(identity);
  live.current = visible ? identity : null;
  const back = useRef<(() => void) | null>(null);
  const registerBack = useCallback((handler: (() => void) | null) => { back.current = handler; }, []);
  const handoff = useRedLightHandoff({ nativeBackBoundary: false, title: "照片可能较亮" });
  useDidHide(() => { setVisible(false); setViewer(null); });
  useDidShow(() => setVisible(true));
  useEffect(() => { handoff.cancel(); setViewer(null); }, [identity]);
  if (!visible) return null;
  const media: SpotViewerMedia[] = entries.map(entry => ({
    id: `${entry.kind}:${entry.side}:${entry.id}`, ...(paths[entry.id] ? { src: paths[entry.id]! } : {}),
    alt: labels[entry.kind], caption: `${labels[entry.kind]}${entry.side === "before" ? " · 原图" : entry.side === "after" ? " · 修改后" : ""}`,
    state: paths[entry.id] ? "ready" : failedIds.includes(entry.id) ? "error" : "loading",
  }));
  const index = viewer?.identity === identity ? viewer.index : null;
  let offset = 0;
  const photos = (ids: readonly string[], old: boolean, comparison: boolean) => {
    if (!ids.length) return <Text className="contribution-photo-none">无图片</Text>;
    return ids.map(id => {
      const position = offset++;
      const entry = entries[position]!;
      return <Button id={`spot-media-source-${position}`} key={`${entry.side}:${id}`}
        className={`contribution-frozen-media__photo focus-ring${comparison ? " contribution-photo-diff__photo" : ""}${old ? " contribution-photo-diff__old" : ""}`}
        ariaLabel={`查看${labels[entry.kind]}${old ? "原图" : comparison ? "修改后" : ""}第${ids.indexOf(id) + 1}张`}
        onClick={() => { void handoff.confirm("照片和查看器保留原始颜色，可能影响暗适应。").then(accepted => {
          if (accepted && live.current === identity) setViewer({ identity, index: position });
        }); }}>
        {paths[id] ? <><Image src={paths[id]!} mode="aspectFill" onError={() => onImageError(id)} />
          <Text className="contribution-frozen-media__red-label">{labels[entry.kind]}</Text></>
          : <Text>{failedIds.includes(id) ? "暂不可读" : "读取中"}</Text>}
        {old ? <Text className="contribution-photo-diff__old-mark" aria-hidden="true">⊘</Text> : null}
      </Button>;
    });
  };
  return <>
    {groups.map(group => <View className={`contribution-frozen-media${group.before ? " contribution-photo-diff" : ""}`} data-media-kind={group.kind} key={group.kind}>
      <Text className="type-label">{labels[group.kind]}</Text>
      {group.before ? <View className="contribution-photo-diff__line">
        <View className="contribution-photo-diff__side" ariaLabel="原照片">{photos(group.before, true, true)}</View>
        <Text className="contribution-photo-diff__arrow" aria-label="修改为">→</Text>
        <View className="contribution-photo-diff__side" ariaLabel="修改后的照片">{photos(group.after, false, true)}</View>
      </View> : <View className="contribution-frozen-media__list">{photos(group.after, false, false)}</View>}
    </View>)}
    {entries.some(entry => failedIds.includes(entry.id) && !paths[entry.id]) ? <StatusPanel state="ERROR" title="部分照片暂时无法读取" detail="其他照片和已填写内容仍保留，可重试读取。" recoveryLabel="重试照片" onRecover={onRetry} /> : null}
    {handoff.warning}
    <NativeBackBoundary active={index !== null || handoff.active} onBack={() => {
      if (handoff.active) handoff.cancel(); else if (back.current) back.current(); else setViewer(null);
    }} />
    {index !== null && media[index] ? <SpotImageViewer name={name} media={media} index={index}
      onIndexChange={next => setViewer({ identity, index: next })} onClose={() => setViewer(null)}
      onRetry={onRetry} onBackHandlerChange={registerBack} /> : null}
  </>;
}
