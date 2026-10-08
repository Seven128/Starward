import type { DeepSkySceneCatalogEntry, SkyObservationFrame } from "@starward/miniapp-contracts";
import type { SkyArtworkRegistration, SkyArtworkView } from "./sky-artwork-registration";
import type { SkyArtworkContributionSurface, SkyArtworkLevelSurface, SkyArtworkLevels,
  SkyArtworkLevelsDraw, SkyArtworkLevel, SkyArtworkLocalObservation } from "./sky-artwork-level-composition";
import { unknownSkyArtworkLocalObservation } from "./sky-artwork-level-composition";
import type {SkyDeepAuxiliaryDisplayFacts} from "./sky-deep-auxiliary-visibility";
import { skyNativeImageIsCurrent } from "./sky-artwork-loader";
import type { SkyRenderSurface } from "./sky-render-surface";
import { skyTargetOpticalFrame, type SkyTargetOpticalImage } from "./sky-sdss-optical-frame";
import { skyExactTargetOpticalIdentity, type SkyExactTargetOpticalField, type SkyExactTargetOpticalImage } from "./sky-target-optical-identity";
import { registerSkyTanOpticalField } from "./sky-tan-optical-registration";
import { registerSkyDeepSkyRegion, type SkyDeepSkyRegion } from "./sky-deep-sky-region";

/** Explicit task capability and publication intent. Normal Scene callers omit
 * this port; having group methods on a renderer does not enable an exact-source family. */
export interface SkySceneTargetOpticalPort {
  readonly surface: SkyRenderSurface & SkyArtworkLevelSurface & SkyArtworkContributionSurface;
  readonly reference: string;
  readonly publicationHash: string;
}

export interface SkySceneTargetOpticalSubmission {
  readonly surface: SkySceneTargetOpticalPort["surface"];
  readonly frame: SkyExactTargetOpticalImage;
  readonly sourceKind: "science" | "display" | "prepared";
  readonly draw: SkyArtworkLevelsDraw;
  /** Optional catalog domain for the model observation of this exact group.
   * Its presence alone supplies no qualification or source credit. */
  readonly region: SkyDeepSkyRegion | null;
  /** One whole-cutout choice, made before later layers. Photo disappearance
   * after terrain/navigation cannot authorize a different spectrum afterward. */
  readonly allowInfrared: boolean;
}

const unsubmitted: SkyArtworkLevelsDraw = Object.freeze({ submitted: false, finePrepared: false, coarsePrepared: false });

/** Join the already admitted ready descriptors, same report observation and
 * actual group draw. Failed ready fields remain expected for EMPTY proof; a
 * prepared-only empty result cannot erase an unavailable original fine slot.
 * No catalog center/culling or display-brightness test defines this coverage.
 */
