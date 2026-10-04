import { createProgramInfo, setBuffersAndAttributes, setUniforms, drawBufferInfo,
  type ProgramInfo, type BufferInfo } from "twgl.js";
import type { SkyRenderSurface } from "./sky-render-surface";
import { skyArtworkViewParameters, type SkyArtworkView } from "./sky-artwork-registration";
import { skyArtworkRasterBounds } from "./sky-artwork-raster-bounds";
import { createSkyGpuTextures } from "./sky-gpu-textures";
import type {SkyMoonDisc} from "./sky-moon-disc";
import type {SkyPlanetDisc} from "./sky-planet-disc";
import type {SkyPhaseDisc} from "./sky-phase-disc";
import {saturnRingFragment} from "./sky-saturn-ring-fragment";
import { skyLandscapeFragment, skyLandscapePanoramaFragment } from "./sky-landscape";
import {SATURN_BANDS,SATURN_EQUATORIAL_RADIUS_KM,SATURN_REFERENCE_RADIUS_KM} from "./sky-saturn-rings";

const position = `
  vec4 screenPosition(vec2 p) {
    return vec4(p.x / u_resolution.x * 2.0 - 1.0, 1.0 - p.y / u_resolution.y * 2.0, 0.0, 1.0);
  }`;
const pointVertex = `
  attribute vec2 a_position;
  attribute vec3 a_shape;
  attribute vec4 a_color;
  uniform vec2 u_resolution;
  uniform mediump float u_pixelRatio;
  uniform float u_maxPointSize;
  varying vec4 v_color;
  varying vec3 v_shape;
  varying float v_size;
  varying float v_glare, v_extent;
  ${position}
  void main() {
    gl_Position = screenPosition(a_position);
    // Bright-point detail follows the same catalogue/FOV-derived CSS radius.
    // Faint points and non-stellar symbols retain their existing profiles.
    v_glare = a_shape.z > 0.5 ? smoothstep(2.0, 2.7, a_shape.x) : 0.0;
    float extent = a_shape.z > 0.5 ? mix(2.5, 8.0, v_glare) : 1.0;
    float radius = a_shape.x * u_pixelRatio;
    v_size = min(u_maxPointSize, 2.0 * (radius * extent + 1.0));
    v_extent = max(0.0, (v_size * 0.5 - 1.0) / max(radius, 0.01));
    gl_PointSize = v_size;
    v_shape = vec3(a_shape.xy * u_pixelRatio, a_shape.z);
    v_color = a_color;
  }`;
const pointFragment = `
  precision mediump float;
  uniform mediump float u_pixelRatio;
  varying vec4 v_color;
  varying vec3 v_shape;
  varying float v_size;
  varying float v_glare, v_extent;
  void main() {
    vec2 offset = (gl_PointCoord - 0.5) * v_size;
    float d = length(offset);
    float alpha;
    if (v_shape.z > 0.5) {
      // Original soft core with bounded bright-point halo/axis wings. This is
      // display tuning, not a measured instrument/eye PSF or conserved flux.
      float q = d / v_shape.x;
      float core = exp(-q * q);
      alpha = core;
      if (v_glare > 0.0) {
        vec2 axes = abs(offset);
        float width = max(0.7 * u_pixelRatio, 0.12 * v_shape.x);
        float across = min(axes.x, axes.y) / width;
        float wing = exp(-across * across) * exp(-max(axes.x, axes.y) / (2.5 * v_shape.x));
        float halo = 0.14 * exp(-0.5 * q);
        alpha += v_glare * (1.0 - core) * (halo + 0.18 * wing);
      }
      alpha *= 1.0 - smoothstep(v_extent * v_shape.x - 0.5, v_extent * v_shape.x + 0.5, d);
    } else {
      alpha = 1.0 - smoothstep(v_shape.x - 0.5, v_shape.x + 0.5, d);
      if (v_shape.y > 0.0) alpha *= smoothstep(v_shape.x - v_shape.y - 0.5, v_shape.x - v_shape.y + 0.5, d);
    }
    gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
  }`;
const lineVertex = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  uniform vec2 u_resolution;
  varying vec4 v_color;
  ${position}
  void main() { gl_Position = screenPosition(a_position); v_color = a_color; }`;
const lineFragment = `
  precision mediump float;
  varying vec4 v_color;
  void main() { gl_FragColor = v_color; }`;
const imageVertex = `
  attribute vec2 a_position;
  attribute vec2 a_uv;
  uniform vec2 u_resolution;
  varying vec2 v_uv, v_pixel;
  ${position}
  void main() { gl_Position = screenPosition(a_position); v_uv = a_uv; v_pixel = a_position; }`;
const imageFragment = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_opacity;
  varying vec2 v_uv;
  void main() { vec4 c = texture2D(u_image, v_uv); gl_FragColor = vec4(c.rgb, c.a * u_opacity); }`;
const artworkVertex = `
  attribute vec2 a_position;
  uniform vec2 u_resolution;
  varying vec2 v_pixel;
  ${position}
  void main() { v_pixel = a_position; gl_Position = screenPosition(a_position); }`;
// The same inverse stereographic camera ray drives registered imagery and solar light.
const skyRay = `
  uniform vec2 u_center;
  uniform float u_scale;
  uniform vec3 u_right, u_up, u_forward;
  vec3 skyRay(vec2 pixel) {
    vec2 p = (pixel-u_center)/u_scale;
    p.y = -p.y;
    float squared = dot(p,p);
    vec3 camera = vec3(2.0*p,1.0-squared)/(1.0+squared);
    return u_right*camera.x+u_up*camera.y+u_forward*camera.z;
  }`;
// Inverse ray followed by intersection with the three-anchor image plane.
// Uses ENU throughout; the research prototype's NEU is not copied.
const artworkFragment = `
  precision highp float;
  varying vec2 v_pixel;
  ${skyRay}
  uniform vec3 u_row0, u_row1, u_row2, u_anchorU, u_anchorV;
  uniform float u_determinant;
  uniform sampler2D u_image;
  uniform float u_opacity;
  uniform vec3 u_tint;
  uniform float u_infraredCutout;
  uniform float u_cutoutEdges;
  void main() {
    vec3 ray = skyRay(v_pixel);
    if (ray.z < 0.0) discard;
    vec3 coefficients = vec3(dot(u_row0,ray),dot(u_row1,ray),dot(u_row2,ray));
    float sum = coefficients.x+coefficients.y+coefficients.z;
    if (abs(sum)<0.0000001 || u_determinant/sum<=0.0) discard;
    vec2 uv = vec2(dot(coefficients,u_anchorU),dot(coefficients,u_anchorV))/sum;
    if (uv.x<0.0 || uv.y<0.0 || uv.x>1.0 || uv.y>1.0) discard;
    vec4 source = texture2D(u_image,uv);
    float alpha = source.a*u_opacity;
    if (u_infraredCutout > 0.5) {
      // Continuous display opacity suppresses the grey JPEG pedestal without
      // classifying faint/black pixels as missing, or changing source bytes.
      float brightness = dot(source.rgb,vec3(0.2126,0.7152,0.0722));
      alpha *= smoothstep(0.0,1.0,brightness);
    }
    if (u_cutoutEdges > 0.5) {
      // A display taper of the known rectangular field, not inferred missing data.
      vec2 edge = min(uv,vec2(1.0)-uv);
      vec2 fade = smoothstep(vec2(0.0),vec2(0.08),edge);
      alpha *= fade.x*fade.y;
    }
    gl_FragColor = vec4(source.rgb*u_tint,alpha);
  }`;
