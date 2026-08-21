import Taro from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import type { NotificationRecord } from "@/state/notification";
import { selectNotification } from "@/state/notification";
import { useAppStore } from "@/state/app-store";
import "./notification.scss";

const ICON: Readonly<Record<NotificationRecord["tone"], string>> = {
  error: "!",
  warning: "!",
  info: "i",
  success: "✓",
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
      data-od-id={`notification-${notification.placement}`}
      role={notification.tone === "error" ? "alert" : "status"}
      aria-live={notification.tone === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <Text
        className="notification__icon"
        data-od-id="notification-icon"
        aria-hidden="true"
      >
        {ICON[notification.tone]}
      </Text>
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
      {notification.dismissible && onDismiss ? (
        <Button
          className="notification__dismiss focus-ring"
          data-od-id="notification-dismiss"
          aria-label={`关闭通知：${notification.title}`}
          onClick={onDismiss}
        >
          <Text aria-hidden="true">×</Text>
        </Button>
      ) : null}
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
  return (
    <View className="notification-host" aria-label="全局通知">
      <NotificationRegion placement="floating" />
    </View>
  );
}
