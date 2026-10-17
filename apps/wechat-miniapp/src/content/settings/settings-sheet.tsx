import { SemanticIcon } from "@/components/semantic-asset";
import { LoadingIndicator } from "@/components/loading-indicator";
import type { DisplayMode, UserPreferences } from "@starward/miniapp-contracts";
import { Button, Text, View } from "@tarojs/components";
import type { SettingsSheetKind } from "./settings-sections";
import type { LocationState } from "@/state/app-store";
import type { AccountExportState } from "./account-export";

export type OpenSettingsSheet = SettingsSheetKind | "DELETE_FINAL" | "DELETE_CLEANUP";

const CONTENT: Record<Exclude<OpenSettingsSheet, "LOCATION" | "DELETE" | "DELETE_FINAL" | "DELETE_CLEANUP">, { title: string; body: string }> = {
  DIRECTION: {
    title: "方位天空",
    body: "打开方位天空时按需使用设备方向信息。方向数据只用于当前页面，不上传；离开页面后停止读取。",
  },
  PRECISE: {
    title: "精确位置",
    body: "创建观星点时会单独确认要提交的地点坐标。浏览地图不会自动公开你的实时位置。",
  },
  CACHE: {
    title: "清理本机缓存",
    body: "清理临时地图、筛选、搜索记录与夜空缓存。远端观星计划、想去列表、主页链接和投稿草稿保持不变。",
  },
  EXPORT: {
    title: "导出数据",
    body: "服务端会整理当前账户的计划、投稿和设置，生成 JSON 文件；完成后由微信文件分享交付。",
  },
};

