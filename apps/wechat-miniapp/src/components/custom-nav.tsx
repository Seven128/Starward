import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { SoftButton } from "./soft-button";
import "./custom-nav.scss";

export function CustomNav({
  title,
  subtitle,
  back = false,
  right,
}: {
  title: string;
  subtitle?: string | undefined;
  back?: boolean | undefined;
  right?: React.ReactNode | undefined;
}) {
  let statusBarHeight = 0;
  try {
    statusBarHeight = Taro.getWindowInfo().statusBarHeight ?? 0;
  } catch {
    // H5 diagnostic builds may not expose the native window metrics API.
  }
  return (
    <View
      className="custom-nav safe-top"
      {...(statusBarHeight > 0
        ? { style: { paddingTop: `${statusBarHeight}px` } }
        : {})}
    >
      <View className="custom-nav__bar">
        <View className="custom-nav__side">
          {back ? (
            <SoftButton
              variant="ghost"
              label="返回"
              onClick={() =>
                Taro.navigateBack().catch(() =>
                  Taro.switchTab({ url: "/pages/map/index" }),
                )
              }
            >
              ←
            </SoftButton>
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
    </View>
  );
}
