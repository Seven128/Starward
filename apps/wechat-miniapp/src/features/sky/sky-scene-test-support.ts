import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createSkySceneFrameIdentity, type SkySceneFrameIdentity, type SkySceneFrameInput, type SkyScenePorts, type SkySceneFailure } from "./sky-scene-frame";
import type { SkyRenderSurface } from "./sky-render-surface";
import type { SkyPickSnapshot } from "./sky-object-picking";
import { SKY_OBSERVING_VERTICAL_FOV_DEG as SKY_VERTICAL_FOV_DEG } from "./sky-zoom";
import { skyBodyImageBinding, type SkyBodyImageBinding, type SkyBodyImagePublications } from "./sky-body-image-completion";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Identity = SkySceneFrameIdentity;
export interface SkySceneTestInputs {
  observation?: Partial<Mutable<Identity["observation"]>>;
  view?: Partial<Mutable<Identity["view"]>>;
  canvas?: Partial<Mutable<Identity["canvas"]>>;
  layers?: Mutable<NonNullable<SkySceneFrameInput["layers"]>>;
  imagery?: Mutable<NonNullable<SkySceneFrameInput["imagery"]>>;
  work?: Mutable<NonNullable<SkySceneFrameInput["work"]>>;
}
type SkySceneTestFailures = {
  [K in SkySceneFailure["kind"]]?: (failure: Extract<SkySceneFailure, { kind: K }>) => void;
};

/** The shared empty scientific/native inputs are absence, never a successful
 * sample or image. Each test supplies the actual responsibility it exercises. */
export function skySceneTestFrame(inputs: SkySceneTestInputs = {}): SkySceneFrameInput {
  return {
    identity: createSkySceneFrameIdentity({
      observation: { data: undefined, frameAt: undefined, ...inputs.observation },
      view: { heading: null, pose: null, manualBasis: null, mode: "NIGHT", verticalFovDeg: SKY_VERTICAL_FOV_DEG, ...inputs.view },
      canvas: { generation: 1, width: 390, height: 844, ...inputs.canvas },
    }),
    ...(inputs.layers ? { layers: inputs.layers } : {}),
    ...(inputs.imagery ? { imagery: inputs.imagery } : {}),
    ...(inputs.work ? { work: inputs.work } : {}),
  };
}

/** Mutable test demands are captured afresh at submission, just as the page's
 * admission owner does. Completed frames never retain this mutable fixture. */
export function skySceneTestCase(inputs: SkySceneTestInputs & { surface: SkyRenderSurface; ports?: SkyScenePorts }) {
  return {
    surface: inputs.surface,
    observation: { data: undefined, frameAt: undefined, ...inputs.observation } as Mutable<Identity["observation"]>,
    view: { heading: null, pose: null, manualBasis: null, mode: "NIGHT", verticalFovDeg: SKY_VERTICAL_FOV_DEG, ...inputs.view } as Mutable<Identity["view"]>,
    canvas: { generation: 1, width: 390, height: 844, ...inputs.canvas },
    layers: { ...inputs.layers },
    imagery: { ...inputs.imagery,
      targetOptical: { image: null, ...inputs.imagery?.targetOptical },
      galactic: { image: null, publication: null, ...inputs.imagery?.galactic },
      bodyImages: inputs.imagery?.bodyImages ?? [],
    },
    work: { ...inputs.work },
    ports: inputs.ports ?? {},
    failures: {} as SkySceneTestFailures,
  };
}
export type SkySceneTestCase = ReturnType<typeof skySceneTestCase>;

/** Numerical draw/pick comparisons exclude live report methods in the admission
 * identity. Callers separately assert the exact admitted identity/source owner. */
export function skySceneTestPickFacts(snapshot:SkyPickSnapshot|null):Omit<SkyPickSnapshot,'identity'>|null {
  if(!snapshot)return null;
  const {identity:_identity,...facts}=snapshot;
  return structuredClone(facts);
}

export function skySceneTestPorts(scene: SkySceneTestCase): SkyScenePorts {
  const ports = { ...scene.ports }, failures = { ...scene.failures };
  return { ...ports, failed(failure, identity) {
    ports.failed?.(failure, identity);
    switch (failure.kind) {
      case "infrared": failures.infrared?.(failure); break;
      case "target-optical": failures["target-optical"]?.(failure); break;
      case "constellation": failures.constellation?.(failure); break;
      case "hips": failures.hips?.(failure); break;
      case "solar-light": failures["solar-light"]?.(failure); break;
      case "moon": failures.moon?.(failure); break;
      case "planet": failures.planet?.(failure); break;
      case "sun-disc": failures["sun-disc"]?.(failure); break;
      case "galactic-band": failures["galactic-band"]?.(failure); break;
      case "scene": failures.scene?.(failure); break;
    }
  } };
}

const bodyPublications = new Map<keyof SkyBodyImagePublications, SkyBodyImagePublications[keyof SkyBodyImagePublications]>();
function bodyPublication<R extends keyof SkyBodyImagePublications>(reference: R): SkyBodyImagePublications[R] {
  let publication = bodyPublications.get(reference);
  if (!publication) {
    const body = reference.split(":")[1]!.toLowerCase();
    const file = body === "moon" ? "coverage-manifest.json" : "manifest.json";
    const bytes = readFileSync(new URL(`../../../../../workers/miniapp-api/assets/${body}/${file}`, import.meta.url));
    publication = { ...JSON.parse(bytes.toString("utf8")), publicationHash: createHash("sha256").update(bytes).digest("hex") };
    bodyPublications.set(reference, publication!);
  }
  return publication as SkyBodyImagePublications[R];
}

/** Real checked-in publication identity accompanies a controlled native bitmap;
 * this fixture does not fabricate a successful GPU submission or publication. */
export function skySceneTestBodyImages(images: Partial<Record<keyof SkyBodyImagePublications, object | null | undefined>>): readonly SkyBodyImageBinding[] {
  const bindings: SkyBodyImageBinding[] = [];
  for (const [reference, image] of Object.entries(images)) {
    if (!image) continue;
    const key = reference as keyof SkyBodyImagePublications;
    const binding = skyBodyImageBinding(key, image, bodyPublication(key));
    if (binding) bindings.push(binding as SkyBodyImageBinding);
  }
  return bindings;
}
