import Taro from "@tarojs/taro";
import {
  Input,
  Picker,
  Switch,
  Text,
  Textarea,
  View,
} from "@tarojs/components";
import { useEffect, useState } from "react";
import {
  DEMO_SPOTS,
  validateExternalUrl,
  type ImportDraft,
  type ImportStage,
  type PlatformKind,
} from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { NotificationRegion } from "@/components/notification";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import {
  createPostImport,
  errorMessage,
  getPostImport,
  MiniappApiError,
  updatePostImport,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./index.scss";

const STAGES: ImportStage[] = [
  "SOURCE",
  "EDIT_DRAFT",
  "ASSOCIATE_SPOT",
  "PREVIEW",
  "SUBMIT",
];
const STAGE_LABEL: Record<ImportStage, string> = {
  SOURCE: "来源",
  EDIT_DRAFT: "编辑草稿",
  ASSOCIATE_SPOT: "关联点位",
  PREVIEW: "预览",
  SUBMIT: "提交",
};
const PLATFORMS: PlatformKind[] = [
  "XIAOHONGSHU",
  "WEIBO",
  "WECHAT_CHANNELS",
  "OTHER",
];
const PLATFORM_LABEL: Record<PlatformKind, string> = {
  XIAOHONGSHU: "小红书",
  WEIBO: "微博",
  WECHAT_CHANNELS: "视频号",
  OTHER: "其他平台",
};

export default function ImportPage() {
  const themeClass = useThemeClass();
  const stored = useAppStore((state) => state.importDraft);
  const setStored = useAppStore((state) => state.setImportDraft);
  const [draft, setDraft] = useState<ImportDraft | null>(stored);
  const [platformIndex, setPlatformIndex] = useState(
    stored ? PLATFORMS.indexOf(stored.platform) : 0,
  );
  const [url, setUrl] = useState(stored?.originalUrl ?? "");
  const [rights, setRights] = useState(stored?.rightsConfirmed ?? false);
  const [busy, setBusy] = useState(false);
  const notify = useAppStore((state) => state.notify);
  const announce = (
    tone: "error" | "warning" | "info" | "success",
    title: string,
    body: string,
  ) => {
    notify({
      owner: "profile-content",
      placement: "inline",
      tone,
      title,
      body,
      dismissible: true,
      dedupeKey: `profile-content-${tone}-${title}-${body.slice(0, 48)}`,
    });
  };
  const saveLocal = (next: ImportDraft) => {
    setDraft(next);
    setStored(next);
  };
  const draftQuery = useResourceQuery({
    queryKey: ["post-import", draft?.importDraftId ?? "none"],
    queryFn: (signal) => {
      if (!draft) return Promise.reject(new Error("import_draft_missing"));
      return getPostImport(draft.importDraftId, signal);
    },
    enabled: Boolean(draft),
    staleTime: 10_000,
  });
  useEffect(() => {
    const remote = draftQuery.data?.data;
    if (!remote || (draft && remote.revision <= draft.revision)) return;
    saveLocal(remote);
    setRights(remote.rightsConfirmed);
  }, [draft, draftQuery.data]);

  const start = async () => {
    const validation = validateExternalUrl(url);
    if (!validation.ok || !validation.normalizedUrl) {
      announce(
        "error",
        "来源未保存",
        `来源链接无效：${validation.code}。${validation.recovery.join(" ")}；输入未清空。`,
      );
      return;
    }
    setBusy(true);
    try {
      const result = await createPostImport({
        platform: PLATFORMS[platformIndex]!,
        originalUrl: validation.normalizedUrl,
        rightsConfirmed: rights,
      });
      saveLocal(result.data);
      announce(
        "warning",
        "来源已保存",
        "来源已持久化。自动解析未获许可；手动导入始终可用。",
      );
    } catch (error) {
      announce("error", "来源未保存", `${errorMessage(error)}；输入未清空。`);
    } finally {
      setBusy(false);
    }
  };
  const patchField = (key: "title" | "body" | "sourceNote", value: string) => {
    if (!draft) return;
    saveLocal({
      ...draft,
      [key]: { ...draft[key], value, editedByUser: true },
    });
  };
  const preserveDraftAfterConflict = async (local: ImportDraft) => {
    const refreshed = await draftQuery.refetch().catch(() => undefined);
    if (!refreshed) return;
    const remote = refreshed.data;
    saveLocal({
      ...remote,
      rightsConfirmed: local.rightsConfirmed,
      title: { ...remote.title, value: local.title.value, editedByUser: true },
      body: { ...remote.body, value: local.body.value, editedByUser: true },
      sourceNote: {
        ...remote.sourceNote,
        value: local.sourceNote.value,
        editedByUser: true,
      },
      visibility: {
        ...remote.visibility,
        value: local.visibility.value,
        editedByUser: true,
      },
    });
  };
  const persist = async (
    local: ImportDraft,
    patch: Omit<Parameters<typeof updatePostImport>[1], "expectedRevision">,
  ) => {
    setBusy(true);
    try {
      const result = await updatePostImport(local.importDraftId, {
        ...patch,
        expectedRevision: local.revision,
      });
      saveLocal(result.data);
      return result.data;
    } catch (error) {
      if (error instanceof MiniappApiError && error.code === "CONFLICT") {
        await preserveDraftAfterConflict(local);
        announce(
          "warning",
          "草稿有新修订",
          "服务端草稿已有新修订；已刷新版本号并保留本页全部人工输入，请核对后重试。",
        );
      } else {
        announce(
          "error",
          "草稿未同步",
          `${errorMessage(error)}；本页输入完整保留，可重试。`,
        );
      }
      return null;
    } finally {
      setBusy(false);
    }
  };
  const go = async (stage: ImportStage) => {
    if (!draft) return;
    if (stage === "EDIT_DRAFT" && !draft.rightsConfirmed) {
      announce(
        "error",
        "无法进入编辑",
        "必须先确认本人拥有导入与再发布权利；草稿未清空。",
      );
      return;
    }
    if (stage === "PREVIEW" && !draft.spotId && !draft.spotProposalId) {
      announce(
        "error",
        "无法预览",
        "预览前请选择正式点位或创建独立点位提案；草稿仍保留。",
      );
      return;
    }
    if (
      stage === "SUBMIT" &&
      (!draft.title.value.trim() ||
        !draft.body.value.trim() ||
        !draft.rightsConfirmed)
    ) {
      announce(
        "error",
        "无法提交",
        "提交前需完成权利确认、标题和正文；草稿未清空。",
      );
      return;
    }
    const saved = await persist(draft, {
      stage,
      rightsConfirmed: draft.rightsConfirmed,
      title: draft.title.value,
      body: draft.body.value,
      sourceNote: draft.sourceNote.value,
      visibility: draft.visibility.value,
    });
    if (!saved) return;
    announce(
      stage === "SUBMIT" ? "success" : "info",
      stage === "SUBMIT" ? "已提交审核" : `已进入${STAGE_LABEL[stage]}`,
      stage === "SUBMIT"
        ? "Demo 已完成提交闭环：内容进入待审核状态；点位提案保持独立审核，不会自动创建正式点位。"
        : `已进入${STAGE_LABEL[stage]}；当前草稿仍可返回修改。`,
    );
  };
  const associateSpot = async (index: number) => {
    if (!draft) return;
    const spot = DEMO_SPOTS[index];
    if (!spot) return;
    const saved = await persist(draft, { spotId: spot.spotId });
    if (saved)
      announce(
        "success",
        "已关联正式点位",
        `${spot.name}；仍可返回编辑或更换关联。`,
      );
  };
  const createProposal = async () => {
    if (!draft) return;
    const saved = await persist(draft, { createProposal: true });
    if (saved)
      announce(
        "warning",
        "已创建独立点位提案",
        "已创建独立点位提案草稿；它不会自动成为正式观星点。",
      );
  };
  const currentStage = draft?.stage ?? "SOURCE";
  return (
    <View className={`${themeClass} import-page`} data-route="own-post-import">
      <CustomNav title="导入我的观星帖" subtitle="白名单 · 手动闭环" back />
      <View className="import-content page-inset safe-bottom">
        <NotificationRegion owner="profile-content" placement="inline" />
        <View
          className="stage-track"
          aria-label={`导入流程，当前${STAGE_LABEL[currentStage]}`}
        >
          {STAGES.map((stage, index) => (
            <View
              key={stage}
              className={`stage-step${stage === currentStage ? " stage-step--active" : draft && index < STAGES.indexOf(currentStage) ? " stage-step--done" : ""}`}
            >
              <Text>{index + 1}</Text>
              <Text className="type-caption">{STAGE_LABEL[stage]}</Text>
            </View>
          ))}
        </View>
        {draftQuery.isError ? (
          <StatusPanel
            state="STALE"
            detail={`服务端草稿暂不可回读，继续保留本机可恢复副本：${errorMessage(draftQuery.error)}。`}
            recoveryLabel="重试回读"
            onRecover={() => void draftQuery.refetch()}
          />
        ) : null}
        {!draft || currentStage === "SOURCE" ? (
          <View className="import-form card">
            <Text className="type-section">1. 来源与权利确认</Text>
            <View className="form-group">
              <Text className="type-label">来源平台</Text>
              <Picker
                mode="selector"
                range={PLATFORMS.map((platform) => PLATFORM_LABEL[platform])}
                value={platformIndex}
                onChange={(event) =>
                  setPlatformIndex(Number(event.detail.value))
                }
              >
                <View className="field focus-ring">
                  <Text>{PLATFORM_LABEL[PLATFORMS[platformIndex]!]}</Text>
                </View>
              </Picker>
            </View>
            <View className="form-group">
              <Text className="type-label">原分享链接</Text>
              <Input
                className="field"
                value={url}
                maxlength={2048}
                placeholder="https://..."
                aria-label="原帖子分享链接"
                onInput={(event) => setUrl(event.detail.value)}
              />
            </View>
            <View className="rights-row">
              <View>
                <Text className="type-label">本人拥有导入和编辑权利</Text>
                <Text className="type-caption">未确认时不能进入编辑或提交</Text>
              </View>
              <Switch
                checked={rights}
                color="var(--primary)"
                aria-label="确认本人拥有导入和编辑权利"
                onChange={(event) => {
                  setRights(event.detail.value);
                  if (draft)
                    saveLocal({
                      ...draft,
                      rightsConfirmed: event.detail.value,
                    });
                }}
              />
            </View>
            <StatusPanel
              state="PARTIAL"
              detail="自动解析需要平台许可、URL allowlist、DNS/IP 复核、重定向/大小/MIME/超时和 SSRF 控制。当前门禁关闭，手动导入可用。"
            />
            <SoftButton
              variant="primary"
              disabled={busy}
              label="保存来源并进入手动编辑"
              onClick={() => {
                if (!draft) void start();
                else void go("EDIT_DRAFT");
              }}
            >
              {busy ? "保存中…" : draft ? "进入手动编辑" : "保存来源"}
            </SoftButton>
          </View>
        ) : null}
        {draft && currentStage === "EDIT_DRAFT" ? (
          <View className="import-form card">
            <Text className="type-section">2. 手动编辑草稿</Text>
            <StatusPanel
              state="PARTIAL"
              detail={`自动解析：${draft.parseState} · ${draft.parseReason}。重试/失败只可填充未编辑字段，当前用户编辑不会被覆盖。`}
            />
            <View className="form-group">
              <Text className="type-label">标题</Text>
              <Input
                className="field"
                value={draft.title.value}
                maxlength={120}
                placeholder="我的观星记录"
                aria-label="导入草稿标题"
                onInput={(event) => patchField("title", event.detail.value)}
              />
            </View>
            <View className="form-group">
              <Text className="type-label">正文</Text>
              <Textarea
                className="field field-textarea"
                value={draft.body.value}
                maxlength={6000}
                placeholder="手动粘贴并编辑本人内容"
                aria-label="导入草稿正文"
                onInput={(event) => patchField("body", event.detail.value)}
              />
            </View>
            <View className="form-group">
              <Text className="type-label">来源说明</Text>
              <Textarea
                className="field"
                value={draft.sourceNote.value}
                maxlength={500}
                autoHeight
                aria-label="编辑后的来源说明"
                onInput={(event) =>
                  patchField("sourceNote", event.detail.value)
                }
              />
            </View>
            <View className="rights-row">
              <View>
                <Text className="type-label">公开展示</Text>
                <Text className="type-caption">
                  默认仅自己可见；提交审核不等于自动公开
                </Text>
              </View>
              <Switch
                checked={draft.visibility.value === "PUBLIC"}
                color="var(--primary)"
                aria-label="导入内容公开展示"
                onChange={(event) =>
                  saveLocal({
                    ...draft,
                    visibility: {
                      ...draft.visibility,
                      value: event.detail.value ? "PUBLIC" : "PRIVATE",
                      editedByUser: true,
                    },
                  })
                }
              />
            </View>
            <View
              className="form-group"
              data-capability="media-upload-disabled"
            >
              <Text className="type-label">媒体</Text>
              <StatusPanel
                state="PARTIAL"
                detail="Demo 未配置私有对象存储、受控派生图、EXIF GPS 清理与内容安全回调，因此媒体上传保持关闭；标题、正文和来源沿袭仍可完成手动导入闭环。"
              />
              <SoftButton disabled label="媒体上传能力当前未接入">
                添加媒体 · 未接入
              </SoftButton>
            </View>
            <View className="import-actions">
              <SoftButton
                disabled={busy}
                label="返回来源"
                onClick={() => void go("SOURCE")}
              >
                上一步
              </SoftButton>
              <SoftButton
                variant="primary"
                disabled={busy}
                label="保存草稿并关联点位"
                onClick={() => void go("ASSOCIATE_SPOT")}
              >
                关联点位
              </SoftButton>
            </View>
          </View>
        ) : null}
        {draft && currentStage === "ASSOCIATE_SPOT" ? (
          <View className="import-form card">
            <Text className="type-section">3. 关联正式点位或提案</Text>
            <View className="form-group">
              <Text className="type-label">正式观星点</Text>
              <Picker
                mode="selector"
                range={DEMO_SPOTS.map(
                  (spot) => `${spot.name} · ${spot.region}`,
                )}
                value={Math.max(
                  0,
                  DEMO_SPOTS.findIndex((spot) => spot.spotId === draft.spotId),
                )}
                onChange={(event) =>
                  void associateSpot(Number(event.detail.value))
                }
              >
                <View className="field focus-ring">
                  <Text>
                    {draft.spotId
                      ? DEMO_SPOTS.find((spot) => spot.spotId === draft.spotId)
                          ?.name
                      : "选择已有正式点位"}
                  </Text>
                </View>
              </Picker>
            </View>
            <Text className="type-caption">或者</Text>
            <SoftButton
              disabled={busy}
              label="创建独立新增观星地点提案"
              onClick={() => void createProposal()}
            >
              {draft.spotProposalId
                ? `已创建 ${draft.spotProposalId}`
                : "新增地点提案"}
            </SoftButton>
            <StatusPanel
              state="PARTIAL"
              detail="点位提案与内容审核状态独立；提案提交不会自动生成正式 spot_id。"
            />
            <View className="import-actions">
              <SoftButton
                disabled={busy}
                label="返回编辑草稿"
                onClick={() => void go("EDIT_DRAFT")}
              >
                上一步
              </SoftButton>
              <SoftButton
                variant="primary"
                disabled={busy}
                label="进入导入预览"
                onClick={() => void go("PREVIEW")}
              >
                预览
              </SoftButton>
            </View>
          </View>
        ) : null}
        {draft && (currentStage === "PREVIEW" || currentStage === "SUBMIT") ? (
          <View className="import-form card">
            <Text className="type-section">
              {currentStage === "PREVIEW" ? "4. 提交前预览" : "5. 审核状态"}
            </Text>
            <View className="lineage-card">
              <Text className="type-label">持续来源沿袭</Text>
              <Text className="type-caption">
                平台：{PLATFORM_LABEL[draft.platform]}
              </Text>
              <Text className="type-caption">原链接：{draft.originalUrl}</Text>
              <Text className="type-caption">导入时间：{draft.importedAt}</Text>
              <Text className="type-caption">
                解析方式：手动（自动解析 {draft.parseState}）
              </Text>
              <Text className="type-caption">
                权利确认：{draft.rightsConfirmed ? "已确认" : "未确认"}
              </Text>
              <Text className="type-caption">
                来源说明：{draft.sourceNote.value}
              </Text>
            </View>
            <View className="preview-content">
              <Text className="type-page-title">
                {draft.title.value || "未填写标题"}
              </Text>
              <Text className="type-body">
                {draft.body.value || "未填写正文"}
              </Text>
              <Text className="type-caption">
                关联：{draft.spotId ?? draft.spotProposalId ?? "未关联"}
              </Text>
              <Text className="type-caption">
                可见性：{draft.visibility.value} · 不呈现为第三方平台官方内容
              </Text>
            </View>
            <View className="review-grid">
              <View>
                <Text className="type-label">内容审核</Text>
                <Text className="status-tag">{draft.moderationState}</Text>
              </View>
              <View>
                <Text className="type-label">点位提案审核</Text>
                <Text className="status-tag">{draft.proposalReviewState}</Text>
              </View>
            </View>
            {currentStage === "PREVIEW" ? (
              <View className="import-actions">
                <SoftButton
                  label="返回关联点位"
                  disabled={busy}
                  onClick={() => void go("ASSOCIATE_SPOT")}
                >
                  上一步
                </SoftButton>
                <SoftButton
                  variant="primary"
                  disabled={busy}
                  label="提交内容审核"
                  onClick={() => void go("SUBMIT")}
                >
                  提交审核
                </SoftButton>
              </View>
            ) : (
              <>
                <SoftButton
                  label="复制原始来源链接"
                  onClick={() =>
                    Taro.setClipboardData({ data: draft.originalUrl })
                      .then(() =>
                        announce(
                          "success",
                          "已复制来源",
                          "原始来源链接已复制；来源沿袭仍保留。",
                        ),
                      )
                      .catch((error) =>
                        announce(
                          "error",
                          "复制失败",
                          `${errorMessage(error)}；原始来源链接仍保留。`,
                        ),
                      )
                  }
                >
                  复制来源
                </SoftButton>
              </>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}
