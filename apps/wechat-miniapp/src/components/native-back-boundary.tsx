import { PageContainer, RootPortal, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";

/**
 * Gives a custom modal surface one native WEAPP Back layer. The visible modal
 * remains owned by its caller. This invisible PageContainer mounts already shown
 * so WEAPP adds a native Back layer, then rearms only when the caller stays open.
 */
export function NativeBackBoundary({
  active,
  onBack,
}: {
  active: boolean;
  onBack: () => void | Promise<void>;
}) {
  const activeRef = useRef(active);
  const onBackRef = useRef(onBack);
  const leaveHandled = useRef(false);
  const [armed, setArmed] = useState(active);
  activeRef.current = active;
  onBackRef.current = onBack;
  useEffect(() => setArmed(active), [active]);

  const handleLeave = () => {
    if (!activeRef.current) return;
    if (leaveHandled.current) return;
    leaveHandled.current = true;
    setArmed(false);
    void Promise.resolve(onBackRef.current()).finally(() => {
      setTimeout(() => {
        leaveHandled.current = false;
        if (activeRef.current) setArmed(true);
      }, 0);
    });
  };

  if (!active || !armed) return null;

  return (
    <RootPortal>
      <PageContainer
        show
        duration={1}
        zIndex={1}
        overlay={false}
        position="bottom"
        round={false}
        closeOnSlideDown={false}
        customStyle="width:1px;height:1px;min-height:0;overflow:hidden;background:transparent;pointer-events:none;"
        onBeforeLeave={handleLeave}
        onAfterLeave={handleLeave}
      >
        <View aria-hidden="true" />
      </PageContainer>
    </RootPortal>
  );
}
