import { FloatingNotificationHost } from "@/components/notification";
import Taro from "@tarojs/taro";
import { Button, Input, ScrollView, Switch, Text, View } from "@tarojs/components";
import { useMemo, useState } from "react";
import type { PlatformKind, ProfileLink } from "@starward/miniapp-contracts";
import { validateExternalUrl } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { SemanticIcon } from "@/components/semantic-asset";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import {
  createProfileLink,
  deleteProfileLink,
  errorMessage,
  getProfileLinks,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
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
  const links = useResourceQuery({
    queryKey: ["profile-links"],
    queryFn: (signal) => getProfileLinks(signal),
    staleTime: 30_000,
  });
  const [platform, setPlatform] = useState<PlatformKind>("XIAOHONGSHU");
  const [displayName, setDisplayName] = useState("");
  const [url, setUrl] = useState("");
  const [publicLink, setPublicLink] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [mutation, setMutation] = useState<
    | { kind: "SAVE" }
    | { kind: "DELETE"; id: string }
    | null
  >(null);

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
      placement: "inline",
      tone,
      title,
      body,
      dismissible: true,
      dedupeKey: `profile-links-${tone}-${title}`,
    });

  const save = async () => {
    const label = displayName.trim();
    const result = validateExternalUrl(url.trim());
    setValidationMessage("");
    if (!label) {
      setValidationMessage("请填写主页名称；当前输入会保留。 ");
      return;
    }
    if (!result.ok || !result.normalizedUrl) {
      setValidationMessage(
        `链接不可用：${result.recovery.join("；") || "请检查链接"}。`,
      );
      return;
    }
    if (mutation) return;
    setMutation({ kind: "SAVE" });
    try {
      await createProfileLink({
        platform,
        displayName: label,
        url: result.normalizedUrl,
        visibility: publicLink ? "PUBLIC" : "PRIVATE",
        sortOrder: activeLinks.length,
      });
      setDisplayName("");
      setUrl("");
      setPublicLink(false);
      announce("success", "主页链接已保存", "服务端已回读当前账户的主页关系。 ");
      await links.refetch();
    } catch (error) {
      announce(
        "error",
        "主页链接未保存",
        `${errorMessage(error)}；名称、可见性和链接输入均保留，可重试。`,
      );
    } finally {
      setMutation(null);
    }
  };

  const remove = async (link: ProfileLink) => {
    if (mutation) return;
    const confirmation = await Taro.showModal({
      title: "移除主页链接？",
      content: `将移除“${link.displayName}”这条账户关系；不会修改外部平台内容。`,
      confirmText: "移除",
      confirmColor: "#B53A3A",
    });
    if (!confirmation.confirm) return;
    setMutation({ kind: "DELETE", id: link.profileLinkId });
    try {
      await deleteProfileLink(link.profileLinkId);
      announce("success", "主页链接已移除", "已从当前账户关系中删除。 ");
      await links.refetch();
    } catch (error) {
      announce(
        "error",
        "主页链接未移除",
        `${errorMessage(error)}；原记录保持不变，可重试。`,
      );
    } finally {
      setMutation(null);
    }
  };

  const openOrCopy = async (link: ProfileLink) => {
    const result = validateExternalUrl(link.url);
    if (!result.ok || !result.normalizedUrl) {
      announce(
        "error",
        "链接已被拦截",
        "该地址不符合安全 URL 策略；没有打开，也没有复制危险地址。",
      );
      return;
    }
    if (data?.tryOpenEnabled && (await tryOpenExternalUrl(result.normalizedUrl))) {
      announce("success", "已尝试打开主页", "如果微信拦截了外部跳转，仍可使用复制链接。 ");
      return;
    }
    try {
      await copyExternalUrl(result.normalizedUrl);
      announce(
        "warning",
        "已复制主页链接",
        "当前环境未开放外部跳转或跳转被拦截；复制链接仍可交给微信或浏览器打开。",
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
            <StatusPanel state="LOADING" detail="正在回读当前微信身份的主页链接。" />
          ) : null}
          {links.isError ? (
            <StatusPanel
              state={permissionDenied ? "PERMISSION_DENIED" : "ERROR"}
              detail={`主页链接暂不可用：${errorMessage(links.error)}；不会用本机猜测替代服务端关系。`}
              recoveryLabel="重试回读"
              onRecover={() => void links.refetch()}
            />
          ) : null}

          <View
            className="profile-links-editor card"
            data-od-id="profile-link-editor"
            data-control="profile-link-editor"
          >
            <View className="profile-links-section-heading">
              <View>
                <Text className="type-section">添加主页</Text>
                <Text className="type-caption">
                  只保存主页 URL 与账户关系；不会代替外部平台发布内容。
                </Text>
              </View>
            </View>
            <View className="profile-links-platform-grid" role="radiogroup" aria-label="平台">
              {PLATFORMS.map((item) => (
                <Button
                  key={item.key}
                  className={`chip focus-ring${platform === item.key ? " chip--selected" : ""}`}
                  aria-pressed={platform === item.key}
                  onClick={() => setPlatform(item.key)}
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
                maxlength={80}
                placeholder="例如：我的观星记录"
                onInput={(event) => {
                  setDisplayName(event.detail.value);
                  setValidationMessage("");
                }}
              />
            </View>
            <View className="profile-links-field-group">
              <Text className="type-label">主页链接</Text>
              <Input
                className="field"
                value={url}
                maxlength={2048}
                type="text"
                placeholder="https://example.com/your-profile"
                onInput={(event) => {
                  setUrl(event.detail.value);
                  setValidationMessage("");
                }}
              />
              {validationMessage ? (
                <View className="profile-links-validation" role="alert">
                  {validationMessage}
                </View>
              ) : null}
            </View>
            <View className="profile-links-visibility-row">
              <View>
                <Text className="type-label">对外显示</Text>
                <Text className="type-caption">
                  私有关系不会出现在公开资料；公开前仍需服务端能力允许。
                </Text>
              </View>
              <Switch
                checked={publicLink}
                color="var(--positive)"
                aria-label="公开显示主页链接"
                onChange={(event) => setPublicLink(event.detail.value)}
              />
            </View>
            <SoftButton
              variant="primary"
              label="保存主页链接"
              disabled={mutation !== null}
              onClick={() => void save()}
            >
              {mutation?.kind === "SAVE" ? "保存中…" : "保存主页链接"}
            </SoftButton>
            <Text className="type-caption profile-links-capability-note">
              {data?.tryOpenEnabled
                ? "当前环境允许尝试外部打开；失败时始终保留复制入口。"
                : "当前环境未开放外部打开；每条有效链接都保留复制入口。"}
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
                <Text className="type-caption">只显示当前微信身份的链接关系。</Text>
              </View>
              <Text className="type-caption">{activeLinks.length} 条</Text>
            </View>
            {links.data && activeLinks.length === 0 ? (
              <Text className="type-caption">还没有主页链接；添加后会在这里回读。</Text>
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
                    {link.visibility === "PUBLIC" ? "公开关系" : "私有关系"} · 更新 {link.updatedAt.slice(0, 16).replace("T", " ")}
                  </Text>
                </View>
                <View className="profile-link-row__actions">
                  <SoftButton
                    label="打开或复制主页链接"
                    onClick={() => void openOrCopy(link)}
                  >
                    <SemanticIcon name="horizon" />
                    <Text>打开 / 复制</Text>
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
