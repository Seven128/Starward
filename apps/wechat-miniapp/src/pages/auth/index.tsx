import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { useState } from "react";
import { CustomNav } from "@/components/custom-nav";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useThemeClass } from "@/hooks/use-theme";
import { useAppStore } from "@/state/app-store";
import "./index.scss";

export default function PermissionPage() {
  const themeClass = useThemeClass();
  const locationState = useAppStore((state) => state.locationState);
  const setLocationState = useAppStore((state) => state.setLocationState);
  const [feedback, setFeedback] = useState("");
  const requestOnce = async () => {
    setLocationState("REQUESTING");
    try {
      await Taro.getLocation({
        type: "gcj02",
        isHighAccuracy: false,
        highAccuracyExpireTime: 2500,
      });
      setLocationState("GRANTED");
      setFeedback(
        "已获得一次位置；不会默认开启持续定位，也不会把精确位置写入普通埋点。",
      );
    } catch {
      setLocationState("DENIED");
      setFeedback("定位仍未授予；默认深圳试点和手动搜索继续可用。");
    }
  };
  return (
    <View className={`${themeClass} permission-page`}>
      <CustomNav title="定位与隐私" back />
      <View className="permission-content page-inset safe-bottom">
        <View className="permission-hero card">
          <Text className="type-page-title">定位不是使用前提</Text>
          <Text className="type-body">
            只在你主动请求附近推荐时询问一次。拒绝后显示深圳试点区域，并可在搜索框手动选择城市或普通地点。
          </Text>
          <Text className="type-body">
            默认不持续定位、不保存每次打开的精确坐标，也不把常去观星点、夜间行程或收藏的隐蔽地点写入普通分析事件。
          </Text>
        </View>
        <StatusPanel
          state={
            locationState === "GRANTED"
              ? "READY"
              : locationState === "REQUESTING"
                ? "LOADING"
                : "PERMISSION_DENIED"
          }
          detail={feedback || `当前状态：${locationState}。手动路径始终保留。`}
        />
        <View className="permission-actions">
          <SoftButton
            variant="primary"
            label="请求一次当前位置"
            onClick={() => void requestOnce()}
          >
            请求一次位置
          </SoftButton>
          <SoftButton
            label="打开微信权限设置"
            onClick={() =>
              void Taro.openSetting().then((settings) => {
                const granted = Boolean(
                  settings.authSetting["scope.userLocation"],
                );
                setLocationState(granted ? "GRANTED" : "DENIED");
                setFeedback(
                  granted
                    ? "定位权限已开启。"
                    : "定位权限未开启；手动路径仍可用。",
                );
              })
            }
          >
            微信权限设置
          </SoftButton>
          <SoftButton
            label="不授权，返回深圳试点地图"
            onClick={() => {
              setLocationState("DENIED");
              void Taro.switchTab({ url: "/pages/map/index" });
            }}
          >
            使用默认试点区域
          </SoftButton>
        </View>
        <View className="privacy-card card">
          <Text className="type-section">高敏感夜间数据</Text>
          <Text className="type-body">
            常去点位、夜间出行、精确轨迹、隐蔽收藏与提醒位置按最小化采集、单独授权、可查看/删除处理。本
            Demo 不启用持续轨迹、广告画像或公开分享。
          </Text>
        </View>
      </View>
    </View>
  );
}
