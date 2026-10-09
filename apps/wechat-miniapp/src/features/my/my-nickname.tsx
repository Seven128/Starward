import { SemanticIcon } from "@/components/semantic-asset";
import { useDidShow, useDidHide } from "@tarojs/taro";
import { Button, Input, Text, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import { getAccountProfile, saveAccountNickname, currentDraftUserId } from "@/services/api-client";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useAppStore } from "@/state/app-store";
import { NativeBackBoundary } from "@/components/native-back-boundary";
import { useAccountOperation } from "@/hooks/use-account-operation";

/** Saved identity is server-owned; a failed edit stays a draft until explicit retry. */
export function MyNickname({ owner }: { owner: string | null }) {
  const profile = useResourceQuery({
    queryKey: ["account-profile", owner], enabled: Boolean(owner),
    queryFn: signal => getAccountProfile(owner!, signal), staleTime: 30_000,
  });
  const pending = useRef(false);
  const reset = useAppStore(state => state.mapResetVersion);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const draft = useRef<{ owner: string; reset: number; nickname: string; revision: number } | null>(null);
  const notify = useAppStore(state => state.notify);
  const visible = useRef(true);
  const operations = useAccountOperation("nickname", value => {
    pending.current = value;
    if (!value) setSaving(false);
  });
  useDidShow(() => { if (owner) void profile.refetch(); });
  useDidShow(() => { visible.current = true; });
  useDidHide(() => { visible.current = false; setEditing(false); });
  useEffect(() => () => { visible.current = false; }, []);
  const editorVisible = editing && draft.current?.owner === owner && (draft.current.reset === reset || saving);
  useEffect(() => {
    if (saving) return;
    if (draft.current && (draft.current.owner !== owner || draft.current.reset !== reset)) {
      draft.current = null; setEditing(false); setErrorText("");
    }
  }, [owner, reset]);
  const cancel = () => { if (!pending.current) { draft.current = null; setEditing(false); } };
  const edit = async () => {
    if (!owner || currentDraftUserId() !== owner) return;
    const operation = operations.begin();
    if (!operation) return;
    try {
      const saved = profile.data?.data ?? (await profile.refetch())?.data;
      operation.assertCurrent();
      if (!saved) return;
      if (draft.current?.owner !== owner || draft.current.reset !== reset) draft.current = { owner, reset, nickname: saved.nickname ?? "", revision: saved.revision };
      setValue(draft.current.nickname);
      setErrorText("");
      setEditing(true);
    } catch { /* A retired read cannot reopen the editor; query owns current read failures. */ }
    finally { operation.release(); }
  };
  const save = async () => {
    if (!owner || !profile.data || draft.current?.owner !== owner || draft.current.reset !== useAppStore.getState().mapResetVersion || currentDraftUserId() !== owner) return;
    const operation = operations.begin();
    if (!operation) return;
    setSaving(true);
    setErrorText("");
    try {
      const saved = profile.data.data;
      const previous = draft.current?.owner === owner ? draft.current : null;
      const input = { owner, reset: useAppStore.getState().mapResetVersion, nickname: value, revision: previous?.revision ?? saved.revision };
      draft.current = input;
      await saveAccountNickname(owner, { nickname: input.nickname, expectedRevision: input.revision }, operation);
      operation.assertCurrent();
      draft.current = null;
      setEditing(false);
      await profile.refetch();
    } catch (error) {
      if (!operation.isCurrent()) return;
      if (draft.current?.owner === owner) draft.current.reset = useAppStore.getState().mapResetVersion;
      const conflict = error instanceof Error && /conflict|CONFLICT/i.test(error.message);
      if (conflict) {
        const latest = (await profile.refetch())?.data;
        if (!operation.isCurrent()) return;
        if (latest && draft.current?.owner === owner) draft.current.revision = latest.revision;
      }
      setErrorText(conflict ? "资料已更新，请确认修改后再次保存。" : "请检查昵称（1至40字）或网络后重试。");
      if (visible.current) notify({ owner: "my", placement: "floating", tone: "warning", title: "昵称未保存",
        body: conflict ? "资料已更新。再次打开后确认并保存你的修改。" : "请检查昵称（1至40字）或网络后重试，已保存的昵称保持不变。",
        dismissible: true, dedupeKey: "my-nickname-save" });
    } finally { operation.release(); }
  };
  return <View className="profile-summary__copy">
    <NativeBackBoundary active={editorVisible} onBack={cancel} />
    <Button className="my-nickname focus-ring" aria-label="修改昵称" onClick={() => void edit()}>
      <Text className="type-section">{profile.data?.data.nickname ?? (profile.isError ? "资料暂不可用" : profile.isPending ? "正在加载" : "设置昵称")}</Text>
      <SemanticIcon name="pencil" />
    </Button>
    {editorVisible ? <View className="modal-scrim my-nickname-overlay" onClick={cancel}>
      <View className="my-nickname-dialog" role="dialog" aria-modal="true" aria-label="修改昵称" onClick={event => event.stopPropagation()}>
        <Text className="type-section">修改昵称</Text>
        <Input focus value={value} maxlength={40} disabled={saving} aria-label="昵称" placeholder="请输入昵称"
          onInput={event => setValue(event.detail.value)} confirmType="done" onConfirm={() => void save()} />
        {errorText ? <View role="alert"><Text>{errorText}</Text></View> : null}
        <View className="my-nickname-dialog__actions">
          <Button disabled={saving} onClick={cancel}>取消</Button>
          <Button loading={saving} disabled={saving} onClick={() => void save()}>保存</Button>
        </View>
      </View>
    </View> : null}
  </View>;
}
