export const SHOOTING_RULE_VERSION = "starward-shooting-rules@1.0.0";

export type Experience = "beginner" | "intermediate" | "expert";
export type Target = "milky-way" | "star-trails" | "moon" | "meteor-shower" | "planet-landscape" | "portrait" | "station-trail" | "sunset-milky-way";
export interface ConditionsSnapshot {
  capturedAt: string;
  sourceVersions: string[];
  lightPollutionSqm?: number;
  moonIllumination?: number;
  totalCloudPercent?: number;
  windMps?: number;
  humidityPercent?: number;
  targetAltitudeDeg?: number;
}
export interface CameraEquipment { kind: "camera"; model: string; sensorWidthMm: number; sensorHeightMm: number; focalLengthMm: number; maxAperture: number; tracker: boolean; tripod: boolean }
export interface PhoneEquipment { kind: "phone"; model: string; focalLengthMm: number; equivalentFocalLengthMm: number; tripod: boolean; controls: Array<"iso" | "shutter" | "white-balance" | "focus" | "exposure-compensation" | "burst" | "raw" | "night-mode"> }
export type ShootingEquipment = CameraEquipment | PhoneEquipment;
export interface ShootingInput { target: Target; locationId: string; scheduledAt: string; timezone: string; equipment: ShootingEquipment; acceptsStacking: boolean; experience: Experience; conditions: ConditionsSnapshot }

export interface ShootingPlanResult {
  ruleVersion: string;
  deterministic: true;
  settings: Record<string, string | number | boolean>;
  risks: string[];
  alternatives: string[];
  confidence: number;
  missingConditions: string[];
  provenance: { conditionsCapturedAt: string; sourceVersions: string[] };
}

const requiredConditionKeys = ["lightPollutionSqm", "moonIllumination", "totalCloudPercent", "windMps", "humidityPercent", "targetAltitudeDeg"] as const;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits = 1) => { const scale = 10 ** digits; return Math.round(value * scale) / scale; };

export function calculateTrailingLimitSeconds(input: { focalLengthMm: number; cropFactor: number; targetAltitudeDeg?: number; tracker: boolean }): number {
  if (input.tracker) return 120;
  if (!Number.isFinite(input.focalLengthMm) || input.focalLengthMm <= 0 || !Number.isFinite(input.cropFactor) || input.cropFactor <= 0) throw new RangeError("invalid_optical_input");
  const altitudeFactor = input.targetAltitudeDeg === undefined ? 0.8 : clamp(0.65 + input.targetAltitudeDeg / 180, 0.65, 1);
  return round(clamp((300 / (input.focalLengthMm * input.cropFactor)) * altitudeFactor, 0.5, 30));
}

function baseResult(input: ShootingInput, settings: ShootingPlanResult["settings"], risks: string[], alternatives: string[]): ShootingPlanResult {
  const missingConditions = requiredConditionKeys.filter((key) => input.conditions[key] === undefined);
  if ((input.conditions.windMps ?? 0) > 6) risks.push("风速较高：三脚架振动和长焦抖动风险上升");
  if ((input.conditions.humidityPercent ?? 0) > 85) risks.push("湿度较高：准备镜头加热带并检查结露");
  if ((input.conditions.totalCloudPercent ?? 0) > 50) risks.push("云量较高：参数可执行但目标可见窗口不确定");
  return {
    ruleVersion: SHOOTING_RULE_VERSION, deterministic: true, settings, risks, alternatives,
    confidence: round(clamp(1 - missingConditions.length * 0.11, 0.25, 1), 2), missingConditions,
    provenance: { conditionsCapturedAt: input.conditions.capturedAt, sourceVersions: [...input.conditions.sourceVersions] },
  };
}

