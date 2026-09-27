import { CONTRIBUTION_MEDIA_KINDS, type ContributionFormalBaseline, type ContributionFormalProposal, type ContributionMediaKind } from "@starward/miniapp-contracts";

export const CONTRIBUTION_PHOTO_LABELS = { site: "现场照片", parking: "停车照片", toilet: "洗手间照片" };
export interface ContributionPhotoGroup {
  kind: ContributionMediaKind;
  /** Presence, including [], means an explicit old → new comparison. */
  before?: readonly string[];
  after: readonly string[];
}

export function formalPhotoGroups(baseline: ContributionFormalBaseline, proposal: ContributionFormalProposal, includeUnchanged = false): ContributionPhotoGroup[] {
  return CONTRIBUTION_MEDIA_KINDS.flatMap(kind => {
    const before = baseline.media[kind];
    const after = Object.prototype.hasOwnProperty.call(proposal.media, kind) ? proposal.media[kind] ?? [] : before;
    const changed = before.length !== after.length || before.some((id, index) => id !== after[index]);
    return changed ? [{ kind, before, after }] : includeUnchanged && after.length ? [{ kind, after }] : [];
  });
}

/** One entry per displayed crop, including a retained photo on both sides. */
export function photoGroupEntries(groups: readonly ContributionPhotoGroup[]) {
  return groups.flatMap(group => [
    ...(group.before ?? []).map(id => ({ id, kind: group.kind, side: "before" as const })),
    ...group.after.map(id => ({ id, kind: group.kind, side: group.before ? "after" as const : "current" as const })),
  ]);
}
