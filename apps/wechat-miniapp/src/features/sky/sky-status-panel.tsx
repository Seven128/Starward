import type { ComponentProps } from "react";
import { StatusPanel } from "@/components/status-panel";

/** Keep shared recovery behavior while wording the Sky states for its users. */
export function SkyStatusPanel(props: ComponentProps<typeof StatusPanel>) {
  const title = props.title ?? (props.state === "ERROR" ? "暂不可用"
    : props.state === "EMPTY" ? "暂无资料" : props.state === "PERMISSION_DENIED" ? "需要授权" : undefined);
  return <StatusPanel {...props} title={title} />;
}
