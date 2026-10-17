import type { ContributionFormalBaseline, SpotDetail } from "@starward/miniapp-contracts";
import { formalSpotFacts } from "./formal-spot-facts.ts";
import { spotMediaGroups } from "./public-spot-media.ts";

export function contributionFormalBaseline(detail: SpotDetail, revision: number): ContributionFormalBaseline {
  if (!Number.isSafeInteger(revision) || revision <= 0)
    throw new Error("contribution_baseline_revision_invalid");
  const fields = formalSpotFacts(detail);
  const media = spotMediaGroups(detail.spot, detail.formalMedia);
  return { spotId: detail.spot.spotId, revision, fields, media };
}
