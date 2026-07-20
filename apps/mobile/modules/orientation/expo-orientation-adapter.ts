import { DeviceMotion, Magnetometer, type DeviceMotionMeasurement } from "expo-sensors";
import { OrientationEngine, type StableOrientation } from "./orientation-engine";

export interface OrientationSubscription {
  stop(): void;
}

export async function startExpoOrientation(
  onUpdate: (orientation: StableOrientation) => void,
  options: { declinationDeg?: number; intervalMs?: number } = {},
): Promise<OrientationSubscription | null> {
  if (!(await DeviceMotion.isAvailableAsync()) || !(await Magnetometer.isAvailableAsync())) return null;
  const engine = new OrientationEngine();
  const intervalMs = Math.max(50, options.intervalMs ?? 100);
  DeviceMotion.setUpdateInterval(intervalMs);
  Magnetometer.setUpdateInterval(intervalMs);
  let magnetic: { headingDeg: number; field: number } | undefined;
  const magnetometer = Magnetometer.addListener(({ x, y, z }) => {
    magnetic = {
      headingDeg: ((Math.atan2(-y, x) * 180) / Math.PI + 360) % 360,
      field: Math.sqrt(x * x + y * y + z * z),
    };
  });
  const motion = DeviceMotion.addListener((sample: DeviceMotionMeasurement) => {
    onUpdate(engine.update({
      timestampMs: sample.rotation.timestamp * 1_000,
      attitude: {
        yawDeg: sample.rotation.alpha * 180 / Math.PI,
        pitchDeg: sample.rotation.beta * 180 / Math.PI,
        rollDeg: sample.rotation.gamma * 180 / Math.PI,
      },
      magneticHeadingDeg: magnetic?.headingDeg,
      magneticFieldMicrotesla: magnetic?.field,
      declinationDeg: options.declinationDeg,
    }));
  });
  return { stop: () => { motion.remove(); magnetometer.remove(); } };
}

