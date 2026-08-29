// Shared synthetic Android foreground and PNG fixtures; no real device data.
export const activity = "com.tencent.mm/com.tencent.mm.plugin.appbrand.ui.AppBrandUI";
export const permissionsActivity = "com.tencent.mm/com.tencent.mm.plugin.appbrand.ui.AppBrandAuthorizeUI";
export const systemLocationActivity = "com.android.permissioncontroller/com.skyui.permissioncontroller.request.ui.SkyGrantPermissionsActivity";
export function permissionHistory({ from = "com.tencent.mm", underlyingTask = 41, underlyingUser = 0 } = {}) {
  return `topResumedActivity=ActivityRecord{abc u0 ${permissionsActivity} t41}
  * Hist  #1: ActivityRecord{abc u0 ${permissionsActivity} t41}
    launchedFromUid=10000 launchedFromPackage=${from}
    Intent { cmp=${permissionsActivity} (has extras) }
  * Hist  #0: ActivityRecord{def u${underlyingUser} ${activity} t${underlyingTask}}
    launchedFromPackage=com.tencent.mm
`;
}
export function png(width = 1080, height = 2400) {
  const bytes = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(bytes);
  bytes.write("IHDR", 12); bytes.writeUInt32BE(width, 16); bytes.writeUInt32BE(height, 20);
  return bytes;
}
