import { SystemMotionProbe } from "@/components/system-motion-probe";
import { FloatingNotificationHost } from "@/components/notification";
import Taro, { useDidHide, useDidShow, useLoad } from "@tarojs/taro";
import { ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import type { PageState } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useMotionThemeClass as useThemeClass } from "@/hooks/use-theme";
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
  const locationRequestBusy = useRef<{
    owner: string | null; reset: number; previous: LocationState; kind: string;
  } | null>(null);
  const pageActive = useRef(true);
  const intentLive = useRef(true);
  const permissionReturn = useRef(false);
  const beginLocation = (kind = "LOCATION") => {
    if (locationRequestBusy.current || !pageActive.current) return;
    const state = useAppStore.getState();
    const attempt = { owner: state.accountOwnerId, reset: state.mapResetVersion, previous: state.locationState, kind };
    locationRequestBusy.current = attempt;
    setBusy(true);
    return attempt;
  };
  const currentLocation = (attempt: NonNullable<typeof locationRequestBusy.current>) => {
    const state = useAppStore.getState();
    return pageActive.current && locationRequestBusy.current === attempt &&
      state.accountOwnerId === attempt.owner && state.mapResetVersion === attempt.reset;
  };
  const cancelLocation = (updatePage = true) => {
    const attempt = locationRequestBusy.current;
    locationRequestBusy.current = null;
    const state = useAppStore.getState();
    if (attempt && state.accountOwnerId === attempt.owner && state.mapResetVersion === attempt.reset && state.locationState === "REQUESTING")
      setLocationState(attempt.previous);
    if (updatePage) { setBusy(false); setFeedbackState(null); setFeedback(""); }
  };
  const finishLocation = (attempt: NonNullable<typeof locationRequestBusy.current>) => {
    if (locationRequestBusy.current !== attempt) return;
    locationRequestBusy.current = null;
    if (pageActive.current) setBusy(false);
  };
  useDidHide(() => { pageActive.current = false; intentLive.current = false; cancelLocation(); });
  useDidShow(() => {
    pageActive.current = true;
    if (permissionReturn.current) { permissionReturn.current = false; void openPermissions(true); }
  });
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (state.accountOwnerId !== previous.accountOwnerId || state.mapResetVersion !== previous.mapResetVersion) {
        permissionReturn.current = false; cancelLocation();
      }
    });
    return () => { pageActive.current = false; permissionReturn.current = false; cancelLocation(false); unsubscribe(); };
  }, []);
  useLoad(() => {
    const page = Taro.getCurrentPages().at(-1);
    // Only the opener's explicit click can issue this one-use command. URL
    // parameters and ordinary permission-page entry never request location.
    page?.getOpenerEventChannel?.()?.once?.("locationIntent", (action: unknown) => {
      if (!intentLive.current || !pageActive.current || Taro.getCurrentPages().at(-1) !== page) return;
      intentLive.current = false;
      if (action === "locate") void requestOnce();
      else if (action === "settings") void openPermissions();
    });
  });
  const requestOnce = async () => {
    const attempt = beginLocation();
    if (!attempt) return;
    setFeedbackState(null);
    setFeedback("正在获取本次位置。");
    setLocationState("REQUESTING");
    try {
      const result = await requestOneShotLocation(Taro);
      if (!currentLocation(attempt)) return;
      setLocationState(result.state);
      const detail = result.state === "GRANTED"
        ? "已取得一次位置，地图未移动。回到地图重新定位后，可选择移动。"
        : result.state === "DENIED" ? "定位未授权；地图未移动，仍可手动浏览。"
          : "本次位置暂不可用；地图未移动，请检查系统定位后重试。";
      setFeedback(detail);
      notify({
        owner: "map", placement: "inline", tone: result.state === "GRANTED" ? "success" : "warning",
        title: LOCATION_STATE_LABEL[result.state], body: detail,
        action: result.state === "GRANTED" ? undefined : { label: "查看权限说明", route: "/pages/auth/index" },
        dismissible: true, dedupeKey: "map-location-request",
      });
    } finally {
      finishLocation(attempt);
    }
  };
  const openPermissions = async (readOnly = false) => {
    const attempt = beginLocation("SETTINGS");
    if (!attempt) return;
    setFeedbackState("LOADING");
    setFeedback(readOnly ? "正在读取定位权限。" : "正在打开微信权限设置。");
    try {
      permissionReturn.current = !readOnly;
      const settings = await (readOnly ? Taro.getSetting() : Taro.openSetting());
      if (!currentLocation(attempt)) return;
      permissionReturn.current = false;
      const permission = settings.authSetting?.["scope.userLocation"];
      const locationState = useAppStore.getState().locationState;
      if (permission === false) setLocationState("DENIED");
      else if (permission === true && locationState !== "GRANTED") setLocationState("AUTHORIZED");
      const detail = permission === true
        ? locationState === "GRANTED" ? "权限已开启，本次已取得过一次位置；可返回地图重新定位。"
          : "权限已开启，尚未获取本次位置；可返回地图主动定位。"
        : permission === false ? "定位权限未开启；仍可手动浏览地图。"
          : "尚未取得定位授权状态；未获取位置，仍可手动浏览。";
      if (typeof permission === "boolean") notify({
        owner: "map", placement: "inline", tone: permission ? "info" : "warning",
        title: permission ? "定位权限已开启" : "定位权限未开启",
        body: detail,
        action: undefined, dismissible: true, dedupeKey: "map-location-request",
      });
      setFeedbackState(permission === false ? "PERMISSION_DENIED" : "READY");
      setFeedback(detail);
    } catch {
      if (!currentLocation(attempt)) return;
      permissionReturn.current = false;
      setFeedbackState("ERROR");
      setFeedback("微信权限设置暂未打开，请重试。");
    } finally {
      finishLocation(attempt);
    }
  };
  const useDefaultRegion = async () => {
    if (locationRequestBusy.current?.kind === "NAVIGATION") return;
    cancelLocation();
    permissionReturn.current = false;
    resetMapToDefaultRegion();
    const attempt = beginLocation("NAVIGATION");
    if (!attempt) return;
    try {
      await Taro.switchTab({ url: "/pages/map/index" });
    } catch {
      if (!currentLocation(attempt)) return;
      setFeedbackState("ERROR");
      setFeedback("已恢复默认区域；地图暂未打开，请重试。");
    } finally {
      finishLocation(attempt);
    }
  };
  return (
    <><SystemMotionProbe /><View className={`${themeClass} permission-page`}>
      <FloatingNotificationHost />
      <CustomNav title="定位与隐私" back />
      <ScrollView scrollY enhanced showScrollbar={false} className="permission-scroll">
      <View className="permission-content page-inset safe-bottom">
        <View className="permission-hero card">
          <Text className="type-page-title">不定位也能浏览</Text>
          <Text className="type-body">
            主动查找附近时定位一次。拒绝后仍可浏览地图，或使用深圳区域。
          </Text>
        </View>
        <StatusPanel
          state={
            feedbackState ?? (locationState === "GRANTED"
              ? "READY"
              : locationState === "REQUESTING"
                ? "LOADING"
                : locationState === "DENIED" ? "PERMISSION_DENIED"
                  : locationState === "UNAVAILABLE" ? "ERROR" : "READY")
          }
          detail={feedback || `定位状态：${LOCATION_STATE_LABEL[locationState]}。`}
          recoveryLabel={busy && locationRequestBusy.current?.kind !== "NAVIGATION" ? "取消" : undefined}
          onRecover={busy && locationRequestBusy.current?.kind !== "NAVIGATION" ? () => { permissionReturn.current = false; cancelLocation(); } : undefined}
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
    </View></>
  );
}
