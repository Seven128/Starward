import type { SpotSummary } from "@starward/miniapp-contracts";
import { mediaSource } from "../utils/media-source";
import { mediaIsRenderable } from "../utils/spot-media";
import { SharedButton as Button } from "./shared-button-press";
import { SpotIdentityContent } from "./spot-identity-content";

/** Search and Map show the same published place identity. The consumer keeps
 * selection, filter evidence and query ownership outside this visual card. */
export function SpotIdentityCard({ spot, onSelect, label, control = "spot-search-result-card", disabled = false }: {
  spot: SpotSummary;
  onSelect: () => void;
  label?: string;
  control?: string;
  disabled?: boolean;
}) {
  const media = spot.media.find(item => mediaIsRenderable(item));
  const mediaSrc = media ? mediaSource(media.thumbnailPath || media.localPath) : null;
  return <Button className={`spot-identity-card${mediaSrc ? " spot-identity-card--with-media" : ""}`}
    data-control={control} onClick={onSelect} disabled={disabled} ariaLabel={label ?? `选择${spot.name}`}>
    <SpotIdentityContent region={spot.region || "区域暂无数据"} name={spot.name} address={spot.address}
      mediaSrc={mediaSrc} mediaAlt={media?.alt || `${spot.name}现场照片`} />
  </Button>;
}
