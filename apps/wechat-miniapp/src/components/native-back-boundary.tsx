import { PageContainer, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Gives a custom modal surface one native WEAPP Back layer. The visible modal
 * remains owned by its caller. This invisible PageContainer stays mounted and
 * transitions to shown so WEAPP adds a native Back layer, then rearms only when
 * the caller stays open.
 */
export function NativeBackBoundary({
  active,
  onBack,
  nativeMapContent,
}: {
  active: boolean;
  onBack: () => void | Promise<void>;
  /** Map's existing native foreground container also carries its event modal. */
  nativeMapContent?: ReactNode;
}) {
  const activeRef = useRef(active);
  const onBackRef = useRef(onBack);
  const leaveHandled = useRef(false);
  const alive = useRef(true);
  const rearmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [present, setPresent] = useState(false);
  const [armed, setArmed] = useState(false);
  activeRef.current = active;
  onBackRef.current = onBack;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (rearmTimer.current) clearTimeout(rearmTimer.current);
    };
  }, []);
  useEffect(() => {
    setArmed(false);
    if (!active) {
      const timer = setTimeout(() => setPresent(false), 32);
      return () => clearTimeout(timer);
    }
    setPresent(true);
    // WEAPP must observe one mounted show=false frame before show=true. Default
    // callers unmount inactive containers because a page may own only one.
    // Map's existing sole foreground container retains its modal subtree.
    const timer = setTimeout(() => setArmed(true), 32);
    return () => clearTimeout(timer);
  }, [active]);

  const handleLeave = () => {
    if (!activeRef.current) return;
    if (leaveHandled.current) return;
    leaveHandled.current = true;
    setArmed(false);
    let request: Promise<void>;
    try {
      request = Promise.resolve(onBackRef.current());
    } catch {
      request = Promise.reject(new Error("native_back_command_failed"));
    }
    void request.catch(() => {
      console.warn("native_back_command_failed");
    }).finally(() => {
      if (!alive.current) return;
      rearmTimer.current = setTimeout(() => {
        rearmTimer.current = null;
        if (!alive.current) return;
        leaveHandled.current = false;
        if (activeRef.current) setArmed(true);
      }, nativeMapContent ? 0 : 32);
    });
  };

  if (!present && !nativeMapContent) return null;

  return (
    <PageContainer
      show={active && armed}
      duration={1}
      zIndex={nativeMapContent ? 1200 : 1}
      overlay={false}
      position={nativeMapContent ? "center" : "bottom"}
      round={false}
      closeOnSlideDown={false}
      customStyle={nativeMapContent
        ? "width:100vw;height:100vh;min-height:100vh;overflow:visible;background:transparent;pointer-events:none;"
        : "width:1px;height:1px;min-height:0;overflow:hidden;background:transparent;pointer-events:none;"}
      onBeforeLeave={handleLeave}
      {...(nativeMapContent ? {} : { onAfterLeave: handleLeave })}
    >
      {nativeMapContent ?? <View aria-hidden="true" />}
    </PageContainer>
  );
}
