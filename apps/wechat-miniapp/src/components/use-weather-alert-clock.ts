import { useEffect, useRef, useState } from "react";
import type { WeatherEvidenceSummary } from "@starward/miniapp-contracts";
import { weatherAlertState } from "./weather-alert-state";

export function useWeatherAlertClock(evidence: WeatherEvidenceSummary | undefined, active: boolean, refresh: () => void) {
  const [now, setNow] = useState(Date.now);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      const current = Date.now();
      setNow(current);
      const next = weatherAlertState(evidence, current).nextBoundary;
      if (next !== null) timer = setTimeout(() => {
        update();
        refreshRef.current();
      }, Math.min(2_147_483_647, Math.max(1, next - current)));
    };
    update();
    return () => clearTimeout(timer);
  }, [evidence, active]);
  return now;
}
