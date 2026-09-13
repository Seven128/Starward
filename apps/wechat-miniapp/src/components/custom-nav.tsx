import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { useRef, useState } from "react";
import { nativeStatusBarHeightPx, nativeMenuClearancePx, nativeNavigationInsets } from "@/theme/native-metrics";
import { SemanticIcon } from "./semantic-asset";
import { SoftButton } from "./soft-button";

export function CustomNav({
  title,
  subtitle,
  back = false,
  backOdId,
  backFallbackTab = "/pages/map/index",
  odId,
  right,
  beforeBack,
  onBackAuthorized,
  onBackFailure,
}: {
  title: string;
  subtitle?: string | undefined;
  back?: boolean | undefined;
  backOdId?: string | undefined;
  backFallbackTab?: "/pages/map/index" | "/pages/my/index" | undefined;
  odId?: string | undefined;
  right?: React.ReactNode | undefined;
  beforeBack?: (() => boolean | Promise<boolean>) | undefined;
  onBackAuthorized?: (() => void | Promise<void>) | undefined;
  onBackFailure?: (() => void | Promise<void>) | undefined;
}) {
  const statusBarHeight = nativeStatusBarHeightPx();
  const menuClearance = nativeMenuClearancePx();
  const actionSafeTop = right ? nativeNavigationInsets().safeTop : undefined;
  const navigationBusy = useRef(false);
  const [backError, setBackError] = useState(false);
  const goBack = async () => {
    if (navigationBusy.current) return;
    navigationBusy.current = true;
    setBackError(false);
    const fallback = () => Taro.switchTab({ url: backFallbackTab });
    let hasPriorPage = false;
    try {
      hasPriorPage = Taro.getCurrentPages().length > 1;
    } catch {
      // An unavailable page stack is equivalent to an unprovable back target.
    }
    try {
      if (beforeBack && !(await beforeBack())) return;
      await onBackAuthorized?.();
      if (hasPriorPage) {
        try {
          await Taro.navigateBack();
        } catch {
          await fallback();
        }
      } else {
        await fallback();
      }
    } catch {
      try {
        await onBackFailure?.();
      } finally {
        setBackError(true);
      }
    } finally {
      navigationBusy.current = false;
    }
  };
  return (
    <View
      className={`custom-nav safe-top${right ? " custom-nav--with-action" : ""}`}
      data-control="mini-primary-navigation"
      {...(odId ? { "data-od-id": odId } : {})}
      style={{
        ...(statusBarHeight > 0 ? { paddingTop: `${actionSafeTop ?? statusBarHeight}px` } : {}),
        ...(menuClearance !== undefined ? { "--nav-menu-clearance": `${menuClearance}px` } : {}),
      }}
    >
      <View className="custom-nav__bar">
        <View className="custom-nav__side">
          {back ? (
            <View {...(backOdId ? { "data-od-id": backOdId } : {})}>
              <View className="custom-nav__back-control">
                <SoftButton variant="ghost" label="返回" onClick={goBack}>
                  {""}
                </SoftButton>
                <SemanticIcon
                  name="arrow-left"
                  label="返回"
                  className="custom-nav__back-icon"
                />
              </View>
            </View>
          ) : null}
        </View>
        <View className="custom-nav__title">
          <Text className="type-section">{title}</Text>
          {subtitle ? <Text className="type-caption">{subtitle}</Text> : null}
        </View>
        <View className="custom-nav__side custom-nav__side--right">
          {right}
        </View>
      </View>
      {backError ? (
        <View className="custom-nav__error" role="alert" aria-live="polite">
          <Text className="type-caption">暂时无法返回，请再点一次返回。</Text>
        </View>
      ) : null}
      {__MINIAPP_DEVELOPMENT_FIXTURE_MODE__ ? (
        <View
          className="development-fixture-banner"
          data-od-id="development-fixture-banner"
          role="status"
          aria-label="测试数据，不能用于现实判断"
        >
          <Text>测试数据 · 不用于现实判断</Text>
        </View>
      ) : null}
    </View>
  );
}
