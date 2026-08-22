import { Button, Text } from "@tarojs/components";
import type { PropsWithChildren } from "react";

export function SoftButton({
  children,
  variant = "default",
  label,
  icon,
  disabled = false,
  onClick,
  className = "",
}: PropsWithChildren<{
  variant?: "default" | "primary" | "danger" | "ghost";
  label: string;
  icon?: "back" | "settings" | "favorite" | "favorite-active" | "locate" | "refresh";
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}>) {
  return (
    <Button
      className={`soft-button soft-button--${variant}${icon ? ` soft-button--icon-${icon}` : ""} focus-ring ${className}`}
      aria-label={label}
      {...(disabled ? { disabled: true } : {})}
      onClick={() => onClick?.()}
    >
      {icon ? (
        <Text className="native-accessibility-label">{label}</Text>
      ) : (
        <Text>{children}</Text>
      )}
    </Button>
  );
}