export function buildShootingPlan(input: ShootingInput): ShootingPlanResult {
  if (!input.locationId || !Number.isFinite(Date.parse(input.scheduledAt)) || !input.timezone) throw new TypeError("shooting_context_invalid");
  if (input.equipment.kind === "phone") {
    const equipment = input.equipment;
    const supports = (control: PhoneEquipment["controls"][number]) => equipment.controls.includes(control);
    const settings: ShootingPlanResult["settings"] = { lens: "主摄", stabilization: equipment.tripod ? "三脚架固定；关闭光学防抖（若设备允许）" : "稳定支撑", stackingFrames: input.acceptsStacking ? 20 : 1 };
    if (supports("shutter")) settings.shutterSeconds = Math.min(10, calculateTrailingLimitSeconds({ focalLengthMm: equipment.equivalentFocalLengthMm, cropFactor: 1, targetAltitudeDeg: input.conditions.targetAltitudeDeg, tracker: false }));
    if (supports("iso")) settings.iso = 1600;
    if (supports("white-balance")) settings.whiteBalanceK = 4000;
    if (supports("focus")) settings.focus = "手动无穷远附近，放大星点复核";
    if (supports("exposure-compensation")) settings.exposureCompensationEv = 0;
    if (supports("burst")) settings.captureMode = "间隔连拍";
    if (supports("night-mode")) settings.nightModeAlternative = "无专业快门时使用夜景模式并固定手机";
    return baseResult(input, settings, equipment.tripod ? [] : ["无三脚架：拖影与帧间位移风险较高"], ["缩短快门并增加堆栈张数", "切换已验证支持专业模式的设备"]);
  }
  const cropFactor = 36 / input.equipment.sensorWidthMm;
  const trailingLimit = calculateTrailingLimitSeconds({ focalLengthMm: input.equipment.focalLengthMm, cropFactor, targetAltitudeDeg: input.conditions.targetAltitudeDeg, tracker: input.equipment.tracker });
  const shutterSeconds = input.equipment.tracker ? Math.min(60, trailingLimit) : Math.min(10, trailingLimit);
  return baseResult(input, {
    aperture: input.equipment.maxAperture, shutterSeconds, iso: input.equipment.tracker ? 800 : 1600, whiteBalanceK: 4000,
    focus: "手动对焦，放大亮星复核", focalLengthMm: input.equipment.focalLengthMm, intervalSeconds: round(shutterSeconds + 2),
    stackingFrames: input.acceptsStacking ? 20 : 1, longExposureNoiseReduction: false, tracker: input.equipment.tracker,
    composition: input.target === "milky-way" ? "横向银河拱桥，先核对地平线遮挡" : "按目标轨迹和前景方向构图",
  }, input.equipment.tracker ? [] : [`星点拖线限制约 ${trailingLimit} 秒；先试拍并放大检查`], ["缩短快门并提高 ISO", "使用赤道仪后重新计算", "增加堆栈张数降低单帧压力"]);
}

export interface ShootingPlanVersion { id: string; revision: number; previousRevision: number | null; input: ShootingInput; result: ShootingPlanResult; userOverrides: Record<string, unknown>; savedAt: string; offlinePackRevision?: number }
export function saveShootingPlanVersion(previous: ShootingPlanVersion | null, input: ShootingInput, userOverrides: Record<string, unknown>, savedAt: string): ShootingPlanVersion {
  const result = buildShootingPlan(input);
  const revision = (previous?.revision ?? 0) + 1;
  return { id: previous?.id ?? `shooting-${input.locationId}-${Date.parse(savedAt)}`, revision, previousRevision: previous?.revision ?? null, input, result, userOverrides: { ...userOverrides }, savedAt };
}

export interface ChecklistItem { id: string; phase: "departure" | "field"; label: string; critical: boolean; done: boolean; assignee?: string }
export const BASE_CHECKLIST: readonly ChecklistItem[] = [
  { id: "battery", phase: "departure", label: "电池与移动电源", critical: true, done: false }, { id: "storage", phase: "departure", label: "存储卡与剩余空间", critical: true, done: false },
  { id: "tripod", phase: "departure", label: "三脚架与快装板", critical: true, done: false }, { id: "lens-cloth", phase: "departure", label: "镜头布与防露用品", critical: false, done: false },
  { id: "red-light", phase: "departure", label: "红光手电、保暖、驱蚊和补给", critical: true, done: false }, { id: "flash-off", phase: "field", label: "关闭自动闪光，避免白光干扰", critical: true, done: false },
  { id: "manual-focus", phase: "field", label: "手动星点对焦并放大复核", critical: true, done: false }, { id: "dew-level", phase: "field", label: "检查水平、试拍与结露", critical: false, done: false },
] as const;
export function mergeChecklist(local: ChecklistItem[], incoming: ChecklistItem[]): ChecklistItem[] {
  const merged = new Map<string, ChecklistItem>();
  for (const item of [...BASE_CHECKLIST, ...incoming, ...local]) merged.set(item.id, { ...(merged.get(item.id) ?? item), ...item, done: (merged.get(item.id)?.done ?? false) || item.done });
  return [...merged.values()];
}

export function explainExposurePlan(input: { deterministic: { iso: number; seconds: number; aperture: number; ruleVersion: string }; aiSuggestion?: unknown }) {
  return { settings: { iso: input.deterministic.iso, seconds: input.deterministic.seconds, aperture: input.deterministic.aperture }, ruleVersion: input.deterministic.ruleVersion, aiRole: "explanation-only", explanation: "曝光参数来自确定性器材与天体运动规则；AI 仅解释风险与调整方向。", ignoredSuggestion: Boolean(input.aiSuggestion) };
}
