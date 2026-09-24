import { Button, Text, View } from "@tarojs/components";
import type { ContributionSubmission } from "@starward/miniapp-contracts";
import { CONTRIBUTION_FORMAL_FIELD_KEYS } from "@starward/miniapp-contracts";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { SelectionTabs } from "@/components/selection-tabs";
import { SpotIdentityContent } from "@/components/spot-identity-content";
import { displayBeijingTimestamp } from "@/utils/zoned-date";
import { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { currentDraftUserId, getContributionMedia } from "@/services/api-client";
import {
  contributionSubmissionState,
  KIND_LABEL,
  MERGE_STATE_LABEL,
  PUBLICATION_IMPACT_LABEL,
  TOPICS,
} from "./contribution-model";
import type { ContributionForm } from "./use-contribution-form";
import { contributionFrozenAttempt, contributionRecordCover, contributionRecordGroup, contributionRecordIdentity, contributionRecordStatus, contributionSubmittedPlaceFacts, type ContributionRecordGroup } from "./contribution-record-model";

type CreationFilter = "ALL" | "DRAFT" | "PENDING" | "ONLINE" | "REJECTED";
type FeedbackFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
const FORMAL_FIELD_LABELS: Record<(typeof CONTRIBUTION_FORMAL_FIELD_KEYS)[number], string> = {
  address:"地点地址",name:"地点名称",openness:"开放状态",hours:"开放时间",access:"进入规则",accessNote:"进入条件",road:"末段道路",safety:"夜间安全",parking:"停车设施",parkingNote:"停车说明",toilet:"洗手间",toiletNote:"洗手间说明",platform:"观测平台",horizon:"视野与遮挡",light:"现场灯光",signal:"通信与充电",camping:"露营条件",contact:"场地联系",detail:"补充说明",
};

function recordName(item: ContributionSubmission) {
  return contributionRecordIdentity(item).name;
}

function ContributionSpotIdentityCard({ item, eager = false }: { item: ContributionSubmission; eager?: boolean }) {
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

function RecordDetail({ item, onBack }: { item: ContributionSubmission; onBack(): void }) {
  const status = contributionRecordStatus(item);
  const latestAttempt = contributionFrozenAttempt(item);
  const frozen = latestAttempt?.snapshot ?? item;
  const submittedPlace = contributionSubmittedPlaceFacts(item);
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
      </View> : frozen.formalFeedback ? <View className="contribution-frozen-diff">{CONTRIBUTION_FORMAL_FIELD_KEYS.filter(key => Object.prototype.hasOwnProperty.call(frozen.formalFeedback!.proposal.fields,key)).map(key => <View key={key}><Text className="type-caption">{FORMAL_FIELD_LABELS[key]}</Text><Text className="contribution-frozen-diff__old">{frozen.formalFeedback!.baseline.fields[key] || "未填写"}</Text><Text> → </Text><Text>{frozen.formalFeedback!.proposal.fields[key] || "已清空"}</Text></View>)}</View> : <><Text className="type-body">{frozen.detail || "没有文字说明"}</Text><Text className="type-caption">涉及事实：{frozen.topics.length ? frozen.topics.map((topic) => TOPICS.find((entry) => entry.key === topic)?.label ?? "其他").join(" · ") : "未提供"}</Text></>}
      <Text className="type-caption">媒体：{frozen.media.length} 项</Text>
    </View>
    <View className="contribution-readonly-section">
      <Text className="type-section">处理结果</Text>
      <Text className="type-body">证据合并：{MERGE_STATE_LABEL[item.mergeState]}</Text>
      <Text className="type-body">公开影响：{PUBLICATION_IMPACT_LABEL[item.publicationImpact]}</Text>
      <Text className="type-caption">此处展示冻结的本次记录；正式点资料以地图当前版本为准。</Text>
    </View>
  </View>;
}

export function ContributionRecords({ form }: { form: ContributionForm }) {
  const [group, setGroup] = useState<ContributionRecordGroup>("CREATION");
  const [creationFilter, setCreationFilter] = useState<CreationFilter>("ALL");
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>("ALL");
  const [selected, setSelected] = useState<ContributionSubmission | null>(null);
  if (selected) return <RecordDetail item={selected} onBack={() => setSelected(null)} />;

  const records = form.submissions
    .filter((item) => contributionRecordGroup(item) === group)
    .filter((item) => contributionSubmissionState(item) !== "WITHDRAWN")
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const activeFilter = group === "CREATION" ? creationFilter : feedbackFilter;
  const visible = records.filter((item) => activeFilter === "ALL" || contributionRecordStatus(item).key === activeFilter);
  const confirmedEmpty = Boolean(form.history.data) && !form.history.refreshError &&
    form.history.data?.dataState !== "STALE_USABLE";
  const filters = group === "CREATION"
    ? ([['ALL', '全部'], ['DRAFT', '草稿'], ['PENDING', '审核中'], ['ONLINE', '已上线'], ['REJECTED', '未通过']] as const)
    : ([['ALL', '全部'], ['PENDING', '审核中'], ['APPROVED', '已通过'], ['REJECTED', '未通过']] as const);

  return <View className="contribution-records" data-control="contribution-records">
    <SelectionTabs className="contribution-records__groups" semantics="tabs" label="记录类型"
      items={[{ id: "CREATION", label: "创建的观星点", controlId: "contribution-group-creation" }, { id: "FEEDBACK", label: "反馈编辑", controlId: "contribution-group-feedback" }] as const}
      activeId={group} onSelect={setGroup} itemClassName="contribution-records__group" activeItemClassName="contribution-records__group--active" />
    <View className="contribution-records__filters" aria-label="状态筛选">
      {filters.map(([key, label]) => <Button key={key} className={`chip focus-ring${activeFilter === key ? " chip--selected" : ""}`} aria-pressed={activeFilter === key} onClick={() => group === "CREATION" ? setCreationFilter(key as CreationFilter) : setFeedbackFilter(key as FeedbackFilter)}>{label}</Button>)}
    </View>
    {form.history.refreshError || form.history.data?.dataState === "STALE_USABLE" ? <StatusPanel state="STALE" detail="记录尚未确认最新状态，暂时显示上次内容。" recoveryLabel="重新获取" onRecover={() => void form.history.refetch().catch(() => {})} /> : null}
    {form.history.isPending ? <StatusPanel state="LOADING" detail="正在读取创建与反馈记录。" /> : form.history.isError ? <StatusPanel state="ERROR" detail="暂时无法读取记录。" recoveryLabel="重试" onRecover={() => void form.history.refetch().catch(() => {})} /> : visible.length ? <View className="contribution-records__list">
      {visible.map((item) => { const status = contributionRecordStatus(item); const submissionState = contributionSubmissionState(item).toLowerCase(); const recordKind = item.kind.toLowerCase().replaceAll("_", "-"); return <View className={`contribution-record contribution-record--${submissionState} contribution-record--${recordKind}`} key={item.submissionId}>
        <View className="contribution-record-card"><ContributionSpotIdentityCard item={item} /><View className="contribution-record-card__extension"><Text className={`contribution-status-pill contribution-status-pill--${status.tone}`}>{status.label}</Text><Text className="type-caption contribution-record-card__meta">{displayBeijingTimestamp(item.updatedAt)}</Text></View></View>
        {item.review?.reason ? <Text className="contribution-record__reason">审核意见：{item.review.reason}</Text> : null}
        {contributionSubmissionState(item) === "DRAFT" ? <SoftButton label={`继续编辑${recordName(item)}`} disabled={form.submissionCommandBusy} onClick={() => void Taro.navigateTo({ url: `/content/contribution/index?submissionId=${encodeURIComponent(item.submissionId)}` })}>继续编辑</SoftButton> : status.key === "REJECTED" ? <View className="contribution-record__actions"><SoftButton label={`查看${recordName(item)}审核意见`} disabled={form.submissionCommandBusy} onClick={() => setSelected(item)}>查看审核意见</SoftButton><SoftButton label={`修改并重新提交${recordName(item)}`} disabled={form.submissionCommandBusy} onClick={() => item.formalFeedback && item.spotId ? void Taro.navigateTo({ url: `/content/spot-feedback/index?spotId=${encodeURIComponent(item.spotId)}&spotName=${encodeURIComponent(recordName(item))}&submissionId=${encodeURIComponent(item.submissionId)}` }) : void Taro.navigateTo({ url: `/content/contribution/index?submissionId=${encodeURIComponent(item.submissionId)}` })}>修改并重新提交</SoftButton></View> : <SoftButton label={`查看${recordName(item)}本次记录`} disabled={form.submissionCommandBusy} onClick={() => setSelected(item)}>查看提交内容</SoftButton>}
      </View>; })}
    </View> : confirmedEmpty ? <StatusPanel state="EMPTY" emptyLevel="page" title="暂无记录" detail="当前分组和筛选下没有记录。" /> : null}
  </View>;
}