const skyMeshVertex = `
  attribute vec2 a_position;
  attribute vec2 a_uv;
  uniform vec2 u_resolution;
  varying vec2 v_pixel, v_uv;
  ${position}
  void main() { v_pixel=a_position; v_uv=a_uv; gl_Position=screenPosition(a_position); }`;
const skyMeshFragment = `
  precision highp float;
  varying vec2 v_pixel, v_uv;
  ${skyRay}
  uniform sampler2D u_image;
  uniform float u_opacity;
  void main() {
    if(skyRay(v_pixel).z<=0.0) discard;
    vec4 source=texture2D(u_image,v_uv);
    gl_FragColor=vec4(source.rgb,source.a*u_opacity);
  }`;

// Clear-sky, single-scattering approximation in the shared ENU camera. The
// Rayleigh/Mie phase functions and optical-air-mass approximation follow the
// Preetham/Three.js Sky reference (see THIRD_PARTY_NOTICES). Fixed aerosol
// parameters and display exposure are illustrative, not local weather or
// measured radiance. Twilight is deliberately tapered to the dark base;
// Observation mode never submits this layer.
const solarLightFragment = `
  precision highp float;
  varying vec2 v_pixel;
  ${skyRay}
  uniform vec3 u_sunDirection, u_base;
  uniform float u_sunAltitude;
  const vec3 BETA_R = vec3(5.804543e-6,1.356291e-5,3.026590e-5);
  const vec3 BETA_M = vec3(1.597e-6,2.413e-6,3.541e-6);
  const float PI = 3.141592653589793;
  void main() {
    vec3 ray = skyRay(v_pixel);
    if (ray.z <= 0.0) { gl_FragColor = vec4(u_base,1.0); return; }
    // A restrained chart-only low-sky glow gives the simulated horizon
    // depth at night. It is not measured airglow, light pollution or weather.
    float lowSky = 1.0-smoothstep(0.0,0.45,ray.z);
    float nightWeight = 1.0-smoothstep(-18.0,-9.0,u_sunAltitude);
    vec3 nightGlow = vec3(0.025,0.025,0.035)*lowSky*nightWeight;
    if (u_sunAltitude <= -18.0) {
      gl_FragColor = vec4(u_base+nightGlow,1.0);
      return;
    }
    float cosine = clamp(ray.z,0.0,1.0);
    float zenithDeg = acos(cosine)*180.0/PI;
    float airMass = 1.0/(cosine+0.15*pow(93.885-zenithDeg,-1.253));
    vec3 extinction = exp(-(BETA_R*8400.0+BETA_M*1250.0)*airMass);
    float scatterCosine = clamp(dot(ray,u_sunDirection),-1.0,1.0);
    float rayleighPhase = 3.0*(1.0+scatterCosine*scatterCosine)/(16.0*PI);
    float g = 0.8;
    float miePhase = (1.0-g*g)/(4.0*PI*pow(1.0+g*g-2.0*g*scatterCosine,1.5));
    float mieTwilight = smoothstep(-8.0,0.0,u_sunAltitude);
    vec3 scattering = (BETA_R*rayleighPhase+BETA_M*miePhase*mieTwilight)
      / (BETA_R+BETA_M) * (vec3(1.0)-extinction);
    float sunCosine = max(u_sunDirection.z,0.0);
    float sunZenithDeg = acos(sunCosine)*180.0/PI;
    float sunAirMass = 1.0/(sunCosine+0.15*pow(93.885-sunZenithDeg,-1.253));
    vec3 sunTransmittance = exp(-(BETA_R*8400.0+BETA_M*1250.0)*sunAirMass);
    // Low sunlight crosses a longer path near the solar horizon. Keep the
    // opposite/upper sky blue instead of tinting and clipping the whole dome.
    float lowSun = 1.0-smoothstep(0.0,20.0,u_sunAltitude);
    float towardSun = max(scatterCosine,0.0);
    float horizonWeight = 1.0-smoothstep(0.1,0.7,ray.z);
    float directSunFade = smoothstep(-9.0,2.0,u_sunAltitude);
    float sunsetWeight = 0.65*lowSun*directSunFade*(0.15+0.85*towardSun)*horizonWeight;
    float twilight = pow(smoothstep(-18.0,3.0,u_sunAltitude),3.0);
    vec3 radiance = 550.0*twilight*scattering*mix(vec3(1.0),sunTransmittance,sunsetWeight);
    // Near the low solar disc the Mie forward lobe otherwise clips the whole
    // horizon to white. Compress that lobe without dimming the opposite sky.
    float horizonSolar = lowSun*towardSun*horizonWeight;
    float exposure = 0.12*(1.0-0.45*lowSun)*(1.0-0.85*horizonSolar);
    // This is an observing chart with white native status text, not a
    // photometric daytime image. Keep the directional/twilight curve within
    // the ordinary mode's dark sky gamut.
    const vec3 DAY_CEILING = vec3(0.14,0.27,0.39);
    vec3 sky = u_base+(DAY_CEILING-u_base)*(vec3(1.0)-exp(-exposure*radiance))+nightGlow;
    gl_FragColor = vec4(sky,1.0);
  }`;

// A coordinate-registered orientation cue only. Width and brightness are
// illustrative constants, not an ESA image or measured Milky Way radiance.
const galacticBandFragment = `
  precision highp float;
  varying vec2 v_pixel;
  ${skyRay}
  uniform vec3 u_galacticPole, u_galacticCenter;
  uniform float u_strength;
  void main() {
    vec3 ray = skyRay(v_pixel);
    if (ray.z <= 0.0) discard;
    float latitude = abs(dot(ray,u_galacticPole));
    float narrow = exp(-pow(latitude/0.12,2.0));
    float broad = exp(-pow(latitude/0.27,2.0));
    float bulge = pow(max(dot(ray,u_galacticCenter),0.0),6.0);
    float alpha = u_strength*(0.14*narrow+0.05*broad+0.14*bulge*narrow);
    gl_FragColor = vec4(0.41,0.48,0.57,alpha);
  }`;

