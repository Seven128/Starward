import type { SkyArtworkRegistration, SkyArtworkView } from "./sky-artwork-registration";
import type { SkyDeepSkyRegion } from "./sky-deep-sky-region";

/** Pixel-center facts in this renderer's highp catalog-region shader model.
 * Physical ICRS accuracy and area absence are unverified. Zero stays unknown;
 * consumers may use positive components only as a model-domain display guard. */
export interface SkyArtworkLocalObservation {
  readonly scope: "frozen-highp-shader-pixel-centers";
  readonly precision: "unknown";
  readonly signalRevision: number | null;
  readonly fine: { readonly selection: "has" | "not-selected" | "unknown"; readonly photo: "positive" | "unknown" };
  readonly coarse: { readonly selection: "has" | "not-selected" | "unknown"; readonly photo: "positive" | "unknown" };
}
export const unknownSkyArtworkLocalObservation: SkyArtworkLocalObservation = Object.freeze({
  scope: "frozen-highp-shader-pixel-centers", precision: "unknown", signalRevision: null,
  fine: Object.freeze({selection:"unknown", photo:"unknown"}), coarse: Object.freeze({selection:"unknown", photo:"unknown"}),
});

/** Explicit candidate contracts. Both use a complete four-texel stencil before
 * choosing a color; geometric source support makes no science-validity claim.
 * Old JPEG/display-contribution alpha cannot enter this group API. */
export type SkyArtworkLevel = {
  readonly image: object;
  readonly registration: SkyArtworkRegistration;
} & (
  | { readonly sampleAvailability: "joint-area-alpha";
      readonly geometricCoverage?: never; readonly scientificAvailability?: never }
  | { readonly geometricCoverage: "geometric-source-area"; readonly scientificAvailability: "UNKNOWN";
      readonly sampleAvailability?: never }
);

export interface SkyArtworkLevels {
  readonly coarse?: SkyArtworkLevel | null;
  readonly fine?: SkyArtworkLevel | null;
}

/** Submission/texture preparation is deliberately not a visible-source credit.
 * A valid black sample excludes coarse while contributing no display opacity. */
export interface SkyArtworkLevelsDraw {
  readonly submitted: boolean;
  readonly coarsePrepared: boolean;
  readonly finePrepared: boolean;
}

export interface SkyArtworkLevelSurface {
  artworkLevels(levels: SkyArtworkLevels, view: SkyArtworkView, opacity: number): SkyArtworkLevelsDraw;
}

/** Eligibility precedes foreground compositing and spectral-source selection.
 * Empty requires a successful full framebuffer evaluation; skipping a probe
 * or failing to prepare a texture does not establish empty coverage. */
export type SkyArtworkEligibility = "has" | "empty" | "unknown";
export interface SkyArtworkLevelsQualification {
  readonly fine: SkyArtworkEligibility;
  readonly coarse: SkyArtworkEligibility;
  readonly any: SkyArtworkEligibility;
}

/** A positive component survives actual later draw alpha and navigation clear.
 * RGBA8 zero remains unknown, including valid black and sub-byte attenuation.
 * This is component participation, not a counterfactual post-clamp RGB delta. */
export interface SkyArtworkLevelsContribution {
  readonly completed: boolean;
  readonly qualification: SkyArtworkLevelsQualification;
  readonly finePhoto: "positive" | "unknown";
  readonly coarsePhoto: "positive" | "unknown";
}

/** Receipts belong to the exact draw object and renderer frame. A prior-frame
 * draw, an unsubmitted draw and an unfinished frame cannot receive a credit. */
export interface SkyArtworkContributionSurface {
  artworkLevelsObserveRegion?(draw: SkyArtworkLevelsDraw, region: SkyDeepSkyRegion | null): SkyArtworkLocalObservation;
  artworkLevelsQualification(draw: SkyArtworkLevelsDraw): SkyArtworkLevelsQualification;
  artworkLevelsContribution(draw: SkyArtworkLevelsDraw): SkyArtworkLevelsContribution;
  /** An enabled auxiliary owner failed; ordinary UNKNOWN is not a fault. */
  artworkContributionsFailed?(): boolean;
  /** Explicit retry; frame ticks do not retry failed auxiliary allocations. */
  resetArtworkContributions(): void;
}

/** Opt-in policy for additional logical RGBA8 storage, separate from source
 * image pressure. No device capacity or default native budget is implied. */
export interface SkyArtworkContributionBudget {
  readonly auxiliaryBytesLimit: number;
  readonly maxGroups: number;
}

