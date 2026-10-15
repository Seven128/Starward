import { useDidHide } from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";
import { currentDraftUserId, loginWithWechat } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { WechatLogin } from "@/components/wechat-login";
import { useAccountOperation } from "./use-account-operation";

/** Page-owned intent only; session storage, identity and private drafts stay in their existing owners. */
export function useWechatLogin({ nativeBack = true } = {}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const task = useRef<{ run(owner: string): void; valid(): boolean }>();
  const request = useRef<AbortController>();
  const backHandler = useRef(() => {});
  const operations = useAccountOperation("wechat-login", setBusy);
  const close = () => {
    task.current = undefined;
    request.current?.abort();
    request.current = undefined;
    operations.retire();
    setOpen(false);
    setFailed(false);
  };
  useDidHide(close);
  useEffect(() => () => { task.current = undefined; request.current?.abort(); }, []);
  const requireAccount = (run: (owner: string) => void = () => {}, valid = () => true) => {
    const owner = currentDraftUserId();
    if (owner) { if (valid()) run(owner); return; }
    request.current?.abort();
    operations.retire();
    task.current = { run, valid };
    setFailed(false);
    setOpen(true);
  };
  const login = async () => {
    const intent = task.current;
    if (!intent || !intent.valid()) { close(); return; }
    const operation = operations.begin({ allowAuthentication: true });
    if (!operation) return;
    const controller = new AbortController();
    request.current = controller;
    setFailed(false);
    try {
      const session = await loginWithWechat(controller.signal);
      operation.assertCurrent();
      operation.authenticate();
      if (task.current !== intent || !intent.valid()) { close(); return; }
      task.current = undefined;
      setOpen(false);
      useAppStore.getState().notify({ owner: "wechat-login", placement: "floating", tone: "success", title: "登录成功", body: "", dedupeKey: "wechat-login-success" });
      intent.run(session.userId);
    } catch {
      if (operation.isCurrent() && !controller.signal.aborted) setFailed(true);
    } finally {
      if (request.current === controller) request.current = undefined;
      operation.release();
    }
  };
  return { open, close, back: () => backHandler.current(), requireAccount,
    dialog: open ? <WechatLogin busy={busy} failed={failed} onLogin={() => void login()} onClose={close} nativeBack={nativeBack} backHandler={backHandler} /> : null };
}
