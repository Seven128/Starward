import { Button, Image, Text, View } from "@tarojs/components";
import type { FacilityEvidence, RepresentativeMedia } from "@starward/miniapp-contracts";
import { useAppStore } from "@/state/app-store";
import { mediaSource } from "@/utils/media-source";
import { FACILITY_LABEL, facilityStatusLabel } from "@/utils/facility-presentation";
import { SemanticIcon } from "./semantic-asset";
import "./facility-card.scss";

/** Shared facility facts, with a photograph variant when the owning record supplies one. */
export function FacilityCard({ id, evidence, photos = [], onOpenPhotos }: {
  id: string;
  evidence: FacilityEvidence;
  photos?: readonly RepresentativeMedia[];
  onOpenPhotos?: (() => void) | undefined;
}) {
  const day = useAppStore(state => state.mode === "DAY");
  const photo = photos[0];
  const interactive = Boolean(photo && onOpenPhotos);
  const Root = interactive ? Button : View;
  const label = evidence.type === "PARKING" && day ? "停车设施" : FACILITY_LABEL[evidence.type];
  const description = evidence.detail?.trim() || evidence.summary?.trim();
  const status = `${facilityStatusLabel(evidence.status)}${evidence.distanceM === null ? "" : ` · ${evidence.distanceM}m`}`;
  return <Root id={id} className={`facility-card${photo ? " facility-card--with-media" : ""}${interactive ? " focus-ring" : ""}`}
    ariaLabel={interactive ? `${label}，${status}${description ? `，${description}` : ""}。查看照片，共 ${photos.length} 张` : ""} onClick={() => { if (interactive) onOpenPhotos?.(); }}>
    {photo ? <Image className="facility-card__image" src={mediaSource(photo.thumbnailPath || photo.localPath)} mode="aspectFill" aria-hidden="true" /> : null}
    {photo ? <View className="facility-card__shade" aria-hidden="true" /> : null}
    <View className="facility-card__content">
      <View className="facility-card__heading">
        {day && (evidence.type === "PARKING" || evidence.type === "TOILET") ? <SemanticIcon
          name={evidence.type === "PARKING" ? "parking" : "restroom"} className="facility-card__icon" /> : null}
        <Text className="facility-card__name">{label}</Text>
        <Text className="facility-card__status">{status}</Text>
      </View>
      {description ? <Text className="facility-card__summary">{description}</Text> : null}
    </View>
    {photo ? <View className="facility-card__count"><SemanticIcon name="images" /><Text>{photos.length}</Text></View> : null}
  </Root>;
}
