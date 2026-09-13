import { wgs84ToGcj02 } from "@starward/coordinate-system";
import type {
  ContributionSubmission,
  DisplayMode,
} from "@starward/miniapp-contracts";
import { MINIAPP_DESIGN } from "../../theme/design-tokens";

export type PrivateContributionMarkerState = "DRAFT" | "PENDING";

export interface PrivateContributionMarker {
  submission: ContributionSubmission;
  latitude: number;
  longitude: number;
  state: PrivateContributionMarkerState;
}

export function privateContributionMarkers(
  submissions: readonly ContributionSubmission[],
): PrivateContributionMarker[] {
  return submissions.flatMap((submission) => {
    if (
      submission.kind !== "NEW_SPOT_PROPOSAL" ||
      !submission.candidateLocation ||
      submission.publicationImpact === "SPOT_PUBLISHED" ||
      submission.submissionState === "WITHDRAWN"
    ) return [];
    const { latitude, longitude } = submission.candidateLocation.wgs84;
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180 ||
      (latitude === 0 && longitude === 0)
    ) return [];
    const point = wgs84ToGcj02({ lat: latitude, lon: longitude, system: "WGS84" });
    return [{
      submission,
      latitude: point.lat,
      longitude: point.lon,
      state: submission.submissionState === "PENDING_REVIEW" || submission.submissionState === "ACCEPTED"
        ? "PENDING"
        : "DRAFT",
    }];
  });
}

export function privateContributionMarkerItems(
  entries: readonly PrivateContributionMarker[],
  firstId: number,
  mode: DisplayMode,
  largeText = false,
) {
  const theme = MINIAPP_DESIGN.themes[mode === "DAY" ? "day" : mode === "NIGHT" ? "night" : "observation"];
  const textScale = largeText ? 2 : 1;
  return entries.map((entry, index) => {
    const name = entry.submission.candidateLocation?.displayName.trim() || "未命名草稿";
    const pending = entry.state === "PENDING";
    return {
      id: firstId + index,
      latitude: entry.latitude,
      longitude: entry.longitude,
      iconPath: mode === "DAY"
        ? pending
          ? "/assets/b-icons/spot-marker--day--pending.png"
          : "/assets/b-icons/spot-marker--day--draft.png"
        : pending
          ? "/assets/icons/proposal-marker.png"
          : "/assets/icons/draft-marker.png",
      width: pending ? 40 : 32,
      height: pending ? 45 : 36,
      anchor: { x: 0.5, y: 1 },
      alpha: 0.96,
      label: {
        content: name,
        color: theme["text-primary"],
        fontSize: MINIAPP_DESIGN.type.metadata.size * textScale,
        bgColor: theme.surface,
        borderColor: pending ? theme["choice-selected-border"] : theme["border-strong"],
        borderWidth: 1,
        borderRadius: 10,
        padding: 5,
        anchorX: 0,
        anchorY: pending ? -48 : -40,
        textAlign: "center" as const,
      },
      ariaLabel: `${name}，${pending ? "审核中提案" : "我的草稿点"}`,
    };
  });
}
