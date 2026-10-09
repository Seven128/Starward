import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { Button, Image, Slider, Text, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import type { AccountAvatarMimeType } from "@starward/miniapp-contracts";
import { SemanticIcon } from "@/components/semantic-asset";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { currentDraftUserId, getAccountAvatar, getAccountProfile, saveAccountAvatar } from "@/services/api-client";
import { miniappQueryClient } from "@/services/query-client";
import { useAppStore } from "@/state/app-store";
import { NativeBackBoundary } from "@/components/native-back-boundary";
import { useRedLightHandoff } from "@/components/red-light-handoff";
import { useAccountOperation } from "@/hooks/use-account-operation";
import { MINIAPP_DESIGN } from "@/theme/design-tokens";

function avatarMime(path: string): AccountAvatarMimeType {
  if (/\.png(?:$|\?)/iu.test(path)) return "image/png";
  if (/\.webp(?:$|\?)/iu.test(path)) return "image/webp";
  if (/\.jpe?g(?:$|\?)/iu.test(path)) return "image/jpeg";
  throw new Error("请选择 JPG、PNG 或 WebP 图片");
}

function readBase64(filePath: string) {
  return new Promise<string>((resolve, reject) => Taro.getFileSystemManager().readFile({
    filePath, encoding: "base64", success: result => typeof result.data === "string" ? resolve(result.data) : reject(new Error("头像读取失败")), fail: reject,
  }));
}

export function MyAvatar({ owner }: { owner: string | null }) {
  const mode = useAppStore(state => state.mode);
  const theme = MINIAPP_DESIGN.themes[mode === "DAY" ? "day" : mode === "NIGHT" ? "night" : "observation"];
  const sliderColors = mode === "DAY"
    ? { activeColor: "#365D67", backgroundColor: "#D8DEDF" }
    : { activeColor: theme.primary, backgroundColor: theme.border, blockColor: theme["text-primary"] };
  const mediaHandoff = useRedLightHandoff({ nativeBackBoundary: false });
  const profile = useResourceQuery({ queryKey: ["account-profile", owner], enabled: Boolean(owner), queryFn: signal => getAccountProfile(owner!, signal), staleTime: 30_000 });
  const avatar = useResourceQuery({ queryKey: ["account-avatar", owner, profile.data?.data.avatar?.version ?? "none"], enabled: Boolean(owner && profile.data?.data.avatar), queryFn: signal => getAccountAvatar(owner!, signal), staleTime: Infinity });
  const notify = useAppStore(state => state.notify);
  const reset = useAppStore(state => state.mapResetVersion);
  const pending = useRef(false);
  const [sheet, setSheet] = useState(false);
  const [preview, setPreview] = useState<{ owner: string; reset: number; path: string; size: number; mimeType: AccountAvatarMimeType } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const visible = useRef(true);
  const operations = useAccountOperation("avatar", value => {
    pending.current = value;
    setBusy(value);
    if (!value) setSaving(false);
  });
  const close = () => { if (!pending.current) { setSheet(false); setPreview(null); setZoom(1); } };
  useDidHide(() => { visible.current = false; close(); });
  useDidShow(() => { visible.current = true; });
  useEffect(() => () => { visible.current = false; }, []);
  // A controlled renewal can temporarily hide identity while this save still owns its intent.
  // Other account/reset changes retire through the shared owner, including batched A→B→A.
  const previewVisible = Boolean(preview && preview.owner === owner && (preview.reset === reset || saving));
  useEffect(() => {
    if (saving) return;
    if (preview && (preview.owner !== owner || preview.reset !== reset)) { setPreview(null); setZoom(1); }
    setSheet(false);
  }, [owner, reset]);
  const pick = async (sourceType: "album" | "camera") => {
    if (!owner || currentDraftUserId() !== owner) return;
    const operation = operations.begin();
    if (!operation) return;
    try {
      const allowed = await mediaHandoff.confirm("微信相册、相机和头像预览可能较亮，无法跟随红光模式。");
      operation.assertCurrent();
      if (!allowed) return;
      const result = await operation.native(() => Taro.chooseMedia({ count: 1, mediaType: ["image"], sourceType: [sourceType], sizeType: ["compressed"] }));
      operation.assertCurrent();
      const file = result.tempFiles[0];
      if (!file || !Number.isSafeInteger(file.size) || file.size <= 0 || file.size > 10_000_000) throw new Error("图片需小于 10 MB");
      setPreview({ owner, reset: useAppStore.getState().mapResetVersion, path: file.tempFilePath, size: file.size, mimeType: avatarMime(file.tempFilePath) });
      setZoom(1); setSheet(false);
    } catch (error) {
      if (!operation.isCurrent() || !visible.current) return;
      const message = error instanceof Error ? error.message : typeof (error as { errMsg?: unknown })?.errMsg === "string" ? String((error as { errMsg: string }).errMsg) : "请稍后重试。";
      if (/cancel/u.test(message)) return;
      notify({ owner: "my", placement: "floating", tone: "warning", title: "头像未选择", body: message, dismissible: true, dedupeKey: "my-avatar-pick" });
    } finally { operation.release(); }
  };
  const save = async () => {
    if (!owner || !preview || preview.owner !== owner || preview.reset !== useAppStore.getState().mapResetVersion || currentDraftUserId() !== owner) return;
    const operation = operations.begin();
    if (!operation) return;
    setSaving(true);
    try {
      const latest = profile.data?.data ?? (await profile.refetch())?.data;
      operation.assertCurrent();
      if (!latest) throw new Error("资料暂不可用");
      const dataBase64 = await readBase64(preview.path);
      operation.assertCurrent();
      await saveAccountAvatar(owner, { dataBase64, mimeType: preview.mimeType, declaredByteSize: preview.size, zoom, expectedRevision: latest.revision }, operation);
      operation.assertCurrent();
      setPreview(null); setZoom(1);
      await profile.refetch();
      operation.assertCurrent();
      await miniappQueryClient.invalidateQueries({ queryKey: ["account-avatar", owner] });
    } catch (error) {
      if (!operation.isCurrent()) return;
      // A valid same-account renewal advances this retained draft, not an arbitrary reset.
      const retainedReset = useAppStore.getState().mapResetVersion;
      setPreview(current => current === preview ? { ...current, reset: retainedReset } : current);
      if (visible.current) notify({ owner: "my", placement: "floating", tone: "warning", title: "头像未保存", body: /conflict/i.test(error instanceof Error ? error.message : "") ? "资料已更新，请确认后再次保存。" : "请检查图片或网络后重试，原头像保持不变。", dismissible: true, dedupeKey: "my-avatar-save" });
      if (operation.isCurrent()) await profile.refetch();
    } finally { operation.release(); }
  };
  const saved = avatar.data?.data;
  // Color media is opt-in in observation mode. Keep the saved account data for
  // normal modes; a deliberate media choice still opens the existing preview.
  const savedSrc = saved && mode !== "OBSERVATION" ? `data:${saved.mimeType};base64,${saved.dataBase64}` : "";
  return <>
    <NativeBackBoundary active={sheet || previewVisible || mediaHandoff.active} onBack={() => mediaHandoff.active ? mediaHandoff.cancel() : close()} />
    {mediaHandoff.warning}
    <Button className="profile-summary__avatar focus-ring" data-control="my-avatar-action" aria-label={mode === "OBSERVATION" ? "更换头像；红光模式隐藏头像照片" : "更换头像"} disabled={busy} onClick={() => { if (!pending.current) setSheet(true); }}>
      {savedSrc ? <Image className="profile-summary__avatar-image" src={savedSrc} mode="aspectFill" style={{ transform: `scale(${saved!.zoom})` }} /> : <SemanticIcon name="account-user" />}
    </Button>
    {sheet ? <View className="modal-scrim my-avatar-overlay" onClick={close}><View className="my-avatar-sheet" role="dialog" aria-modal="true" aria-label="更换头像" onClick={event => event.stopPropagation()}>
      <Text className="type-section">更换头像</Text>
      <Button data-control="my-avatar-album" disabled={busy} onClick={() => void pick("album")}>从相册上传</Button>
      <Button data-control="my-avatar-camera" disabled={busy} onClick={() => void pick("camera")}>拍照</Button>
      <Button disabled={busy} onClick={close}>取消</Button>
    </View></View> : null}
    {previewVisible && preview ? <View className="modal-scrim my-avatar-overlay" onClick={close}><View className="my-avatar-editor" role="dialog" aria-modal="true" aria-label="调整头像" onClick={event => event.stopPropagation()}>
      <Text className="type-section">调整头像</Text>
      <View className="my-avatar-preview"><Image src={preview.path} mode="aspectFill" style={{ transform: `scale(${zoom})` }} /></View>
      <View className="my-avatar-zoom"><Text>缩小</Text><Slider min={1} max={2.5} step={0.05} value={zoom} disabled={saving} {...sliderColors} blockSize={20} aria-label="头像缩放" onChanging={event => setZoom(Number(event.detail.value))} onChange={event => setZoom(Number(event.detail.value))} /><Text>放大</Text></View>
      <View className="my-avatar-editor__actions"><Button disabled={saving} onClick={close}>取消</Button><Button className="my-avatar-save" loading={saving} disabled={saving} data-control="my-avatar-save" onClick={() => void save()}>使用此头像</Button></View>
    </View></View> : null}
  </>;
}
