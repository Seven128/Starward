import type { PreparedRenderedOpticalManifest, SdssScienceOpticalManifest, SdssDisplayOpticalManifest } from "@starward/miniapp-contracts";
import type { SkyArtworkLevelsContribution, SkyArtworkLevelsDraw } from "./sky-artwork-level-composition";
import { skyNativeImageIsCurrent } from "./sky-artwork-loader";
import type { SkyPreparedOpticalField, SkySdssOpticalField, SkySdssScienceOpticalField,
  SkySdssDisplayOpticalField, SkyTargetOpticalImage } from "./sky-sdss-optical-frame";
import { isSkyLegacyOpticalFrame, skyExactTargetOpticalIdentity,
  type SkyExactTargetOpticalField } from "./sky-target-optical-identity";

export interface SkySdssLegacyOpticalCompletion {
  readonly kind: "legacy";
  readonly reference: string;
  readonly publicationHash: string;
  readonly field: SkySdssOpticalField;
}
export type SkySdssScienceParticipatingField = SkySdssScienceOpticalField & { readonly slot: "fine" | "coarse" };
export type SkyPreparedParticipatingField = SkyPreparedOpticalField & { readonly slot: "fine" | "coarse" };
export type SkySdssDisplayParticipatingField = SkySdssDisplayOpticalField & { readonly slot: "fine" | "coarse" };
interface ExactOpticalCompletion {
  readonly reference: string;
  readonly publicationHash: string;
  readonly receipt: SkyArtworkLevelsContribution & { readonly completed: true };
}
export interface SkySdssScienceOpticalCompletion extends ExactOpticalCompletion {
  readonly kind: "science";
  readonly sciencePublication: SdssScienceOpticalManifest;
  readonly participatingFields: readonly SkySdssScienceParticipatingField[];
}
export interface SkyPreparedOpticalCompletion extends ExactOpticalCompletion {
  readonly kind: "prepared";
  readonly preparedPublication: PreparedRenderedOpticalManifest;
  readonly participatingFields: readonly SkyPreparedParticipatingField[];
}
export interface SkySdssDisplayOpticalCompletion extends ExactOpticalCompletion {
  readonly kind: "display";
  readonly displayPublication: SdssDisplayOpticalManifest;
  readonly participatingFields: readonly SkySdssDisplayParticipatingField[];
}
export type SkySdssOpticalCompletion = SkySdssLegacyOpticalCompletion | SkySdssScienceOpticalCompletion | SkySdssDisplayOpticalCompletion;
export type SkyTargetOpticalCompletion = SkySdssOpticalCompletion | SkyPreparedOpticalCompletion;

const fieldEqual = (a: SkySdssOpticalField, b: SkySdssOpticalField) =>
  a.image === b.image && a.level === b.level && a.fieldDegrees === b.fieldDegrees;

/** Legacy submission/coverage policy remains with Scene. Call only after its
 * successful finish, with the actual selected primary or surviving parent. */
export function completeLegacySkyOptical(frame: SkyTargetOpticalImage | null | undefined,
  paintedImage: object | null | undefined): SkySdssLegacyOpticalCompletion | null {
  if (!frame || !isSkyLegacyOpticalFrame(frame) || !paintedImage) return null;
  const selected = paintedImage === frame.image ? frame :
    paintedImage === frame.coarser?.image ? frame.coarser :
    paintedImage === frame.fallback?.image ? frame.fallback : null;
  if (!selected || !skyNativeImageIsCurrent(selected.image)) return null;
  return Object.freeze({ kind: "legacy", reference: frame.reference, publicationHash: frame.publicationHash,
    field: Object.freeze({ image: selected.image, level: selected.level, fieldDegrees: selected.fieldDegrees }) });
}

type ParticipatingField<F extends SkyExactTargetOpticalField> = SkySdssOpticalField & {
  readonly slot: "fine" | "coarse"; readonly asset: F["asset"];
};
/** One participation rule for both exact-source families. Geometric support
 * and science validity are not participation or visible-source credit. */
