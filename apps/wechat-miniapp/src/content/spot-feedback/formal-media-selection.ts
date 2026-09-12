import {
  CONTRIBUTION_MEDIA_KINDS,
  type ContributionFormalBaseline,
  type ContributionFormalProposal,
  type ContributionMediaKind,
  type ContributionUploadId,
} from "@starward/miniapp-contracts";

export type FormalMediaSelection = Record<ContributionMediaKind, readonly string[]>;

function sameIds(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function createFormalMediaSelection(
  baseline: ContributionFormalBaseline,
  priorProposal?: ContributionFormalProposal,
  availablePriorUploads: readonly ContributionUploadId[] = [],
): FormalMediaSelection {
  const allowed = new Set<string>([
    ...Object.values(baseline.media).flat(),
    ...availablePriorUploads,
  ]);
  return Object.fromEntries(CONTRIBUTION_MEDIA_KINDS.map(kind => {
    const proposed = Object.prototype.hasOwnProperty.call(priorProposal?.media ?? {}, kind)
      ? priorProposal!.media[kind] ?? []
      : baseline.media[kind];
    return [kind, [...new Set(proposed.filter(id => allowed.has(id)))].slice(0, 3)];
  })) as unknown as FormalMediaSelection;
}

export function formalMediaProposal(
  baseline: ContributionFormalBaseline,
  selection: FormalMediaSelection,
) {
  const media: Partial<Record<ContributionMediaKind, readonly string[]>> = {};
  for (const kind of CONTRIBUTION_MEDIA_KINDS)
    if (!sameIds(selection[kind], baseline.media[kind])) media[kind] = [...selection[kind]];
  return media;
}

export function appendFormalMedia(selection: FormalMediaSelection, kind: ContributionMediaKind, uploadId: ContributionUploadId) {
  if (selection[kind].includes(uploadId) || selection[kind].length >= 3) return selection;
  return { ...selection, [kind]: [...selection[kind], uploadId] };
}

export function removeFormalMedia(selection: FormalMediaSelection, kind: ContributionMediaKind, id: string) {
  return { ...selection, [kind]: selection[kind].filter(value => value !== id) };
}