export function SettingsSheet({
  sheet,
  mode,
  closing,
  locationPreference,
  locationState,
  busy,
  close,
  selectLocation,
  openLocation,
  advanceDelete,
  confirmCache,
  confirmExport,
  exportState,
  shareExport,
  retryExportCleanup,
  retryDeletionCleanup,
  confirmDelete,
}: {
  sheet: OpenSettingsSheet;
  mode: DisplayMode;
  closing: boolean;
  locationPreference: UserPreferences["locationPreference"];
  locationState: LocationState;
  busy: boolean;
  close: () => void;
  selectLocation: (value: UserPreferences["locationPreference"]) => void;
  openLocation: () => void;
  advanceDelete: () => void;
  confirmCache: () => void;
  confirmExport: () => void;
  exportState: AccountExportState;
  shareExport: () => void;
  retryExportCleanup: () => void;
  retryDeletionCleanup: () => void;
  confirmDelete: () => void;
}) {
  const exportPhase = exportState.phase;
  const dismissible = sheet !== "DELETE_CLEANUP" && (!busy || (sheet === "EXPORT" && exportPhase === "PREPARING"));
  const title = sheet === "DELETE_CLEANUP" ? "本机清理未完成"
    : sheet === "EXPORT" && exportPhase === "READY" ? "账户文件已准备"
    : sheet === "LOCATION" ? "附近地点"
    : sheet === "DELETE" ? "删除账户"
    : sheet === "DELETE_FINAL" ? "确认删除账户？"
    : CONTENT[sheet].title;
  const body = sheet === "DELETE_CLEANUP" ? "服务端删除成功；本机身份和草稿清理尚未确认。完成清理前暂停账户操作，避免继续使用旧身份。"
    : sheet === "LOCATION" ? locationState === "DENIED"
    ? "定位权限未开启，可继续手动浏览地图。"
    : "仅获取一次当前位置，用于查找附近观星点。"
    : sheet === "DELETE" ? "账户资料、偏好、个人计划与相关个人数据将被删除。公共观星点所需的审核记录会去标识化保留。"
    : sheet === "DELETE_FINAL" ? "此操作不可撤销。再次进入时，将按新账户开始。"
    : sheet === "EXPORT" && mode === "OBSERVATION"
      ? `${CONTENT.EXPORT.body} 微信文件分享界面可能亮屏；可取消并先切换日间或夜间。`
      : CONTENT[sheet].body;

  return <View className={`modal-scrim settings-sheet-scrim${closing ? " settings-sheet-scrim--closing" : ""}`} onClick={() => { if (dismissible) close(); }}>
    <View className={`settings-sheet${closing ? " settings-sheet--closing" : ""}`} ariaRole="dialog" ariaLabel={title}
      catchMove onClick={(event) => event.stopPropagation()}>
      <View className="settings-sheet__header">
        <Text className="settings-sheet__title">{title}</Text>
        {sheet !== "DELETE_CLEANUP" ? <Button className="settings-sheet__close focus-ring" ariaLabel="关闭" disabled={!dismissible} onClick={close}>
          <SemanticIcon name="close" />
        </Button> : null}
      </View>
      <Text className="settings-sheet__body">{body}</Text>

      {sheet === "EXPORT" ? <View className="settings-export-state" aria-live="polite">
        {exportPhase === "PREPARING" || exportPhase === "SHARING" || exportPhase === "CLEANING" ? <LoadingIndicator /> : null}
        <Text className="type-label">{exportPhase === "PREPARING" ? "正在整理服务端账户数据"
          : exportPhase === "SHARING" ? "正在交给微信文件分享"
          : exportPhase === "COMPLETE" ? "已交给微信文件分享"
          : exportPhase === "CLEANUP_REQUIRED" || exportPhase === "CLEANING" ? "本机临时文件未清除"
          : exportPhase === "FAILED" ? "账户文件暂未准备完成"
          : exportPhase === "READY" ? exportState.outcome === "cancelled" ? "文件交接已取消"
            : exportState.outcome === "failed" ? "文件交接失败，文件仍可再次分享" : "文件已准备，尚未完成交接"
          : "包含当前账户的计划、投稿和设置"}</Text>
        {exportPhase === "FAILED" ? <Text className="type-caption">{exportState.detail}</Text> : null}
        {exportPhase === "CLEANUP_REQUIRED" || exportPhase === "CLEANING" ? <Text className="type-caption">
          {exportState.handedOff ? "微信已接受本次交接；仍需清理本机临时文件。" : "请先清理本次临时文件，再重新准备。"}</Text> : null}
        <Text className="type-caption">服务端完成与文件交接是两个独立结果。微信接受交接不代表对方已收到。</Text>
      </View> : null}

      {sheet === "DELETE_CLEANUP" ? <View className="settings-sheet__actions">
        <Button id="settings-deletion-cleanup-retry" className="settings-sheet__primary settings-sheet__primary--ready loading-button focus-ring"
          disabled={busy} aria-busy={busy} onClick={retryDeletionCleanup}>
          {busy ? <LoadingIndicator /> : null}{busy ? "正在清理" : "重试本机清理"}
        </Button>
      </View> : sheet === "LOCATION" ? <>
        <Text className="type-meta" style={mode === "DAY" ? { color: "#6c7b88" } : {}}>不会持续定位，也不会公开你的实时位置。</Text>
        <View className="settings-sheet__choices">
        {(["ASK_ONCE", "MANUAL_ONLY"] as const).map((value) => {
          const selected = locationPreference === value;
          return <Button key={value} id={`settings-location-${value === "ASK_ONCE" ? "ask-once" : "manual-only"}`}
            className={`settings-sheet__choice focus-ring${selected ? " settings-sheet__choice--selected" : ""}`}
            ariaLabel={`${value === "ASK_ONCE" ? "使用时询问" : "始终手动选择"}，${selected ? "当前已选" : "点击选择"}`} onClick={() => selectLocation(value)}>
            <Text>{value === "ASK_ONCE" ? "使用时询问" : "始终手动选择"}</Text>
            {selected ? <SemanticIcon name={mode === "DAY" ? "settings-choice-check" : "check"} /> : null}
          </Button>;
        })}
        </View>
        <View className="settings-sheet__actions">
          <Button className="settings-sheet__secondary focus-ring" onClick={close}>手动浏览</Button>
          <Button className="settings-sheet__primary settings-sheet__primary--ready focus-ring" onClick={openLocation}>
            {locationState === "DENIED" ? "查看权限设置" : "获取本次位置"}
          </Button>
        </View>
      </> : sheet === "EXPORT" ? <View className="settings-sheet__actions">
        <Button className="settings-sheet__secondary focus-ring" disabled={!dismissible} onClick={close}>返回设置</Button>
        {exportPhase !== "PREPARING" && exportPhase !== "SHARING" ? <Button id="settings-export-next"
          className="settings-sheet__primary settings-sheet__primary--ready loading-button focus-ring"
          disabled={busy} aria-busy={busy}
          onClick={exportPhase === "READY" ? shareExport : exportPhase === "CLEANUP_REQUIRED" ? retryExportCleanup
            : exportPhase === "COMPLETE" ? close : confirmExport}>
          {exportPhase === "CLEANING" ? <LoadingIndicator /> : null}
          {exportPhase === "READY" ? "交给微信文件分享" : exportPhase === "CLEANUP_REQUIRED" ? "重试本机清理"
            : exportPhase === "CLEANING" ? "正在清理" : exportPhase === "COMPLETE" ? "完成" : "准备数据"}
        </Button> : null}
      </View> : <View className="settings-sheet__actions">
        {sheet === "DIRECTION" || sheet === "PRECISE" ?
          <Button className="settings-sheet__primary settings-sheet__primary--ready focus-ring" onClick={close}>知道了</Button> : <>
            <Button className="settings-sheet__secondary focus-ring" disabled={busy} onClick={close}>
              {sheet === "DELETE" ? "保留账户" : "取消"}
            </Button>
            <Button className={`settings-sheet__primary loading-button focus-ring${!busy ? " settings-sheet__primary--ready" : ""}${sheet === "DELETE" || sheet === "DELETE_FINAL" ? " settings-sheet__primary--danger" : ""}`}
              aria-busy={busy} disabled={busy}
              onClick={sheet === "CACHE" ? confirmCache : sheet === "DELETE" ? advanceDelete : confirmDelete}>
              {busy ? <LoadingIndicator /> : null}
              {busy ? "处理中" : sheet === "CACHE" ? "清理缓存" : sheet === "DELETE" ? "继续" : "确认删除"}
            </Button>
          </>}
      </View>}
    </View>
  </View>;
}
