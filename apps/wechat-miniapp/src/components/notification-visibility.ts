import Taro from "@tarojs/taro";
import { useEffect, useState } from "react";
import type { NotificationRecord } from "@/state/notification";

export function floatingNotificationNodeId(notification: Pick<NotificationRecord, "id" | "createdAt" | "occurrences">): string {
  const identity = Array.from(notification.id, character => character.codePointAt(0)!.toString(16)).join("_");
  return `notice-${notification.createdAt}-${notification.occurrences}-${identity}`;
}

/** Offscreen entries stay queued. If native observation is unavailable, retain
 * the dismissible notice instead of pretending that the user has seen it. */
export function useFloatingNotificationVisibility(nodeId: string): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let disposed = false;
    let observer: Taro.IntersectionObserver | undefined;
    setVisible(false);
    Taro.nextTick(() => {
      if (disposed) return;
      try {
        const page = Taro.getCurrentInstance().page;
        if (!page) return;
        observer = Taro.createIntersectionObserver(page, { thresholds: [0, 0.999], initialRatio: 0 });
        observer.relativeTo(".notification-host__scroll").relativeToViewport().observe(`#${nodeId}`, result => {
          if (!disposed) setVisible(typeof result.intersectionRatio === "number" && result.intersectionRatio >= 0.999);
        });
      } catch {
        observer?.disconnect();
        observer = undefined;
      }
    });
    return () => { disposed = true; observer?.disconnect(); };
  }, [nodeId]);
  return visible;
}
