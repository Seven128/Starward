import Taro from "@tarojs/taro";
import { View } from "@tarojs/components";
import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import { useEffect, useRef } from "react";
import {
  useAppStore,
  type SourceLiftOwner,
  type SourceLiftPhase,
} from "@/state/app-store";
import "./source-lift-focus-layer.scss";

export type SourceLiftVariant = "panelOnly" | "mapCoupled";
export type { SourceLiftPhase };

/**
 * The shared owner for the two current focus surfaces. The source node is
 * rendered exactly once; when focused it is positioned above its immutable
 * origin placeholder while the destination panel is layered below it.
 * Consumers own the durable state and only pass the presentation open flag.
 */
export function SourceLiftFocusLayer({
  variant,
  owner,
  source,
  children,
  onClose,
  closeOptions,
  ariaLabel,
  className = "",
}: PropsWithChildren<{
  variant: SourceLiftVariant;
  owner: SourceLiftOwner;
  source: ReactNode;
  onClose?: () => void;
  closeOptions?: {
    restoreMap?: boolean;
    discardFilterDraft?: boolean;
  };
  ariaLabel: string;
  className?: string;
}>) {
  const runtime = useAppStore((state) => state.sourceLift);
  const reducedMotion = useAppStore((state) => state.preferences.reducedMotion);
  const focusSourceLift = useAppStore((state) => state.focusSourceLift);
  const closeSourceLift = useAppStore((state) => state.closeSourceLift);
  const finishSourceLift = useAppStore((state) => state.finishSourceLift);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = runtime.owner === owner && runtime.phase !== "IDLE";
  const phase: SourceLiftPhase = active ? runtime.phase : "IDLE";
  const sourceLifted =
    active && phase !== "RESTORING" && phase !== "CANCELLED";
  let statusBarHeight = 0;
  let safeTop = 0;
  try {
    const windowInfo = Taro.getWindowInfo();
    const nativeStatusBarHeight = Taro.getWindowInfo().statusBarHeight;
    if (
      typeof nativeStatusBarHeight === "number" &&
      Number.isFinite(nativeStatusBarHeight) &&
      nativeStatusBarHeight >= 0
    ) {
      statusBarHeight = nativeStatusBarHeight;
    }
    const navBarHeight = (windowInfo.windowWidth * 96) / 750;
    safeTop = statusBarHeight + navBarHeight;
  } catch {
    // Fail closed to the CSS safe-area fallback if native metrics are absent.
  }
  try {
    const menuButton = Taro.getMenuButtonBoundingClientRect();
    if (Number.isFinite(menuButton.bottom)) {
      safeTop = Math.max(safeTop, menuButton.bottom + 4);
    }
  } catch {
    // Simulator and older runtimes may not expose capsule geometry.
  }
  const nativeSafeTopStyle = {
    "--source-lift-status-bar-height": `${statusBarHeight}px`,
    "--source-lift-safe-top": `${safeTop}px`,
  } as CSSProperties;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const duration = reducedMotion ? 1 : variant === "mapCoupled" ? 220 : 160;
    if (phase === "LIFTING")
      timer.current = setTimeout(() => focusSourceLift(owner), duration);
    if (phase === "RESTORING" || phase === "CANCELLED")
      timer.current = setTimeout(() => {
        finishSourceLift(owner);
      }, duration);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [finishSourceLift, focusSourceLift, owner, phase, reducedMotion, variant]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const requestClose = () => {
    onClose?.();
    closeSourceLift(owner, closeOptions);
  };
  return (
    <View
      className={`source-lift-focus-layer source-lift-focus-layer--${variant} ${
        active ? "source-lift-focus-layer--visible" : ""
      } source-lift-focus-layer--phase-${phase.toLowerCase()} ${className}`}
      data-od-id="source-lift-focus-layer"
      data-variant={variant}
      data-phase={phase}
      role={active ? "dialog" : "presentation"}
      aria-modal={active ? "true" : "false"}
      ariaLabel={ariaLabel}
      style={nativeSafeTopStyle}
    >
      <View
        className="source-lift-origin-placeholder"
        data-od-id="source-lift-origin-placeholder"
        aria-hidden={active}
      />
      <View
        className={`source-lift-source${sourceLifted ? " source-lift-source--lifted" : ""}`}
        data-od-id="source-lift-source"
        id={`source-lift-toggle-${owner.toLowerCase()}`}
      >
        {source}
      </View>
      {active ? (
        <>
          <View
            className="source-lift-scrim"
            data-od-id="source-lift-scrim"
            aria-hidden="true"
            onClick={requestClose}
          />
          <View
            className="source-lift-composition"
            data-od-id={
              variant === "panelOnly"
                ? "spot-finder-sheet"
                : "map-analysis-focus-panel"
            }
            onClick={(event) => event.stopPropagation()}
          >
            <View className="source-lift-composition__content">
              {children}
              {variant === "mapCoupled" ? (
                <View
                  className="source-lift-map-dock"
                  data-od-id="source-lift-map-dock"
                  aria-hidden="true"
                />
              ) : null}
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
