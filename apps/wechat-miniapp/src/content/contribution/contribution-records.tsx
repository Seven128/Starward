import { Button, Text, View } from "@tarojs/components";
import type { ContributionSubmission } from "@starward/miniapp-contracts";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { SelectionTabs } from "@/components/selection-tabs";
import { displayBeijingTimestamp } from "@/utils/zoned-date";
import { useEffect, useRef, useState } from "react";
import Taro from "@tarojs/taro";
import { currentDraftUserId, getSharedSpot, MiniappApiError } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { contributionSubmissionState } from "./contribution-model";
import type { ContributionForm } from "./use-contribution-form";
import { contributionRecordGroup, contributionRecordIdentity, contributionRecordPrimaryAction, contributionRecordStatus, resolveContributionRecordDetail, type ContributionRecordDetailSelection, type ContributionRecordGroup } from "./contribution-record-model";
import { ContributionRecordDetail, ContributionSpotIdentityCard } from "./contribution-record-detail";
import { ContributionRecordStatus } from "./contribution-record-status";

type CreationFilter = "ALL" | "DRAFT" | "PENDING" | "ONLINE" | "REJECTED";
type FeedbackFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
function recordName(item: ContributionSubmission) {
  return contributionRecordIdentity(item).name;
}

export function ContributionRecords({ form, onDetailOpen, onDetailClose, onGroupChange, onFilterChange }: {
  form: ContributionForm; onDetailOpen(): void; onDetailClose(): void;
  onGroupChange(group: ContributionRecordGroup): void; onFilterChange(): void;
}) {
  const [group, setGroup] = useState<ContributionRecordGroup>("CREATION");
  const [creationFilter, setCreationFilter] = useState<CreationFilter>("ALL");
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>("ALL");
  const [selected, setSelected] = useState<ContributionRecordDetailSelection | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<{ id: string; missing: boolean } | null>(null);
  const opening = useRef(false);
  const openingVersion = useRef(0);
  const openingAbort = useRef<AbortController | null>(null);
  useEffect(() => () => { openingVersion.current++; openingAbort.current?.abort(); }, []);
  const showDetail = (item: ContributionSubmission) => {
    onDetailOpen();
    setSelected({ owner: currentDraftUserId(), submissionId: item.submissionId });
  };
  const closeDetail = () => { setSelected(null); onDetailClose(); };
  const cancelOpening = () => {
    openingVersion.current++;
    openingAbort.current?.abort();
    openingAbort.current = null;
    opening.current = false;
    setOpeningId(null);
    setOpenError(null);
  };
  const openPublishedSpot = async (item: ContributionSubmission) => {
    if (!item.spotId || opening.current) return;
    const version = ++openingVersion.current;
    const controller = new AbortController();
    openingAbort.current = controller;
    opening.current = true;
    setOpeningId(item.submissionId);
    setOpenError(null);
    const owner = currentDraftUserId();
    try {
      const response = await getSharedSpot(item.spotId, controller.signal);
      if (version !== openingVersion.current || !owner || currentDraftUserId() !== owner) return;
      const spot = response.data;
      const map = useAppStore.getState();
      map.setFinderQuery(spot.name);
      map.setViewport({ center: spot.spotGcj02, zoom: Math.max(12, map.viewport.zoom) });
      map.requestSpotOpen(spot.spotId);
      await Taro.switchTab({ url: "/pages/map/index" });
    } catch (error) {
      if (version === openingVersion.current && currentDraftUserId() === owner) setOpenError({
        id: item.submissionId,
        missing: error instanceof MiniappApiError && (error.statusCode === 404 || error.code === "STALE_REJECTED"),
      });
    } finally {
      if (version === openingVersion.current) {
        openingAbort.current = null;
        opening.current = false;
        setOpeningId(null);
      }
    }
  };
  const renderRecordActions = (item: ContributionSubmission) => {
    const action = contributionRecordPrimaryAction(item);
    const busy = form.submissionCommandBusy || openingId !== null;
    const name = recordName(item);
    if (action === "EDIT") return <SoftButton label={`继续编辑${name}`} disabled={busy}
      onClick={() => void Taro.navigateTo({ url: `/content/contribution/index?submissionId=${encodeURIComponent(item.submissionId)}` })}>继续编辑</SoftButton>;
    if (action === "REVIEW_AND_EDIT") return <View className="contribution-record__actions">
      <SoftButton label={`查看${name}审核意见`} disabled={busy} onClick={() => showDetail(item)}>查看审核意见</SoftButton>
      <SoftButton label={`修改并重新提交${name}`} disabled={busy} onClick={() => item.formalFeedback && item.spotId
        ? void Taro.navigateTo({ url: `/content/spot-feedback/index?spotId=${encodeURIComponent(item.spotId)}&spotName=${encodeURIComponent(name)}&submissionId=${encodeURIComponent(item.submissionId)}` })
        : void Taro.navigateTo({ url: `/content/contribution/index?submissionId=${encodeURIComponent(item.submissionId)}` })}>修改并重新提交</SoftButton>
    </View>;
    if (action === "OPEN_PUBLISHED_SPOT") return <>
      <SoftButton label={`打开${name}正式观星点`} disabled={busy} onClick={() => void openPublishedSpot(item)}>
        {openingId === item.submissionId ? "正在打开…" : "查看正式观星点"}
      </SoftButton>
      {openError?.id === item.submissionId ? <>
        <StatusPanel state="ERROR"
          title={openError.missing ? "当前不可公开查看" : undefined}
          detail={openError.missing ? "这个正式观星点当前不可公开查看；本次提交记录仍可查看。" : "正式观星点暂时无法打开，请检查网络后重试。"}
          recoveryLabel={openError.missing ? "查看本次记录" : "重试打开"}
          onRecover={() => openError.missing ? showDetail(item) : void openPublishedSpot(item)} />
        {!openError.missing ? <SoftButton label={`查看${name}本次提交记录`} onClick={() => showDetail(item)}>查看本次记录</SoftButton> : null}
      </> : null}
    </>;
    return <SoftButton label={`查看${name}本次记录`} disabled={busy} onClick={() => showDetail(item)}>查看提交内容</SoftButton>;
  };
  if (selected) {
    const detail = resolveContributionRecordDetail(selected, currentDraftUserId(), form.history.data?.data.submissions ?? null);
    if (detail.state === "ACCOUNT_CHANGED") return <StatusPanel state="ERROR" title="账号已变化"
      detail="这条记录属于之前的账号，请返回列表重新读取当前账号记录。"
      recoveryLabel="返回记录列表" onRecover={closeDetail} />;
    if (detail.state === "UNAVAILABLE") return <View className="contribution-record-detail">
      {form.history.isPending ? <StatusPanel state="LOADING" detail="正在读取当前账号的记录。" />
        : <StatusPanel state="ERROR" detail="暂时无法读取当前账号的记录。" recoveryLabel="重新获取"
          onRecover={() => void form.history.refetch().catch(() => {})} />}
      <SoftButton label="返回记录列表" onClick={closeDetail}>返回记录</SoftButton>
    </View>;
    if (detail.state === "MISSING") return <StatusPanel state="ERROR" title="记录已不可用"
      detail="当前账号的记录列表中没有这条记录，请返回列表查看最新状态。"
      recoveryLabel="返回记录列表" onRecover={closeDetail} />;
    return <>
      {form.history.refreshError || form.history.data?.dataState === "STALE_USABLE" ?
        <StatusPanel state="STALE" detail="记录尚未确认最新状态，暂时显示上次内容。" recoveryLabel="重新获取"
          onRecover={() => void form.history.refetch().catch(() => {})} /> : null}
      <ContributionRecordDetail item={detail.item} onBack={closeDetail} />
    </>;
  }

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
      activeId={group} onSelect={(next) => { if (next === group) return; cancelOpening(); onGroupChange(next); setGroup(next); }} itemClassName="contribution-records__group" activeItemClassName="contribution-records__group--active" />
    <View className="contribution-records__filters" aria-label="状态筛选">
      {filters.map(([key, label]) => <Button key={key} className={`chip focus-ring${activeFilter === key ? " chip--selected" : ""}`} aria-pressed={activeFilter === key} onClick={() => { if (key === activeFilter) return; cancelOpening(); onFilterChange(); group === "CREATION" ? setCreationFilter(key as CreationFilter) : setFeedbackFilter(key as FeedbackFilter); }}>{label}</Button>)}
    </View>
    {form.history.refreshError || form.history.data?.dataState === "STALE_USABLE" ? <StatusPanel state="STALE" detail="记录尚未确认最新状态，暂时显示上次内容。" recoveryLabel="重新获取" onRecover={() => void form.history.refetch().catch(() => {})} /> : null}
    {form.history.isPending ? <StatusPanel state="LOADING" detail="正在读取创建与反馈记录。" /> : form.history.isError ? <StatusPanel state="ERROR" detail="暂时无法读取记录。" recoveryLabel="重试" onRecover={() => void form.history.refetch().catch(() => {})} /> : visible.length ? <View className="contribution-records__list">
      {visible.map((item) => { const status = contributionRecordStatus(item); const submissionState = contributionSubmissionState(item).toLowerCase(); const recordKind = item.kind.toLowerCase().replaceAll("_", "-"); return <View className={`contribution-record contribution-record--${submissionState} contribution-record--${recordKind}`} key={item.submissionId}>
        <View className="contribution-record-card"><ContributionSpotIdentityCard item={item} /><View className="contribution-record-card__extension"><ContributionRecordStatus status={status} /><Text className="type-caption contribution-record-card__meta">{displayBeijingTimestamp(item.updatedAt)}</Text></View></View>
        {item.review?.reason ? <Text className="contribution-record__reason">审核意见：{item.review.reason}</Text> : null}
        {renderRecordActions(item)}
      </View>; })}
    </View> : confirmedEmpty ? <StatusPanel state="EMPTY" emptyLevel="page" title="暂无记录" detail="当前分组和筛选下没有记录。" /> : null}
  </View>;
}
