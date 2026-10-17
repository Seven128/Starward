import { View } from "@tarojs/components";
import { useDidHide, useDidShow } from "@tarojs/taro";
import { useState } from "react";

/** Visual only: the request owner mounts this while its operation is pending. */
export function LoadingIndicator({ kind = "dots" }: { kind?: "dots" | "arc" }) {
  const [visible, setVisible] = useState(true);
  useDidHide(() => setVisible(false));
  useDidShow(() => setVisible(true));
  return <View className={`loading-indicator loading-indicator--${kind}${visible ? "" : " loading-indicator--paused"}`} aria-hidden="true">
    {kind === "dots" ? <><View /><View /><View /></> : null}
  </View>;
}
