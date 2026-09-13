import { Button, Text, View } from "@tarojs/components";
import type { ContributionSubmission } from "@starward/miniapp-contracts";
import { CONTRIBUTION_FORMAL_FIELD_KEYS } from "@starward/miniapp-contracts";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { SelectionTabs } from "@/components/selection-tabs";
import { displayBeijingTimestamp } from "@/utils/zoned-date";
import { useState } from "react";
import Taro from "@tarojs/taro";
import {
  contributionSubmissionState,
  KIND_LABEL,
  MERGE_STATE_LABEL,
  PUBLICATION_IMPACT_LABEL,
  TOPICS,
} from "./contribution-model";
import type { ContributionForm } from "./use-contribution-form";
import { contributionFrozenAttempt, contributionRecordGroup, contributionRecordStatus, type ContributionRecordGroup } from "./contribution-record-model";

type CreationFilter = "ALL" | "DRAFT" | "PENDING" | "ONLINE" | "REJECTED";
type FeedbackFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
const FORMAL_FIELD_LABELS: Record<(typeof CONTRIBUTION_FORMAL_FIELD_KEYS)[number], string> = {
  address:"地点地址",name:"地点名称",openness:"开放状态",hours:"开放时间",access:"进入规则",accessNote:"进入条件",road:"末段道路",safety:"夜间安全",parking:"停车设施",parkingNote:"停车说明",toilet:"洗手间",toiletNote:"洗手间说明",platform:"观测平台",horizon:"视野与遮挡",light:"现场灯光",signal:"通信与充电",camping:"露营条件",contact:"场地联系",detail:"补充说明",
};

function recordName(item: ContributionSubmission) {
  return item.spotNameSnapshot ?? item.candidateLocation?.displayName ?? "地点待定";
}

function recordRegion(item: ContributionSubmission) {
  return item.candidateLocation?.region ?? (item.spotId ? "正式观星点" : "地区资料未提供");
}

function ContributionSpotIdentityCard({ item }: { item: ContributionSubmission }) {
  return <View className="spot-identity-card">
    <View className="spot-identity-card__copy">
      <Text className="spot-identity-card__region">{recordRegion(item)}</Text>
      <Text className="spot-identity-card__title">{recordName(item)}</Text>
    </View>
  </View>;
}

function RecordDetail({ item, onBack }: { item: ContributionSubmission; onBack(): void }) {
  const status = contributionRecordStatus(item);
  const latestAttempt = contributionFrozenAttempt(item);
  const frozen = latestAttempt?.snapshot ?? item;
  return <View className="contribution-record-detail" data-control="contribution-record-detail">
    <Button className="contribution-record-detail__back focus-ring" ariaLabel="返回记录列表" onClick={onBack}>‹ <Text>返回记录</Text></Button>
    <View className="contribution-record-card--detail"><ContributionSpotIdentityCard item={item} /><View className="contribution-record-card__extension"><Text className={`contribution-status-pill contribution-status-pill--${status.tone}`}>{status.label}</Text><Text className="type-caption contribution-record-card__meta">{KIND_LABEL[item.kind]} · 更新 {displayBeijingTimestamp(item.updatedAt)}</Text></View></View>
    {item.review?.reason ? <View className="contribution-review-note"><Text className="type-label">审核意见</Text><Text className="type-body">{item.review.reason}</Text></View> : null}
    <View className="contribution-readonly-section">
      <Text className="type-section">本次提交内容</Text>
      {latestAttempt ? <Text className="type-caption">第 {latestAttempt.attemptNo} 次提交 · {displayBeijingTimestamp(latestAttempt.submittedAt)}</Text> : null}
      {frozen.formalFeedback ? <View className="contribution-frozen-diff">{CONTRIBUTION_FORMAL_FIELD_KEYS.filter(key => Object.prototype.hasOwnProperty.call(frozen.formalFeedback!.proposal.fields,key)).map(key => <View key={key}><Text className="type-caption">{FORMAL_FIELD_LABELS[key]}</Text><Text className="contribution-frozen-diff__old">{frozen.formalFeedback!.baseline.fields[key] || "未填写"}</Text><Text> → </Text><Text>{frozen.formalFeedback!.proposal.fields[key] || "已清空"}</Text></View>)}</View> : <><Text className="type-body">{frozen.detail || "没有文字说明"}</Text><Text className="type-caption">涉及事实：{frozen.topics.length ? frozen.topics.map((topic) => TOPICS.find((entry) => entry.key === topic)?.label ?? "其他").join(" · ") : "未提供"}</Text></>}
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
    </View> : <View className="contribution-records__empty"><Text className="type-section">暂无记录</Text><Text className="type-caption">当前分组和筛选下没有记录。</Text></View>}
  </View>;
}