// Historical J/H/K false-color image, registered in the same exact observer
// frame as the schematic. Additive blending leaves black source areas empty.
// When its finite source texels are magnified, smooth the background rather
// than enlarging its infrared point sources into apparent catalogue stars.
// This display filter preserves the published pixels, colour and registration;
// it is neither a point-source catalogue nor a scientific validity mask.
const galacticImageFragment = `
  precision highp float;
  varying vec2 v_pixel;
  ${skyRay}
  uniform vec3 u_galacticPole, u_galacticCenter;
  uniform sampler2D u_image;
  uniform vec2 u_imageTexel;
  uniform float u_strength, u_filterStrength;
  vec3 galacticSample(vec2 uv) {
    // The panorama wraps in longitude. Latitude ends at the two poles.
    return texture2D(u_image,vec2(fract(uv.x),clamp(uv.y,0.0,1.0))).rgb;
  }
  void main() {
    vec3 ray = skyRay(v_pixel);
    if (ray.z <= 0.0) discard;
    vec3 east = cross(u_galacticPole,u_galacticCenter);
    float longitude = atan(dot(ray,east),dot(ray,u_galacticCenter));
    float latitude = asin(clamp(dot(ray,u_galacticPole),-1.0,1.0));
    vec2 uv = vec2(0.5-longitude/6.28318530718,0.5-latitude/3.14159265359);
    vec3 original = galacticSample(uv);
    vec3 infrared = original;
    if (u_filterStrength > 0.0) {
      // Separable [1,4,6,4,1]/16 in both axes. Bilinear grouping reduces the
      // 25 weighted source samples to nine fetches, without another texture,
      // upload or decoded image. Weights sum to one, preserving diffuse colour.
      vec2 offset = 1.2*u_imageTexel;
      vec3 smoothImage = 0.140625*original;
      smoothImage += 0.1171875*(galacticSample(uv+vec2(offset.x,0.0))+
        galacticSample(uv-vec2(offset.x,0.0))+galacticSample(uv+vec2(0.0,offset.y))+
        galacticSample(uv-vec2(0.0,offset.y)));
      smoothImage += 0.09765625*(galacticSample(uv+offset)+galacticSample(uv-offset)+
        galacticSample(uv+vec2(offset.x,-offset.y))+galacticSample(uv+vec2(-offset.x,offset.y)));
      infrared = mix(original,smoothImage,u_filterStrength);
    }
    gl_FragColor = vec4(infrared,0.24*u_strength);
  }`;

// A geometric, hard-edged main-ring shadow. The band opacities are illustrative
// display values, not measured optical depth; PDS Viewer likewise omits penumbra.
const saturnRingShadowFragment = `
  uniform float u_ringShadowAvailable;
  uniform vec3 u_ringSunBody;
  float ringShadow(vec3 body) {
    if (u_ringShadowAvailable < 0.5 || abs(u_ringSunBody.z) < 0.00001) return 0.0;
    float travel = -body.z / u_ringSunBody.z;
    if (travel <= 0.0) return 0.0;
    float radius = length(body.xy + travel * u_ringSunBody.xy);
    float opacity = 0.0;
    ${SATURN_BANDS.map(({innerKm,outerKm,opacity})=>`
    opacity = max(opacity, ${opacity.toFixed(3)} *
      smoothstep(${(innerKm/SATURN_EQUATORIAL_RADIUS_KM-.004).toFixed(7)},
        ${(innerKm/SATURN_EQUATORIAL_RADIUS_KM+.004).toFixed(7)}, radius) *
      (1.0-smoothstep(${(outerKm/SATURN_EQUATORIAL_RADIUS_KM-.004).toFixed(7)},
        ${(outerKm/SATURN_EQUATORIAL_RADIUS_KM+.004).toFixed(7)}, radius)));`).join("\n")}
    return opacity;
  }`;

// A plain-albedo phase mask oriented to the report Sun. Saturn's silhouette
// is scaled by its projected polar axis; this is not surface texture/photometry.
const moonFragment = `
  precision highp float;
  varying vec2 v_uv, v_pixel;
  ${skyRay}
  uniform vec2 u_sunward;
  uniform float u_illuminatedFraction;
  uniform vec2 u_minorDirection;
  uniform float u_minorRatio;
  uniform vec3 u_tint;
  uniform vec3 u_bodyObserver, u_bodyRight, u_bodyDown;
  uniform float u_polarRatio;
  ${saturnRingShadowFragment}
  void main() {
    vec2 p = 2.0*v_uv-1.0;
    vec2 majorDirection = vec2(-u_minorDirection.y,u_minorDirection.x);
    vec2 sphereP = majorDirection*dot(p,majorDirection)
      +u_minorDirection*dot(p,u_minorDirection)/u_minorRatio;
    float squared = dot(sphereP,sphereP);
    if (squared > 1.0) discard;
    if (skyRay(v_pixel).z < 0.0) discard;
    float facing = sqrt(max(0.0,1.0-squared));
    float phaseCos = 2.0*u_illuminatedFraction-1.0;
    float phaseSin = sqrt(max(0.0,1.0-phaseCos*phaseCos));
    float incidence = dot(vec3(sphereP,facing),vec3(u_sunward*phaseSin,phaseCos));
    float daylight = smoothstep(-0.012,0.012,incidence);
    float brightness = 0.045 + daylight*(0.62+0.335*max(incidence,0.0));
    if (u_ringShadowAvailable > 0.5) {
      float inversePolarSquared = 1.0/(u_polarRatio*u_polarRatio);
      vec3 offset = u_bodyRight*p.x+u_bodyDown*p.y;
      vec3 weightedObserver = vec3(u_bodyObserver.xy,u_bodyObserver.z*inversePolarSquared);
      float qa=dot(u_bodyObserver,weightedObserver);
      float qb=dot(offset,weightedObserver);
      float qc=dot(offset,vec3(offset.xy,offset.z*inversePolarSquared))-1.0;
      float discriminant=qb*qb-qa*qc;
      if (discriminant >= 0.0) {
        vec3 body=offset+u_bodyObserver*((-qb+sqrt(discriminant))/qa);
        brightness *= 1.0-ringShadow(body);
      }
    }
    float edge = 1.0-smoothstep(0.96,1.0,squared);
    gl_FragColor = vec4(u_tint*brightness,edge);
  }`;

