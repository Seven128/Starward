import type { CSSProperties } from "react";
import { Text } from "@tarojs/components";
import { SharedButton as Button } from "./shared-button-press";
import { SemanticIcon } from "./semantic-asset";
import { nativeNavigationInsets } from "@/theme/native-metrics";
import "./primary-bookmark.scss";

/** The two primary destinations share one geometry; their navigation stays with the caller. */
export function PrimaryBookmark({ destination, disabled = false, onClick }: {
  destination: "map" | "my";
  disabled?: boolean;
  onClick: () => void;
}) {
  const { safeTop } = nativeNavigationInsets();
  const toMap = destination === "map";
  return <Button className={`primary-bookmark primary-bookmark--${toMap ? "right" : "left"} focus-ring`}
    style={(safeTop === undefined ? {} : { "--primary-bookmark-top": `${safeTop + 12}px` }) as CSSProperties}
    data-control={toMap ? "my-return-map" : "map-my-entry"} data-od-id={toMap ? "my-return-map" : "map-my-entry"}
    ariaLabel={toMap ? "返回地图" : "我的"} disabled={disabled}
    onClick={event => { event.stopPropagation(); onClick(); }}>
    <SemanticIcon name={toMap ? "map" : "account-user"} /><Text>{toMap ? "地图" : "我的"}</Text>
  </Button>;
}
