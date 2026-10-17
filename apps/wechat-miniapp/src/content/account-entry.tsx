import { useState, type ReactNode } from "react";
import { View } from "@tarojs/components";
import { CustomNav } from "@/components/custom-nav";
import { StatusPanel } from "@/components/status-panel";
import { SystemMotionProbe } from "@/components/system-motion-probe";
import { useMotionThemeClass } from "@/hooks/use-theme";
import { useWechatLogin } from "@/hooks/use-wechat-login";
import { currentDraftUserId } from "@/services/api-client";

/** Admit private routes before mounting their drafts; later renewals stay with the editor's existing owner. */
export function AccountEntry({ title, children }: { title: string; children: ReactNode }) {
  const [entered, setEntered] = useState(() => Boolean(currentDraftUserId()));
  const login = useWechatLogin();
  const theme = useMotionThemeClass();
  if (entered) return children;
  return <><SystemMotionProbe /><View className={theme}>
    <CustomNav title={title} back backFallbackTab="/pages/my/index" />
    <View className="page-inset"><StatusPanel state="PERMISSION_DENIED" title="请先登录"
      detail={`微信快捷登录后继续${title}。`} recoveryLabel="微信快捷登录"
      onRecover={() => login.requireAccount(() => setEntered(true))} /></View>
    {login.dialog}
  </View></>;
}