// Report-owned phase and body orientation. OPAL latitude profiles are
// longitude-neutral; transparent rows fall back to the plain globe.
const bodyTextureFragment = `
  precision highp float;
  varying vec2 v_uv, v_pixel;
  ${skyRay}
  uniform vec2 u_sunward;
  uniform float u_illuminatedFraction;
  uniform vec3 u_tint;
  uniform float u_colorMode;
  uniform vec3 u_bodyObserver, u_bodyRight, u_bodyDown;
  uniform float u_polarRatio;
  uniform float u_profile;
  uniform vec3 u_fallbackTint;
  uniform sampler2D u_image;
  ${saturnRingShadowFragment}
  const float PI=3.141592653589793;
  void main() {
    vec2 p=2.0*v_uv-1.0;
    float squared=dot(p,p);
    if(squared>1.0)discard;
    if(skyRay(v_pixel).z<0.0)discard;
    float invPolarSquared=1.0/(u_polarRatio*u_polarRatio);
    vec3 offset=u_bodyRight*p.x+u_bodyDown*p.y;
    vec3 observer=u_bodyObserver;
    vec3 weightedObserver=vec3(observer.xy,observer.z*invPolarSquared);
    float qa=dot(observer,weightedObserver);
    float qb=dot(offset,weightedObserver);
    float qc=dot(offset,vec3(offset.xy,offset.z*invPolarSquared))-1.0;
    float discriminant=qb*qb-qa*qc;
    if(discriminant<0.0)discard;
    vec3 body=offset+observer*((-qb+sqrt(discriminant))/qa);
    vec3 normal=normalize(vec3(body.xy,body.z*invPolarSquared));
    float facing=max(0.0,dot(normal,observer));
    float longitude=atan(body.y,body.x);
    float latitude=atan(normal.z,length(normal.xy));
    vec2 mapUv=vec2((longitude+PI)/(2.0*PI),0.5-latitude/PI);
    vec4 sampleColor=texture2D(u_image,mapUv);
    vec3 albedo=sampleColor.rgb;
    float phaseCos=2.0*u_illuminatedFraction-1.0;
    float phaseSin=sqrt(max(0.0,1.0-phaseCos*phaseCos));
    float incidence=dot(vec3(p,facing),vec3(u_sunward*phaseSin,phaseCos));
    float daylight=smoothstep(-0.012,0.012,incidence);
    float brightness=0.045+daylight*(0.62+0.335*max(incidence,0.0));
    brightness *= 1.0-ringShadow(body);
    float edge=smoothstep(0.0,0.04,discriminant);
    vec3 surface=mix(vec3(albedo.r),albedo,u_colorMode);
    vec3 textured=u_tint*brightness*(mix(0.3,0.08,u_profile)+
      mix(1.2,0.9,u_profile)*clamp(surface,0.0,1.0));
    gl_FragColor=vec4(mix(u_fallbackTint*brightness,textured,sampleColor.a),edge);
  }`;

// Relative photospheric intensity at 579.88 nm: Neckel/Labs coefficients as
// tabulated by Hestroffer & Magnan (1998), Table 1 (wavelength in text/Table 2).
// https://legacy.adsabs.harvard.edu/pdf/1998A%26A...333..338H
// Palette multiplication is a display mapping, not natural colour or photometry.
// The mean profile does not supply current sunspots, corona or local extinction.
const sunFragment = `
  precision highp float;
  varying vec2 v_pixel;
  ${skyRay}
  uniform vec2 u_discCenter;
  uniform float u_discRadius;
  uniform vec3 u_tint;
  void main() {
    vec2 p=(v_pixel-u_discCenter)/u_discRadius;
    float squared=dot(p,p);
    if(squared>1.0)discard;
    if(skyRay(v_pixel).z<0.0)discard;
    float mu=sqrt(max(0.0,1.0-squared));
    float intensity=clamp(0.28392+mu*(1.36896+mu*(-1.75998+
      mu*(2.22154+mu*(-1.56074+mu*0.44630)))),0.0,1.0);
    float edge=1.0-smoothstep(0.965,1.0,squared);
    gl_FragColor=vec4(u_tint*intensity,edge);
  }`;

export interface SkyGpuRenderer extends SkyRenderSurface { dispose(): void }

