import { View } from "@tarojs/components";
import type { PropsWithChildren, ReactNode } from "react";
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
 * The shared owner for the two V2.1.1 focus surfaces.  The source node is
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
  ariaLabel,
  className = "",
}: PropsWithChildren<{
  variant: SourceLiftVariant;
  owner: SourceLiftOwner;
  source: ReactNode;
  onClose?: () => void;
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

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const duration = reducedMotion ? 1 : 160;
    if (phase === "LIFTING")
      timer.current = setTimeout(() => focusSourceLift(owner), duration);
    if (phase === "RESTORING" || phase === "CANCELLED")
      timer.current = setTimeout(() => {
        finishSourceLift(owner);
        const documentRef = globalThis.document;
        documentRef
          ?.getElementById(`source-lift-toggle-${owner.toLowerCase()}`)
          ?.querySelector<HTMLElement>("button,[role=button],input")
          ?.focus();
      }, duration);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [finishSourceLift, focusSourceLift, owner, phase, reducedMotion]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const requestClose = () => {
    onClose?.();
    closeSourceLift(owner);
  };
  return (
    <View
      className={`source-lift-focus-layer source-lift-focus-layer--${variant} ${
        active ? "source-lift-focus-layer--visible" : ""
      } ${className}`}
      data-od-id="source-lift-focus-layer"
      data-variant={variant}
      data-phase={phase}
      role={active ? "dialog" : "presentation"}
      aria-modal={active ? "true" : "false"}
      ariaLabel={ariaLabel}
    >
      <View
        className="source-lift-origin-placeholder"
        data-od-id="source-lift-origin-placeholder"
        aria-hidden={active}
      />
      <View
        className={`source-lift-source${active ? " source-lift-source--lifted" : ""}`}
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
            {children}
          </View>
        </>
      ) : null}
    </View>
  );
}
