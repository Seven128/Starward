import { Button, Text } from "@tarojs/components";
import type { PropsWithChildren } from "react";

export function SoftButton({
  children,
  variant = "default",
  label,
  iconOnly = false,
  disabled = false,
  onClick,
  className = "",
}: PropsWithChildren<{
  variant?: "default" | "primary" | "danger" | "ghost";
  label: string;
  iconOnly?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}>) {
  return (
    <Button
      className={`soft-button soft-button--${variant} focus-ring ${className}`}
      aria-label={label}
      {...(disabled ? { disabled: true } : {})}
      onClick={() => onClick?.()}
    >
      <Text aria-hidden={iconOnly}>{children}</Text>
      {iconOnly ? (
        <Text className="native-accessibility-label">{label}</Text>
      ) : null}
    </Button>
  );
}
