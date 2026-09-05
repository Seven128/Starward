import { FloatingNotificationHost } from "@/components/notification";
import { useRouter } from "@tarojs/taro";
import { Button, Input, ScrollView, Switch, Text, Textarea, View } from "@tarojs/components";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ImportDraft,
  ImportStage,
  PlatformKind,
} from "@starward/miniapp-contracts";
import { validateExternalUrl } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { StatusPanel } from "@/components/status-panel";
import { SoftButton } from "@/components/soft-button";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import {
  createPostImport,
  errorMessage,
  getPostImport,
  getPostImports,
  MiniappApiError,
  updatePostImport,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./index.scss";

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
      return `解析失败：${draft.parseReason || "没有可用解析结果"}；已编辑字段不会被覆盖。`;
    case "RUNNING":
      return "解析进行中；请保留当前草稿，稍后回读。";
    case "GATED":
      return `自动解析未开放：${draft.parseReason || "当前平台未配置解析能力"}；可继续手动编辑。`;
    default:
      return draft.parseReason || "尚未请求自动解析；可继续手动编辑。";
  }
}

export default function ImportPage() {
  const themeClass = useThemeClass();
  const router = useRouter();
  const notify = useAppStore((state) => state.notify);
  const routeSpotId = useAppStore((state) => state.selectedSpotId);
  const imports = useResourceQuery({
    queryKey: ["imports"],
    queryFn: (signal) => getPostImports(signal),
    staleTime: 15_000,
  });
  const [selectedId, setSelectedId] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const detail = useResourceQuery({
    queryKey: ["import", selectedId],
    queryFn: (signal) => getPostImport(selectedId, signal),
    enabled: Boolean(selectedId),
    staleTime: 10_000,
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
  const [action, setAction] = useState<"CREATE" | "SAVE" | "STAGE" | null>(null);
  const [localDraft, setLocalDraft] = useState<ImportDraft | null>(null);
  const hydratedDraftId = useRef("");

  const listItems = imports.data?.data.imports ?? [];
  const loadedDraft = detail.data?.data ?? null;
  const listDraft = listItems.find((item) => item.importDraftId === selectedId) ?? null;
  const draft = localDraft ?? loadedDraft ?? listDraft;
  const serverDraft = loadedDraft ?? listDraft;
  const isPermissionDenied = (error: unknown) =>
    error instanceof MiniappApiError && error.code === "PERMISSION_DENIED";

  useEffect(() => {
    const routeId = router.params.importDraftId ?? "";
    if (routeId) {
      if (routeId !== selectedId) setLocalDraft(null);
      setSelectedId(routeId);
      return;
    }
    if (!selectedId && !isCreatingNew && listItems[0])
      setSelectedId(listItems[0].importDraftId);
  }, [isCreatingNew, listItems, router.params.importDraftId, selectedId]);

  useEffect(() => {
    if (
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
  }, [selectedId, serverDraft]);

  const announce = (
    tone: "error" | "warning" | "success",
    titleText: string,
    bodyText: string,
  ) =>
    notify({
      owner: "import",
      placement: "inline",
      tone,
      title: titleText,
      body: bodyText,
      dismissible: true,
      dedupeKey: `import-${tone}-${titleText}`,
    });

  const beginCreate = async () => {
    setValidationMessage("");
    const normalized = validateExternalUrl(sourceUrl.trim());
    if (!normalized.ok || !normalized.normalizedUrl) {
      setValidationMessage(
        `来源链接不可用：${normalized.recovery.join("；") || "请粘贴完整的 http/https 链接"}。`,
      );
      return;
    }
    if (!rightsConfirmed) {
      setValidationMessage("请先确认你有权使用本次导入的文字与媒体，并同意进入审核。 ");
      return;
    }
    if (action) return;
    setAction("CREATE");
    try {
      const response = await createPostImport({
        platform,
        originalUrl: normalized.normalizedUrl,
        rightsConfirmed,
      });
      const created = response.data;
      setIsCreatingNew(false);
      setSelectedId(created.importDraftId);
      setLocalDraft(created);
      announce("success", "已建立导入草稿", "来源与权利声明已进入可回读的草稿记录。 ");
      await imports.refetch();
    } catch (error) {
      announce(
        "error",
        "导入草稿未建立",
        `${errorMessage(error)}；来源、权利和编辑输入均保留，没有伪造解析或持久化成功。`,
      );
    } finally {
      setAction(null);
    }
  };

  const saveCurrent = async (nextStage?: ImportStage) => {
    if (!draft || action) return null;
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
      announce("warning", "缺少正式 spot_id", "请填写已确认的 spot_id，或改用独立地点提议。 ");
      return null;
    }
    if (nextStage === "SUBMIT" && (!rightsConfirmed || !title.trim() || !body.trim())) {
      announce("warning", "预览信息不完整", "提交审核前需要权利确认、标题和正文；当前编辑保持不变。 ");
      return null;
    }
    setAction(nextStage ? "STAGE" : "SAVE");
    try {
      const response = await updatePostImport(draft.importDraftId, {
        expectedRevision: draft.revision,
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
      });
      setLocalDraft(response.data);
      announce(
        "success",
        nextStage === "SUBMIT" ? "已提交人工审核" : "导入草稿已保存",
        nextStage === "SUBMIT"
          ? "当前记录进入审核；不会自动发布内容，也不会创建正式观星点。"
          : "字段修订与来源沿袭已由服务端回读。",
      );
      await imports.refetch().catch(() => undefined);
      return response.data;
    } catch (error) {
      if (error instanceof MiniappApiError && error.code === "CONFLICT") {
        await detail.refetch().catch(() => undefined);
      }
      announce(
        "error",
        nextStage ? "导入阶段未推进" : "导入草稿未保存",
        `${errorMessage(error)}；本地编辑字段保留，可回读后重试。`,
      );
      return null;
    } finally {
      setAction(null);
    }
  };

  const setAssociationValue = (value: "FORMAL" | "PROPOSAL" | "NONE") => {
    setAssociation(value);
    if (value === "FORMAL" && !formalSpotId && routeSpotId)
      setFormalSpotId(routeSpotId);
  };

  const currentStage = draft?.stage ?? "SOURCE";
  const currentStageIndex = stageIndex(currentStage);
  const canEdit = Boolean(draft && currentStage !== "SUBMIT");
  const sourceValidation = useMemo(
    () => (sourceUrl.trim() ? validateExternalUrl(sourceUrl.trim()) : null),
    [sourceUrl],
  );
  const selectDraft = (id: string) => {
    if (id === selectedId) return;
    setIsCreatingNew(false);
    setLocalDraft(null);
    setSelectedId(id);
  };

  const beginAnotherImport = () => {
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
      <ScrollView scrollY enhanced bounces={false} showScrollbar={false} className="import-page__scroll hide-scrollbar">
        <View className="import-content page-inset safe-bottom">
          {imports.isPending ? <StatusPanel state="LOADING" detail="正在回读当前身份的导入草稿。" /> : null}
          {imports.isError ? (
            <StatusPanel
              state={isPermissionDenied(imports.error) ? "PERMISSION_DENIED" : "ERROR"}
              detail={`导入列表暂不可用：${errorMessage(imports.error)}；不会用本机猜测替代服务端草稿。`}
              recoveryLabel="重试回读"
              onRecover={() => void imports.refetch()}
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
                  disabled={Boolean(draft)}
                  onClick={() => setPlatform(item.key)}
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
                value={sourceUrl}
                maxlength={2048}
                disabled={Boolean(draft)}
                placeholder="https://example.com/post"
                onInput={(event) => {
                  setSourceUrl(event.detail.value);
                  setValidationMessage("");
                }}
              />
              {sourceValidation && !sourceValidation.ok ? (
                <View className="import-validation" role="alert">{sourceValidation.recovery.join("；")}</View>
              ) : null}
            </View>
            <View className="import-rights-row">
              <View>
                <Text className="type-label">我有权使用本次导入的文字与媒体，并同意进入审核</Text>
                <Text className="type-caption">仅引用来源元数据时，不要粘贴或上传权利未经确认的正文、照片；声明也不代表自动公开。</Text>
              </View>
              <Switch
                data-od-id="import-rights-confirmation"
                checked={rightsConfirmed}
                color="var(--positive)"
                disabled={Boolean(draft && currentStage === "SUBMIT")}
                aria-label="确认本次导入文字与媒体的使用权并同意审核"
                onChange={(event) => setRightsConfirmed(event.detail.value)}
              />
            </View>
            {validationMessage ? <View className="import-validation" role="alert">{validationMessage}</View> : null}
            {!draft ? (
              <View data-od-id="import-create-draft">
                <SoftButton variant="primary" label="建立导入草稿" disabled={action !== null} onClick={() => void beginCreate()}>
                  {action === "CREATE" ? "建立中…" : "建立导入草稿"}
                </SoftButton>
              </View>
            ) : (
              <View className="import-selected-draft">
                <Text className="type-caption">已选草稿：{draft.importDraftId} · {platformLabel(draft.platform)}</Text>
                <View data-od-id="import-new-draft">
                  <SoftButton label="新建另一条导入" disabled={action !== null} onClick={beginAnotherImport}>
                    新建另一条导入
                  </SoftButton>
                </View>
              </View>
            )}
            <Text className="type-caption import-capability-note">
              当前服务端若未开放自有内容导入，会明确返回不可用；来源输入不会被清空或冒充成功。
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
                    <Text className="type-caption">解析只提供起点；手工修订字段不会被后续解析静默覆盖。</Text>
                  </View>
                  <Text className="import-status-pill">{draft.parseState}</Text>
                </View>
                <View className="import-parse-note" role="status">
                  <Text className="type-caption">{parseStatusText(draft)}</Text>
                </View>
                <View className="import-field-group">
                  <Text className="type-label">标题</Text>
                  <Input className="field" data-od-id="import-title" value={title} maxlength={160} disabled={!canEdit} placeholder="为导入内容补充标题" onInput={(event) => setTitle(event.detail.value)} />
                </View>
                <View className="import-field-group">
                  <Text className="type-label">正文</Text>
                  <Textarea className="field import-body-field" data-od-id="import-body" value={body} maxlength={6000} disabled={!canEdit} placeholder="编辑可公开或仅自己保留的正文" onInput={(event) => setBody(event.detail.value)} />
                  <Text className="type-caption">{body.length}/6000 · 当前服务端修订号 rev.{draft.revision}</Text>
                </View>
                <View className="import-field-group">
                  <Text className="type-label">来源备注</Text>
                  <Input className="field" data-od-id="import-source-note" value={sourceNote} maxlength={500} disabled={!canEdit} placeholder="保留原平台、原链接与必要说明" onInput={(event) => setSourceNote(event.detail.value)} />
                </View>
                <View className="import-rights-row">
                  <View>
                    <Text className="type-label">公开可见性</Text>
                    <Text className="type-caption">仅保存你的选择；是否公开仍受审核与内容政策约束。</Text>
                  </View>
                  <View className="import-visibility-actions">
                    <Button className={`chip focus-ring${visibility === "PRIVATE" ? " chip--selected" : ""}`} aria-pressed={visibility === "PRIVATE"} onClick={() => setVisibility("PRIVATE")}>私有</Button>
                    <Button className={`chip focus-ring${visibility === "PUBLIC" ? " chip--selected" : ""}`} aria-pressed={visibility === "PUBLIC"} onClick={() => setVisibility("PUBLIC")}>公开</Button>
                  </View>
                </View>
                {currentStage === "SOURCE" ? (
                  <View data-od-id="import-enter-edit-draft">
                    <SoftButton variant="primary" label="进入编辑草稿" disabled={action !== null} onClick={() => void saveCurrent("EDIT_DRAFT")}>
                      {action === "STAGE" ? "进入中…" : "进入编辑草稿"}
                    </SoftButton>
                  </View>
                ) : (
                  <SoftButton label="保存当前草稿" disabled={action !== null || !canEdit} onClick={() => void saveCurrent()}>
                    {action === "SAVE" ? "保存中…" : "保存当前草稿"}
                  </SoftButton>
                )}
              </View>

              <View className="import-association-card card" data-od-id="import-spot-association" data-control="import-spot-association">
                <Text className="type-section">关联对象</Text>
                <Text className="type-caption">正式 spot_id 与独立 spot_proposal_id 二选一；提议不会直接创建正式观星点。</Text>
                <View className="import-association-options" role="radiogroup" aria-label="导入关联对象">
                  <Button data-od-id="import-association-formal" className={`import-association-option focus-ring${association === "FORMAL" ? " import-association-option--selected" : ""}`} aria-pressed={association === "FORMAL"} onClick={() => setAssociationValue("FORMAL")}>
                    <Text className="type-label">关联正式观星点</Text>
                    <Text className="type-caption">使用已存在且可核验的 spot_id。</Text>
                  </Button>
                  <Button data-od-id="import-association-proposal" className={`import-association-option focus-ring${association === "PROPOSAL" ? " import-association-option--selected" : ""}`} aria-pressed={association === "PROPOSAL"} onClick={() => setAssociationValue("PROPOSAL")}>
                    <Text className="type-label">建立独立地点提议</Text>
                    <Text className="type-caption">创建独立 proposal_id，等待单独审核。</Text>
                  </Button>
                  <Button className={`import-association-option focus-ring${association === "NONE" ? " import-association-option--selected" : ""}`} aria-pressed={association === "NONE"} onClick={() => setAssociationValue("NONE")}>
                    <Text className="type-label">暂不关联</Text>
                    <Text className="type-caption">可继续编辑，但没有关联对象不能进入预览。</Text>
                  </Button>
                </View>
                {association === "FORMAL" ? (
                  <View className="import-field-group">
                    <Text className="type-label">正式 spot_id</Text>
                    <Input className="field" data-od-id="import-formal-spot-id" value={formalSpotId} maxlength={180} placeholder={routeSpotId || "spot:…"} onInput={(event) => setFormalSpotId(event.detail.value)} />
                    <Text className="type-caption">仅填写已由地图或详情确认的 spot_id；无可确认 ID 时请改用地点提议。</Text>
                  </View>
                ) : null}
                <SoftButton label="保存关联选择" disabled={action !== null || !canEdit} onClick={() => void saveCurrent()}>
                  {action === "SAVE" ? "保存中…" : "保存关联选择"}
                </SoftButton>
              </View>

              <View className="import-preview-card card" data-od-id="import-preview-submit" data-control="import-preview-submit">
                <Text className="type-section">预览并提交</Text>
                <View className="import-preview-copy">
                  <Text className="type-label">{title.trim() || "（未填写标题）"}</Text>
                  <Text className="type-caption">{body.trim() || "（未填写正文）"}</Text>
                  <Text className="type-caption">{association === "FORMAL" ? `正式点位：${formalSpotId || routeSpotId || "待填写"}` : association === "PROPOSAL" ? "独立地点提议：待审核" : "尚未关联点位"}</Text>
                </View>
                {draft.parseState === "FAILED" ? <Text className="type-caption import-warning">解析失败没有被隐藏；请检查编辑字段后继续，系统不会伪造解析成功。</Text> : null}
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
                <Text className="type-caption">重启后从服务端回读；列表失败时不会显示为已成功。</Text>
              </View>
              <Text className="type-caption">{listItems.length} 条</Text>
            </View>
            {listItems.length ? listItems.map((item) => (
              <Button key={item.importDraftId} className={`import-history-row focus-ring${selectedId === item.importDraftId ? " import-history-row--selected" : ""}`} aria-pressed={selectedId === item.importDraftId} onClick={() => selectDraft(item.importDraftId)}>
                <View>
                  <Text className="type-label">{item.title.value || item.originalUrl}</Text>
                  <Text className="type-caption">{item.stage} · {item.moderationState} · rev.{item.revision}</Text>
                </View>
              </Button>
            )) : imports.data ? <Text className="type-caption">暂无可回读的导入草稿。</Text> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
