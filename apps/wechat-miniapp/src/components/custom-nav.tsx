import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { nativeStatusBarHeightPx } from "@/theme/native-metrics";
import { SemanticIcon } from "./semantic-asset";
import { SoftButton } from "./soft-button";
import "./custom-nav.scss";

export function CustomNav({
  title,
  subtitle,
  back = false,
  backOdId,
  backFallbackTab = "/pages/map/index",
  odId,
  right,
}: {
  title: string;
  subtitle?: string | undefined;
  back?: boolean | undefined;
  backOdId?: string | undefined;
  backFallbackTab?: "/pages/map/index" | "/pages/my/index" | undefined;
  odId?: string | undefined;
  right?: React.ReactNode | undefined;
}) {
  const statusBarHeight = nativeStatusBarHeightPx();
  const goBack = () => {
    const fallback = () => Taro.switchTab({ url: backFallbackTab });
    let hasPriorPage = false;
    try {
      hasPriorPage = Taro.getCurrentPages().length > 1;
    } catch {
      // An unavailable page stack is equivalent to an unprovable back target.
    }
    if (!hasPriorPage) {
      void fallback();
      return;
    }
    void Taro.navigateBack().catch(fallback);
  };
  return (
    <View
      className="custom-nav safe-top"
      {...(odId ? { "data-od-id": odId } : {})}
      {...(statusBarHeight > 0
        ? { style: { paddingTop: `${statusBarHeight}px` } }
        : {})}
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
      {__MINIAPP_DEVELOPMENT_FIXTURE_MODE__ ? (
        <View
          className="development-fixture-banner"
          data-od-id="development-fixture-banner"
          role="status"
          aria-label="开发验收数据，不能用于现实判断"
        >
          <Text>开发验收数据 · 不用于现实判断</Text>
        </View>
      ) : null}
    </View>
  );
}
