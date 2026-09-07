import { ToggleField } from "@/components/toggle-field";
import { FloatingNotificationHost } from "@/components/notification";
import Taro, { useDidHide, useDidShow, useRouter, useUnload } from "@tarojs/taro";
import { Button, Input, ScrollView, Text, Textarea, View } from "@tarojs/components";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  ImportDraft,
  ImportStage,
  PlatformKind,
} from "@starward/miniapp-contracts";
import { validateExternalUrl } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { FormalSpotField } from "@/components/formal-spot-field";
import { StatusPanel } from "@/components/status-panel";
import { SoftButton } from "@/components/soft-button";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { ImportSaveRecoveryError } from "@/services/import-save-retry";
import {
  createPostImport,
  clearPostImportSaveRecovery,
  currentDraftUserId,
  errorMessage,
  getPostImport,
  getPostImports,
  MiniappApiError,
  updatePostImport,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./index.scss";
import { createImportLocalDraftStore, type ImportLocalDraft } from "./local-draft";
import { importPreviewRecovery } from "./preview-recovery";

const PLATFORMS: readonly { key: PlatformKind; label: string }[] = [
  { key: "XIAOHONGSHU", label: "小红书" },
  { key: "WEIBO", label: "微博" },
  { key: "WECHAT_CHANNELS", label: "视频号" },
  { key: "OTHER", label: "其他" },
];

const STAGES: readonly { key: ImportStage; label: string }[] = [
  { key: "SOURCE", label: "来源" },
  { key: "EDIT_DRAFT", label: "编辑草稿" },
  { key: "ASSOCIATE_SPOT", label: "关联地点" },
  { key: "PREVIEW", label: "预览" },
  { key: "SUBMIT", label: "审核" },
];

const PARSE_LABEL: Record<ImportDraft["parseState"], string> = {
  NOT_REQUESTED: "手动编辑", GATED: "自动解析未开放", RUNNING: "解析中",
  PARTIAL: "待补充", FAILED: "解析失败", COMPLETE: "解析完成",
};
const REVIEW_LABEL: Record<ImportDraft["moderationState"], string> = {
  DRAFT: "草稿", PENDING: "待审核", APPROVED: "审核通过", REJECTED: "审核未通过",
};

function platformLabel(platform: PlatformKind) {
  return PLATFORMS.find((item) => item.key === platform)?.label ?? "其他";
}

function stageIndex(stage: ImportStage) {
  return STAGES.findIndex((item) => item.key === stage);
}

function parseStatusText(draft: ImportDraft) {
  switch (draft.parseState) {
    case "COMPLETE":
      return "解析完成；仍以你确认的可编辑字段为准。";
    case "PARTIAL":
      return "解析不完整；已解析字段可编辑，未解析部分请手动补充。";
    case "FAILED":
      return "暂未取得可用解析结果；可继续手动编辑，已编辑字段不会被覆盖。";
    case "RUNNING":
      return "解析进行中；请保留当前草稿，稍后回读。";
    case "GATED":
      return "当前来源尚未开放自动解析；可继续手动编辑。";
    default:
      return "尚未请求自动解析；可继续手动编辑。";
  }
}

export default function ImportPage() {
  const themeClass = useThemeClass();
  const router = useRouter();
  const notify = useAppStore((state) => state.notify);
  const mountId = useId();
  const recoveryGeneration = useRef(0);
  const pageVisible = useRef(true);
  const [, refreshIdentity] = useState(0);
  useDidShow(() => { pageVisible.current = true; refreshIdentity(value => value + 1); });
  const cancelRecoveryFocus = () => {
    pageVisible.current = false;
    recoveryGeneration.current += 1;
  };
  useDidHide(cancelRecoveryFocus);
  useUnload(cancelRecoveryFocus);
  const owner = currentDraftUserId();
  const formOwner = useRef(owner);
  formOwner.current ??= owner;
  const ownerMatches = () => !!owner && owner === formOwner.current && owner === currentDraftUserId();
  const routeSpotId = useAppStore((state) => state.selectedSpotId);
  const contextId = useAppStore((state) => state.observationContext?.contextId);
  const imports = useResourceQuery({
    queryKey: ["imports", owner ?? `unresolved:${mountId}`],
    queryFn: (signal) => getPostImports(signal, owner ?? undefined),
    staleTime: 15_000,
    throwOnRefetchError: true,
  });
  const [selectedId, setSelectedId] = useState("");
  const appliedRouteId = useRef<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const detail = useResourceQuery({
    queryKey: ["import", selectedId, owner ?? `unresolved:${mountId}`],
    queryFn: (signal) => getPostImport(selectedId, signal, owner ?? undefined),
    enabled: Boolean(selectedId) && owner === formOwner.current,
    staleTime: 10_000,
    throwOnRefetchError: true,
  });
  const [platform, setPlatform] = useState<PlatformKind>("XIAOHONGSHU");
  const [sourceUrl, setSourceUrl] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [association, setAssociation] = useState<"FORMAL" | "PROPOSAL" | "NONE">("NONE");
  const [formalSpotId, setFormalSpotId] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [sourceFocus, setSourceFocus] = useState(false);
  const [recoveryAnchor, setRecoveryAnchor] = useState("");
  const [editorFocus, setEditorFocus] = useState("");
  const [action, setAction] = useState<"CREATE" | "SAVE" | "STAGE" | null>(null);
  const actionBusy = useRef(false);
  const [saveRecoveryError, setSaveRecoveryError] = useState(false);
  const [recoveryReviewed, setRecoveryReviewed] = useState(false);
  const [localDraft, setLocalDraft] = useState<ImportDraft | null>(null);
  const hydratedDraftId = useRef("");
  const localStore = useMemo(() => owner ? createImportLocalDraftStore(Taro, owner, currentDraftUserId) : null, [owner]);
  const [editRecovery, setEditRecovery] = useState<ImportLocalDraft | null>(null);
  const [editRecoveryError, setEditRecoveryError] = useState("");
  const [editStorageError, setEditStorageError] = useState("");
  const [discardEditConfirmed, setDiscardEditConfirmed] = useState(false);
  const dirtyEdit = useRef(false);
  const restoredRevision = useRef<number | null>(null);
  useEffect(() => {
    if (!localStore || !ownerMatches()) return;
    try { setEditRecovery(localStore.read()); }
    catch (error) { setEditRecoveryError(errorMessage(error)); }
  }, [localStore]);

  const listItems = imports.data?.data.imports ?? [];
  const loadedDraft = detail.data?.data ?? null;
  const listDraft = listItems.find((item) => item.importDraftId === selectedId) ?? null;
  const draft = localDraft ?? loadedDraft ?? listDraft;
  const serverDraft = loadedDraft ?? listDraft;
  const isPermissionDenied = (error: unknown) =>
    error instanceof MiniappApiError && error.code === "PERMISSION_DENIED";

  useEffect(() => {
    if (!ownerMatches() || dirtyEdit.current) return;
    const routeValue = router.params.importDraftId ?? "";
    let routeId = routeValue;
    try { routeId = decodeURIComponent(routeValue); } catch { /* Keep malformed IDs explicit. */ }
    if (routeId && appliedRouteId.current !== routeValue) {
      appliedRouteId.current = routeValue;
      if (routeId !== selectedId) setLocalDraft(null);
      setSelectedId(routeId);
      return;
    }
    if (!selectedId && !isCreatingNew && listItems[0])
      setSelectedId(listItems[0].importDraftId);
  }, [isCreatingNew, listItems, router.params.importDraftId, selectedId, owner]);

  useEffect(() => {
    if (
      !ownerMatches() ||
      !serverDraft ||
      serverDraft.importDraftId !== selectedId ||
      hydratedDraftId.current === selectedId
    )
      return;
    hydratedDraftId.current = selectedId;
    setLocalDraft(null);
    setPlatform(serverDraft.platform);
    setSourceUrl(serverDraft.originalUrl);
    setRightsConfirmed(serverDraft.rightsConfirmed);
    setTitle(serverDraft.title.value);
    setBody(serverDraft.body.value);
    setSourceNote(serverDraft.sourceNote.value);
    setVisibility(serverDraft.visibility.value);
    setAssociation(serverDraft.spotId ? "FORMAL" : serverDraft.spotProposalId ? "PROPOSAL" : "NONE");
    setFormalSpotId(serverDraft.spotId ?? "");
    setValidationMessage("");
  }, [selectedId, serverDraft, owner]);

  const announce = (
    tone: "error" | "warning" | "success",
    titleText: string,
    bodyText: string,
  ) =>
    notify({
      owner: "import",
      placement: "floating",
      tone,
      title: titleText,
      body: bodyText,
      dismissible: true,
      dedupeKey: `import-${tone}-${titleText}`,
    });

  const keepEdit = (patch: Partial<ImportLocalDraft>) => {
    if (!ownerMatches() || !localStore || editRecovery || editRecoveryError) return;
    // Background query refreshes must not silently rebase unsaved edits.
    restoredRevision.current ??= draft?.revision ?? null;
    dirtyEdit.current = true;
    setDiscardEditConfirmed(false);
    try {
      localStore.write({ schema: 1, id: draft?.importDraftId ?? "", revision: restoredRevision.current ?? draft?.revision ?? null,
        platform, sourceUrl, rightsConfirmed, title, body, sourceNote, visibility, association, formalSpotId, ...patch });
      setEditStorageError("");
    } catch (error) { setEditStorageError(errorMessage(error)); }
  };
  const clearSavedEdit = () => {
    dirtyEdit.current = false;
    restoredRevision.current = null;
    try { localStore?.clear(); setEditStorageError(""); }
    catch (error) { setEditStorageError(errorMessage(error)); }
  };
  const recoverEdit = async (discard = false) => {
    if (!ownerMatches() || actionBusy.current || !localStore) return;
    actionBusy.current = true; setAction("SAVE");
    try {
      if (discard) { localStore.clear(); setEditRecovery(null); setEditRecoveryError(""); return; }
      const copy = editRecovery;
      if (!copy) return;
      const latest = copy.id ? (await getPostImport(copy.id, undefined, owner!)).data : null;
      if (!ownerMatches()) return;
      if (latest?.stage === "SUBMIT") throw new Error("此草稿已提交审核，不能覆盖编辑。可返回查看记录，或放弃本机副本。");
      hydratedDraftId.current = copy.id;
      setSelectedId(copy.id); setIsCreatingNew(!copy.id); setLocalDraft(latest);
      setPlatform(copy.platform); setSourceUrl(copy.sourceUrl); setRightsConfirmed(copy.rightsConfirmed);
      setTitle(copy.title); setBody(copy.body); setSourceNote(copy.sourceNote); setVisibility(copy.visibility);
      setAssociation(copy.association); setFormalSpotId(copy.formalSpotId);
      restoredRevision.current = copy.revision; dirtyEdit.current = true;
      setEditRecovery(null); setEditRecoveryError("");
      announce("success", "已恢复本机编辑", "内容尚未保存；保存时会检查是否有更新，不会自动提交审核。");
    } catch (error) { if (ownerMatches()) setEditRecoveryError(errorMessage(error)); }
    finally { actionBusy.current = false; setAction(null); }
  };

  const beginCreate = async () => {
    if (!ownerMatches()) return;
    setValidationMessage("");
    const normalized = validateExternalUrl(sourceUrl.trim());
    if (!normalized.ok || !normalized.normalizedUrl) {
      setValidationMessage(
        sourceUrl.trim()
          ? `来源链接不可用：${normalized.recovery.join("；") || "请粘贴完整的 http/https 链接"}。`
          : "请粘贴完整的 http/https 来源链接；当前输入会保留。",
      );
      setSourceFocus(true);
      return;
    }
    if (!rightsConfirmed) {
      setValidationMessage("请先确认你有权使用本次导入的文字与媒体，并同意进入审核。 ");
      return;
    }
    if (actionBusy.current) return;
    actionBusy.current = true;
    setAction("CREATE");
    try {
      const response = await createPostImport({
        platform,
        originalUrl: normalized.normalizedUrl,
        rightsConfirmed,
      }, owner!);
      if (!ownerMatches()) return;
      const created = response.data;
      setIsCreatingNew(false);
      setSelectedId(created.importDraftId);
      setLocalDraft(created);
      clearSavedEdit();
      await imports.refetch().catch(() => {
        if (!ownerMatches()) return;
        announce("warning", "草稿已建立，列表暂未刷新", "当前草稿已保存，可继续编辑；稍后重新打开列表查看。 ");
      });
    } catch (error) {
      if (!ownerMatches()) return;
      if (error instanceof ImportSaveRecoveryError) { setSaveRecoveryError(true); setRecoveryReviewed(false); }
      announce(
        "error",
        "暂未确认草稿建立结果",
        `${errorMessage(error)}；当前输入仍在页面中。请先刷新草稿列表核对，避免重复建立。`,
      );
    } finally {
      actionBusy.current = false;
      setAction(null);
    }
  };

  const saveCurrent = async (nextStage?: ImportStage) => {
    if (!ownerMatches() || !draft || draft.stage === "SUBMIT" || actionBusy.current) return null;
    if (nextStage === "EDIT_DRAFT" && !rightsConfirmed) {
      announce("warning", "仍需权利确认", "确认原始内容权利后才能进入编辑草稿。 ");
      return null;
    }
    if (nextStage === "PREVIEW" && association === "NONE") {
      announce("warning", "还没有关联对象", "预览前请选择正式观星点或建立独立地点提议。 ");
      return null;
    }
    if (
      nextStage === "PREVIEW" &&
      association === "FORMAL" &&
      !(formalSpotId.trim() || routeSpotId)
    ) {
      announce("warning", "尚未选择正式地点", "请搜索并选择对应地点，或改用独立地点提议。 ");
      return null;
    }
    if (nextStage === "SUBMIT" && (!rightsConfirmed || !title.trim() || !body.trim())) {
      announce("warning", "预览信息不完整", "提交审核前需要权利确认、标题和正文；当前编辑保持不变。 ");
      return null;
    }
    actionBusy.current = true;
    setAction(nextStage ? "STAGE" : "SAVE");
    try {
      const response = await updatePostImport(draft.importDraftId, {
        expectedRevision: restoredRevision.current ?? draft.revision,
        rightsConfirmed,
        title,
        body,
        sourceNote,
        visibility,
        ...(association === "FORMAL"
          ? { spotId: formalSpotId.trim() || routeSpotId }
          : association === "PROPOSAL"
            ? { spotId: null, createProposal: true }
            : { spotId: null }),
        ...(nextStage ? { stage: nextStage } : {}),
      }, owner!);
      if (!ownerMatches()) return null;
      setLocalDraft(response.data);
      clearSavedEdit();
      if (nextStage === "SUBMIT") announce(
        "success", "已提交人工审核",
        "当前记录进入审核；不会自动发布内容，也不会创建正式观星点。",
      );
      await imports.refetch().catch(() => {
        if (!ownerMatches()) return;
        announce("warning", "草稿已保存，列表暂未刷新", "当前保存结果已保留，可稍后重试刷新列表。");
      });
      return response.data;
    } catch (error) {
      if (!ownerMatches()) return null;
      if (error instanceof ImportSaveRecoveryError) { setSaveRecoveryError(true); setRecoveryReviewed(false); }
      if (error instanceof MiniappApiError && error.code === "CONFLICT") {
        const latest = await detail.refetch().catch(() => undefined);
        if (!ownerMatches()) return null;
        if (latest?.data.importDraftId === draft.importDraftId) setLocalDraft(latest.data);
        restoredRevision.current = null;
      }
      announce(
        "error",
        nextStage ? "暂未确认阶段推进结果" : "暂未确认草稿保存结果",
        `${errorMessage(error)}；当前编辑字段仍在页面中，请核对草稿记录后重试。`,
      );
      return null;
    } finally {
      actionBusy.current = false;
      setAction(null);
    }
  };

  const clearSaveRecovery = async (confirmed = false) => {
    if (!ownerMatches() || actionBusy.current) return;
    actionBusy.current = true;
    setAction("SAVE");
    try {
      await imports.refetch();
      if (!ownerMatches()) return;
      if (!confirmed || !recoveryReviewed) {
        setRecoveryReviewed(true);
        announce("warning", "请核对已保存草稿", "列表已刷新。清理后无法沿用旧请求身份，再次建立可能重复。核对后可确认清理本机恢复信息。");
        return;
      }
      clearPostImportSaveRecovery(owner!);
      setSaveRecoveryError(false);
      setRecoveryReviewed(false);
      announce("success", "恢复信息已清理", "当前输入和服务器草稿保留；不会自动重发保存请求。");
    } catch (error) {
      if (ownerMatches()) {
        setRecoveryReviewed(false);
        announce("warning", "恢复信息未清理", errorMessage(error));
      }
    } finally { actionBusy.current = false; setAction(null); }
  };

  const setAssociationValue = (value: "FORMAL" | "PROPOSAL" | "NONE") => {
    keepEdit({ association: value, formalSpotId: value === "FORMAL" && !formalSpotId && routeSpotId ? routeSpotId : formalSpotId });
    setAssociation(value);
    if (value === "FORMAL" && !formalSpotId && routeSpotId)
      setFormalSpotId(routeSpotId);
  };

  const currentStage = draft?.stage ?? "SOURCE";
  const previewRecovery = importPreviewRecovery({ rightsConfirmed, title, body });
  const recoverPreview = () => {
    if (!pageVisible.current || !ownerMatches() || actionBusy.current || !previewRecovery) return;
    const anchor = previewRecovery.anchor;
    const generation = ++recoveryGeneration.current;
    setRecoveryAnchor("");
    setEditorFocus("");
    Taro.nextTick(() => {
      if (!pageVisible.current || generation !== recoveryGeneration.current || !ownerMatches() || actionBusy.current) return;
      setRecoveryAnchor(anchor);
      setEditorFocus(anchor);
    });
  };
  const currentStageIndex = stageIndex(currentStage);
  const canEdit = Boolean(draft && currentStage !== "SUBMIT" && action === null);
  const sourceValidation = useMemo(
    () => (sourceUrl.trim() ? validateExternalUrl(sourceUrl.trim()) : null),
    [sourceUrl],
  );
  const selectDraft = (id: string) => {
    if (!ownerMatches() || id === selectedId || actionBusy.current) return;
    if (dirtyEdit.current) { announce("warning", "请先处理当前编辑", "请先保存，或使用页面上方的放弃编辑操作，再切换草稿。"); return; }
    setIsCreatingNew(false);
    setLocalDraft(null);
    setSelectedId(id);
  };

  const beginAnotherImport = () => {
    if (!ownerMatches() || actionBusy.current) return;
    if (dirtyEdit.current) { announce("warning", "请先处理当前编辑", "请先保存，或使用页面上方的放弃编辑操作，再新建导入。"); return; }
    hydratedDraftId.current = "";
    setIsCreatingNew(true);
    setSelectedId("");
    setLocalDraft(null);
    setPlatform("OTHER");
    setSourceUrl("");
    setRightsConfirmed(false);
    setTitle("");
    setBody("");
    setSourceNote("");
    setVisibility("PRIVATE");
    setAssociation("NONE");
    setFormalSpotId("");
    setValidationMessage("");
  };

  const discardCurrentEdit = () => {
    if (!ownerMatches() || actionBusy.current || !dirtyEdit.current || !localStore) return;
    if (!discardEditConfirmed) { setDiscardEditConfirmed(true); return; }
    try {
      localStore.clear();
      dirtyEdit.current = false;
      restoredRevision.current = null;
      setDiscardEditConfirmed(false);
      setEditStorageError("");
      beginAnotherImport();
      announce("success", "已放弃当前编辑", "本机未保存输入已清除；已保存的服务器草稿仍可从列表打开。");
    } catch (error) { setEditStorageError(errorMessage(error)); }
  };

  if (formOwner.current && owner !== formOwner.current) return (
    <View className={`${themeClass} import-page`}>
      <FloatingNotificationHost />
      <CustomNav title="内容导入" back backFallbackTab="/pages/my/index" />
      <StatusPanel state="PERMISSION_DENIED" detail="当前账号已变化，请返回后重新打开内容导入。原账号的草稿不会转存到其他账号。" />
    </View>
  );

  if (editRecovery || editRecoveryError) return (
    <View className={`${themeClass} import-page`}>
      <FloatingNotificationHost />
      <CustomNav title="内容导入" back backFallbackTab="/pages/my/index" />
      <View className="page-inset">
        <StatusPanel state={editRecoveryError ? "ERROR" : "READY"}
          detail={editRecoveryError || "发现未保存的本机编辑副本。恢复后可继续编辑，不会自动保存或提交审核。"}
          recoveryLabel="恢复编辑" onRecover={editRecovery && !action ? () => void recoverEdit() : undefined} />
        <SoftButton label="放弃本机编辑副本" disabled={action !== null} onClick={() => void recoverEdit(true)}>放弃本机编辑副本</SoftButton>
      </View>
    </View>
  );

  return (
    <View
      className={`${themeClass} import-page`}
      data-route="content-import"
      data-od-id="content-import"
    >
      <FloatingNotificationHost />
      <CustomNav
        title="内容导入"
        back
        backOdId="import-back-action"
        backFallbackTab="/pages/my/index"
      />
      <ScrollView scrollY enhanced bounces={false} showScrollbar={false} scrollIntoView={recoveryAnchor} className="import-page__scroll hide-scrollbar">
        <View className="import-content page-inset safe-bottom">
          {dirtyEdit.current ? <View>
            <StatusPanel state="READY"
              detail={discardEditConfirmed ? "确认放弃当前未保存输入？本机编辑副本也会清除，已保存的服务器草稿保留。" : "当前有未保存编辑，可保存后继续，也可在此放弃。"}
              recoveryLabel={discardEditConfirmed ? "确认放弃当前编辑" : "放弃当前未保存编辑"}
              onRecover={action ? undefined : discardCurrentEdit} />
            {discardEditConfirmed ? <SoftButton label="继续编辑" disabled={action !== null} onClick={() => setDiscardEditConfirmed(false)}>继续编辑</SoftButton> : null}
          </View> : null}
          {editStorageError ? <StatusPanel state="ERROR" detail={`本机编辑保存异常：${editStorageError}；请保留当前页面，避免丢失输入。`} /> : null}
          {saveRecoveryError ? <StatusPanel state="ERROR"
            detail="本机导入重试信息暂不可用。清理只影响旧请求的重试身份，当前输入和服务器草稿保留；请先核对列表，避免重复建立。"
            recoveryLabel={recoveryReviewed ? "已核对，确认清理恢复信息" : "刷新列表并核对"}
            onRecover={action ? undefined : () => void clearSaveRecovery(recoveryReviewed)} /> : null}
          {imports.isPending ? <StatusPanel state="LOADING" detail="正在加载导入草稿。" /> : null}
          {imports.refreshError || imports.data?.dataState === "STALE_USABLE" ? <StatusPanel state="STALE"
            detail={imports.refreshError ? "导入列表更新失败，暂时显示上次记录；当前编辑内容已保留。" : "当前显示上次获取的导入列表，尚未确认最新状态；当前编辑内容已保留。"}
            recoveryLabel="重新获取列表"
            onRecover={() => void imports.refetch().catch(() => {})} /> : null}
          {selectedId && !isCreatingNew && (detail.refreshError || detail.data?.dataState === "STALE_USABLE") ? <StatusPanel state="STALE"
            detail={detail.refreshError ? "这份导入记录更新失败，暂时保留上次内容；当前编辑不会清除。" : "这份导入记录仍是上次获取的内容，尚未确认最新状态；当前编辑不会清除。"}
            recoveryLabel="重新获取记录"
            onRecover={() => void detail.refetch().catch(() => {})} /> : null}
          {imports.isError ? (
            <StatusPanel
              state={isPermissionDenied(imports.error) ? "PERMISSION_DENIED" : "ERROR"}
              detail={`导入列表暂时无法加载：${errorMessage(imports.error)}`}
              recoveryLabel="重试"
              onRecover={() => void imports.refetch().catch(() => {})}
            />
          ) : null}

          <View className="import-source-card card" data-od-id="import-source-rights" data-control="import-source-rights">
            <Text className="type-section">来源与权利</Text>
            <Text className="type-caption">只导入你有权使用的文字与媒体；可仅引用来源链接、地点和日期，不复制来源正文或照片。</Text>
            <View className="import-platform-grid" role="radiogroup" aria-label="来源平台">
              {PLATFORMS.map((item) => (
                <Button
                  key={item.key}
                  data-od-id={`import-platform-${item.key.toLowerCase()}`}
                  className={`chip focus-ring${platform === item.key ? " chip--selected" : ""}`}
                  aria-pressed={platform === item.key}
                  disabled={Boolean(draft) || action !== null}
                  onClick={() => { keepEdit({ platform: item.key }); setPlatform(item.key); }}
                >
                  <Text>{item.label}</Text>
                </Button>
              ))}
            </View>
            <View className="import-field-group">
              <Text className="type-label">原始内容链接</Text>
              <Input
                className="field"
                data-od-id="import-source-url"
                ariaLabel="原始内容链接"
                value={sourceUrl}
                focus={sourceFocus}
                onBlur={() => setSourceFocus(false)}
                maxlength={2048}
                disabled={Boolean(draft) || action !== null}
                placeholder="https://example.com/post"
                onInput={(event) => {
                  keepEdit({ sourceUrl: event.detail.value }); setSourceUrl(event.detail.value);
                  setValidationMessage("");
                }}
              />
              {validationMessage && (!sourceValidation || !sourceValidation.ok) ? (
                <View className="import-validation" role="alert">{validationMessage}</View>
              ) : sourceValidation && !sourceValidation.ok ? (
                <View className="import-validation" role="alert">{sourceValidation.recovery.join("；")}</View>
              ) : null}
            </View>
            <View id="import-rights-section">
            <ToggleField id="import-rights-confirmation"
              label="我有权使用这些文字与媒体，并同意审核"
              description="确认权利后仍需审核，不会自动公开。"
              checked={rightsConfirmed}
              disabled={currentStage === "SUBMIT" || action !== null}
              stateLabels={{ checked: "已确认", unchecked: "未确认" }}
              onChange={value => { keepEdit({ rightsConfirmed: value }); setRightsConfirmed(value); }} />
            </View>
            {validationMessage && sourceValidation?.ok ? <View className="import-validation" role="alert">{validationMessage}</View> : null}
            {!draft ? (
              <View data-od-id="import-create-draft">
                <SoftButton variant="primary" label="建立导入草稿" disabled={action !== null} onClick={() => void beginCreate()}>
                  {action === "CREATE" ? "建立中…" : "建立导入草稿"}
                </SoftButton>
              </View>
            ) : (
              <View className="import-selected-draft">
                <Text className="type-caption">{draft.title.value || "未命名草稿"} · {platformLabel(draft.platform)}</Text>
                <View data-od-id="import-new-draft">
                  <SoftButton label="新建另一条导入" disabled={action !== null} onClick={beginAnotherImport}>
                    新建另一条导入
                  </SoftButton>
                </View>
              </View>
            )}
            <Text className="type-caption import-capability-note">
              导入暂不可用时会保留已填写的来源，方便稍后重试。
            </Text>
          </View>

          {draft ? (
            <>
              <View className="import-stage-strip" role="list" aria-label="导入流程阶段">
                {STAGES.map((stage, index) => (
                  <View className={`import-stage${index === currentStageIndex ? " import-stage--current" : ""}${index < currentStageIndex ? " import-stage--done" : ""}`} key={stage.key} role="listitem">
                    <Text className="import-stage__index">{index + 1}</Text>
                    <Text className="type-caption">{stage.label}</Text>
                  </View>
                ))}
              </View>

              <View className="import-draft-card card" data-od-id="import-draft-editor" data-control="import-draft-editor">
                <View className="import-section-heading">
                  <View>
                    <Text className="type-section">编辑草稿</Text>
                    <Text className="type-caption">请核对解析结果；你的修改会保留。</Text>
                  </View>
                  <Text className="import-status-pill">{PARSE_LABEL[draft.parseState]}</Text>
                </View>
                <View className="import-parse-note" role="status">
                  <Text className="type-caption">{parseStatusText(draft)}</Text>
                </View>
                <View className="import-field-group" id="import-title-section">
                  <Text className="type-label">标题</Text>
                  <Input className="field" ariaLabel="标题" data-od-id="import-title" value={title} focus={editorFocus === "import-title-section"} onBlur={() => setEditorFocus("")} maxlength={160} disabled={!canEdit} placeholder="为导入内容补充标题" onInput={(event) => { keepEdit({ title: event.detail.value }); setTitle(event.detail.value); }} />
                </View>
                <View className="import-field-group" id="import-body-section">
                  <Text className="type-label">正文</Text>
                  <Textarea className="field import-body-field" ariaLabel="正文" data-od-id="import-body" value={body} focus={editorFocus === "import-body-section"} onBlur={() => setEditorFocus("")} maxlength={6000} disabled={!canEdit} placeholder="编辑可公开或仅自己保留的正文" onInput={(event) => { keepEdit({ body: event.detail.value }); setBody(event.detail.value); }} />
                  <Text className="type-caption">{body.length}/6000 字</Text>
                </View>
                <View className="import-field-group">
                  <Text className="type-label">来源备注</Text>
                  <Input className="field" ariaLabel="来源备注" data-od-id="import-source-note" value={sourceNote} maxlength={500} disabled={!canEdit} placeholder="保留原平台、原链接与必要说明" onInput={(event) => { keepEdit({ sourceNote: event.detail.value }); setSourceNote(event.detail.value); }} />
                </View>
                <View className="import-rights-row">
                  <View>
                    <Text className="type-label">公开可见性</Text>
                    <Text className="type-caption">仅保存你的选择；是否公开仍受审核与内容政策约束。</Text>
                  </View>
                  <View className="import-visibility-actions">
                    <Button className={`chip focus-ring${visibility === "PRIVATE" ? " chip--selected" : ""}`} disabled={!canEdit || action !== null} aria-pressed={visibility === "PRIVATE"} onClick={() => { keepEdit({ visibility: "PRIVATE" }); setVisibility("PRIVATE"); }}>私有</Button>
                    <Button className={`chip focus-ring${visibility === "PUBLIC" ? " chip--selected" : ""}`} disabled={!canEdit || action !== null} aria-pressed={visibility === "PUBLIC"} onClick={() => { keepEdit({ visibility: "PUBLIC" }); setVisibility("PUBLIC"); }}>公开</Button>
                  </View>
                </View>
                {currentStage === "SOURCE" ? (
                  <View data-od-id="import-enter-edit-draft">
                    <SoftButton variant="primary" label="进入编辑草稿" disabled={action !== null} onClick={() => void saveCurrent("EDIT_DRAFT")}>
                      {action === "STAGE" ? "进入中…" : "进入编辑草稿"}
                    </SoftButton>
                  </View>
                ) : (
                  <SoftButton label={action === "SAVE" ? "保存中" : dirtyEdit.current ? "保存当前草稿" : "已保存，可再次保存"} disabled={action !== null || !canEdit} onClick={() => void saveCurrent()}>
                    {action === "SAVE" ? "保存中…" : dirtyEdit.current ? "保存当前草稿" : "已保存"}
                  </SoftButton>
                )}
              </View>

              <View className="import-association-card card" data-od-id="import-spot-association" data-control="import-spot-association">
                <Text className="type-section">关联对象</Text>
                <Text className="type-caption">选择内容实际对应的正式地点；未收录的地点可以提交提议，审核前不会成为正式观星点。</Text>
                <View className="import-association-options" role="radiogroup" aria-label="导入关联对象">
                  <Button data-od-id="import-association-formal" className={`import-association-option focus-ring${association === "FORMAL" ? " import-association-option--selected" : ""}`} disabled={!canEdit || action !== null} aria-pressed={association === "FORMAL"} onClick={() => setAssociationValue("FORMAL")}>
                    <Text className="type-label">关联正式观星点</Text>
                    <Text className="type-caption">搜索并选择已收录的正式地点。</Text>
                  </Button>
                  <Button data-od-id="import-association-proposal" className={`import-association-option focus-ring${association === "PROPOSAL" ? " import-association-option--selected" : ""}`} disabled={!canEdit || action !== null} aria-pressed={association === "PROPOSAL"} onClick={() => setAssociationValue("PROPOSAL")}>
                    <Text className="type-label">建立独立地点提议</Text>
                    <Text className="type-caption">提出新的地点线索，等待单独审核。</Text>
                  </Button>
                  <Button className={`import-association-option focus-ring${association === "NONE" ? " import-association-option--selected" : ""}`} disabled={!canEdit || action !== null} aria-pressed={association === "NONE"} onClick={() => setAssociationValue("NONE")}>
                    <Text className="type-label">暂不关联</Text>
                    <Text className="type-caption">可继续编辑，但没有关联对象不能进入预览。</Text>
                  </Button>
                </View>
                {association === "FORMAL" ? (
                  <FormalSpotField id="import-formal-spot-id" key={draft.importDraftId} value={formalSpotId} contextId={contextId} disabled={!canEdit || action !== null} onChange={value => { keepEdit({ formalSpotId: value }); setFormalSpotId(value); }} />
                ) : null}
                <SoftButton label="保存关联选择" disabled={action !== null || !canEdit} onClick={() => void saveCurrent()}>
                  {action === "SAVE" ? "保存中…" : "保存关联选择"}
                </SoftButton>
              </View>

              <View className="import-preview-card card" data-od-id="import-preview-submit" data-control="import-preview-submit">
                <Text className="type-section">预览并提交</Text>
                {currentStage === "PREVIEW" || currentStage === "SUBMIT" ? <View className="import-preview-copy">
                  <Text className="type-label">{title.trim() || "（未填写标题）"}</Text>
                  <Text className="type-body">{body.trim() || "（未填写正文）"}</Text>
                  <Text className="type-caption">{association === "FORMAL" ? (formalSpotId ? "已选择正式观星点" : "尚未选择正式地点") : association === "PROPOSAL" ? "独立地点提议：待审核" : "尚未关联点位"}</Text>
                </View> : null}
                {draft.parseState === "FAILED" ? <Text className="type-caption import-warning">自动解析失败，请手动补充并核对内容。</Text> : null}
                {currentStage === "EDIT_DRAFT" ? (
                  <View data-od-id="import-save-association">
                    <SoftButton variant="primary" label="进入预览" disabled={action !== null || association === "NONE"} onClick={() => void saveCurrent("ASSOCIATE_SPOT")}>
                      {action === "STAGE" ? "保存关联中…" : "保存关联并继续"}
                    </SoftButton>
                  </View>
                ) : null}
                {currentStage === "ASSOCIATE_SPOT" ? (
                  <View data-od-id="import-open-preview">
                    <SoftButton variant="primary" label="打开预览" disabled={action !== null || association === "NONE"} onClick={() => void saveCurrent("PREVIEW")}>
                      {action === "STAGE" ? "预览中…" : "打开预览"}
                    </SoftButton>
                  </View>
                ) : null}
                {currentStage === "PREVIEW" ? (
                  <View data-od-id="import-submit-review">
                    {previewRecovery ? <StatusPanel state="PARTIAL" detail={previewRecovery.detail} recoveryLabel={previewRecovery.label} onRecover={action ? undefined : recoverPreview} /> : null}
                    <SoftButton variant="primary" label="提交人工审核" disabled={action !== null || !rightsConfirmed || !title.trim() || !body.trim()} onClick={() => void saveCurrent("SUBMIT")}>
                      {action === "STAGE" ? "提交中…" : "提交人工审核"}
                    </SoftButton>
                  </View>
                ) : null}
                {currentStage === "SUBMIT" ? <StatusPanel state="READY" detail="已提交审核；公开发布和正式地点创建仍由后续审核/发布流程决定。" /> : null}
              </View>
            </>
          ) : null}

          <View className="import-history-card card">
            <View className="import-section-heading">
              <View>
                <Text className="type-section">已有导入草稿</Text>
                <Text className="type-caption">选择已保存的草稿，继续编辑或查看审核进度。</Text>
              </View>
              <Text className="type-caption">{imports.data ? `${listItems.length} 条` : "—"}</Text>
            </View>
            {listItems.length ? listItems.map((item) => (
              <Button key={item.importDraftId} disabled={action !== null} className={`import-history-row focus-ring${selectedId === item.importDraftId ? " import-history-row--selected" : ""}`} aria-pressed={selectedId === item.importDraftId} onClick={() => selectDraft(item.importDraftId)}>
                <View>
                  <Text className="type-label">{item.title.value || item.originalUrl}</Text>
                  <Text className="type-caption">{STAGES.find((stage) => stage.key === item.stage)?.label ?? "草稿"} · {REVIEW_LABEL[item.moderationState]}</Text>
                </View>
              </Button>
            )) : imports.data ? <Text className="type-caption">还没有导入草稿。</Text> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
