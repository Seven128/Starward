function scenario(key: string, action: string, label: string, ids: string[], primary: string, body: string, meta = "当前为版本化产品示例；生产数据将显示来源、生成时间、有效期和质量状态。") {
  return { key, action, label, evidence: ids.map((id, index) => ({ id, title: index === 0 ? primary : label, body, meta })) };
}
export const skyFeature = { outcome: "sky-orientation-ar", eyebrow: "天空定位", title: "通用天空与可选 AR", subtitle: "天空视图不依赖相机；AR、方向传感器和校准只增强定位，能力不足时保留可操作降级。", scenarios: [
  scenario("universal-sky","sky-open-universal-view","通用天空",["sky-time-context","sky-location-context","sky-visible-objects"],"2026-08-13 00:40 · 深圳", "当前可见目标：银河核心、土星与夏季大三角；位置、时区与算法版本随结果显示。"),
  scenario("time-jump","sky-jump-time","跳转时刻",["sky-selected-time","sky-object-position","sky-timezone"],"所选时间 01:30", "目标位置按新时间更新；使用 Asia/Shanghai 展示并以 UTC 存储计算时刻。"),
  scenario("obstruction-trajectory","sky-add-obstruction","遮挡轨迹",["sky-obstruction-profile","sky-target-trajectory","sky-visible-window"],"南偏东地平线遮挡 12°", "目标轨迹与遮挡相交后，可见窗口收窄为 00:52–02:18。"),
  scenario("field-of-view","sky-apply-fov","视场模拟",["sky-fov-equipment","sky-fov-overlay","sky-fov-scale"],"20 mm 镜头 · 全画幅", "视场覆盖层按器材焦距与传感器尺寸计算；缩放比例和假设可查看。"),
  scenario("ar-degradation","sky-open-ar","AR 能力",["sky-ar-support-state","sky-ar-fallback","sky-ar-accuracy"],"AR 当前不可用", "已降级到通用天空与静态天空，不阻断核心定位；低精度方向不会冒充准确指向。"),
  scenario("low-accuracy-guidance","sky-calibrate-sensors","传感器校准",["sky-sensor-accuracy","sky-calibration-guide","sky-manual-orientation"],"方向精度低 · 需要校准", "远离车辆和金属，完成八字校准；也可按北向与地标手动定向。"),
] } as const;