function completedExactFields<F extends SkyExactTargetOpticalField>(frame: F & { readonly coarser: F | null },
  draw: SkyArtworkLevelsDraw, receipt: SkyArtworkLevelsContribution) {
  const parent = frame.coarser;
  if (!draw.submitted || !receipt.completed) return null;
  if ((receipt.finePhoto === "positive" && !draw.finePrepared) ||
    (receipt.coarsePhoto === "positive" && (!draw.coarsePrepared || !parent))) return null;
  // UNKNOWN is uncertainty; EMPTY is an explicit incompatible absence claim.
  if ((receipt.finePhoto === "positive" && receipt.qualification.fine === "empty") ||
    (receipt.coarsePhoto === "positive" && receipt.qualification.coarse === "empty") ||
    (receipt.qualification.any === "empty" &&
      (receipt.finePhoto === "positive" || receipt.coarsePhoto === "positive"))) return null;
  const fields: ParticipatingField<F>[] = [];
  const append = (field: F, slot: "fine" | "coarse") => {
    if (skyNativeImageIsCurrent(field.image)) fields.push(Object.freeze({ slot,
      image: field.image, level: field.level, fieldDegrees: field.fieldDegrees, asset: field.asset }));
  };
  if (receipt.finePhoto === "positive") append(frame, "fine");
  if (receipt.coarsePhoto === "positive" && parent) append(parent, "coarse");
  // Copy our own value fields: a borrowed mutable receipt cannot rewrite history.
  const completedReceipt = Object.freeze({ completed: true as const,
    qualification: Object.freeze({ fine: receipt.qualification.fine, coarse: receipt.qualification.coarse,
      any: receipt.qualification.any }), finePhoto: receipt.finePhoto, coarsePhoto: receipt.coarsePhoto });
  return { receipt: completedReceipt, participatingFields: Object.freeze(fields) };
}

/** Caller owns the exact draw/getter association and successful frame fence.
 * Actual primary is fine, actual parent is coarse; current query metadata and
 * requested levels cannot relabel an already completed field or its source. */
export function completeTargetSkyOptical(frame: SkyTargetOpticalImage | null | undefined,
  draw: SkyArtworkLevelsDraw, receipt: SkyArtworkLevelsContribution):
  SkySdssScienceOpticalCompletion | SkySdssDisplayOpticalCompletion | SkyPreparedOpticalCompletion | null {
  const identity = skyExactTargetOpticalIdentity(frame);
  if (!identity) return null;
  if (identity.kind === "science") {
    const fields = completedExactFields<SkySdssScienceOpticalField>(identity.frame, draw, receipt);
    return fields ? Object.freeze({ kind: "science", reference: identity.frame.reference,
      publicationHash: identity.frame.publicationHash, sciencePublication: identity.publication, ...fields }) : null;
  }
  if (identity.kind === "display") {
    const fields = completedExactFields<SkySdssDisplayOpticalField>(identity.frame, draw, receipt);
    return fields ? Object.freeze({ kind: "display", reference: identity.frame.reference,
      publicationHash: identity.frame.publicationHash, displayPublication: identity.publication, ...fields }) : null;
  }
  const fields = completedExactFields<SkyPreparedOpticalField>(identity.frame, draw, receipt);
  return fields ? Object.freeze({ kind: "prepared", reference: identity.frame.reference,
    publicationHash: identity.frame.publicationHash, preparedPublication: identity.publication, ...fields }) : null;
}
export function completeScienceSkyOptical(frame: SkyTargetOpticalImage | null | undefined,
  draw: SkyArtworkLevelsDraw, receipt: SkyArtworkLevelsContribution): SkySdssScienceOpticalCompletion | null {
  if (!frame || !("sciencePublication" in frame)) return null;
  const completed = completeTargetSkyOptical(frame, draw, receipt);
  return completed?.kind === "science" ? completed : null;
}
export function completePreparedSkyOptical(frame: SkyTargetOpticalImage | null | undefined,
  draw: SkyArtworkLevelsDraw, receipt: SkyArtworkLevelsContribution): SkyPreparedOpticalCompletion | null {
  if (!frame || !("preparedPublication" in frame)) return null;
  const completed = completeTargetSkyOptical(frame, draw, receipt);
  return completed?.kind === "prepared" ? completed : null;
}

