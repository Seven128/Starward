import { Button, Text } from "@tarojs/components";
import type { PropsWithChildren } from "react";

export function SoftButton({
  children,
  variant = "default",
  label,
  disabled = false,
  onClick,
  className = "",
}: PropsWithChildren<{
  variant?: "default" | "primary" | "danger" | "ghost";
  label: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}>) {
  return (
    <Button
      className={`soft-button soft-button--${variant} focus-ring${
        disabled ? " soft-button--disabled" : ""
      } ${className}`}
      ariaLabel={label}
      disabled={disabled}
      onClick={() => { if (!disabled) onClick?.(); }}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Text>{children}</Text>
      ) : (
        children
      )}
    </Button>
  );
}
