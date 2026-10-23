import { Button as NativeButton, View as NativeView, type ButtonProps, type ViewProps } from "@tarojs/components";
import "./shared-button-press.scss";

export type SharedButtonProps = ButtonProps & {
  /** Only an icon's visual content moves; the button and its hit box stay put. */
  pressVariant?: "surface" | "icon" | "none";
  /** A nested visible face keeps feedback off its larger transparent hit box. */
  pressFace?: "self" | "child" | "before";
  "aria-busy"?: boolean | "true" | "false";
};

function pressFeedback(className: string, variant: "surface" | "icon" | "none", face: "self" | "child" | "before",
  hoverClass: string | undefined, unavailable: boolean) {
  const feedback = variant !== "none" && hoverClass !== "none";
  return {
    className: `${feedback ? `shared-button-press shared-button-press--${variant} shared-button-press--face-${face} ` : ""}${className}`,
    hoverClass: feedback && !unavailable ? "shared-button-press--pressed" : "none",
    hoverStartTime: 0,
    hoverStayTime: 0,
  };
}

/** The native button owns tap/scroll cancellation and hover lifetime. Domain
 * touch/long-press handlers pass through unchanged; feedback has no React state
 * or animation timer and therefore cannot redraw a Map/Sky parent. */
export function SharedButton({ children, className = "", pressVariant = "surface", pressFace = "self",
  disabled = false, loading = false, hoverClass, hoverStartTime: _hoverStartTime,
  hoverStayTime: _hoverStayTime, onClick, ...props }: SharedButtonProps) {
  const busy = props["aria-busy"] === true || props["aria-busy"] === "true";
  const unavailable = disabled || loading || busy;
  return <NativeButton {...props}
    {...pressFeedback(className, pressVariant, pressFace, hoverClass, unavailable)}
    disabled={unavailable} loading={loading}
    onClick={event => { if (!unavailable) onClick?.(event); }}>
    {children}
  </NativeButton>;
}

/** The native Picker retains opening, cancellation and disabled behavior. This
 * replaces only its existing View face, without another button or wrapper. */
export function PickerTrigger({ children, className = "", disabled, hoverClass,
  hoverStartTime: _hoverStartTime, hoverStayTime: _hoverStayTime, ...props }: ViewProps & { disabled: boolean }) {
  return <NativeView {...props}
    {...pressFeedback(className, disabled ? "none" : "surface", "self", hoverClass, disabled)}>
    {children}
  </NativeView>;
}