/** Native WEAPP WebGL node only; no DOM, offscreen canvas, readback or second camera. */
export function createSkyGpuRenderer(gl: WebGLRenderingContext, pixelRatio: number, options: {
  imageFailed?(image: object): void;
  textureByteBudget?: number;
} = {}): SkyGpuRenderer {
  let disposed = false;
  const programs: ProgramInfo[] = [];
  const buffers: WebGLBuffer[] = [];
  const textures = createSkyGpuTextures(gl,options.imageFailed,options.textureByteBudget);
  let width = 0, height = 0;
  let kind: "points" | "lines" | null = null;
  const vertices: number[] = [];
  const colors = new Map<string, readonly number[]>();
  let backgroundRgb: readonly number[] = [0, 0, 0];
  const color = (hex: string) => {
    let rgb = colors.get(hex);
    if (!rgb) {
      if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error("sky_gpu_invalid_color");
      rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
      colors.set(hex, rgb);
    }
    return rgb;
  };
  const assertAvailable = () => {
    if (disposed) throw new Error("sky_gpu_disposed");
    if (gl.isContextLost()) throw new Error("sky_gpu_context_lost");
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    textures.dispose();
    for (const buffer of buffers) gl.deleteBuffer(buffer);
    for (const program of programs) gl.deleteProgram(program.program);
    buffers.length = programs.length = vertices.length = 0;
    colors.clear();
  };
  const makeProgram = (vertex: string, fragment: string) => {
    // TWGL deletes failed shaders/programs; retain each successful allocation
    // immediately so a later shader or buffer failure releases the earlier ones.
    const program = createProgramInfo(gl, [vertex, fragment], () => {});
    if (!program) throw new Error("sky_gpu_shader_unavailable");
    programs.push(program);
    const shaders = gl.getAttachedShaders(program.program);
    shaders?.forEach(shader => { gl.detachShader(program.program, shader); gl.deleteShader(shader); });
    return program;
  };
  const makeBuffer = (stride: number, attributes: Record<string, [number, number]>): BufferInfo => {
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("sky_gpu_buffer_unavailable");
    buffers.push(buffer);
    return { numElements: 0, attribs: Object.fromEntries(Object.entries(attributes).map(([name, [size, offset]]) =>
      [name, { buffer, numComponents: size, type: gl.FLOAT, stride: stride * 4, offset: offset * 4 }])) };
  };
  try {
    assertAvailable();
    if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) throw new Error("sky_gpu_invalid_pixel_ratio");
    const pointSizeRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | null;
    const maxPointSize = pointSizeRange?.[1];
    if (!Number.isFinite(maxPointSize) || !maxPointSize || maxPointSize < 1)
      throw new Error("sky_gpu_point_size_unavailable");
    const points = makeProgram(pointVertex, pointFragment);
    const lines = makeProgram(lineVertex, lineFragment);
    const image = makeProgram(imageVertex, imageFragment);
    const pointBuffer = makeBuffer(9, { a_position: [2, 0], a_shape: [3, 2], a_color: [4, 5] });
    const lineBuffer = makeBuffer(6, { a_position: [2, 0], a_color: [4, 2] });
    const imageBuffer = makeBuffer(4, { a_position: [2, 0], a_uv: [2, 2] });
    let artwork: ProgramInfo | null = null, artworkBuffer: BufferInfo | null = null, artworkUnavailable = false;
    let skyMesh: ProgramInfo | null = null, skyMeshBuffer: BufferInfo | null = null, skyMeshUnavailable = false;
    let solarLight: ProgramInfo | null = null, solarLightBuffer: BufferInfo | null = null, solarLightUnavailable = false;
    let landscape: ProgramInfo | null = null, landscapeBuffer: BufferInfo | null = null, landscapeUnavailable = false;
    let landscapePanorama: ProgramInfo | null = null, landscapePanoramaUnavailable = false;
    let galacticBand: ProgramInfo | null = null, galacticBandBuffer: BufferInfo | null = null, galacticBandUnavailable = false;
    let galacticImage: ProgramInfo | null = null, galacticImageUnavailable = false;
    let ringProgram: ProgramInfo | null = null, ringBuffer: BufferInfo | null = null, ringsUnavailable = false;
    let moonProgram: ProgramInfo | null = null, moonUnavailable = false;
    let bodyTextureProgram: ProgramInfo | null = null, bodyTextureUnavailable = false;
    let sunProgram: ProgramInfo | null = null, sunBuffer: BufferInfo | null = null, sunUnavailable = false;
    const maxAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number;
    const submit = (program: ProgramInfo, buffer: BufferInfo, data: readonly number[], stride: number, primitive: number,
      uniforms: Record<string, unknown> = {}) => {
      if (!data.length) return;
      // Switching a dense star buffer to a 6-vertex image must disable unused
      // attribute arrays. Leaving an old enabled array caused GL1282 on Android.
      for (let i = 0; i < maxAttributes; i++) gl.disableVertexAttribArray(i);
      const first = Object.values(buffer.attribs!)[0]!;
      gl.bindBuffer(gl.ARRAY_BUFFER, first.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
      buffer.numElements = data.length / stride;
      gl.useProgram(program.program);
      setBuffersAndAttributes(gl, program, buffer);
      setUniforms(program, { u_resolution: [width, height], u_pixelRatio: pixelRatio,
        u_maxPointSize: maxPointSize, ...uniforms });
      drawBufferInfo(gl, buffer, primitive);
    };
    const flush = () => {
      if (kind === "points") submit(points, pointBuffer, vertices, 9, gl.POINTS);
      if (kind === "lines") submit(lines, lineBuffer, vertices, 6, gl.TRIANGLES);
      vertices.length = 0; kind = null;
    };
    const use = (next: typeof kind) => { if (kind !== next) flush(); kind = next; };
    const paintPhaseDisc = (disc: SkyPhaseDisc & {oblate?:SkyPlanetDisc["oblate"],
      surfaceOrientation?:SkyPlanetDisc["surfaceOrientation"],ringSunBody?:SkyPlanetDisc["ringSunBody"]},
      view: SkyArtworkView, tint: string, observationMode: boolean) => {
      assertAvailable();
      const parameters=skyArtworkViewParameters(view,width,height);
      if (moonUnavailable || !parameters || ![disc.x,disc.y,disc.radiusPx,disc.illuminatedFraction,...disc.sunward].every(Number.isFinite) ||
        disc.radiusPx <= 0 || disc.illuminatedFraction < 0 || disc.illuminatedFraction > 1) return false;
      flush();
      if (!moonProgram) {
        const programCount = programs.length;
        try { moonProgram = makeProgram(imageVertex,moonFragment); }
        catch {
          for (const program of programs.splice(programCount)) gl.deleteProgram(program.program);
          moonUnavailable = true; assertAvailable(); return false;
        }
      }
      // Angular size stays in the model; the floor only preserves subpixel visibility.
      const shape=disc.oblate;
      const shadow=disc.ringSunBody&&disc.surfaceOrientation;
      const radius = Math.max(0.5,shape?.majorRadiusPx??disc.radiusPx);
      const x0=disc.x-radius,x1=disc.x+radius,y0=disc.y-radius,y1=disc.y+radius;
      try {
        submit(moonProgram,imageBuffer,[x0,y0,0,0,x1,y0,1,0,x0,y1,0,1,
          x0,y1,0,1,x1,y0,1,0,x1,y1,1,1],4,gl.TRIANGLES,{
          u_sunward:disc.sunward,u_illuminatedFraction:disc.illuminatedFraction,
          u_minorDirection:shape?.minorDirection??[0,1],
          u_minorRatio:shape?shape.minorRadiusPx/shape.majorRadiusPx:1,
          u_ringShadowAvailable:shadow?1:0,u_ringSunBody:disc.ringSunBody??[0,0,1],
          u_polarRatio:shape?.polarRatio??1,
          u_bodyObserver:disc.surfaceOrientation?.observerBody??[0,0,1],
          u_bodyRight:disc.surfaceOrientation?.rightBody??[1,0,0],
          u_bodyDown:disc.surfaceOrientation?.downBody??[0,-1,0],
          u_tint:observationMode?[1,.25,.2]:color(tint),
          u_center:[parameters.center.x,parameters.center.y],u_scale:parameters.scale,
          u_right:view.basis.right,u_up:view.basis.up,u_forward:view.basis.forward,
        });
        if (gl.getError() !== gl.NO_ERROR) throw new Error("sky_gpu_phase_disc_draw_failed");
        return true;
      } catch { assertAvailable(); moonUnavailable = true; return false; }
    };
    const paintBodyTexture=(disc:SkyMoonDisc|SkyPlanetDisc,view:SkyArtworkView,source:object|null|undefined,
      tint:string,colorMode:0|1,fallbackTint=tint)=>{
      const parameters=skyArtworkViewParameters(view,width,height);
      if(!source||!parameters||!disc.surfaceOrientation||disc.radiusPx<4||bodyTextureUnavailable)return false;
      assertAvailable();flush();
      if(!bodyTextureProgram){
        const programCount=programs.length;
        try{bodyTextureProgram=makeProgram(imageVertex,bodyTextureFragment);}
        catch{
          for(const program of programs.splice(programCount))gl.deleteProgram(program.program);
          bodyTextureUnavailable=true;options.imageFailed?.(source);assertAvailable();return false;
        }
      }
      const texture=textures.get(source);
      if(!texture)return false;
      const shape="oblate" in disc?disc.oblate:null;
      const radius=Math.max(.5,shape?.majorRadiusPx??disc.radiusPx);
      const x0=disc.x-radius,x1=disc.x+radius,y0=disc.y-radius,y1=disc.y+radius;
      try{
        submit(bodyTextureProgram,imageBuffer,[x0,y0,0,0,x1,y0,1,0,x0,y1,0,1,
          x0,y1,0,1,x1,y0,1,0,x1,y1,1,1],4,gl.TRIANGLES,{
          u_sunward:disc.sunward,u_illuminatedFraction:disc.illuminatedFraction,
          u_tint:color(tint),u_colorMode:colorMode,u_image:texture,
          u_polarRatio:shape?.polarRatio??1,
          u_ringShadowAvailable:"ringSunBody" in disc&&disc.ringSunBody?1:0,
          u_ringSunBody:"ringSunBody" in disc?disc.ringSunBody??[0,0,1]:[0,0,1],
          u_profile:"body" in disc&&(disc.body==="JUPITER"||disc.body==="SATURN"||disc.body==="URANUS"||disc.body==="NEPTUNE")?1:0,
          u_fallbackTint:color(fallbackTint),
          u_bodyObserver:disc.surfaceOrientation.observerBody,
          u_bodyRight:disc.surfaceOrientation.rightBody,
          u_bodyDown:disc.surfaceOrientation.downBody,
          u_center:[parameters.center.x,parameters.center.y],u_scale:parameters.scale,
          u_right:view.basis.right,u_up:view.basis.up,u_forward:view.basis.forward,
        });
        if(gl.getError()!==gl.NO_ERROR)throw new Error("sky_gpu_body_texture_draw_failed");
        return true;
      }catch{assertAvailable();bodyTextureUnavailable=true;options.imageFailed?.(source);return false;}
    };
    return {
      begin(w, h, background) {
        assertAvailable();
        if (!(w > 0 && h > 0 && Number.isFinite(w) && Number.isFinite(h))) throw new Error("sky_gpu_invalid_size");
        width = w; height = h; textures.begin();
        vertices.length = 0; kind = null;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.SCISSOR_TEST);
        gl.colorMask(true, true, true, true);
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        // Straight alpha source, opaque destination. Avoid translucent canvas
        // composition and keep the star's magnitude/alpha meaning unchanged.
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        const rgb = color(background);
        backgroundRgb = rgb;
        gl.clearColor(rgb[0]!, rgb[1]!, rgb[2]!, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      },
      solarLight(view, sun) {
        assertAvailable();
        const parameters = skyArtworkViewParameters(view,width,height);
        if (!parameters || !sun.direction.every(Number.isFinite) ||
          !Number.isFinite(sun.altitudeDeg) || sun.altitudeDeg < -90 || sun.altitudeDeg > 90) return false;
        if (solarLightUnavailable) return false;
        flush();
        if (!solarLight) {
          const programCount = programs.length, bufferCount = buffers.length;
          try {
            solarLight = makeProgram(artworkVertex,solarLightFragment);
            solarLightBuffer = makeBuffer(2,{a_position:[2,0]});
          } catch {
            for (const program of programs.splice(programCount)) gl.deleteProgram(program.program);
            for (const buffer of buffers.splice(bufferCount)) gl.deleteBuffer(buffer);
            solarLight = null; solarLightBuffer = null; solarLightUnavailable = true;
            assertAvailable();
            return false;
          }
        }
        try {
          submit(solarLight,solarLightBuffer!,[0,0,width,0,0,height,0,height,width,0,width,height],2,gl.TRIANGLES,{
            u_center:[parameters.center.x,parameters.center.y],u_scale:parameters.scale,
            u_right:view.basis.right,u_up:view.basis.up,u_forward:view.basis.forward,
            u_sunDirection:sun.direction,u_sunAltitude:sun.altitudeDeg,u_base:backgroundRgb,
          });
          if (gl.getError() !== gl.NO_ERROR) throw new Error("sky_gpu_solar_light_draw_failed");
          return true;
        } catch {
          assertAvailable();
          solarLightUnavailable = true;
          return false;
        }
      },
      landscape(view, sun, observationMode, panorama) {
        assertAvailable();
        const parameters = skyArtworkViewParameters(view,width,height);
        if (!parameters || !sun.direction.every(Number.isFinite) ||
          !Number.isFinite(sun.altitudeDeg) || sun.altitudeDeg < -90 || sun.altitudeDeg > 90) return false;
        flush();
        if (panorama) {
          if (landscapePanoramaUnavailable) { options.imageFailed?.(panorama.image); return false; }
          const texture = textures.get(panorama.image);
          if (!texture) return false;
          try {
            if (!landscapePanorama) landscapePanorama = makeProgram(artworkVertex, skyLandscapePanoramaFragment(skyRay));
            if (!landscapeBuffer) landscapeBuffer = makeBuffer(2, { a_position: [2, 0] });
            const { width: imageWidth, height: imageHeight } = panorama.mask.resource.image;
            submit(landscapePanorama, landscapeBuffer, [0,0,width,0,0,height,0,height,width,0,width,height], 2, gl.TRIANGLES, {
              u_center: [parameters.center.x, parameters.center.y], u_scale: parameters.scale,
              u_right: view.basis.right, u_up: view.basis.up, u_forward: view.basis.forward,
              u_image: texture, u_imageSize: [imageWidth, imageHeight],
              u_seam: panorama.mask.publication.projection.seamAzimuthDeg / 360,
              u_sunAltitude: sun.altitudeDeg, u_observationMode: observationMode ? 1 : 0,
            });
            if (gl.getError() !== gl.NO_ERROR) throw new Error("sky_gpu_landscape_panorama_draw_failed");
            return true;
          } catch {
            assertAvailable(); landscapePanoramaUnavailable = true; options.imageFailed?.(panorama.image); return false;
          }
        }
        if (landscapeUnavailable) return false;
        if (!landscape) {
          const programCount = programs.length, bufferCount = buffers.length;
          try {
            landscape = makeProgram(artworkVertex,skyLandscapeFragment(skyRay));
            if (!landscapeBuffer) landscapeBuffer = makeBuffer(2,{a_position:[2,0]});
          } catch {
            for (const program of programs.splice(programCount)) gl.deleteProgram(program.program);
            for (const buffer of buffers.splice(bufferCount)) gl.deleteBuffer(buffer);
            landscape = null; landscapeBuffer = null; landscapeUnavailable = true;
            assertAvailable();
            return false;
          }
        }
        try {
          submit(landscape,landscapeBuffer!,[0,0,width,0,0,height,0,height,width,0,width,height],2,gl.TRIANGLES,{
            u_center:[parameters.center.x,parameters.center.y],u_scale:parameters.scale,
            u_right:view.basis.right,u_up:view.basis.up,u_forward:view.basis.forward,
            u_sunDirection:sun.direction,u_sunAltitude:sun.altitudeDeg,u_base:backgroundRgb,
            u_observationMode:observationMode?1:0,
          });
          if (gl.getError() !== gl.NO_ERROR) throw new Error("sky_gpu_landscape_draw_failed");
          return true;
        } catch {
          assertAvailable();
          landscapeUnavailable = true;
          return false;
        }
      },
      galacticBand(view, band, source) {
        assertAvailable();
        const parameters = skyArtworkViewParameters(view,width,height);
        if (!parameters || !Number.isFinite(band.strength) ||
          band.strength <= 0 || band.strength > 1 ||
          !band.pole.every(Number.isFinite) || !band.center.every(Number.isFinite)) return false;
        flush();
        if (source && !galacticImageUnavailable) {
          const texture=textures.get(source);
          if(texture){
            try {
              if(!galacticImage)galacticImage=makeProgram(artworkVertex,galacticImageFragment);
              if(!galacticBandBuffer)galacticBandBuffer=makeBuffer(2,{a_position:[2,0]});
              gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ZERO,gl.ONE);
              submit(galacticImage,galacticBandBuffer,[0,0,width,0,0,height,0,height,width,0,width,height],2,gl.TRIANGLES,{
                u_center:[parameters.center.x,parameters.center.y],u_scale:parameters.scale,
                u_right:view.basis.right,u_up:view.basis.up,u_forward:view.basis.forward,
                u_galacticPole:band.pole,u_galacticCenter:band.center,
                u_strength:band.strength,u_image:texture,
                u_imageTexel:[1/(source as {width:number}).width,1/(source as {height:number}).height],
                // The equirectangular source has pi/height radians per texel.
                // One-to-two logical pixels is a continuous sampling transition;
                // minified/whole-dome views retain the original panorama.
                u_filterStrength:Math.max(0,Math.min(1,parameters.scale*Math.PI/(source as {height:number}).height-1)),
              });
              if(gl.getError()!==gl.NO_ERROR)throw new Error("sky_gpu_galactic_image_draw_failed");
              return true;
            }catch {assertAvailable();galacticImageUnavailable=true;options.imageFailed?.(source);}
            finally {gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);}
          }
        }
        if(galacticBandUnavailable)return false;
        if (!galacticBand) {
          const programCount = programs.length, bufferCount = buffers.length;
          try {
            galacticBand = makeProgram(artworkVertex,galacticBandFragment);
            galacticBandBuffer = makeBuffer(2,{a_position:[2,0]});
          } catch {
            for (const program of programs.splice(programCount)) gl.deleteProgram(program.program);
            for (const buffer of buffers.splice(bufferCount)) gl.deleteBuffer(buffer);
            galacticBand = null; galacticBandBuffer = null; galacticBandUnavailable = true;
            assertAvailable();
            return false;
          }
        }
        try {
          submit(galacticBand,galacticBandBuffer!,[0,0,width,0,0,height,0,height,width,0,width,height],2,gl.TRIANGLES,{
            u_center:[parameters.center.x,parameters.center.y],u_scale:parameters.scale,
            u_right:view.basis.right,u_up:view.basis.up,u_forward:view.basis.forward,
            u_galacticPole:band.pole,u_galacticCenter:band.center,u_strength:band.strength,
          });
          if (gl.getError() !== gl.NO_ERROR) throw new Error("sky_gpu_galactic_band_draw_failed");
          return true;
        } catch {
          assertAvailable();
          galacticBandUnavailable = true;
          return false;
        }
      },
      moon(disc, view, observationMode, source) {
        // Missing surface samples are a uniform neutral display globe, never
        // bright white terrain. Half-tint is close to the reviewed Clementine
        // map's median display level; it supplies no local albedo or landforms.
        if(!observationMode&&paintBodyTexture(disc,view,source,"#DEE3EB",0,"#6F7175"))return true;
        return paintPhaseDisc(disc,view,"#DEE3EB",observationMode);
      },
      sun(disc,view,observationMode) {
        assertAvailable();
        const parameters=skyArtworkViewParameters(view,width,height);
        if(sunUnavailable||!parameters||![disc.x,disc.y,disc.radiusPx].every(Number.isFinite)||disc.radiusPx<=0)return false;
        flush();
        if(!sunProgram){
          const programCount=programs.length,bufferCount=buffers.length;
          try{sunProgram=makeProgram(artworkVertex,sunFragment);sunBuffer=makeBuffer(2,{a_position:[2,0]});}
          catch{
            for(const program of programs.splice(programCount))gl.deleteProgram(program.program);
            for(const buffer of buffers.splice(bufferCount))gl.deleteBuffer(buffer);
            sunProgram=null;sunBuffer=null;sunUnavailable=true;assertAvailable();return false;
          }
        }
        const radius=Math.max(.5,disc.radiusPx),x0=disc.x-radius,x1=disc.x+radius,y0=disc.y-radius,y1=disc.y+radius;
        try{
          submit(sunProgram,sunBuffer!,[x0,y0,x1,y0,x0,y1,x0,y1,x1,y0,x1,y1],2,gl.TRIANGLES,{
            u_center:[parameters.center.x,parameters.center.y],u_scale:parameters.scale,
            u_right:view.basis.right,u_up:view.basis.up,u_forward:view.basis.forward,
            u_discCenter:[disc.x,disc.y],u_discRadius:radius,
            u_tint:observationMode?[1,.24,.18]:color("#FFE8B8"),
          });
          if(gl.getError()!==gl.NO_ERROR)throw new Error("sky_gpu_solar_disc_draw_failed");
          return true;
        }catch{assertAvailable();sunUnavailable=true;return false;}
      },
      planet(disc,view,tint,observationMode,source) {
        if((disc.body==="MARS"||disc.body==="MERCURY"||disc.body==="JUPITER"||disc.body==="SATURN"||disc.body==="URANUS"||disc.body==="NEPTUNE")&&!observationMode&&
          paintBodyTexture(disc,view,source,"#FFFFFF",disc.body==="MERCURY"?0:1,tint))return true;
        return paintPhaseDisc(disc,view,tint,observationMode);
      },
      saturnRings(disc,view,tint,observationMode) {
        assertAvailable();
        const projection=disc.ringProjection,shape=disc.oblate;
        const parameters=skyArtworkViewParameters(view,width,height);
        if(!projection||!shape||!parameters||ringsUnavailable)return false;
        const major=projection.majorScreen.map(v=>v*disc.radiusPx);
        const minor=projection.minorScreen.map(v=>v*disc.radiusPx*Math.abs(projection.opening));
        const determinant=major[0]!*minor[1]!-major[1]!*minor[0]!;
        if(!Number.isFinite(determinant)||Math.abs(determinant)<1e-8)return false;
        flush();
        if(!ringProgram){
          const programCount=programs.length,bufferCount=buffers.length;
          try{
            ringProgram=makeProgram(artworkVertex,saturnRingFragment(skyRay));
            ringBuffer=makeBuffer(2,{a_position:[2,0]});
          }catch{
            for(const program of programs.splice(programCount))gl.deleteProgram(program.program);
            for(const buffer of buffers.splice(bufferCount))gl.deleteBuffer(buffer);
            ringProgram=null;ringBuffer=null;ringsUnavailable=true;assertAvailable();return false;
          }
        }
        const extent=SATURN_BANDS[2].outerKm/SATURN_REFERENCE_RADIUS_KM;
        const rx=extent*Math.hypot(major[0]!,minor[0]!)+2,ry=extent*Math.hypot(major[1]!,minor[1]!)+2;
        const x0=Math.max(0,disc.x-rx),x1=Math.min(width,disc.x+rx);
        const y0=Math.max(0,disc.y-ry),y1=Math.min(height,disc.y+ry);
        if(x0>=x1||y0>=y1)return true;
        try{
          submit(ringProgram,ringBuffer!,[x0,y0,x1,y0,x0,y1,x0,y1,x1,y0,x1,y1],2,gl.TRIANGLES,{
            u_center:[parameters.center.x,parameters.center.y],u_scale:parameters.scale,
            u_right:view.basis.right,u_up:view.basis.up,u_forward:view.basis.forward,
            u_discCenter:[disc.x,disc.y],u_ringMajor:major,u_ringMinor:minor,u_opening:projection.opening,
            u_minorDirection:shape.minorDirection,u_globeRadii:[shape.majorRadiusPx,shape.minorRadiusPx],
            u_majorEnu:projection.majorEnu,u_planeMinorEnu:projection.planeMinorEnu,u_poleEnu:projection.poleEnu,
            u_sunEnu:projection.sunEnu??[0,0,0],u_sunAvailable:projection.sunEnu?1:0,
            u_tint:color(tint),u_shadowTint:color(observationMode?"#4B211D":"#4E473B"),
          });
          if(gl.getError()!==gl.NO_ERROR)throw new Error("sky_gpu_saturn_rings_draw_failed");
          return true;
        }catch{assertAvailable();ringsUnavailable=true;return false;}
      },
      image(source, transform, opacity) {
        assertAvailable(); flush();
        const texture = textures.get(source);
        if (!texture) return false;
        const [a, b, c, d, e, f] = transform;
        const quad: number[] = [];
        for (const [u, v] of [[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]]) {
          const x = u! - 0.5, y = v! - 0.5;
          quad.push(a*x+c*y+e, b*x+d*y+f, u!, v!);
        }
        submit(image, imageBuffer, quad, 4, gl.TRIANGLES, { u_image: texture, u_opacity: opacity });
        return true;
      },
      skyImageMesh(source, triangles, view, opacity) {
        assertAvailable();
        const parameters=skyArtworkViewParameters(view,width,height);
        if(!parameters || !Number.isFinite(opacity) || opacity<0 || opacity>1 ||
          triangles.length%12!==0 || triangles.length>16*16*24 || triangles.some(n=>!Number.isFinite(n)))return false;
        if(!triangles.length || opacity===0)return true;
        if(skyMeshUnavailable)return false;
        flush();
        if(!skyMesh){
          const programCount=programs.length,bufferCount=buffers.length;
          try{
            skyMesh=makeProgram(skyMeshVertex,skyMeshFragment);
            skyMeshBuffer=makeBuffer(4,{a_position:[2,0],a_uv:[2,2]});
          }catch{
            for(const program of programs.splice(programCount))gl.deleteProgram(program.program);
            for(const buffer of buffers.splice(bufferCount))gl.deleteBuffer(buffer);
            skyMesh=null;skyMeshBuffer=null;skyMeshUnavailable=true;
            assertAvailable();return false;
          }
        }
        const texture=textures.get(source);
        if(!texture)return false;
        submit(skyMesh,skyMeshBuffer!,triangles,4,gl.TRIANGLES,{
          u_center:[parameters.center.x,parameters.center.y],u_scale:parameters.scale,
          u_right:view.basis.right,u_up:view.basis.up,u_forward:view.basis.forward,
          u_image:texture,u_opacity:opacity,
        });
        if(gl.getError()!==gl.NO_ERROR)throw new Error("sky_gpu_mesh_draw_failed");
        return true;
      },
      artwork(source, registration, view, opacity, tint, composite = "additive") {
        assertAvailable();
        const parameters = skyArtworkViewParameters(view,width,height);
        if (!parameters || !Number.isFinite(opacity)) return false;
        if (opacity <= 0) return true;
        if (artworkUnavailable) return false;
        flush();
        if (!artwork) {
          const programCount = programs.length, bufferCount = buffers.length;
          try {
            artwork = makeProgram(artworkVertex,artworkFragment);
            artworkBuffer = makeBuffer(2,{a_position:[2,0]});
          } catch {
            for (const program of programs.splice(programCount)) gl.deleteProgram(program.program);
            for (const buffer of buffers.splice(bufferCount)) gl.deleteBuffer(buffer);
            artwork = null; artworkBuffer = null; artworkUnavailable = true;
            assertAvailable();
            return false; // Decorative shader failure keeps valid stars usable.
          }
        }
        const texture = textures.get(source);
        if (!texture) return false;
        const {rows,determinant,anchorU,anchorV} = registration;
        // Constellation art / infrared cutouts add light. Finished optical
        // products instead cover the background, including their black pixels;
        // adding W3 light would change their colors and saturate their cores.
        if (composite === "source-over" || composite === "optical-cutout")
          gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        else gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ZERO,gl.ONE);
        const rasterBounds = skyArtworkRasterBounds(registration,view,width,height,
          gl.drawingBufferWidth,gl.drawingBufferHeight);
        try {
          if (rasterBounds) {
            gl.scissor(rasterBounds.x,rasterBounds.y,rasterBounds.width,rasterBounds.height);
            gl.enable(gl.SCISSOR_TEST);
          }
          submit(artwork,artworkBuffer!,[0,0,width,0,0,height,0,height,width,0,width,height],2,gl.TRIANGLES,{
            u_center:[parameters.center.x,parameters.center.y],u_scale:parameters.scale,
            u_right:view.basis.right,u_up:view.basis.up,u_forward:view.basis.forward,
            u_row0:rows[0],u_row1:rows[1],u_row2:rows[2],u_determinant:determinant,
            u_anchorU:anchorU,u_anchorV:anchorV,u_image:texture,u_opacity:Math.min(1,opacity),u_tint:color(tint),
            u_infraredCutout:composite === "infrared-cutout" ? 1 : 0,
            u_cutoutEdges:composite === "infrared-cutout" || composite === "optical-cutout" ? 1 : 0,
          });
        } finally {
          if (rasterBounds) gl.disable(gl.SCISSOR_TEST);
          gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        }
        return true;
      },
      segments(segments, hex, opacity = 1) {
        use("lines"); const rgb = color(hex);
        for (const [x1,y1,x2,y2] of segments) {
          const length = Math.hypot(x2-x1, y2-y1);
          if (length <= 0) continue;
          const dx = -(y2-y1) / length * 0.5, dy = (x2-x1) / length * 0.5;
          for (const [x,y] of [[x1+dx,y1+dy],[x1-dx,y1-dy],[x2+dx,y2+dy],
            [x2+dx,y2+dy],[x1-dx,y1-dy],[x2-dx,y2-dy]]) vertices.push(x!, y!, ...rgb, opacity);
        }
      },
      disc(x, y, radius, hex, opacity, strokeWidth = 0, profile = "disc") {
        use("points"); vertices.push(x, y, radius, strokeWidth, profile === "star" ? 1 : 0, ...color(hex), opacity);
      },
      finish() {
        assertAvailable(); flush();
        textures.finish();
        // Submission is not physical presentation evidence. Detect native GL
        // failures before the page publishes a usable picking snapshot.
        const error = gl.getError();
        if (error !== gl.NO_ERROR) throw new Error(`sky_gpu_draw_failed:${error}`);
        assertAvailable();
      },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
}
