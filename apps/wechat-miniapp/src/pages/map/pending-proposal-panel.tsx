import { Button, Image, ScrollView, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ContributionSubmission } from "@starward/miniapp-contracts";
import { SemanticIcon } from "@/components/semantic-asset";
import { SpotImageViewer, type SpotViewerMedia } from "@/components/spot-image-viewer";
import { useSpotMediaGalleryPosition } from "@/components/spot-media-gallery-position";
import { useHiddenNativeScrollbar } from "@/components/use-hidden-native-scrollbar";
import { currentDraftUserId, getContributionMedia } from "@/services/api-client";
import type { SpotPanelExtent, SpotPanelPhase } from "./spot-panel";
import { pendingProposalPanelValues } from "./pending-proposal-model";

export function PendingProposalPanel({ submission, variant = "PENDING", extent, phase, onExtent, onClose, onCloud, onEdit,
  onHandleTouchStart, onHandleTouchMove, onHandleTouchEnd, onHandleTouchCancel, onViewerBackHandlerChange }: {
  submission: ContributionSubmission;
  variant?: "DRAFT" | "PENDING";
  extent: SpotPanelExtent;
  phase: SpotPanelPhase;
  onExtent: (extent: SpotPanelExtent) => void;
  onClose: () => void;
  onCloud?: () => void;
  onEdit?: () => void;
  onHandleTouchStart: (event: unknown) => void;
  onHandleTouchMove: (event: unknown) => void;
  onHandleTouchEnd: (event?: unknown) => void;
  onHandleTouchCancel: () => void;
  onViewerBackHandlerChange?: (handler: (() => void) | null) => void;
}) {
  const model = pendingProposalPanelValues(submission);
  const draft = variant === "DRAFT";
  const [mediaState, setMediaState] = useState<Record<string, { state: "loading" | "error" | "ready"; src?: string }>>({});
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [mediaWindowStart, setMediaWindowStart] = useState(0);
  const mediaRequests = useRef(new Map<string, AbortController>());
  const mediaStateRef = useRef(mediaState);
  mediaStateRef.current = mediaState;
  const owner = currentDraftUserId();
  const mediaKey = model.media.map(item => item.uploadId).join("|");
  const mediaScope = `${owner ?? "none"}:${submission.submissionId}:${mediaKey}`;
  const galleryPosition = useSpotMediaGalleryPosition(mediaScope);
  useHiddenNativeScrollbar("spot-proposal-scroll", extent !== "small", `${mediaScope}:${extent}`);
  useHiddenNativeScrollbar("spot-proposal-media-strip", extent === "large" && model.media.length > 1, mediaScope);
  const leadMedia = model.media[0];
  const handleInDocument = extent === "large" && Boolean(leadMedia);
  const panelHandle = <View className={`spot-panel__handle-band${handleInDocument ? " spot-panel__handle-band--document" : ""}`}>
    <Button className="spot-panel__handle focus-ring" data-control="map-spot-panel-handle"
      ariaLabel={`拖动调整${draft ? "草稿" : "审核中"}观星点信息面板大小`}
      onTouchStart={onHandleTouchStart} onTouchMove={onHandleTouchMove}
      onTouchEnd={onHandleTouchEnd} onTouchCancel={onHandleTouchCancel}>
      <View className="spot-panel__handle-bar" aria-hidden="true" />
    </Button>
    <View className="spot-panel__extent-actions" role="group" ariaLabel={`调整或关闭${draft ? "草稿" : "审核中"}观星点信息面板`}>
      <Button className="spot-panel__extent-button" disabled={extent === "small"}
        ariaLabel={extent === "large" ? "收起为中档面板" : "收起为小档面板"}
        onClick={() => onExtent(extent === "large" ? "medium" : "small")}><SemanticIcon name="chevron-down" /></Button>
      <Button className="spot-panel__extent-button" disabled={extent === "large"}
        ariaLabel={extent === "small" ? "展开为中档面板" : "展开为大档面板"}
        onClick={() => onExtent(extent === "small" ? "medium" : "large")}><SemanticIcon name="chevron-up" /></Button>
      <Button className="spot-panel__extent-button spot-panel__extent-button--close" ariaLabel={`关闭${draft ? "草稿" : "审核中"}观星点信息面板`}
        onClick={onClose}><SemanticIcon name="close" /></Button>
    </View>
  </View>;
  const loadMedia = useCallback((index: number, retry = false) => {
    const item = model.media[index];
    if (!item) return;
    const id = item.uploadId;
    if (mediaRequests.current.has(id) || (!retry && mediaStateRef.current[id]?.state === "ready")) return;
    if (!owner) { setMediaState(previous => ({ ...previous, [id]: { state: "error" } })); return; }
    const controller = new AbortController();
    mediaRequests.current.set(id, controller);
    setMediaState(previous => ({ ...previous, [id]: { state: "loading" } }));
    void getContributionMedia(submission.submissionId, id, controller.signal, owner)
      .then((response) => {
        if (!controller.signal.aborted) setMediaState(previous => ({ ...previous, [id]: { state: "ready", src: `data:${response.data.mimeType};base64,${response.data.dataBase64}` } }));
      })
      .catch(() => {
        if (!controller.signal.aborted) setMediaState(previous => ({ ...previous, [id]: { state: "error" } }));
      })
      .finally(() => { if (mediaRequests.current.get(id) === controller) mediaRequests.current.delete(id); });
  }, [mediaScope]);
  useEffect(() => {
    mediaRequests.current.forEach(controller => controller.abort());
    mediaRequests.current.clear();
    mediaStateRef.current = {};
    setMediaState({});
    setViewerIndex(null);
    setMediaWindowStart(0);
    return () => { mediaRequests.current.forEach(controller => controller.abort()); mediaRequests.current.clear(); };
  }, [mediaScope]);
  useEffect(() => { if (leadMedia) loadMedia(0); }, [leadMedia?.uploadId, loadMedia]);
  useEffect(() => {
    if (extent !== "large") return;
    for (let index = mediaWindowStart; index < Math.min(model.media.length, mediaWindowStart + 3); index++) loadMedia(index);
  }, [extent, mediaWindowStart, mediaKey, loadMedia]);
  useEffect(() => {
    if (viewerIndex === null) return;
    loadMedia(viewerIndex);
    if (viewerIndex + 1 < model.media.length) loadMedia(viewerIndex + 1);
  }, [viewerIndex, mediaKey, loadMedia]);
  const viewerMedia: SpotViewerMedia[] = model.media.map(item => ({
    id: item.uploadId,
    ...(mediaState[item.uploadId]?.src ? { src: mediaState[item.uploadId]!.src } : {}),
    alt: item.label,
    caption: item.label,
    state: mediaState[item.uploadId]?.state ?? "loading",
  }));
  return <View
    id="spot-information-panel"
    className={`spot-panel spot-panel--proposal spot-panel--${extent}${phase === "closing" ? " spot-panel--closing" : ""}${leadMedia ? " spot-panel--with-media" : ""}`}
    data-control="map-pending-proposal-panel"
    data-proposal-id={submission.submissionId}
    data-extent={extent}
    role="region"
    ariaLabel={`${model.name}${draft ? "草稿" : "审核中提案"}信息面板`}
  >
    <View className="spot-panel__snap-measures" aria-hidden="true">
      <View className="spot-panel__snap-small" />
      <View className="spot-panel__snap-medium" />
      <View className="spot-panel__snap-large" />
    </View>
    {!handleInDocument ? panelHandle : null}
    <View className="spot-panel__scroll-frame">
      <ScrollView id="spot-proposal-scroll" className="spot-panel__scroll" scrollY={extent !== "small"} type="custom" enhanced showScrollbar={false}
        ariaLabel={`${draft ? "草稿" : "审核中"}观星点资料`}>
        {leadMedia ? <View className="spot-panel__proposal-media" data-control="spot-media-gallery" ariaLabel={`${model.name}提交照片，共${model.media.length}张`}>
          <ScrollView id="spot-proposal-media-strip" className="spot-panel__media-strip" scrollX={model.media.length > 1} scrollLeft={galleryPosition.returnLeft} enhanced showScrollbar={false}
            ariaLabel={`${model.name}提交照片`}
            onScroll={(event) => {
              const width = Taro.getWindowInfo().windowWidth || 390;
              galleryPosition.onScroll(event);
              const start = Math.floor(event.detail.scrollLeft / (width * .68 + 8));
              if (Number.isFinite(start)) setMediaWindowStart(Math.max(0, Math.min(model.media.length - 1, start)));
            }}>
            <View className="spot-panel__media-track">
              {model.media.map((item, index) => {
                const photo = mediaState[item.uploadId];
                return <Button id={`spot-media-source-${index}`} className="spot-panel__media-slide" key={item.uploadId}
                  ariaLabel={`查看${item.label} ${index + 1}，共 ${model.media.length} 张`}
                  onClick={() => { galleryPosition.remember(); setViewerIndex(index); loadMedia(index, photo?.state === "error"); }}>
                  {photo?.state === "ready" && photo.src
                    ? <Image className="spot-panel__media-image" src={photo.src} mode="aspectFill" lazyLoad ariaLabel={item.label} />
                    : <View className="spot-panel__proposal-media-placeholder"><Text>{item.label}</Text><Text>{photo?.state === "error" ? "照片暂时无法读取" : "正在读取照片…"}</Text></View>}
                  <Text className="spot-panel__media-caption">{index + 1} / {model.media.length}</Text>
                </Button>;
              })}
            </View>
          </ScrollView>
        </View> : null}
        {handleInDocument ? panelHandle : null}
        <View className="spot-panel__identity">
          <View className="spot-panel__proposal-title-row">
            <Text className="spot-panel__title">{model.name}</Text>
            <Text className="spot-panel__proposal-status">{draft ? "草稿" : "审核中"}</Text>
          </View>
          <Text className="spot-panel__address type-caption">{model.address}</Text>
        </View>
        <View className="spot-panel__section" ariaLabel="提交资料">
          <View className="spot-panel__block">
            <Text className="type-label">开放信息</Text>
            <View className="spot-panel__proposal-pair">
              <View className="spot-panel__proposal-pair-item"><Text className="spot-panel__proposal-pair-label type-secondary">开放状态</Text><Text className="type-body">{model.opening[0]}</Text></View>
              <View className="spot-panel__proposal-pair-item"><Text className="spot-panel__proposal-pair-label type-secondary">开放时段</Text><Text className="type-body">{model.opening[1]}</Text></View>
            </View>
          </View>
          <View className="spot-panel__block">
            <Text className="type-label">到达与安全</Text>
            <View className="spot-panel__proposal-pair">
              <View className="spot-panel__proposal-pair-item"><Text className="spot-panel__proposal-pair-label type-secondary">合法进入</Text><Text className="type-body">{model.access[0]}</Text></View>
              <View className="spot-panel__proposal-pair-item"><Text className="spot-panel__proposal-pair-label type-secondary">夜间安全</Text><Text className="type-body">{model.safety}</Text></View>
            </View>
            {model.access[1] ? <Text className="type-caption">{model.access[1]}</Text> : null}
            {model.road ? <Text className="type-caption">{model.road}</Text> : null}
          </View>
          <View className="spot-panel__block">
            <Text className="type-label">设施</Text>
            <View className="spot-panel__facilities">{model.facilities.map(([label, state, note]) =>
              <View className={`spot-panel__facility${note ? " spot-panel__facility--described" : ""}`} key={label}>
                <View className="spot-panel__facility-heading"><Text className="spot-panel__facility-name">{label}</Text><Text className="spot-panel__facility-status type-secondary">{state}</Text></View>
                {note ? <Text className="spot-panel__facility-summary type-caption">{note}</Text> : null}
              </View>)}</View>
          </View>
          <View className="spot-panel__block">
            <Text className="type-label">现场说明</Text>
            {model.site.map(([label, content]) => <View className="spot-panel__proposal-fact" key={label}><Text className="type-caption">{label}</Text><Text>{content}</Text></View>)}
            <Text className="type-body">{model.detail}</Text>
          </View>
          <Text className="spot-panel__proposal-note type-caption">{draft
            ? "这是仅你可见的远端草稿；编辑并明确提交后才会进入审核。"
            : "提交内容正在审核；正式点资料只会在审核、合并并重新核验后更新。"}</Text>
        </View>
      </ScrollView>
    </View>
    {viewerIndex !== null && viewerMedia[viewerIndex] ? <SpotImageViewer
      name={model.name}
      media={viewerMedia}
      index={viewerIndex}
      onIndexChange={(index) => { galleryPosition.reveal(index, viewerMedia.length, Taro.getWindowInfo().windowWidth); setViewerIndex(index); }}
      onClose={() => setViewerIndex(null)}
      onRetry={(index) => loadMedia(index, true)}
      {...(onViewerBackHandlerChange ? { onBackHandlerChange: onViewerBackHandlerChange } : {})}
    /> : null}
    <View className="spot-panel__action-lane">
      <View className="spot-panel__action-bar spot-panel__action-bar--proposal" role="toolbar" ariaLabel={`${draft ? "草稿" : "审核中"}点位动作`}>
        {draft
          ? <Button className="spot-panel__action spot-panel__action--primary" data-control="draft-edit-action"
              ariaLabel={`编辑${model.name}`} onClick={() => onEdit?.()}><SemanticIcon name="pencil" /><Text>编辑观星点</Text></Button>
          : <Button className="spot-panel__action spot-panel__action--cloud" data-control="proposal-cloud-stargazing-action"
              ariaLabel={`打开${model.name}云观星`} onClick={() => onCloud?.()}><SemanticIcon name="star" /><Text>云观星</Text></Button>}
      </View>
    </View>
  </View>;
}
