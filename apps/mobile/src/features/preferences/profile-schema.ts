import { z } from "zod";
import {
  equipmentKinds,
  facilityKinds,
  observerTypes,
  observingTargets,
  requirementLevels,
  travelModes,
} from "@starward/domain/preferences";

const nullableNonNegative = z.number().nonnegative().nullable();

export const preferenceProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "请为预设填写至少两个字的名称").max(24),
  revision: z.number().int().positive(),
  observerTypes: z.array(z.enum(observerTypes)),
  startingPlace: z.string().trim().max(80),
  city: z.string().trim().max(40),
  willingness: z.object({
    continuousLocationWhenFieldSessionStarts: z.boolean(),
    weatherAndAstronomyNotifications: z.boolean(),
  }),
  travel: z.object({
    modes: z.array(z.enum(travelModes)),
    maxOneWayMinutes: nullableNonNegative,
    maxDrivingKilometers: nullableNonNegative,
    maxWalkingKilometers: nullableNonNegative,
    directAccessRequired: z.boolean(),
    acceptsMountainRoad: z.boolean(),
    acceptsUnpavedRoad: z.boolean(),
    acceptsNightWalking: z.boolean(),
    acceptsCamping: z.boolean(),
    acceptsOvernight: z.boolean(),
  }),
  facilities: z.record(z.enum(facilityKinds), z.enum(requirementLevels)),
  targets: z.array(z.enum(observingTargets)),
  equipment: z.array(z.enum(equipmentKinds)),
  lensFocalLengthsMm: z.array(z.number().positive().max(2000)),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PreferenceProfileForm = z.infer<typeof preferenceProfileSchema>;
