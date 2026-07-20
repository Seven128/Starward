export type OrientationAccuracy = "unavailable" | "low" | "medium" | "high";

export interface OrientationSample {
  timestampMs: number;
  attitude: { yawDeg: number; pitchDeg: number; rollDeg: number };
  magneticHeadingDeg?: number;
  magneticFieldMicrotesla?: number;
  declinationDeg?: number;
  gpsCourseDeg?: number;
  gpsSpeedMps?: number;
}

export interface StableOrientation {
  timestampMs: number;
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  accuracy: OrientationAccuracy;
  following: boolean;
  northReference: "true" | "magnetic" | "manual";
  anomaly: "none" | "magnetic-interference" | "stale" | "sensor-unavailable";
  guidance: string;
}

const normalize = (degrees: number) => ((degrees % 360) + 360) % 360;
const signedDelta = (from: number, to: number) => ((to - from + 540) % 360) - 180;
const finite = (value: number | undefined): value is number => typeof value === "number" && Number.isFinite(value);

export class OrientationEngine {
  private last: StableOrientation | null = null;

  update(sample: OrientationSample): StableOrientation {
    if (!Number.isFinite(sample.timestampMs) || ![sample.attitude.yawDeg, sample.attitude.pitchDeg, sample.attitude.rollDeg].every(Number.isFinite)) {
      return this.unavailable(sample.timestampMs, "sensor-unavailable");
    }

    const field = sample.magneticFieldMicrotesla;
    const interference = finite(field) && (field < 25 || field > 65);
    const magnetic = finite(sample.magneticHeadingDeg) ? sample.magneticHeadingDeg : undefined;
    const trueMagnetic = magnetic === undefined ? undefined : normalize(magnetic + (sample.declinationDeg ?? 0));
    const movingGps = finite(sample.gpsCourseDeg) && (sample.gpsSpeedMps ?? 0) >= 2;
    const absoluteHeading = !interference && trueMagnetic !== undefined
      ? trueMagnetic
      : movingGps
        ? normalize(sample.gpsCourseDeg!)
        : normalize(sample.attitude.yawDeg);

    const previous = this.last;
    const elapsed = previous ? sample.timestampMs - previous.timestampMs : 0;
    const stale = previous !== null && (elapsed <= 0 || elapsed > 2_000);
    const accuracy: OrientationAccuracy = interference || stale
      ? "low"
      : trueMagnetic !== undefined && finite(sample.declinationDeg)
        ? "high"
        : movingGps || magnetic !== undefined
          ? "medium"
          : "low";
    const following = accuracy !== "low";
    const smoothing = previous && elapsed > 0 ? Math.min(0.45, Math.max(0.12, elapsed / 500)) : 1;
    const headingDeg = previous && following
      ? normalize(previous.headingDeg + signedDelta(previous.headingDeg, absoluteHeading) * smoothing)
      : absoluteHeading;

    this.last = {
      timestampMs: sample.timestampMs,
      headingDeg,
      pitchDeg: sample.attitude.pitchDeg,
      rollDeg: sample.attitude.rollDeg,
      accuracy,
      following,
      northReference: finite(sample.declinationDeg) ? "true" : magnetic !== undefined ? "magnetic" : "manual",
      anomaly: interference ? "magnetic-interference" : stale ? "stale" : "none",
      guidance: interference
        ? "检测到磁场干扰。请远离车辆或金属，完成八字校准；实时跟随已停止。"
        : stale
          ? "方向样本已中断，已冻结到最后稳定方向。"
          : following
            ? "方向跟随已启用。"
            : "方向精度不足，请使用手动北向或触控浏览。",
    };
    return this.last;
  }

  unavailable(timestampMs = Date.now(), anomaly: StableOrientation["anomaly"] = "sensor-unavailable"): StableOrientation {
    return {
      timestampMs,
      headingDeg: this.last?.headingDeg ?? 0,
      pitchDeg: this.last?.pitchDeg ?? 0,
      rollDeg: this.last?.rollDeg ?? 0,
      accuracy: "unavailable",
      following: false,
      northReference: "manual",
      anomaly,
      guidance: "设备方向不可用。通用天空、手动北向和触控浏览仍可使用。",
    };
  }

  directionTo(targetAzimuthDeg: number): { turn: "left" | "right" | "aligned"; degrees: number } {
    const delta = signedDelta(this.last?.headingDeg ?? 0, normalize(targetAzimuthDeg));
    if (Math.abs(delta) < 2) return { turn: "aligned", degrees: Math.abs(delta) };
    return { turn: delta < 0 ? "left" : "right", degrees: Math.abs(delta) };
  }
}