export function validSkyArtworkLevel(level: SkyArtworkLevel | null | undefined): level is SkyArtworkLevel {
  if (!level) return false;
  const science = level.sampleAvailability === "joint-area-alpha" &&
    !("geometricCoverage" in level) && !("scientificAvailability" in level);
  const geometric = level.geometricCoverage === "geometric-source-area" &&
    level.scientificAvailability === "UNKNOWN" && !("sampleAvailability" in level);
  if (!science && !geometric) return false;
  const image = level.image as { width?: number; height?: number } | null;
  const registration = level.registration;
  const vector = (value: unknown) => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
  return !!image && Number.isInteger(image.width) && Number.isInteger(image.height) &&
    image.width! > 0 && image.height! > 0 && !!registration &&
    Array.isArray(registration.rows) && registration.rows.length === 3 && registration.rows.every(vector) &&
    vector(registration.anchorU) && vector(registration.anchorV) &&
    Number.isFinite(registration.determinant) && Math.abs(registration.determinant) > 0;
}

/** One selected color, then one background blend. Availability is read from
 * original RGBA, before display contribution is derived from the selected RGB.
 * The four texel-center reads prevent LINEAR interpolation from turning an
 * incomplete/missing source neighbor into apparently usable dark imagery. */
export function skyArtworkLevelsFragment(cameraRay: string, output: "display" | "contribution" = "display"): string {
  const field = (name: string) => `
    uniform sampler2D u_${name}Image;
    uniform float u_${name}Ready, u_${name}Determinant;
    uniform vec3 u_${name}Row0, u_${name}Row1, u_${name}Row2, u_${name}AnchorU, u_${name}AnchorV;
    uniform vec2 u_${name}WindowOffset, u_${name}WindowSize, u_${name}Size;
    bool ${name}Sample(vec3 ray, out vec3 rgb) {
      if (u_${name}Ready < 0.5) return false;
      vec3 coefficients = vec3(dot(u_${name}Row0,ray),dot(u_${name}Row1,ray),dot(u_${name}Row2,ray));
      float sum = coefficients.x+coefficients.y+coefficients.z;
      if (abs(sum)<0.0000001 || u_${name}Determinant/sum<=0.0) return false;
      vec2 uv = vec2(dot(coefficients,u_${name}AnchorU),dot(coefficients,u_${name}AnchorV))/sum;
      if (uv.x<0.0 || uv.y<0.0 || uv.x>1.0 || uv.y>1.0) return false;
      vec2 cell = floor(uv*u_${name}Size-0.5);
      vec2 a = (clamp(cell,vec2(0.0),u_${name}Size-1.0)+0.5)/u_${name}Size;
      vec2 b = (clamp(cell+1.0,vec2(0.0),u_${name}Size-1.0)+0.5)/u_${name}Size;
      float availability = min(min(
        texture2D(u_${name}Image,(a*u_${name}Size-u_${name}WindowOffset)/u_${name}WindowSize).a,
        texture2D(u_${name}Image,(vec2(b.x,a.y)*u_${name}Size-u_${name}WindowOffset)/u_${name}WindowSize).a),min(
        texture2D(u_${name}Image,(vec2(a.x,b.y)*u_${name}Size-u_${name}WindowOffset)/u_${name}WindowSize).a,
        texture2D(u_${name}Image,(b*u_${name}Size-u_${name}WindowOffset)/u_${name}WindowSize).a));
      // Float32 center-coordinate/LINEAR roundoff only. The next incomplete
      // 8-bit area value is 254/255, far below this tolerance.
      if (availability < 0.999999) return false;
      // Enter the original pixel grid before normalizing to resident storage.
      // Rounded source/resident ratios otherwise make the same view's sampling
      // depend on which containing window an intermediate view left cached.
      rgb = texture2D(u_${name}Image,(uv*u_${name}Size-u_${name}WindowOffset)/u_${name}WindowSize).rgb;
      return true;
    }`;
  return `precision highp float;
    varying vec2 v_pixel;
    ${cameraRay}
    uniform float u_opacity;
    ${field("coarse")}
    ${field("fine")}
    void main() {
      vec3 rgb;
      vec3 ray = skyRay(v_pixel);
      ${output === "display" ? "if (!fineSample(ray,rgb) && !coarseSample(ray,rgb)) discard;" :
        "bool fineSelected = fineSample(ray,rgb);\n      if (!fineSelected && !coarseSample(ray,rgb)) discard;"}
      float contribution = max(max(rgb.r,rgb.g),rgb.b);
      // Valid black selects fine and returns zero contribution, never coarse.
      vec3 straight = contribution > 0.0 ? rgb/contribution : vec3(0.0);
      ${output === "display" ? "gl_FragColor = vec4(straight,contribution*u_opacity);" :
        "gl_FragColor = vec4(fineSelected ? contribution*u_opacity : 0.0, fineSelected ? 0.0 : contribution*u_opacity, fineSelected ? 1.0 : 0.0, fineSelected ? 0.0 : 1.0);"}
    }`;
}
