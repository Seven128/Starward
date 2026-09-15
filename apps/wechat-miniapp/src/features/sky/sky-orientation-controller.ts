import { createCompassLifecycle, type CompassPort, type CompassEvent } from "./compass-lifecycle";
import { createDeviceOrientationViewTracker, deviceMotionAngleUnit, type DeviceOrientationFrame } from "./device-orientation-view";
import { createDirectionAlignment, type DirectionAlignmentSnapshot } from "./direction-alignment";
import type { SkyViewBasis } from "./sky-view-projection";

export type SkySensorState = "PERMISSION_REQUIRED" | "DENIED" | "CALIBRATING" | "READY" | "LOW_ACCURACY" | "STALE" | "UNAVAILABLE";
export interface SkyOrientationSnapshot {
  /** Fences queued render frames across reference/control transitions. */
  readonly presentationRevision: number;
  readonly state: SkySensorState;
  readonly reason: string;
  readonly pose: DeviceOrientationFrame | null;
  readonly alignment: DirectionAlignmentSnapshot;
  readonly telemetry: { accuracy: number | string | null; sampledAt: number | null };
}
interface Clock {
  now(): number;
  schedule(callback: () => void, ms: number): unknown;
  cancel(handle: unknown): void;
}
const nativeClock: Clock = { now: () => Date.now(), schedule: (fn, ms) => setTimeout(fn, ms),
  cancel: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) };

export function compassAccuracyState(accuracy: number | string | null): "READY" | "LOW_ACCURACY" | "UNAVAILABLE" {
  if (accuracy === null || String(accuracy).trim() === "") return "UNAVAILABLE";
  const number = Number(accuracy);
  if (Number.isFinite(number) && number >= 0) return number <= 20 ? "READY" : "LOW_ACCURACY";
  return ["high", "medium"].includes(String(accuracy).trim().toLowerCase()) ? "READY" : "LOW_ACCURACY";
}

