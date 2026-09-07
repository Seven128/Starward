import { FloatingNotificationHost } from "@/components/notification";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Input, ScrollView, Text, View } from "@tarojs/components";
import { useId, useMemo, useRef, useState } from "react";
import { ToggleField } from "@/components/toggle-field";
import { displayBeijingTimestamp } from "@/utils/zoned-date";
import type { PlatformKind, ProfileLink } from "@starward/miniapp-contracts";
import { validateExternalUrl } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import {
  createProfileLink,
  clearProfileLinkSaveRecovery,
  currentDraftUserId,
  deleteProfileLink,
  errorMessage,
  getProfileLinks,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { useProfileDraft } from "./use-local-draft";
import { ProfileLinkRecoveryError } from "@/services/profile-link-retry";
import "./index.scss";

const PLATFORMS: readonly { key: PlatformKind; label: string }[] = [
  { key: "XIAOHONGSHU", label: "小红书" },
  { key: "WEIBO", label: "微博" },
  { key: "WECHAT_CHANNELS", label: "视频号" },
  { key: "OTHER", label: "其他" },
];

function platformLabel(platform: PlatformKind) {
  return PLATFORMS.find((item) => item.key === platform)?.label ?? "其他";
}

async function copyExternalUrl(url: string) {
  await Taro.setClipboardData({ data: url });
}

async function tryOpenExternalUrl(url: string) {
  const taroWithExternalUrl = Taro as unknown as {
    openUrl?: (options: { url: string }) => Promise<unknown>;
  };
  if (typeof taroWithExternalUrl.openUrl !== "function") return false;
  try {
    await taroWithExternalUrl.openUrl({ url });
    return true;
  } catch {
    return false;
  }
}

export default function ProfileLinksPage() {
  const themeClass = useThemeClass();
  const notify = useAppStore((state) => state.notify);
  const mountId = useId();
  const [, refreshIdentity] = useState(0);
  useDidShow(() => refreshIdentity((value) => value + 1));
  const owner = currentDraftUserId();
  const formOwner = useRef(owner);
  formOwner.current ??= owner;
  const links = useResourceQuery({
    queryKey: ["profile-links", owner ?? `unresolved:${mountId}`],
    queryFn: (signal) => getProfileLinks(signal, owner ?? undefined),
    staleTime: 30_000,
    throwOnRefetchError: true,
  });
  const localDraft = useProfileDraft(owner);
  const { platform, displayName, url, publicLink } = localDraft.value;
  const [validationMessage, setValidationMessage] = useState("");
  const [validationField, setValidationField] = useState<"displayName" | "url" | null>(null);
  const [saveRecoveryError, setSaveRecoveryError] = useState(false);
  const [mutation, setMutation] = useState<
    | { kind: "SAVE" }
    | { kind: "DELETE"; id: string }
    | null
  >(null);
  const mutationBusy = useRef(false);

  const data = links.data?.data;
  const activeLinks = useMemo(
    () => (data?.links ?? []).filter((link) => link.status === "ACTIVE"),
    [data?.links],
  );

  const announce = (
    tone: "error" | "warning" | "success",
    title: string,
    body: string,
  ) =>
    notify({
      owner: "profile-links",
      placement: "floating",
      tone,
      title,
      body,
      dismissible: true,
      dedupeKey: `profile-links-${tone}-${title}`,
    });

  const save = async () => {
    if (mutationBusy.current || localDraft.blocked) return;
    if (!owner || owner !== formOwner.current || owner !== currentDraftUserId()) {
      announce("warning", "请重新打开主页链接", "当前身份尚未就绪或已变化，输入不会转存到其他账户。");
      return;
    }
    const label = displayName.trim();
    const result = validateExternalUrl(url.trim());
    setValidationMessage("");
    if (!label) {
      setValidationField("displayName");
      setValidationMessage("请填写主页名称。");
      return;
    }
    if (!result.ok || !result.normalizedUrl) {
      setValidationField("url");
      setValidationMessage(
        `链接不可用：${result.recovery.join("；") || "请检查链接"}。`,
      );
      return;
    }
    mutationBusy.current = true;
    setMutation({ kind: "SAVE" });
    try {
      await createProfileLink({
        platform,
        displayName: label,
        url: result.normalizedUrl,
        visibility: publicLink ? "PUBLIC" : "PRIVATE",
        sortOrder: activeLinks.length,
      }, owner);
      if (currentDraftUserId() !== owner) return;
      localDraft.saved();
      setSaveRecoveryError(false);
      announce("success", "主页链接已保存", "链接已保存到当前账户。");
      await links.refetch().catch(() => {
        if (currentDraftUserId() !== owner) return;
        announce("warning", "链接已保存，列表暂未刷新", "请重试刷新列表，无需重复添加。");
      });
    } catch (error) {
      if (currentDraftUserId() !== owner) return;
      setSaveRecoveryError(error instanceof ProfileLinkRecoveryError);
      announce(
        "error",
        "请核对主页链接保存结果",
        `${errorMessage(error)}；当前输入仍保留。请先刷新列表核对，避免重复添加。`,
      );
    } finally {
      mutationBusy.current = false;
      setMutation(null);
    }
  };

  const clearSaveRecovery = async () => {
    if (mutationBusy.current || !owner || currentDraftUserId() !== owner) return;
    mutationBusy.current = true;
    setMutation({ kind: "SAVE" });
    try {
      await links.refetch();
      if (currentDraftUserId() !== owner) return;
      const confirmation = await Taro.showModal({
        title: "清理保存恢复记录？",
        content: "请先核对列表中是否已有该链接。清理恢复记录后再次保存可能重复添加；当前输入和已保存链接会保留。",
        confirmText: "确认清理",
        cancelText: "先核对",
      });
      if (!confirmation.confirm || currentDraftUserId() !== owner) return;
      clearProfileLinkSaveRecovery(owner);
      setSaveRecoveryError(false);
      announce("success", "恢复记录已清理", "当前输入仍保留，请核对已保存列表后再决定是否保存。");
    } catch (error) {
      if (currentDraftUserId() === owner) announce("warning", "恢复记录未清理", `${errorMessage(error)}；请稍后重试。`);
    } finally {
      mutationBusy.current = false;
      setMutation(null);
    }
  };

  const remove = async (link: ProfileLink) => {
    if (mutationBusy.current) return;
    if (!owner || owner !== currentDraftUserId()) return;
    mutationBusy.current = true;
    setMutation({ kind: "DELETE", id: link.profileLinkId });
    try {
      const confirmation = await Taro.showModal({
      title: "移除主页链接？",
      content: `将从你的主页链接中移除“${link.displayName}”，外部平台内容保留。`,
      confirmText: "移除",
      confirmColor: "#B53A3A",
    });
    if (!confirmation.confirm) return;
      if (currentDraftUserId() !== owner) return;
      await deleteProfileLink(link.profileLinkId, owner);
      if (currentDraftUserId() !== owner) return;
      announce("success", "主页链接已移除", "已从你的主页链接中移除。");
      await links.refetch().catch(() => {
        if (currentDraftUserId() !== owner) return;
        announce("warning", "链接已移除，列表暂未刷新", "请重试刷新列表。");
      });
    } catch (error) {
      if (currentDraftUserId() !== owner) return;
      announce(
        "error",
        "请核对主页链接移除结果",
        `${errorMessage(error)}；请先刷新列表确认当前状态，再决定是否重试。`,
      );
    } finally {
      mutationBusy.current = false;
      setMutation(null);
    }
  };

  const openOrCopy = async (link: ProfileLink) => {
    const result = validateExternalUrl(link.url);
    if (!result.ok || !result.normalizedUrl) {
      announce(
        "error",
        "链接已被拦截",
        "此链接不安全，无法打开或复制。",
      );
      return;
    }
    if (data?.tryOpenEnabled && (await tryOpenExternalUrl(result.normalizedUrl))) {
      announce("success", "已尝试打开主页", "若未能跳转，可复制链接后在浏览器中打开。");
      return;
    }
    try {
      await copyExternalUrl(result.normalizedUrl);
      announce(
        "warning",
        "已复制主页链接",
        "可粘贴到浏览器中打开。",
      );
    } catch (error) {
      announce("error", "链接未复制", `${errorMessage(error)}；请长按或重试。`);
    }
  };

  const permissionDenied =
    links.isError &&
    typeof links.error === "object" &&
    links.error !== null &&
    "code" in links.error &&
    (links.error as { code?: string }).code === "PERMISSION_DENIED";

  return (
    <View
      className={`${themeClass} profile-links-page`}
      data-route="profile-links"
      data-od-id="profile-links"
    >
      <FloatingNotificationHost />
      <CustomNav
        title="主页链接"
        back
        backOdId="profile-links-back-action"
        backFallbackTab="/pages/my/index"
      />
      <ScrollView
        scrollY
        enhanced
        showScrollbar={false}
        className="profile-links-page__scroll hide-scrollbar"
      >
        <View className="profile-links-content page-inset safe-bottom">
          {links.isPending ? (
            <StatusPanel state="LOADING" detail="正在加载主页链接。" />
          ) : null}
          {links.refreshError || links.data?.dataState === "STALE_USABLE" ? <StatusPanel state="STALE"
            detail={links.refreshError ? "主页链接更新失败，暂时显示上次列表；当前输入已保留。" : "当前显示上次获取的主页列表，尚未确认最新状态；当前输入已保留。"}
            recoveryLabel="重新获取链接"
            onRecover={() => void links.refetch().catch(() => {})} /> : null}
          {links.isError ? (
            <StatusPanel
              state={permissionDenied ? "PERMISSION_DENIED" : "ERROR"}
              detail={`主页链接暂时无法加载：${errorMessage(links.error)}`}
              recoveryLabel="重试"
              onRecover={() => void links.refetch().catch(() => {})}
            />
          ) : null}
          {localDraft.recovery ? (
            <View className="profile-links-editor card">
              <Text className="type-section">恢复未保存的输入</Text>
              <Text className="type-caption">此设备保留了当前账户上次填写的主页信息。若上次保存结果不明确，请先核对已保存列表，避免重复添加。</Text>
              <SoftButton label="恢复主页输入" onClick={localDraft.restore}>恢复输入</SoftButton>
              <SoftButton label="放弃主页输入" onClick={localDraft.discard}>放弃这份输入</SoftButton>
            </View>
          ) : null}
          {saveRecoveryError ? (
            <StatusPanel state="ERROR" detail="本机保存恢复记录暂不可用。先核对已保存列表，再决定是否清理旧记录；本页输入仍保留。"
              recoveryLabel={mutation ? undefined : "核对并清理恢复记录"}
              onRecover={mutation ? undefined : () => void clearSaveRecovery()} />
          ) : null}
          {localDraft.error ? (
            <StatusPanel state="ERROR" detail={localDraft.unreadable
              ? "本机草稿暂时无法读取或清理。已保存链接仍保留，清除草稿后可重新填写。"
              : "当前输入尚未成功保存在本机，请暂留此页；恢复存储后继续编辑可重试。"}
              recoveryLabel={localDraft.unreadable ? "清除本机输入副本" : undefined}
              onRecover={localDraft.unreadable ? localDraft.discard : undefined} />
          ) : null}

          <View
            className="profile-links-editor card"
            data-od-id="profile-link-editor"
            data-control="profile-link-editor"
          >
            <View className="profile-links-section-heading">
              <View>
                <Text className="type-section">添加主页</Text>
              </View>
            </View>
            <View className="profile-links-platform-grid" role="group" aria-label="平台，单选">
              {PLATFORMS.map((item) => (
                <Button
                  key={item.key}
                  className={`chip focus-ring${platform === item.key ? " chip--selected" : ""}`}
                  aria-pressed={platform === item.key}
                  disabled={mutation !== null || localDraft.blocked}
                  onClick={() => localDraft.change("platform", item.key)}
                >
                  <Text>{item.label}</Text>
                </Button>
              ))}
            </View>
            <View className="profile-links-field-group">
              <Text className="type-label">主页名称</Text>
              <Input
                className="field"
                value={displayName}
                focus={validationField === "displayName"}
                onBlur={() => setValidationField(null)}
                ariaLabel="主页名称"
                disabled={mutation !== null || localDraft.blocked}
                maxlength={80}
                placeholder="例如：我的观星记录"
                onInput={(event) => {
                  localDraft.change("displayName", event.detail.value);
                  setValidationMessage("");
                }}
              />
              {validationMessage && !displayName.trim() ? (
                <View className="profile-links-validation" role="alert">{validationMessage}</View>
              ) : null}
            </View>
            <View className="profile-links-field-group">
              <Text className="type-label">主页链接</Text>
              <Input
                className="field"
                value={url}
                focus={validationField === "url"}
                onBlur={() => setValidationField(null)}
                ariaLabel="主页链接"
                disabled={mutation !== null || localDraft.blocked}
                maxlength={2048}
                type="text"
                placeholder="https://example.com/your-profile"
                onInput={(event) => {
                  localDraft.change("url", event.detail.value);
                  setValidationMessage("");
                }}
              />
              {validationMessage && displayName.trim() ? (
                <View className="profile-links-validation" role="alert">
                  {validationMessage}
                </View>
              ) : null}
            </View>
            <ToggleField id="profile-link-visibility" label="对外显示"
              description="关闭后仅自己可见；公开显示需当前服务支持。"
              checked={publicLink} disabled={mutation !== null || localDraft.blocked} onChange={(value) => localDraft.change("publicLink", value)} />
            <SoftButton
              variant="primary"
              label="保存主页链接"
              disabled={mutation !== null || localDraft.blocked}
              onClick={() => void save()}
            >
              {mutation?.kind === "SAVE" ? "保存中…" : "保存主页链接"}
            </SoftButton>
            <Text className="type-caption profile-links-capability-note">
              {data?.tryOpenEnabled
                ? "可尝试打开主页；无法打开时可复制链接。"
                : "暂不支持直接打开主页，可复制链接后查看。"}
            </Text>
          </View>

          <View
            className="profile-links-list card"
            data-od-id="profile-link-open-copy"
            data-control="profile-link-open-copy"
          >
            <View className="profile-links-section-heading">
              <View>
                <Text className="type-section">已保存主页</Text>
              </View>
              <Text className="type-caption">{links.data ? `${activeLinks.length} 条` : "—"}</Text>
            </View>
            {links.data && activeLinks.length === 0 ? (
              <Text className="type-caption">还没有保存的主页。</Text>
            ) : null}
            {activeLinks.map((link) => (
              <View className="profile-link-row" key={link.profileLinkId}>
                <View className="profile-link-row__copy">
                  <View className="profile-link-row__title">
                    <Text className="type-label">{link.displayName}</Text>
                    <Text className="profile-link-platform">{platformLabel(link.platform)}</Text>
                  </View>
                  <Text className="type-caption profile-link-row__url">{link.url}</Text>
                  <Text className="type-caption">
                    {link.visibility === "PUBLIC" ? "公开" : "仅自己可见"} · 更新 {displayBeijingTimestamp(link.updatedAt)}
                  </Text>
                </View>
                <View className="profile-link-row__actions">
                  <SoftButton
                    label={data?.tryOpenEnabled ? "打开或复制主页链接" : "复制主页链接"}
                    onClick={() => void openOrCopy(link)}
                  >
                    {data?.tryOpenEnabled ? "打开 / 复制" : "复制链接"}
                  </SoftButton>
                  <SoftButton
                    label="移除主页链接"
                    disabled={mutation !== null}
                    onClick={() => void remove(link)}
                  >
                    {mutation?.kind === "DELETE" && mutation.id === link.profileLinkId
                      ? "移除中…"
                      : "移除"}
                  </SoftButton>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
