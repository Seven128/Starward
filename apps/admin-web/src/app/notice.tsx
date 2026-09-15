import type { ReactNode } from "react";

export function Notice({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "violet" | "success" | "warning" | "danger";
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`notice ${tone}`}
      role={tone === "danger" ? "alert" : tone === "success" ? "status" : undefined}
    >
      <div className="notice-mark" aria-hidden="true">
        {tone === "success"
          ? "✓"
          : tone === "danger"
            ? "!"
            : tone === "warning"
              ? "·"
              : "i"}
      </div>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}