/** Native liveness only. Page owns visibility, accepted-frame/time and Canvas
 * generation. Historical receipts alone do not establish current photo credit;
 * one retired field cannot erase an independent surviving parent. */
export function liveSkyOpticalCompletion(completion: SkyTargetOpticalCompletion | null | undefined):
  SkyTargetOpticalCompletion | null {
  if (!completion) return null;
  if (completion.kind === "legacy") return skyNativeImageIsCurrent(completion.field.image) ? completion : null;
  const fields = completion.participatingFields.filter(field => skyNativeImageIsCurrent(field.image));
  if (fields.length === 0) return null;
  if (fields.length === completion.participatingFields.length) return completion;
  // Filtering preserves the exact family of every original field.
  return Object.freeze({ ...completion, participatingFields: Object.freeze(fields) }) as SkyTargetOpticalCompletion;
}

export function sameSkyOpticalCompletion(a: SkyTargetOpticalCompletion | null | undefined,
  b: SkyTargetOpticalCompletion | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  if (a.kind !== b.kind || a.reference !== b.reference || a.publicationHash !== b.publicationHash) return false;
  if (a.kind === "legacy") return b.kind === "legacy" && fieldEqual(a.field, b.field);
  if (b.kind === "legacy") return false;
  if (a.kind === "science" ? b.kind !== "science" || a.sciencePublication !== b.sciencePublication :
    a.kind === "display" ? b.kind !== "display" || a.displayPublication !== b.displayPublication :
    b.kind !== "prepared" || a.preparedPublication !== b.preparedPublication) return false;
  if (a.receipt.completed !== b.receipt.completed || a.receipt.finePhoto !== b.receipt.finePhoto ||
    a.receipt.coarsePhoto !== b.receipt.coarsePhoto ||
    a.receipt.qualification.fine !== b.receipt.qualification.fine ||
    a.receipt.qualification.coarse !== b.receipt.qualification.coarse ||
    a.receipt.qualification.any !== b.receipt.qualification.any ||
    a.participatingFields.length !== b.participatingFields.length) return false;
  return a.participatingFields.every((field, index) => {
    const other = b.participatingFields[index]!;
    return field.slot === other.slot && fieldEqual(field, other) && field.asset === other.asset;
  });
}

/** Equal bitmaps/hash do not establish equal family, admitted publication or
 * exact ready primary/parent descriptors. Invalid exact envelopes stay unequal. */
export function sameSkyOpticalInput(a: SkyTargetOpticalImage | null | undefined,
  b: SkyTargetOpticalImage | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  if (a.reference !== b.reference || a.publicationHash !== b.publicationHash || !fieldEqual(a, b)) return false;
  const legacy = isSkyLegacyOpticalFrame(a);
  if (legacy !== isSkyLegacyOpticalFrame(b)) return false;
  if (!legacy) {
    const ai = skyExactTargetOpticalIdentity(a), bi = skyExactTargetOpticalIdentity(b);
    if (!ai || !bi || ai.kind !== bi.kind || ai.publication !== bi.publication || ai.frame.asset !== bi.frame.asset)
      return false;
  }
  const equalAlternative = (ap: SkySdssOpticalField | null | undefined, bp: SkySdssOpticalField | null | undefined) =>
    !ap || !bp ? !ap && !bp : fieldEqual(ap, bp) &&
      (legacy || ("asset" in ap && "asset" in bp && ap.asset === bp.asset));
  return equalAlternative(a.coarser, b.coarser) && equalAlternative(a.fallback, b.fallback);
}
