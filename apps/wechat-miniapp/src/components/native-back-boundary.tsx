import { PageContainer, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type LeaveCycle = { commandSettled: boolean; exited: boolean };

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
  const leaveCycle = useRef<LeaveCycle | null>(null);
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
      leaveCycle.current = null;
      if (rearmTimer.current) clearTimeout(rearmTimer.current);
    };
  }, []);
  useEffect(() => {
    leaveCycle.current = null;
    if (rearmTimer.current) clearTimeout(rearmTimer.current);
    rearmTimer.current = null;
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

  const rearm = (cycle: LeaveCycle) => {
    if (!alive.current || !activeRef.current || leaveCycle.current !== cycle
      || !cycle.commandSettled || !cycle.exited || rearmTimer.current) return;
    // The native exit must finish before WEAPP observes another shown frame.
    // Keep the old cycle fenced until the new native presentation acknowledges
    // entry; a delayed beforeleave must not close the caller's next surface.
    rearmTimer.current = setTimeout(() => {
      rearmTimer.current = null;
      if (alive.current && activeRef.current && leaveCycle.current === cycle) setArmed(true);
    }, 32);
  };

  const handleLeave = () => {
    if (!alive.current || !activeRef.current || !armed || leaveCycle.current) return;
    const cycle: LeaveCycle = { commandSettled: false, exited: false };
    leaveCycle.current = cycle;
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
      if (!alive.current || leaveCycle.current !== cycle) return;
      cycle.commandSettled = true;
      rearm(cycle);
    });
  };

  const handleAfterLeave = () => {
    if (!alive.current) return;
    const cycle = leaveCycle.current;
    if (!cycle) return;
    cycle.exited = true;
    rearm(cycle);
  };

  const handleAfterEnter = () => {
    if (alive.current && activeRef.current && armed) leaveCycle.current = null;
  };

  if (!present && !nativeMapContent) return null;

  // The invisible slot must not become a flex item in its caller. Map's visible
  // foreground subtree keeps its existing presentation owner.
  return (
    <PageContainer
      show={active && armed}
      {...(nativeMapContent ? {} : { style: { position: "fixed" as const, left: 0, top: 0, width: 0, height: 0 } })}
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
      onAfterLeave={handleAfterLeave}
      onAfterEnter={handleAfterEnter}
    >
      {nativeMapContent ?? <View aria-hidden="true" />}
    </PageContainer>
  );
}
