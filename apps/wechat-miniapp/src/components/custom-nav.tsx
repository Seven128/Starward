import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { usePageNavigation } from "@/hooks/use-page-navigation";
import { nativeStatusBarHeightPx, nativeMenuClearancePx, nativeNavigationInsets } from "@/theme/native-metrics";
import { SemanticIcon } from "./semantic-asset";
import { SoftButton } from "./soft-button";
import { reportRuntimeError } from "@/services/runtime-error";
import { openPrimaryPage } from "@/navigation/primary-page-navigation";

export function CustomNav({
  title,
  subtitle,
  back = false,
  backPresentation = "back",
  backOdId,
  backFallbackTab = "/pages/map/index",
  odId,
  right,
  beforeBack,
  onBackAuthorized,
  onBackFailure,
  backAction,
}: {
  title: string;
  subtitle?: string | undefined;
  back?: boolean | undefined;
  backPresentation?: "back" | "dismiss" | "map" | undefined;
  backOdId?: string | undefined;
  backFallbackTab?: "/pages/map/index" | "/pages/my/index" | undefined;
  odId?: string | undefined;
  right?: React.ReactNode | undefined;
  beforeBack?: (() => boolean | Promise<boolean>) | undefined;
  onBackAuthorized?: (() => void | Promise<void>) | undefined;
  onBackFailure?: (() => void | Promise<void>) | undefined;
  backAction?: (() => void | Promise<void>) | undefined;
}) {
  const statusBarHeight = nativeStatusBarHeightPx();
  const menuClearance = nativeMenuClearancePx();
  const dismiss = backPresentation === "dismiss";
  const returnMap = backPresentation === "map";
  const actionSafeTop = right || dismiss ? nativeNavigationInsets().safeTop : undefined;
  const navigation = usePageNavigation();
  const backError = navigation.navigationError;
  const goBack = async () => {
    const attempt = navigation.begin({ allowUnknownStack: true });
    if (!attempt) return;
    if (attempt.stackReadError !== undefined)
      reportRuntimeError("native", "navigation_page_stack_failed", attempt.stackReadError);
    const fallback = () => openPrimaryPage(backFallbackTab);
    try {
      if (beforeBack && !(await beforeBack())) return;
      if (!attempt.active()) return;
      await onBackAuthorized?.();
      if (!attempt.active()) return;
      if (backAction) {
        await backAction();
      } else if (attempt.stack.length > 1) {
        try {
          await Taro.navigateBack();
        } catch (error) {
          reportRuntimeError("native", "navigation_back_failed", error);
          if (attempt.active()) await fallback();
        }
      } else {
        await fallback();
      }
    } catch (error) {
      reportRuntimeError("native", "navigation_return_failed", error);
      if (attempt.active()) {
        try { await onBackFailure?.(); } catch { /* Still report the failed return. */ }
        attempt.fail();
      }
    } finally {
      attempt.release();
    }
  };
  const backControl = back ? <View {...(backOdId ? { "data-od-id": backOdId } : {})}>
    <View className={`custom-nav__back-control${returnMap ? " custom-nav__back-control--map" : ""}`}>
      <SoftButton variant="ghost" label={returnMap ? "返回地图" : dismiss ? "关闭页面" : "返回"}
        className={returnMap ? "custom-nav__map-button" : ""} onClick={goBack}>
        {returnMap ? <>
          <Text className="custom-nav__map-arrow" aria-hidden>‹</Text>
          <SemanticIcon name="map" className="custom-nav__map-icon" />
          <Text>地图</Text>
        </> : ""}
      </SoftButton>
      {!returnMap ? <SemanticIcon name={dismiss ? "close" : "arrow-left"} label={dismiss ? "关闭页面" : "返回"} className="custom-nav__back-icon" /> : null}
    </View>
  </View> : null;
  return (
    <View
      className={`custom-nav safe-top${right ? " custom-nav--with-action" : ""}${dismiss ? " custom-nav--dismiss" : ""}${returnMap ? " custom-nav--map" : ""}`}
      data-control="mini-primary-navigation"
      {...(odId ? { "data-od-id": odId } : {})}
      style={{
        ...(statusBarHeight > 0 ? { paddingTop: `${actionSafeTop ?? statusBarHeight}px` } : {}),
        ...(menuClearance !== undefined ? { "--nav-menu-clearance": `${menuClearance}px` } : {}),
      }}
    >
      <View className="custom-nav__bar">
        <View className="custom-nav__side">
          {!dismiss ? backControl : null}
        </View>
        <View className="custom-nav__title">
          <Text className="type-section">{title}</Text>
          {subtitle ? <Text className="type-caption">{subtitle}</Text> : null}
        </View>
        <View className="custom-nav__side custom-nav__side--right">
          {right}
          {dismiss ? backControl : null}
        </View>
      </View>
      {backError ? (
        <View className="custom-nav__error" role="alert" aria-live="polite">
          <Text className="type-caption">暂时无法返回，请再点一次返回。</Text>
        </View>
      ) : null}
    </View>
  );
}
