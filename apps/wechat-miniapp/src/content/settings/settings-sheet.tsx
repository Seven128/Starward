import { SemanticIcon } from "@/components/semantic-asset";
import type { DisplayMode, UserPreferences } from "@starward/miniapp-contracts";
import { Button, Text, View } from "@tarojs/components";
import type { SettingsSheetKind } from "./settings-sections";

export type OpenSettingsSheet = SettingsSheetKind | "DELETE_FINAL";

const CONTENT: Record<Exclude<OpenSettingsSheet, "LOCATION" | "DELETE" | "DELETE_FINAL">, { title: string; body: string }> = {
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
    title: "下载我的数据",
    body: "服务端会整理当前账户的计划、投稿和设置，生成 JSON 文件；完成后由微信文件分享交付。",
  },
};

export function SettingsSheet({
  sheet,
  mode,
  closing,
  locationPreference,
  busy,
  close,
  selectLocation,
  advanceDelete,
  confirmCache,
  confirmExport,
  confirmDelete,
}: {
  sheet: OpenSettingsSheet;
  mode: DisplayMode;
  closing: boolean;
  locationPreference: UserPreferences["locationPreference"];
  busy: boolean;
  close: () => void;
  selectLocation: (value: UserPreferences["locationPreference"]) => void;
  advanceDelete: () => void;
  confirmCache: () => void;
  confirmExport: () => void;
  confirmDelete: () => void;
}) {
  const title = sheet === "LOCATION" ? "附近地点"
    : sheet === "DELETE" ? "删除账户"
    : sheet === "DELETE_FINAL" ? "确认删除账户？"
    : CONTENT[sheet].title;
  const body = sheet === "LOCATION" ? "仅在使用附近地点时询问定位权限，也可以一直手动选择地点。"
    : sheet === "DELETE" ? "账户资料、偏好、个人计划与相关个人数据将被删除。公共观星点所需的审核记录会去标识化保留。"
    : sheet === "DELETE_FINAL" ? "此操作不可撤销。再次进入时，将按新账户开始。"
    : sheet === "EXPORT" && mode === "OBSERVATION"
      ? `${CONTENT.EXPORT.body} 微信文件分享界面可能亮屏；可取消并先切换日间或夜间。`
      : CONTENT[sheet].body;

  return <View className={`settings-sheet-scrim${closing ? " settings-sheet-scrim--closing" : ""}`} onClick={() => { if (!busy) close(); }}>
    <View className={`settings-sheet${closing ? " settings-sheet--closing" : ""}`} role="dialog" aria-modal="true" aria-label={title}
      catchMove onClick={(event) => event.stopPropagation()}>
      <View className="settings-sheet__header">
        <Text className="settings-sheet__title">{title}</Text>
        <Button className="settings-sheet__close focus-ring" aria-label="关闭" disabled={busy} onClick={close}>
          <SemanticIcon name="close" />
        </Button>
      </View>
      <Text className="settings-sheet__body">{body}</Text>

      {sheet === "LOCATION" ? <View className="settings-sheet__choices">
        {(["ASK_ONCE", "MANUAL_ONLY"] as const).map((value) => {
          const selected = locationPreference === value;
          return <Button key={value} id={`settings-location-${value === "ASK_ONCE" ? "ask-once" : "manual-only"}`}
            className={`settings-sheet__choice focus-ring${selected ? " settings-sheet__choice--selected" : ""}`}
            aria-pressed={selected} onClick={() => selectLocation(value)}>
            <Text>{value === "ASK_ONCE" ? "使用时询问" : "始终手动选择"}</Text>
            {selected ? <SemanticIcon name="check" /> : null}
          </Button>;
        })}
      </View> : <View className="settings-sheet__actions">
        {sheet === "DIRECTION" || sheet === "PRECISE" ?
          <Button className="settings-sheet__primary focus-ring" onClick={close}>知道了</Button> : <>
            <Button className="settings-sheet__secondary focus-ring" disabled={busy} onClick={close}>
              {sheet === "DELETE" ? "保留账户" : "取消"}
            </Button>
            <Button className={`settings-sheet__primary focus-ring${sheet === "DELETE" || sheet === "DELETE_FINAL" ? " settings-sheet__primary--danger" : ""}`}
              loading={busy} disabled={busy}
              onClick={sheet === "CACHE" ? confirmCache : sheet === "EXPORT" ? confirmExport : sheet === "DELETE" ? advanceDelete : confirmDelete}>
              {busy ? "处理中" : sheet === "CACHE" ? "清理缓存" : sheet === "EXPORT" ? "准备数据" : sheet === "DELETE" ? "继续" : "确认删除"}
            </Button>
          </>}
      </View>}
    </View>
  </View>;
}
