import { useDidHide } from "@tarojs/taro";
import { Button, RootPortal, Text, View } from "@tarojs/components";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/state/app-store";
import { NativeBackBoundary } from "./native-back-boundary";

type PendingHandoff = { resolve: (accepted: boolean) => void };

/** An app-owned warning before an unthemed WeChat surface in observation mode. */
export function useRedLightHandoff({ nativeBackBoundary = true }: { nativeBackBoundary?: boolean } = {}) {
  const mode = useAppStore(state => state.mode);
  const pending = useRef<PendingHandoff | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const finish = useCallback((accepted: boolean) => {
    const request = pending.current;
    pending.current = null;
    setDetail(null);
    request?.resolve(accepted);
  }, []);
  useDidHide(() => finish(false));
  useEffect(() => () => { pending.current?.resolve(false); pending.current = null; }, []);
  useEffect(() => { if (mode !== "OBSERVATION" && pending.current) finish(false); }, [finish, mode]);

  const confirm = useCallback((message: string): Promise<boolean> => {
    if (useAppStore.getState().mode !== "OBSERVATION") return Promise.resolve(true);
    if (pending.current) return Promise.resolve(false);
    return new Promise(resolve => {
      pending.current = { resolve };
      setDetail(message);
    });
  }, []);

  const warning = detail ? <>
    {nativeBackBoundary ? <NativeBackBoundary active onBack={() => finish(false)} /> : null}
    <RootPortal>
      <View className="red-light-handoff__scrim" catchMove onClick={() => finish(false)}>
        <View className="red-light-handoff__dialog" role="dialog" aria-modal="true" aria-label="微信界面可能亮屏"
          onClick={event => event.stopPropagation()}>
          <Text className="red-light-handoff__title">微信界面可能亮屏</Text>
          <Text className="red-light-handoff__detail">{detail} 可取消并在设置中切换日间或夜间后再操作。</Text>
          <View className="red-light-handoff__actions">
            <Button className="red-light-handoff__cancel" onClick={() => finish(false)}>取消</Button>
            <Button className="red-light-handoff__continue" onClick={() => finish(true)}>仍要继续</Button>
          </View>
        </View>
      </View>
    </RootPortal>
  </> : null;
  return { confirm, warning, active: detail !== null, cancel: () => finish(false) };
}
