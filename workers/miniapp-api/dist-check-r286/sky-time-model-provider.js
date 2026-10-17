import { observationHorizontalFrame } from "@starward/astronomy-core/observation-frame";
import { skyTimeDirectionToEqj } from "@starward/astronomy-core/sky-time-model";
import { assertSkyTimeModel, SKY_TIME_BODY_ORDER, SKY_TIME_MODEL_FORMAT, SKY_TIME_MODEL_METHOD } from "@starward/miniapp-contracts";
import { calculateMiniappBodyMotionAt, calculateMiniappSkyGeometryAt, MINIAPP_ASTRONOMY_ALGORITHM } from "./astronomy-engine-adapter.js";
/** Geometry publication only. It does not extend the shared time axis, weather
 * coverage or Context, and callers cache it with the existing report owner. */
export function buildSkyTimeModel(input) {
    const model = { format: SKY_TIME_MODEL_FORMAT, method: SKY_TIME_MODEL_METHOD,
        algorithmVersion: `${MINIAPP_ASTRONOMY_ALGORITHM}+${SKY_TIME_MODEL_FORMAT}`,
        observer: { ...input.observer }, startAt: input.hourlyAt[0], endAt: input.hourlyAt.at(-1),
        knots: input.hourlyAt.map(at => {
            const frame = observationHorizontalFrame({ ...input.observer, at });
            const geometry = calculateMiniappSkyGeometryAt({ ...input.observer, at });
            const axes = (value) => value ? {
                primeMeridianEqj: skyTimeDirectionToEqj(value.primeMeridianEnu, frame.equatorialToEnu),
                poleEqj: skyTimeDirectionToEqj(value.poleEnu, frame.equatorialToEnu),
            } : null;
            const bodies = SKY_TIME_BODY_ORDER.map((body, index) => {
                const planet = index < 2 ? null : geometry.planets[index - 2];
                return { body, ...calculateMiniappBodyMotionAt({ ...input.observer, at, body }),
                    angularDiameterDeg: index === 0 ? geometry.sunAngularDiameterDeg : index === 1
                        ? geometry.moonAngularDiameterDeg : planet.angularDiameterDeg,
                    illuminatedFraction: index === 0 ? null : index === 1 ? geometry.moonIllumination : planet.illuminatedFraction,
                    phaseAngleDeg: index === 1 ? geometry.moonPhaseAngleDeg : null,
                    visualMagnitude: planet?.visualMagnitude ?? null,
                    bodyFrameEqj: axes(index === 1 ? geometry.moonBodyFrame : planet?.bodyFrame),
                    ringTiltDeg: planet?.ringTiltDeg ?? null,
                    ringPoleEqj: planet?.ringPoleEnu ? skyTimeDirectionToEqj(planet.ringPoleEnu, frame.equatorialToEnu) : null,
                    ringSunEqj: planet?.ringSunEnu ? skyTimeDirectionToEqj(planet.ringSunEnu, frame.equatorialToEnu) : null, };
            });
            return { at, equatorialToEnu: frame.equatorialToEnu, bodies };
        }) };
    assertSkyTimeModel(model, input);
    return model;
}
//# sourceMappingURL=sky-time-model-provider.js.map