export function submitSkySceneTargetOptical(context: SkyRenderSurface, sourceKind: "science" | "display" | "prepared",
  port: SkySceneTargetOpticalPort | undefined, input: SkyTargetOpticalImage | null | undefined,
  observation: SkyObservationFrame | null, view: SkyArtworkView,
  failed?: (image: object) => void,
  catalogEntry?: DeepSkySceneCatalogEntry | null): SkySceneTargetOpticalSubmission | null {
  const identity = skyExactTargetOpticalIdentity(input);
  if (!port || port.surface !== context || !identity || identity.kind !== sourceKind ||
    port.reference !== identity.frame.reference || port.publicationHash !== identity.frame.publicationHash) return null;
  const { frame, publication } = identity, parent = frame.coarser;

  // Capture original primary/parent before liveness, registration or texture
  // preparation. Actual primary is fine even when it is a MEDIUM fallback.
  const expected = { fine: frame, coarse: parent };
  const reported = new Set<object>();
  const fail = (field: SkyExactTargetOpticalField) => {
    if (!reported.has(field.image)) { reported.add(field.image); failed?.(field.image); }
  };
  const register = (field: SkyExactTargetOpticalField | null): SkyArtworkRegistration | null => {
    if (!field) return null;
    if (!skyNativeImageIsCurrent(field.image)) { fail(field); return null; }
    const registration = registerSkyTanOpticalField(publication, field.asset, observation);
    if (!registration) fail(field);
    return registration;
  };
  let fine = register(expected.fine), coarse = register(expected.coarse);
  // A failure callback can synchronously retire another queued native field.
  if (fine && !skyNativeImageIsCurrent(expected.fine.image)) { fail(expected.fine); fine = null; }
  if (coarse && expected.coarse && !skyNativeImageIsCurrent(expected.coarse.image)) { fail(expected.coarse); coarse = null; }
  const level = (field: SkyExactTargetOpticalField, registration: SkyArtworkRegistration): SkyArtworkLevel =>
    sourceKind !== "prepared" ? { image: field.image, registration, sampleAvailability: "joint-area-alpha" } :
      { image: field.image, registration, geometricCoverage: "geometric-source-area", scientificAvailability: "UNKNOWN" };
  const levels: SkyArtworkLevels = {
    fine: fine ? level(expected.fine, fine) : null,
    coarse: coarse && expected.coarse ? level(expected.coarse, coarse) : null,
  };
  // Ordinary draw/context errors propagate to the Scene frame owner. Auxiliary
  // probe failure is represented by UNKNOWN and is never an image failure.
  const draw = fine || coarse ? port.surface.artworkLevels(levels, view, 1) : unsubmitted;
  let allowInfrared = !draw.submitted; // independent whole-unavailable policy
  if (draw.submitted) {
    const qualification = port.surface.artworkLevelsQualification(draw);
    allowInfrared = !!fine && draw.finePrepared && (!expected.coarse || (!!coarse && draw.coarsePrepared)) &&
      qualification.any === "empty" && qualification.fine === "empty" &&
      (!expected.coarse || qualification.coarse === "empty");
  }
  if (!draw.finePrepared) fail(expected.fine);
  if (expected.coarse && !draw.coarsePrepared) fail(expected.coarse);
  // Only total preparation failure may use the separately admitted finer
  // alternative. A successful/empty primary draw still owns its own coverage.
  // Submit before later layers, with today's view and the alternative's exact
  // descriptor; completion/credit then follow this actual group, not the failed
  // wider image. No third sampler or cross-source composition is introduced.
  if (!draw.submitted && frame.fallback && skyNativeImageIsCurrent(frame.fallback.image)) {
    const alternative = skyTargetOpticalFrame({ publication, image: frame.fallback.image,
      renderedLevel: frame.fallback.level, renderedAsset: frame.fallback.asset, coarser: null });
    const restored = submitSkySceneTargetOptical(context, sourceKind, port, alternative,
      observation, view, failed, catalogEntry);
    if (restored) return restored;
  }
  const region = catalogEntry?.objectRef === frame.reference
    ? registerSkyDeepSkyRegion(catalogEntry, observation) : null;
  return Object.freeze({ surface: port.surface, sourceKind, frame, draw, allowInfrared, region });
}

/** Join local model facts with the original expected, prepared and current
 * source obligations. Failed or retired expected sources are never neutral. */
export function observeSkySceneTargetOptical(submission:SkySceneTargetOpticalSubmission):SkyArtworkLocalObservation {
  const {frame,draw,region,surface}=submission;
  if(!region || region.reference!==frame.reference || !draw.submitted || !draw.finePrepared ||
    !skyNativeImageIsCurrent(frame.image) || (frame.coarser && (!draw.coarsePrepared || !skyNativeImageIsCurrent(frame.coarser.image))) ||
    !surface.artworkLevelsObserveRegion) return unknownSkyArtworkLocalObservation;
  const result=surface.artworkLevelsObserveRegion(draw,region);
  if(!skyNativeImageIsCurrent(frame.image) || (frame.coarser && !skyNativeImageIsCurrent(frame.coarser.image)))
    return unknownSkyArtworkLocalObservation;
  if(result.signalRevision===null) return result;
  // Only this exact original-expected/current/prepared join can authorize
  // neutral slots. The lower pixel-center observer never invents not-selected.
  const q=surface.artworkLevelsQualification(draw);
  const neutral=Object.freeze({selection:"not-selected" as const,photo:"unknown" as const});
  return Object.freeze({...result,fine:q.fine==="empty"?neutral:result.fine,
    coarse:!frame.coarser || q.coarse==="empty"?neutral:result.coarse});
}

/** Capture the original expected-slot contract and same-revision local facts
 * once before aids. Later source-credit filtering cannot rewrite this record. */
export function skyTargetOpticalDisplayFacts(submission:SkySceneTargetOpticalSubmission):SkyDeepAuxiliaryDisplayFacts {
  const local=observeSkySceneTargetOptical(submission),{frame,draw,region}=submission;
  return Object.freeze({reference:frame.reference,regionReference:region?.reference??null,
    submitted:draw.submitted,finePrepared:draw.finePrepared,coarseExpected:!!frame.coarser,
    coarsePrepared:draw.coarsePrepared,nativeCurrent:skyNativeImageIsCurrent(frame.image)&&
      (!frame.coarser||skyNativeImageIsCurrent(frame.coarser.image)),local});
}
