import { Button, Image, Text, View } from "@tarojs/components";
import { useDidHide, useDidShow } from "@tarojs/taro";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONTRIBUTION_MEDIA_KINDS, type ContributionSubmission, type ContributionUploadId } from "@starward/miniapp-contracts";
import { NativeBackBoundary } from "@/components/native-back-boundary";
import { SpotImageViewer, type SpotViewerMedia } from "@/components/spot-image-viewer";
import { StatusPanel } from "@/components/status-panel";
import { useRedLightHandoff } from "@/components/red-light-handoff";
import { currentDraftUserId, getContributionMedia, getSpotContributionMedia, getSpotSite } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { contributionFrozenAttempt, contributionRecordIdentity, contributionRecordPhotos } from "./contribution-record-model";
import { loadAvailableMediaPreviews } from "./media-preview";

const labels = { site: "现场照片", parking: "停车照片", toilet: "洗手间照片" };
const changes = { added: "本次新增", removed: "本次移除", retained: "" };

/** One read-only media consumer for record lists and submitted standalone editors. */
export function ContributionRecordMedia({ item }: { item: ContributionSubmission }) {
  const accountOwner = useAppStore(state => state.accountOwnerId);
  const owner = currentDraftUserId();
  const photos = useMemo(() => contributionRecordPhotos(item), [item]);
  const scope = JSON.stringify([owner, item.submissionId, contributionFrozenAttempt(item)?.attemptId, photos]);
  const [visible, setVisible] = useState(true);
  const [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState<{ scope: string; paths: Record<string, string>; failed: string[] }>({ scope: "", paths: {}, failed: [] });
  const [viewer, setViewer] = useState<{ scope: string; index: number } | null>(null);
  const back = useRef<(() => void) | null>(null);
  const registerBack = useCallback((handler: (() => void) | null) => { back.current = handler; }, []);
  const authorized = Boolean(owner && owner === accountOwner);
  const liveScope = useRef<string | null>(null);
  liveScope.current = authorized && visible ? scope : null;
  const handoff = useRedLightHandoff({ nativeBackBoundary: false, title: "照片可能较亮" });
  const paths = loaded.scope === scope ? loaded.paths : {};
  const failed = loaded.scope === scope ? loaded.failed : [];
  useDidHide(() => { setVisible(false); setViewer(null); });
  useDidShow(() => setVisible(true));
  useEffect(() => { handoff.cancel(); }, [scope]);
  useEffect(() => {
    if (!visible || !authorized || !owner || !photos.length) return;
    const controller = new AbortController();
    const missing = [...new Map(photos.filter(photo => !paths[photo.id]).map(photo => [photo.id, photo])).values()];
    // Only non-upload legacy references need the public site's identity catalogue.
    let site: ReturnType<typeof getSpotSite> | undefined;
    void loadAvailableMediaPreviews(missing.map(photo => photo.id), async id => {
      const photo = missing.find(entry => entry.id === id)!;
      if (photo.owned) {
        const response = await getContributionMedia(item.submissionId, id as ContributionUploadId, controller.signal, owner);
        return `data:${response.data.mimeType};base64,${response.data.dataBase64}`;
      }
      if (!item.spotId) throw new Error("frozen_photo_unavailable");
      if (id.startsWith("upload:")) {
        const response = await getSpotContributionMedia(item.spotId, id as ContributionUploadId, controller.signal);
        return `data:${response.data.mimeType};base64,${response.data.dataBase64}`;
      }
      site ??= getSpotSite(item.spotId, controller.signal);
      const media = (await site).data.media.find(entry => entry.id === id);
      const path = media?.localPath || media?.thumbnailPath;
      if (!path) throw new Error("frozen_photo_unavailable");
      return path;
    }).then(result => {
      if (controller.signal.aborted || currentDraftUserId() !== owner) return;
      setLoaded({ scope, paths: { ...paths, ...result.paths }, failed: result.failedIds });
    });
    return () => controller.abort();
    // Completion does not trigger a new fetch. Retry only the remaining failures.
  }, [scope, visible, authorized, retry]);
  if (!authorized || !visible || !photos.length) return null;
  const media: SpotViewerMedia[] = photos.map(photo => ({
    id: `${photo.kind}:${photo.id}`, ...(paths[photo.id] ? { src: paths[photo.id]! } : {}), alt: labels[photo.kind],
    caption: [labels[photo.kind], changes[photo.change]].filter(Boolean).join(" · "),
    state: paths[photo.id] ? "ready" : failed.includes(photo.id) ? "error" : "loading",
  }));
  const index = viewer?.scope === scope ? viewer.index : null;
  return <>
    {CONTRIBUTION_MEDIA_KINDS.map(kind => photos.some(photo => photo.kind === kind) ? <View className="contribution-frozen-media" data-media-kind={kind} key={kind}>
      <Text className="type-label">{labels[kind]}</Text>
      <View className="contribution-frozen-media__list">{photos.map((photo, photoIndex) => photo.kind === kind ? <Button
        id={`spot-media-source-${photoIndex}`} className="contribution-frozen-media__photo focus-ring" key={photo.id}
        aria-label={`查看${labels[kind]}第${photos.slice(0, photoIndex + 1).filter(entry => entry.kind === kind).length}张${changes[photo.change] ? `，${changes[photo.change]}` : ""}`}
        onClick={() => { void handoff.confirm("照片和查看器保留原始颜色，可能影响暗适应。").then(accepted => {
          if (accepted && liveScope.current === scope) setViewer({ scope, index: photoIndex });
        }); }}>
        {paths[photo.id] ? <><Image src={paths[photo.id]!} mode="aspectFill" onError={() => setLoaded(current => {
          if (current.scope !== scope) return current;
          const remaining = { ...current.paths }; delete remaining[photo.id];
          return { ...current, paths: remaining, failed: [...new Set([...current.failed, photo.id])] };
        })} /><Text className="contribution-frozen-media__red-label">{labels[kind]}</Text></> : <Text>{failed.includes(photo.id) ? "暂不可读" : "读取中"}</Text>}
        {changes[photo.change] ? <Text className="contribution-frozen-media__change">{changes[photo.change]}</Text> : null}
      </Button> : null)}</View>
    </View> : null)}
    {failed.length ? <StatusPanel state="ERROR" detail="部分提交照片暂时无法读取，其他照片仍可查看。" recoveryLabel="重试照片" onRecover={() => setRetry(value => value + 1)} /> : null}
    {handoff.warning}
    <NativeBackBoundary active={index !== null || handoff.active} onBack={() => {
      if (handoff.active) handoff.cancel(); else if (back.current) back.current(); else setViewer(null);
    }} />
    {index !== null && media[index] ? <SpotImageViewer name={contributionRecordIdentity(item).name} media={media} index={index}
      onIndexChange={next => setViewer({ scope, index: next })} onClose={() => setViewer(null)}
      onRetry={() => setRetry(value => value + 1)} onBackHandlerChange={registerBack} /> : null}
  </>;
}