/** Owns sensor/visual-reference transitions; native acquisition stays in the shared coordinator. */
export function createSkyOrientationController(options: {
  port: CompassPort;
  platform: string;
  presented(): SkyViewBasis | null;
  changed(snapshot: SkyOrientationSnapshot): void;
  clock?: Clock;
}) {
  const clock = options.clock ?? nativeClock;
  const alignment = createDirectionAlignment({ now: () => clock.now() });
  const tracker = createDeviceOrientationViewTracker(deviceMotionAngleUnit(options.platform));
  let state: SkySensorState = "PERMISSION_REQUIRED";
  let reason = "允许后仅在本页前台读取设备方向，不记录连续姿态轨迹";
  let raw: DeviceOrientationFrame | null = null;
  let telemetry: SkyOrientationSnapshot["telemetry"] = { accuracy: null, sampledAt: null };
  let lowSince: number | null = null, goodSamples = 0, lowQuality = false;
  let deadline: unknown, generation = 0, reference = 0, resume = false, disposed = false;
  let presentationRevision = 0;
  const lifecycle = createCompassLifecycle(options.port, { requireDeviceMotion: true,
    motionInterval: "game", compassOptional: options.platform.toLowerCase() === "android",
    compassUnavailable: () => { telemetry = { accuracy: null, sampledAt: null }; emit(); } });
  const snapshot = (): SkyOrientationSnapshot => {
    const aligned = alignment.snapshot();
    const basis = aligned.view;
    const horizontal = basis ? Math.hypot(basis.forward[0], basis.forward[1]) : 0;
    const headingDeg = basis && horizontal >= 0.15
      ? (Math.atan2(basis.forward[0], basis.forward[1]) * 180 / Math.PI + 360) % 360 : null;
    return { presentationRevision, state, reason, telemetry: { ...telemetry }, alignment: aligned,
      pose: raw && basis ? { ...raw, basis, headingDeg } : null };
  };
  function emit() { if (!disposed) options.changed(snapshot()); }
  function clearDeadline() { if (deadline !== undefined) clock.cancel(deadline); deadline = undefined; }
  function armDeadline(session: number) {
    clearDeadline();
    deadline = clock.schedule(() => {
      if (session !== generation || !lifecycle.active) return;
      deadline = undefined;
      alignment.endReference(options.presented());
      reference = alignment.startReference();
      presentationRevision++;
      tracker.reset();
      state = "STALE"; reason = "方向数据暂时中断，保留当前视图";
      emit();
    }, 500);
  }
  function acceptCompass(event: CompassEvent) {
    if (!Number.isFinite(event.direction) || event.direction < 0 || event.direction > 360) return;
    tracker.setCompassHeading(event.direction);
    telemetry = { accuracy: event.accuracy, sampledAt: clock.now() };
    const quality = compassAccuracyState(event.accuracy);
    if (quality === "READY") {
      lowSince = null;
      if (++goodSamples >= 3) lowQuality = false;
    } else {
      goodSamples = 0;
      lowSince ??= clock.now();
      if (clock.now() - lowSince >= 2000) lowQuality = true;
    }
    if (alignment.snapshot().ready) updateLiveState();
    emit();
  }
  function updateLiveState() {
    state = lowQuality ? "LOW_ACCURACY" : "READY";
    reason = lowQuality ? "方向精度较低，方位可能存在偏差，可重新校准"
      : "天空图随手机方向更新；可使用可靠天体或方向参照重新校准";
  }
  async function start() {
    if (disposed || lifecycle.active) return;
    const session = ++generation;
    tracker.reset();
    reference = alignment.startReference();
    presentationRevision++;
    telemetry = { accuracy: null, sampledAt: null };
    lowSince = null; goodSamples = 0; lowQuality = false;
    state = "CALIBRATING"; reason = "正在读取设备方向";
    emit();
    armDeadline(session);
    await lifecycle.start(event => { if (session === generation) acceptCompass(event); }, error => {
      if (disposed || session !== generation) return;
      clearDeadline();
      alignment.endReference(options.presented());
      presentationRevision++;
      const message = error instanceof Error ? error.message : String(error);
      const denied = /permission|authoriz|auth|den(?:y|ied)/iu.test(message);
      state = denied ? "DENIED" : "UNAVAILABLE";
      reason = denied ? "方向权限未开启，手动视角与天体列表仍可用" : "设备方向暂不可用，手动视角与天体列表仍可用";
      emit();
    }, event => {
      if (disposed || session !== generation) return;
      const next = tracker.updateMotion(event, clock.now());
      if (!next) {
        // The retained radian adapter needs a defined phone-top azimuth to
        // establish its initial reference. Valid waiting samples are live.
        if (tracker.awaitingNorthReference) {
          state = "CALIBRATING";
          reason = "请稍微放平手机以确定方向，连接后可自由转动";
          armDeadline(session); emit();
        }
        return;
      }
      raw = next;
      // Never throttle this update: confirmation uses the latest raw pose,
      // even when it arrived between the last render and the button tap.
      if (!alignment.update(reference, next.basis, next.sampledAt)) return;
      updateLiveState(); armDeadline(session); emit();
    });
  }
  function stop() {
    generation++; clearDeadline();
    alignment.endReference(options.presented());
    presentationRevision++;
    tracker.reset();
    state = "PERMISSION_REQUIRED";
    reason = "允许后仅在本页前台读取设备方向，不记录连续姿态轨迹";
    void lifecycle.stop(); emit();
  }
  return {
    snapshot, start, stop,
    get active() { return lifecycle.active; },
    hide() { resume = lifecycle.active; stop(); },
    show() { if (resume) { resume = false; void start(); } },
    stopFollowing() { resume = false; stop(); },
    begin() { const changed = alignment.begin(options.presented()); if (changed) { presentationRevision++; emit(); } return changed; },
    commit() { const changed = alignment.commit(); if (changed) { presentationRevision++; emit(); } return changed; },
    cancel() { const changed = alignment.cancel(); if (changed) { presentationRevision++; emit(); } return changed; },
    dispose() { disposed = true; resume = false; stop(); },
  };
}
