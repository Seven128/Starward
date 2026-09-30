import { Button, Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { CONTRIBUTION_FORMAL_FIELD_KEYS, type ContributionSubmission } from "@starward/miniapp-contracts";
import { SpotIdentityContent } from "@/components/spot-identity-content";
import { currentDraftUserId, getContributionMedia } from "@/services/api-client";
import { displayBeijingTimestamp } from "@/utils/zoned-date";
import { KIND_LABEL, MERGE_STATE_LABEL, PUBLICATION_IMPACT_LABEL, TOPICS } from "./contribution-model";
import { contributionFrozenAttempt, contributionRecordCover, contributionRecordIdentity, contributionRecordStatus, contributionSubmittedPlaceFacts } from "./contribution-record-model";
import { formalFeedbackFrozenView } from "./formal-feedback-snapshot";
import { ContributionRecordMedia } from "./contribution-record-media";

const FORMAL_FIELD_LABELS: Record<(typeof CONTRIBUTION_FORMAL_FIELD_KEYS)[number], string> = {
  address:"地点地址",name:"地点名称",openness:"开放状态",hours:"开放时间",access:"进入规则",accessNote:"进入条件",road:"末段道路",safety:"夜间安全",parking:"停车设施",parkingNote:"停车说明",toilet:"洗手间",toiletNote:"洗手间说明",platform:"观测平台",horizon:"视野与遮挡",light:"现场灯光",signal:"通信与充电",camping:"露营条件",contact:"场地联系",detail:"补充说明",
};

export function ContributionSpotIdentityCard({ item, eager = false }: { item: ContributionSubmission; eager?: boolean }) {
  const identity = contributionRecordIdentity(item);
  const cover = contributionRecordCover(item);
  const owner = currentDraftUserId();
  const nodeId = `contribution-cover-${String(item.submissionId).replace(/[^a-zA-Z0-9_-]/gu, "-")}`;
  const [visible, setVisible] = useState(eager);
  const [preview, setPreview] = useState<{ owner: string; uploadId: string; src: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!cover || eager) return;
    let disposed = false;
    let observer: Taro.IntersectionObserver | undefined;
    Taro.nextTick(() => {
      if (disposed) return;
      try {
        const page = Taro.getCurrentInstance().page;
        if (!page) return;
        observer = Taro.createIntersectionObserver(page, { thresholds: [0], initialRatio: 0 });
        observer.relativeToViewport().observe(`#${nodeId}`, result => {
          if (!disposed && typeof result.intersectionRatio === "number" && result.intersectionRatio > 0) setVisible(true);
        });
      } catch {
        observer?.disconnect();
      }
    });
    return () => { disposed = true; observer?.disconnect(); };
  }, [cover?.uploadId, eager, nodeId]);
  useEffect(() => {
    if (!cover || !visible || !owner) return;
    const controller = new AbortController();
    setFailed(false);
    void getContributionMedia(item.submissionId, cover.uploadId, controller.signal, owner)
      .then(response => {
        if (!controller.signal.aborted && currentDraftUserId() === owner)
          setPreview({ owner, uploadId: cover.uploadId, src: `data:${response.data.mimeType};base64,${response.data.dataBase64}` });
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [attempt, cover?.uploadId, item.submissionId, owner, visible]);
  const src = preview?.owner === owner && preview?.uploadId === cover?.uploadId ? preview.src : null;
  return <View id={nodeId} className={`spot-identity-card${src ? " spot-identity-card--with-media" : ""}`}>
    <SpotIdentityContent {...identity} mediaSrc={src} mediaAlt={`${identity.name}本次提交照片`} />
    {cover && failed && !src ? <Button className="contribution-record-cover-retry focus-ring" onClick={() => setAttempt(value => value + 1)}>照片暂时无法显示，重试</Button> : null}
  </View>;
}

export function ContributionRecordDetail({ item, onBack }: { item: ContributionSubmission; onBack(): void }) {
  const status = contributionRecordStatus(item);
  const latestAttempt = contributionFrozenAttempt(item);
  const frozen = latestAttempt?.snapshot ?? item;
  const submittedPlace = contributionSubmittedPlaceFacts(item);
  const formalView = frozen.formalFeedback ? formalFeedbackFrozenView(frozen.formalFeedback) : null;
  return <View className="contribution-record-detail" data-control="contribution-record-detail">
    <Button className="contribution-record-detail__back focus-ring" ariaLabel="返回记录列表" onClick={onBack}>‹ <Text>返回记录</Text></Button>
    <View className="contribution-record-card--detail"><ContributionSpotIdentityCard item={item} eager /><View className="contribution-record-card__extension"><Text className={`contribution-status-pill contribution-status-pill--${status.tone}`}>{status.label}</Text><Text className="type-caption contribution-record-card__meta">{KIND_LABEL[item.kind]} · 更新 {displayBeijingTimestamp(item.updatedAt)}</Text></View></View>
    {item.review?.reason ? <View className="contribution-review-note"><Text className="type-label">审核意见</Text><Text className="type-body">{item.review.reason}</Text></View> : null}
    <View className="contribution-readonly-section">
      <Text className="type-section">本次提交内容</Text>
      {latestAttempt ? <Text className="type-caption">第 {latestAttempt.attemptNo} 次提交 · {displayBeijingTimestamp(latestAttempt.submittedAt)}</Text> : null}
      {submittedPlace ? <View className="contribution-submitted-facts">
        {submittedPlace.selectedLocation ? <Text className="type-secondary">选点：{submittedPlace.selectedLocation}</Text> : null}
        {submittedPlace.fields.map(({ key, value }) => <View className="contribution-submitted-facts__row" key={key}>
          <Text className="type-caption">{FORMAL_FIELD_LABELS[key]}</Text><Text className="type-body">{value || "未填写"}</Text>
        </View>)}
      </View> : formalView ? <View className="contribution-frozen-diff">{CONTRIBUTION_FORMAL_FIELD_KEYS.filter(key => Object.prototype.hasOwnProperty.call(formalView.proposal.fields,key)).map(key => <View key={key}><Text className="type-caption">{FORMAL_FIELD_LABELS[key]}</Text><Text className="contribution-frozen-diff__old">{formalView.baseline.fields[key] || "未填写"}</Text><Text> → </Text><Text>{formalView.proposal.fields[key] || "已清空"}</Text></View>)}</View> : <><Text className="type-body">{frozen.detail || "没有文字说明"}</Text><Text className="type-caption">涉及事实：{frozen.topics.length ? frozen.topics.map((topic) => TOPICS.find((entry) => entry.key === topic)?.label ?? "其他").join(" · ") : "未提供"}</Text></>}
      <ContributionRecordMedia item={item} />
    </View>
    <View className="contribution-readonly-section">
      <Text className="type-section">处理结果</Text>
      <Text className="type-body">证据合并：{MERGE_STATE_LABEL[item.mergeState]}</Text>
      <Text className="type-body">公开影响：{PUBLICATION_IMPACT_LABEL[item.publicationImpact]}</Text>
      <Text className="type-caption">此处展示冻结的本次记录；正式点资料以地图当前版本为准。</Text>
    </View>
  </View>;
}
