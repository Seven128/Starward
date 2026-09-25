import { FloatingNotificationHost } from "@/components/notification";
import Taro from "@tarojs/taro";
import { ScrollView, Text, View } from "@tarojs/components";
import { useRef, useState } from "react";
import type { PageState } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useThemeClass } from "@/hooks/use-theme";
import { useAppStore, type LocationState } from "@/state/app-store";
import { requestOneShotLocation } from "@/services/one-shot-location";
import "./index.scss";

const LOCATION_STATE_LABEL: Record<LocationState, string> = {
  DEFAULT_REGION: "使用默认区域", AUTHORIZED: "定位已授权，尚未取得本次位置", REQUESTING: "正在获取位置",
  GRANTED: "已取得一次位置", DENIED: "定位权限未授予", UNAVAILABLE: "位置暂不可用",
};

export default function PermissionPage() {
  const themeClass = useThemeClass();
  const locationState = useAppStore((state) => state.locationState);
  const setLocationState = useAppStore((state) => state.setLocationState);
  const resetMapToDefaultRegion = useAppStore((state) => state.resetMapToDefaultRegion);
  const notify = useAppStore((state) => state.notify);
  const [feedback, setFeedback] = useState("");
  const [feedbackState, setFeedbackState] = useState<PageState | null>(null);
  const [busy, setBusy] = useState(false);
  const locationRequestBusy = useRef(false);
  const requestOnce = async () => {
    if (locationRequestBusy.current) return;
    locationRequestBusy.current = true;
    setBusy(true);
    setFeedbackState(null);
    setFeedback("正在获取一次位置；手动路径仍可使用。");
    setLocationState("REQUESTING");
    try {
      const result = await requestOneShotLocation(Taro);
      setLocationState(result.state);
      setFeedback(
        result.state === "GRANTED"
          ? "已获取一次位置，地图位置未改变。返回地图后可点击定位；不会持续定位。"
          : result.state === "DENIED"
            ? "定位权限未授予；原地图和手动搜索仍可使用。"
            : "暂时无法取得位置；请检查系统定位服务后重试，原地图和手动搜索仍可使用。",
      );
    } finally {
      locationRequestBusy.current = false;
      setBusy(false);
    }
  };
  const openPermissions = async () => {
    if (locationRequestBusy.current) return;
    locationRequestBusy.current = true;
    setBusy(true);
    setFeedbackState("LOADING");
    setFeedback("正在打开微信权限设置。");
    try {
      const settings = await Taro.openSetting();
      const permission = settings.authSetting?.["scope.userLocation"];
      if (permission === false) setLocationState("DENIED");
      else if (permission === true && locationState !== "GRANTED") setLocationState("AUTHORIZED");
      if (typeof permission === "boolean") notify({
        owner: "map", placement: "inline", tone: permission ? "info" : "warning",
        title: permission ? "定位权限已开启" : "定位权限未开启",
        body: permission ? "尚未重新获取位置；点击定位按钮获取本次位置。" : "原地图仍可浏览，也可手动搜索地点。",
        action: undefined, dismissible: true, dedupeKey: "map-location-request",
      });
      setFeedbackState(permission === false ? "PERMISSION_DENIED" : permission === true && locationState === "GRANTED" ? "READY" : "INITIAL");
      setFeedback(permission === true
        ? locationState === "GRANTED"
          ? "定位权限已开启；本次位置已获取。可返回地图，或主动再次定位。"
          : "定位权限已开启；本次尚未获取位置。请主动点击请求一次位置，或返回地图定位。"
        : permission === false
          ? "定位权限未开启；原地图和手动搜索仍可使用。"
          : "尚未取得定位授权状态；没有获取位置，你仍可手动选择地点。");
    } catch {
      setFeedbackState("ERROR");
      setFeedback("暂时无法打开微信权限设置，请重试；原地图和手动搜索仍可使用。");
    } finally {
      locationRequestBusy.current = false;
      setBusy(false);
    }
  };
  const useDefaultRegion = async () => {
    if (locationRequestBusy.current) return;
    locationRequestBusy.current = true;
    setBusy(true);
    resetMapToDefaultRegion();
    try {
      await Taro.switchTab({ url: "/pages/map/index" });
    } catch {
      setFeedbackState("ERROR");
      setFeedback("默认试点区域已恢复，但地图暂时无法打开，请重试。");
    } finally {
      locationRequestBusy.current = false;
      setBusy(false);
    }
  };
  return (
    <View className={`${themeClass} permission-page`}>
      <FloatingNotificationHost />
      <CustomNav title="定位与隐私" back />
      <ScrollView scrollY enhanced showScrollbar={false} className="permission-scroll">
      <View className="permission-content page-inset safe-bottom">
        <View className="permission-hero card">
          <Text className="type-page-title">不定位也能浏览</Text>
          <Text className="type-body">
            仅在你主动查找附近时定位一次。拒绝后仍可浏览地图，或选择默认的深圳区域。
          </Text>
        </View>
        <StatusPanel
          state={
            feedbackState ?? (locationState === "GRANTED"
              ? "READY"
              : locationState === "REQUESTING"
                ? "LOADING"
                : locationState === "DENIED" ? "PERMISSION_DENIED"
                  : locationState === "UNAVAILABLE" ? "ERROR" : "INITIAL")
          }
          detail={feedback || `定位状态：${LOCATION_STATE_LABEL[locationState]}。`}
        />
        <View className="permission-actions">
          <SoftButton
            variant="primary"
            label="请求一次当前位置"
            disabled={busy || locationState === "REQUESTING"}
            onClick={() => void requestOnce()}
          >
            请求一次位置
          </SoftButton>
          <SoftButton
            label="打开微信权限设置"
            disabled={busy}
            onClick={() => void openPermissions()}
          >
            微信权限设置
          </SoftButton>
          <SoftButton
            label="不获取位置，返回深圳试点地图"
            disabled={busy}
            onClick={() => void useDefaultRegion()}
          >
            使用默认试点区域
          </SoftButton>
        </View>
        <View className="privacy-card card">
          <Text className="type-section">位置与隐私</Text>
          <Text className="type-body">
            不持续记录轨迹，不将精确位置、夜间行程或收藏地点用于广告画像和普通分析。涉及敏感位置的功能单独询问授权；你可在设置中下载数据或删除账户。
          </Text>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}
