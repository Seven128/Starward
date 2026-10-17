import { Button, Text, View } from "@tarojs/components";
import { useEffect, useState, type MutableRefObject } from "react";
import { NativeBackBoundary } from "./native-back-boundary";
import { LoadingIndicator } from "./loading-indicator";
import { retainPrimaryNavigationCover } from "@/navigation/primary-navigation-cover";

export function WechatLogin({ busy, failed, onLogin, onClose, nativeBack = true, backHandler }: {
  busy: boolean;
  failed: boolean;
  onLogin(): void;
  onClose(): void;
  nativeBack?: boolean;
  backHandler?: MutableRefObject<() => void>;
}) {
  const [privacy, setPrivacy] = useState(false);
  useEffect(retainPrimaryNavigationCover, []);
  const back = () => privacy ? setPrivacy(false) : onClose();
  if (backHandler) backHandler.current = back;
  return <>
    {nativeBack ? <NativeBackBoundary active onBack={back} /> : null}
    <View className="wechat-login-scrim modal-scrim" onClick={onClose}>
      <View className="wechat-login" role="dialog" aria-modal="true" aria-label={privacy ? "隐私说明" : "微信快捷登录"} onClick={event => event.stopPropagation()}>
        <View className="wechat-login__header">
          <Text className="wechat-login__title">{privacy ? "隐私说明" : "微信快捷登录"}</Text>
          <Button className="wechat-login__close focus-ring" ariaLabel={privacy ? "返回微信登录" : "关闭登录，继续浏览"} onClick={back}>×</Button>
        </View>
        {privacy ? <>
          <Text className="wechat-login__copy">微信身份只用于账户关联。附近地点按使用时请求一次位置；创建地点需另行确认坐标与公开资料。</Text>
          <Text className="wechat-login__copy">不自动授权头像、昵称或手机号。</Text>
          <Button className="wechat-login__secondary focus-ring" onClick={() => setPrivacy(false)}>返回登录</Button>
        </> : <>
          <Text className="wechat-login__copy">用于同步想去、计划与投稿记录。</Text>
          <Text className="wechat-login__note">头像和昵称可稍后设置；不申请手机号。</Text>
          {failed ? <Text className="wechat-login__error" aria-role="alert">登录暂未完成，请重试。</Text> : null}
          <Button className="wechat-login__primary loading-button focus-ring" disabled={busy} aria-busy={busy} onClick={() => { if (!busy) onLogin(); }}>
            {busy ? <LoadingIndicator /> : null}<Text>{busy ? "登录中" : "微信快捷登录"}</Text>
          </Button>
          <Text className="wechat-login__note">继续即确认已阅读隐私说明。</Text>
          <Button className="wechat-login__secondary focus-ring" onClick={() => setPrivacy(true)}>查看隐私说明</Button>
        </>}
      </View>
    </View>
  </>;
}
