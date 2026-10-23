import * as Location from "expo-location";
import { assertDeviceLocationFix, type DeviceLocationFix } from "./location-fix";

export interface ForegroundLocationGateway {
  getFix(signal: AbortSignal): Promise<DeviceLocationFix>;
}

type FixOutcome = { fix: DeviceLocationFix } | { error: Error };
interface Acquisition {
  readers: Set<(outcome: FixOutcome) => void>;
}

// Expo's one-shot API has no cancellation handle. Keep one native request owned
// until it settles, even after the last logical reader leaves. Reopening the UI
// joins that request; it cannot accumulate callbacks or parallel native work.
let acquisition: Acquisition | null = null;
const failure = (code: string): FixOutcome => ({ error: new Error(code) });

async function acquire(owner: Acquisition): Promise<FixOutcome> {
  if (!owner.readers.size) return failure("foreground_location_cancelled");
  try {
    if (!await Location.hasServicesEnabledAsync()) return failure("foreground_location_services_disabled");
  } catch { return failure("foreground_location_unavailable"); }
  if (!owner.readers.size) return failure("foreground_location_cancelled");
  let location: Location.LocationObject;
  try {
    location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: false });
  } catch { return failure("foreground_location_unavailable"); }
  try {
    const fix: DeviceLocationFix = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracyMeters: location.coords.accuracy,
      timestampMs: location.timestamp,
      coordinateSystem: "WGS84",
      ...(location.mocked === undefined ? {} : { mocked: location.mocked }),
    };
    assertDeviceLocationFix(fix);
    return { fix };
  } catch { return failure("foreground_location_fix_invalid"); }
}

export const expoForegroundLocationGateway: ForegroundLocationGateway = {
  getFix(signal) {
    if (signal.aborted) return Promise.reject(new Error("foreground_location_cancelled"));
    const fresh = acquisition === null;
    const owner = acquisition ?? { readers: new Set<(outcome: FixOutcome) => void>() };
    acquisition = owner;
    const result = new Promise<DeviceLocationFix>((resolve, reject) => {
      const finish = (outcome: FixOutcome) => {
        if (!owner.readers.delete(finish)) return;
        signal.removeEventListener("abort", abort);
        if ("fix" in outcome) resolve({ ...outcome.fix });
        else reject(outcome.error);
      };
      const abort = () => finish(failure("foreground_location_cancelled"));
      owner.readers.add(finish);
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
    if (fresh) void acquire(owner).then((outcome) => {
      if (acquisition === owner) acquisition = null;
      for (const finish of [...owner.readers]) finish(outcome);
    });
    return result;
  },
};
