import {
  CONTRIBUTION_FORMAL_FIELD_KEYS,
  CONTRIBUTION_MEDIA_KINDS,
  resolveContributionFormalRebase,
  type ContributionConflictResolution,
  type ContributionFormalBaseline,
  type ContributionFormalFieldKey,
  type ContributionFormalProposal,
  type ContributionMediaKind,
} from "@starward/miniapp-contracts";

export function assessFormalFeedbackConflict(input: {
  baseline: ContributionFormalBaseline;
  current: ContributionFormalBaseline;
  proposal: ContributionFormalProposal;
  choices?: Partial<Record<string, ContributionConflictResolution>>;
}) {
  const fields: Partial<Record<ContributionFormalFieldKey, ContributionConflictResolution>> = {};
  const media: Partial<Record<ContributionMediaKind, ContributionConflictResolution>> = {};
  for (const key of CONTRIBUTION_FORMAL_FIELD_KEYS) {
    const choice = input.choices?.[`FIELD:${key}`];
    if (choice) fields[key] = choice;
  }
  for (const key of CONTRIBUTION_MEDIA_KINDS) {
    const choice = input.choices?.[`MEDIA:${key}`];
    if (choice) media[key] = choice;
  }
  const resolutions = { fields, media };
  const rebased = resolveContributionFormalRebase({ ...input, resolutions });
  return {
    resolutions,
    proposal: rebased.proposal,
    unresolved: rebased.conflicts.length,
    noRemainingChanges: rebased.conflicts.length === 0 &&
      Object.keys(rebased.proposal.fields).length === 0 && Object.keys(rebased.proposal.media).length === 0,
  };
}
