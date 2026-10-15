import { Button, Text } from "@tarojs/components";
import type { PropsWithChildren } from "react";
import { LoadingIndicator } from "./loading-indicator";

export function SoftButton({
  children,
  variant = "default",
  label,
  disabled = false,
  loading = false,
  onClick,
  className = "",
}: PropsWithChildren<{
  variant?: "default" | "primary" | "danger" | "ghost";
  label: string;
  disabled?: boolean;
  loading?: boolean | "dots" | "arc";
  className?: string;
  onClick?: () => void;
}>) {
  const content = children === undefined ? label : children;
  return (
    <Button
      className={`soft-button soft-button--${variant} focus-ring${
        disabled || loading ? " soft-button--disabled" : ""
      } ${className}`}
      ariaLabel={label}
      aria-busy={Boolean(loading)}
      disabled={disabled || Boolean(loading)}
      onClick={() => { if (!disabled && !loading) onClick?.(); }}
    >
      {loading ? <LoadingIndicator kind={loading === "arc" ? "arc" : "dots"} /> : null}
      {typeof content === "string" || typeof content === "number" ? (
        <Text>{content}</Text>
      ) : (
        content
      )}
    </Button>
  );
}
