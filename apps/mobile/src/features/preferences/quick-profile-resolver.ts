import type { FieldErrors, Resolver } from "react-hook-form";
import { observingTargets, type PreferenceProfile } from "@starward/domain/preferences";

/** This adapter edits only targets and walking distance on a runtime-qualified
 * profile. Preserve all untouched values; complete runtime validation still
 * enforces the write rather than applying the full Wizard's text-edit limits. */
export const quickProfileResolver: Resolver<PreferenceProfile> = async values => {
  const errors: FieldErrors<PreferenceProfile> = {};
  if (!Array.isArray(values.targets) || values.targets.some(target => !observingTargets.includes(target))) errors.targets = { type: "validate", message: "请核对观测目标。" };
  const distance = values.travel?.maxWalkingKilometers;
  if (distance !== null && (typeof distance !== "number" || !Number.isFinite(distance) || distance < 0)) errors.travel = { maxWalkingKilometers: { type: "validate", message: "请核对步行距离。" } };
  return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
};
