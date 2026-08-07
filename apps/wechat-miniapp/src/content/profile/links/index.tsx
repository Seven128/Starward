import Taro from "@tarojs/taro";
import { Input, Picker, Switch, Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import {
  validateExternalUrl,
  type PlatformKind,
  type ProfileLink,
} from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
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

const PLATFORMS: readonly PlatformKind[] = [
  "XIAOHONGSHU",
  "WEIBO",
  "WECHAT_CHANNELS",
  "OTHER",
];
const LABELS: Record<PlatformKind, string> = {
  XIAOHONGSHU: "小红书",
  WEIBO: "微博",
  WECHAT_CHANNELS: "视频号",
  OTHER: "其他平台",
};

export default function ProfileLinksPage() {
  const themeClass = useThemeClass();
  const links = useAppStore((state) => state.profileLinks);
  const saveProfileLink = useAppStore((state) => state.saveProfileLink);
  const replaceProfileLinks = useAppStore((state) => state.replaceProfileLinks);
  const [platformIndex, setPlatformIndex] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [url, setUrl] = useState("");
  const [isPublic, setPublic] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const linkQuery = useResourceQuery({
    queryKey: ["profile-links"],
    queryFn: (signal) => getProfileLinks(signal),
    staleTime: 15_000,
  });
  useEffect(() => {
    if (linkQuery.data) replaceProfileLinks(linkQuery.data.data.links);
  }, [linkQuery.data, replaceProfileLinks]);
  const save = async () => {
    const validation = validateExternalUrl(url);
    if (!validation.ok || !validation.normalizedUrl) {
      setFeedback(
        `链接未保存：${validation.code}。${validation.recovery.join(" ")}；草稿仍保留。`,
      );
      return;
    }
    if (!displayName.trim() || displayName.length > 80) {
      setFeedback("展示名称需为 1–80 个字符；草稿仍保留。");
      return;
    }
    if (links.some((link) => link.url === validation.normalizedUrl)) {
      setFeedback("这个链接已经存在；草稿仍保留。");
      return;
    }
    setSaving(true);
    try {
      const result = await createProfileLink({
        platform: PLATFORMS[platformIndex]!,
        displayName: displayName.trim(),
        url: validation.normalizedUrl,
        visibility: isPublic ? "PUBLIC" : "PRIVATE",
        sortOrder: links.length,
      });
      saveProfileLink(result.data);
      setDisplayName("");
      setUrl("");
      setFeedback(
        "链接已持久化。保存不表示平台隶属、API、抓取或深链授权。",
      );
    } catch (error) {
      setFeedback(`链接未保存：${errorMessage(error)}；输入完整保留，可重试。`);
    } finally {
      setSaving(false);
    }
  };
  const tryOpen = async (link: ProfileLink) => {
    const result = await Taro.showModal({
      title: "直接打开能力未启用",
      content:
        "当前未核验微信业务域名、平台深链和第三方规则。复制链接回退始终可用。",
      confirmText: "复制链接",
      cancelText: "取消",
    });
    if (result.confirm) await Taro.setClipboardData({ data: link.url });
  };
  const remove = async (link: ProfileLink) => {
    const confirmation = await Taro.showModal({
      title: "删除主页链接？",
      content: `将删除“${link.displayName}”；失败时链接保持不变。`,
      confirmColor: "#B53A3A",
    });
    if (!confirmation.confirm) return;
    setRemovingId(link.profileLinkId);
    try {
      const result = await deleteProfileLink(link.profileLinkId);
      replaceProfileLinks(result.data.links);
      setFeedback("链接已删除并从服务端回读。");
    } catch (error) {
      setFeedback(`链接未删除：${errorMessage(error)}；原链接保持不变。`);
    } finally {
      setRemovingId("");
    }
  };
  return (
    <View className={`${themeClass} links-page`} data-route="profile-links">
      <CustomNav title="外部主页链接" subtitle="中性标识 · 复制回退" back />
      <View className="links-content page-inset safe-bottom">
        <StatusPanel
          state="PARTIAL"
          detail="只保存用户声明的平台、名称、URL 与可见性；不抓取第三方资料，不保存 Cookie、Token 或第三方账号数据。"
        />
        {linkQuery.isError ? (
          <StatusPanel
            state="STALE"
            detail={`服务端链接暂不可回读，继续显示本机最后一次副本：${errorMessage(linkQuery.error)}。`}
            recoveryLabel="重试回读"
            onRecover={() => void linkQuery.refetch()}
          />
        ) : null}
        <View className="link-form card">
          <Text className="type-section">添加主页链接</Text>
          <View className="form-group">
            <Text className="type-label">平台类型</Text>
            <Picker
              mode="selector"
              range={PLATFORMS.map((kind) => LABELS[kind])}
              value={platformIndex}
              onChange={(event) => setPlatformIndex(Number(event.detail.value))}
            >
              <View className="field focus-ring" role="button">
                <Text>{LABELS[PLATFORMS[platformIndex]!]}</Text>
              </View>
            </Picker>
          </View>
          <View className="form-group">
            <Text className="type-label">展示名称</Text>
            <Input
              className="field"
              value={displayName}
              maxlength={80}
              placeholder="例如：我的摄影主页"
              aria-label="主页链接展示名称"
              onInput={(event) => setDisplayName(event.detail.value)}
            />
          </View>
          <View className="form-group">
            <Text className="type-label">URL</Text>
            <Input
              className="field"
              value={url}
              maxlength={2048}
              type="text"
              placeholder="https://..."
              aria-label="外部主页 URL"
              onInput={(event) => setUrl(event.detail.value)}
            />
          </View>
          <View className="visibility-row">
            <View>
              <Text className="type-label">公开展示</Text>
              <Text className="type-caption">关闭时仅自己可见</Text>
            </View>
            <Switch
              checked={isPublic}
              color="var(--primary)"
              aria-label="公开展示主页链接"
              onChange={(event) => setPublic(event.detail.value)}
            />
          </View>
          <SoftButton
            variant="primary"
            disabled={saving}
            label="保存外部主页链接"
            onClick={() => void save()}
          >
            {saving ? "保存中…" : "保存链接"}
          </SoftButton>
        </View>
        {feedback ? (
          <StatusPanel
            state={
              feedback.includes("未保存") ||
              feedback.includes("需为") ||
              feedback.includes("已经")
                ? "ERROR"
                : "READY"
            }
            detail={feedback}
          />
        ) : null}
        <View className="section-stack">
          <Text className="type-section">已保存链接</Text>
          {links.length ? (
            links.map((link) => (
              <View className="link-card card" key={link.profileLinkId}>
                <View>
                  <Text className="type-section">{link.displayName}</Text>
                  <Text className="type-caption">
                    {LABELS[link.platform]} ·{" "}
                    {link.visibility === "PUBLIC" ? "公开" : "仅自己"} ·
                    用户声明
                  </Text>
                  <Text className="link-url type-caption">{link.url}</Text>
                </View>
                <View className="link-actions">
                  <SoftButton
                    label={`复制${link.displayName}链接`}
                    onClick={() => Taro.setClipboardData({ data: link.url })}
                  >
                    复制
                  </SoftButton>
                  <SoftButton
                    label={`尝试打开${link.displayName}`}
                    onClick={() => void tryOpen(link)}
                  >
                    尝试打开
                  </SoftButton>
                  <SoftButton
                    variant="danger"
                    disabled={removingId === link.profileLinkId}
                    label={`删除${link.displayName}链接`}
                    onClick={() => void remove(link)}
                  >
                    {removingId === link.profileLinkId ? "删除中…" : "删除"}
                  </SoftButton>
                </View>
              </View>
            ))
          ) : (
            <StatusPanel state="EMPTY" detail="暂无外部主页链接。" />
          )}
        </View>
      </View>
    </View>
  );
}
