import { Button, Image, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import type { ContributionSubmission } from "@starward/miniapp-contracts";
import { SemanticIcon } from "@/components/semantic-asset";
import { currentDraftUserId, getContributionMedia } from "@/services/api-client";
import type { SpotPanelExtent, SpotPanelPhase } from "./spot-panel";
import { pendingProposalPanelValues } from "./pending-proposal-model";

export function PendingProposalPanel({ submission, variant = "PENDING", extent, phase, onExtent, onClose, onCloud, onEdit,
  onHandleTouchStart, onHandleTouchMove, onHandleTouchEnd, onHandleTouchCancel }: {
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
}) {
  const model = pendingProposalPanelValues(submission);
  const draft = variant === "DRAFT";
  const [mediaAttempt, setMediaAttempt] = useState(0);
  const [media, setMedia] = useState<{ state: "idle" | "loading" | "error" | "ready"; src?: string }>({ state: "idle" });
  const leadMedia = model.media[0];
  useEffect(() => {
    if (!leadMedia) {
      setMedia({ state: "idle" });
      return;
    }
    const owner = currentDraftUserId();
    if (!owner) {
      setMedia({ state: "error" });
      return;
    }
    const controller = new AbortController();
    let active = true;
    setMedia({ state: "loading" });
    void getContributionMedia(submission.submissionId, leadMedia.uploadId, controller.signal, owner)
      .then((response) => {
        if (active) setMedia({ state: "ready", src: `data:${response.data.mimeType};base64,${response.data.dataBase64}` });
      })
      .catch(() => {
        if (active) setMedia({ state: "error" });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [leadMedia?.uploadId, mediaAttempt, submission.submissionId]);
  return <View
    id="spot-information-panel"
    className={`spot-panel spot-panel--proposal spot-panel--${extent}${phase === "closing" ? " spot-panel--closing" : ""}`}
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
    <View className="spot-panel__handle-band">
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
    </View>
    <View className="spot-panel__scroll-frame">
      <ScrollView className="spot-panel__scroll" scrollY={extent !== "small"} type="custom" enhanced showScrollbar={false}
        ariaLabel={`${draft ? "草稿" : "审核中"}观星点资料`}>
        <View className="spot-panel__identity">
          <View className="spot-panel__proposal-title-row">
            <Text className="spot-panel__title">{model.name}</Text>
            <Text className="spot-panel__proposal-status">{draft ? "草稿" : "审核中"}</Text>
          </View>
          <Text className="spot-panel__address type-caption">{model.address}</Text>
        </View>
        {leadMedia ? <View className="spot-panel__proposal-media" ariaLabel={`${leadMedia.label}，共${model.media.length}张`}>
          {media.state === "ready" && media.src
            ? <Image className="spot-panel__proposal-media-image" src={media.src} mode="aspectFill" lazyLoad ariaLabel={leadMedia.label} />
            : <View className="spot-panel__proposal-media-placeholder">
              <Text className="type-caption">{media.state === "error" ? "照片暂时无法读取" : "正在读取提交照片…"}</Text>
              {media.state === "error" ? <Button className="spot-panel__proposal-media-retry focus-ring" onClick={() => setMediaAttempt((value) => value + 1)}>重试</Button> : null}
            </View>}
          {media.state === "ready" ? <View className="spot-panel__proposal-media-overlay"><Text>{leadMedia.label}</Text><Text>{model.media.length} 张</Text></View> : null}
        </View> : null}
        <View className="spot-panel__section" ariaLabel="提交资料">
          <View className="spot-panel__block">
            <Text className="type-label">开放时间</Text>
            <View className="spot-panel__proposal-pair"><Text>{model.opening[0]}</Text><Text>{model.opening[1]}</Text></View>
          </View>
          <View className="spot-panel__block">
            <Text className="type-label">到达与安全</Text>
            <View className="spot-panel__proposal-pair"><Text>{model.access[0]}</Text><Text>{model.safety}</Text></View>
            <Text className="type-caption">{model.access[1]}</Text>
            <Text className="type-caption">{model.road}</Text>
          </View>
          <View className="spot-panel__block">
            <Text className="type-label">设施</Text>
            <View className="spot-panel__facilities">{model.facilities.map(([label, state, note]) =>
              <View className={`spot-panel__facility${note ? " spot-panel__facility--described" : ""}`} key={label}>
                <Text className="spot-panel__facility-name">{label}</Text><Text className="spot-panel__facility-status type-secondary">{state}</Text>
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
