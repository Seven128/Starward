import Taro, { useDidHide, useDidShow, useResize } from "@tarojs/taro";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import type { NotificationRecord } from "@/state/notification";
import { selectNotification, selectNotifications } from "@/state/notification";
import { useAppStore } from "@/state/app-store";
import { floatingNotificationNodeId, useFloatingNotificationVisibility } from "./notification-visibility";
import { nativeNavigationInsets } from "@/theme/native-metrics";
import { SemanticIcon } from "./semantic-asset";

const ICON: Readonly<Record<NotificationRecord["tone"], "info" | "check">> = {
  error: "info",
  warning: "info",
  info: "info",
  success: "check",
};

export function NotificationComponent({
  notification,
  residualCount = 0,
  onAction,
  onDismiss,
}: {
  notification: NotificationRecord;
  residualCount?: number;
  onAction?: () => void;
  onDismiss?: () => void;
}) {
  const action = async () => {
    if (onAction) return onAction();
    if (!notification.action?.route) return;
    const method = notification.action.navigation ?? "navigateTo";
    await Taro[method]({ url: notification.action.route });
  };
  return (
    <View
      className={`notification notification--${notification.placement} notification--${notification.tone}`}
      id={`notification-${notification.placement}-${notification.id}`}
      role={notification.tone === "error" ? "alert" : "status"}
      aria-live={notification.tone === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <View
        className="notification__icon"
        data-od-id="notification-icon"
        aria-hidden="true"
      >
        <SemanticIcon name={ICON[notification.tone]} />
      </View>
      <View className="notification__copy" data-od-id="notification-feedback">
        <Text
          className="notification__title type-label"
          data-od-id="notification-title"
        >
          {notification.title}
        </Text>
        <Text
          className="notification__body type-caption"
          data-od-id="notification-body"
        >
          {notification.body}
        </Text>
        {residualCount > 0 ? (
          <Text
            className="notification__residual type-caption"
            data-od-id="notification-residual-count"
          >
            另有 {residualCount} 条状态已保留
          </Text>
        ) : null}
      </View>
      {notification.action ? (
        <Button
          className="notification__action focus-ring"
          data-od-id="notification-action"
          aria-label={notification.action.label}
          onClick={() => void action()}
        >
          <Text>{notification.action.label}</Text>
        </Button>
      ) : null}
      {(notification.dismissible || notification.placement === "floating") && onDismiss ? (
        <Button
          className="notification__dismiss focus-ring"
          data-od-id="notification-dismiss"
          ariaLabel={`关闭通知：${notification.title}`}
          onClick={onDismiss}
        >
          <Text aria-hidden="true">×</Text>
        </Button>
      ) : null}
    </View>
  );
}

// One mounted notice owns its timer. A deduplicated replacement gets a new key,
// so cleanup cancels both expiry and exit before the replacement can be removed.
export function FloatingNotification({ notification, onDismiss }: {
  notification: NotificationRecord;
  onDismiss: () => void;
}) {
  const nodeId = floatingNotificationNodeId(notification);
  const visible = useFloatingNotificationVisibility(nodeId);
  const [closing, setClosing] = useState(false);
  const [paused, setPaused] = useState(false);
  const closingRef = useRef(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const close = () => { closingRef.current = true; setClosing(true); };
  useEffect(() => () => {
    // Hiding during the exit animation must not resurrect a dismissed notice.
    if (closingRef.current) dismissRef.current();
  }, []);
  useEffect(() => {
    // Floating notices are always transient; durable recovery stays inline with the failed task.
    if (closing || paused || !visible) return;
    let cancelled = false;
    const timer = setTimeout(() => { if (!cancelled) close(); }, 3000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [notification.action, closing, paused, visible]);
  useEffect(() => {
    if (!closing) return;
    let cancelled = false;
    const timer = setTimeout(() => { if (!cancelled) dismissRef.current(); }, 160);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [closing]);
  return (
    <View id={nodeId} className={`notification-slot${closing ? " notification-slot--closing" : ""}`}
      onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)} onTouchCancel={() => setPaused(false)}>
      <NotificationComponent notification={notification} onDismiss={close} />
    </View>
  );
}

export function NotificationRegion({
  owner,
  placement = "inline",
}: {
  owner?: string;
  placement?: NotificationRecord["placement"];
}) {
  const queue = useAppStore((state) => state.notifications);
  const dismiss = useAppStore((state) => state.dismissNotification);
  if (placement === "floating") {
    return <View className="notification-stack">
      {selectNotifications(queue, placement, owner).slice(0, 3).map((notification) => (
        <FloatingNotification
          key={`${notification.id}-${notification.createdAt}-${notification.occurrences}`}
          notification={notification}
          onDismiss={() => {
            const current = useAppStore.getState().notifications.find(item => item.id === notification.id);
            if (current?.createdAt === notification.createdAt && current.occurrences === notification.occurrences)
              dismiss(notification.id);
          }}
        />
      ))}
    </View>;
  }
  const selection = selectNotification(queue, placement, owner);
  if (!selection.current) return null;
  return (
    <NotificationComponent
      notification={selection.current}
      residualCount={selection.residualCount}
      onDismiss={() => dismiss(selection.current!.id)}
    />
  );
}

export function FloatingNotificationHost() {
  const [visible, setVisible] = useState(true);
  const [safeTop, setSafeTop] = useState(() => nativeNavigationInsets().safeTop);
  const firstNodeId = useAppStore(state => {
    const first = selectNotifications(state.notifications, "floating")[0];
    return first ? floatingNotificationNodeId(first) : "";
  });
  useDidShow(() => {
    setSafeTop(nativeNavigationInsets().safeTop);
    setVisible(true);
  });
  useDidHide(() => setVisible(false));
  useResize(() => setSafeTop(nativeNavigationInsets().safeTop));
  if (!visible) return null;
  return (
    <View className="notification-host" aria-label="全局通知"
      style={{ ...(safeTop === undefined ? {} : { "--notification-top": `${safeTop}px` }) } as CSSProperties}>
      <ScrollView className="notification-host__scroll" scrollY enhanced showScrollbar={false} scrollIntoView={firstNodeId}>
        <NotificationRegion placement="floating" />
      </ScrollView>
    </View>
  );
}
