export type ArPlatform = "arkit" | "arcore" | "camera-overlay" | "none";

export interface ArCapability {
  platform: ArPlatform;
  cameraPermission: "granted" | "denied" | "undetermined";
  tracking: "normal" | "limited" | "lost" | "unavailable";
}

export interface ArResolution {
  mode: "ar" | "camera-overlay" | "universal-sky";
  trustworthyOverlay: boolean;
  reason: string;
}

export function resolveArMode(capability: ArCapability): ArResolution {
  if (capability.cameraPermission !== "granted") {
    return { mode: "universal-sky", trustworthyOverlay: false, reason: "相机未授权；保留同一地点、时间和目标的通用天空。" };
  }
  if ((capability.platform === "arkit" || capability.platform === "arcore") && capability.tracking === "normal") {
    return { mode: "ar", trustworthyOverlay: true, reason: "原生 AR 追踪正常。" };
  }
  if (capability.platform === "camera-overlay" && capability.tracking !== "lost") {
    return { mode: "camera-overlay", trustworthyOverlay: capability.tracking === "normal", reason: "使用摄像头与方向传感器叠加，精度状态持续可见。" };
  }
  return { mode: "universal-sky", trustworthyOverlay: false, reason: "设备不支持或追踪丢失；已隐藏漂移叠加并回到通用天空。" };
}

