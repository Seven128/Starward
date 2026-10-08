import { SKY_FULL_SPHERE_DISPLAY_FADE_DEG } from "./sky-landscape-visibility";

/** Shared original illustrative atmosphere/exposure in display RGB.
 * Fixed parameters are not site weather, calibrated radiance or source coverage. */
export const skySolarDisplayShader = `vec3 skySolarDisplay(vec3 ray,vec3 sunDirection,float sunAltitude,vec3 base) {
  const vec3 BETA_R = vec3(5.804543e-6,1.356291e-5,3.026590e-5);
  const vec3 BETA_M = vec3(1.597e-6,2.413e-6,3.541e-6);
  const float PI = 3.141592653589793;


    // Continue the horizon colour smoothly into the below-ground finding
    // chart. This is display adaptation, never underground air mass/scattering.
    float horizonDisplay = smoothstep(-${Math.sin(SKY_FULL_SPHERE_DISPLAY_FADE_DEG*Math.PI/180)},0.0,ray.z);
    if (horizonDisplay <= 0.0) { return base; }
    if (ray.z < 0.0) ray = normalize(vec3(ray.xy,0.0));
    // A restrained chart-only low-sky glow gives the simulated horizon
    // depth at night. It is not measured airglow, light pollution or weather.
    float lowSky = 1.0-smoothstep(0.0,0.45,ray.z);
    float nightWeight = 1.0-smoothstep(-18.0,-9.0,sunAltitude);
    vec3 nightGlow = vec3(0.025,0.025,0.035)*lowSky*nightWeight;
    if (sunAltitude <= -18.0) {
      return base+nightGlow*horizonDisplay;
    }
    float cosine = clamp(ray.z,0.0,1.0);
    float zenithDeg = acos(cosine)*180.0/PI;
    float airMass = 1.0/(cosine+0.15*pow(93.885-zenithDeg,-1.253));
    vec3 extinction = exp(-(BETA_R*8400.0+BETA_M*1250.0)*airMass);
    float scatterCosine = clamp(dot(ray,sunDirection),-1.0,1.0);
    float rayleighPhase = 3.0*(1.0+scatterCosine*scatterCosine)/(16.0*PI);
    float g = 0.8;
    float miePhase = (1.0-g*g)/(4.0*PI*pow(1.0+g*g-2.0*g*scatterCosine,1.5));
    float mieTwilight = smoothstep(-8.0,0.0,sunAltitude);
    vec3 scattering = (BETA_R*rayleighPhase+BETA_M*miePhase*mieTwilight)
      / (BETA_R+BETA_M) * (vec3(1.0)-extinction);
    float sunCosine = max(sunDirection.z,0.0);
    float sunZenithDeg = acos(sunCosine)*180.0/PI;
    float sunAirMass = 1.0/(sunCosine+0.15*pow(93.885-sunZenithDeg,-1.253));
    vec3 sunTransmittance = exp(-(BETA_R*8400.0+BETA_M*1250.0)*sunAirMass);
    // Low sunlight retains its relative spectrum through civil twilight;
    // its strength is already faded by the exact-time twilight curve below.
    float lowSun = 1.0-smoothstep(0.0,20.0,sunAltitude);
    float towardSun = max(scatterCosine,0.0);
    float horizonWeight = 1.0-smoothstep(0.2,0.7,ray.z);
    float sunsetWeight = lowSun*(0.15+0.85*towardSun)*horizonWeight;
    // Half-path relative transmittance supplies a fixed display chromaticity,
    // not measured local sunlight or calibrated radiance.
    vec3 solarChroma = sqrt(sunTransmittance/max(sunTransmittance.r,0.0001));
    // Fixed below-horizon display approximation. Curved Earth shadow gives
    // the depression scale; this is not integrated radiance or local weather.
    // The multiple-path transmittance approximation follows published math:
    // Ozlem, Fast Sky Rendering for Daylight & Twilight (2021), Appendix.
    // https://www.researchgate.net/publication/380396923_Fast_Sky_Rendering_for_Daylight_Twilight
    float duskWeight = 1.0-smoothstep(-6.0,0.0,sunAltitude);
    float depression = clamp(-sunAltitude,0.0,18.0)*PI/180.0;
    float shadowHeightKm = 6371.0*(1.0/cos(depression)-1.0);
    float twilightGradient = exp(-(2.0/3.0)*shadowHeightKm/8.4*ray.z);
    vec3 multiplePath = 2.0/(vec3(2.0)+sqrt(BETA_R*8400.0*airMass*BETA_R*8400.0*75.0));
    // Indirect light has a less saturated spectrum than the direct low-sun
    // tint. These fixed display parameters are not site photometry.
    solarChroma = mix(solarChroma,vec3(1.0),0.23*duskWeight);
    float twilight = pow(smoothstep(-18.0,3.0,sunAltitude),3.0);
    vec3 radiance = 550.0*twilight*scattering*mix(vec3(1.0),solarChroma,sunsetWeight);
    radiance *= mix(vec3(1.0),11.0*twilightGradient*multiplePath,duskWeight);
    // Only the active Mie forward lobe needs near-disc compression. Keeping
    // that daytime compression after sunset erases the visible twilight band.
    float horizonSolar = lowSun*towardSun*horizonWeight;
    float exposure = 0.12*(1.0-0.45*lowSun)*(1.0-0.85*horizonSolar*mieTwilight);
    // The exponential maps linear scattering radiance. Encode its result
    // once for the display, without an unrelated dark-chart channel ceiling.
    // The sRGB transfer is described by W3C CSS Color 4, section 19:
    // https://www.w3.org/TR/css-color-4/#color-conversion-code
    // Exposure and fixed atmosphere remain illustrative, not site photometry.
    vec3 mapped = vec3(1.0)-exp(-exposure*radiance);
    vec3 encoded = mix(12.92*mapped,1.055*pow(mapped,vec3(1.0/2.4))-0.055,
      step(vec3(0.0031308),mapped));
    vec3 sky = base+(vec3(1.0)-base)*encoded+nightGlow;
    return mix(base,sky,horizonDisplay);

}
`;

/** Foreground display light over solid bodies. Keep the original geometric alpha
 * so the unlit disc still occults stars behind it. A failed/missing same-frame
 * solarLight or observation mode supplies no invented atmosphere. */
export const skyBodyDisplayShader = `${skySolarDisplayShader}
uniform vec3 u_solarDisplaySunDirection;
uniform float u_solarDisplaySunAltitude,u_solarDisplayEnabled;
vec3 skyBodyDisplay(vec3 body,vec2 pixel) {
  if(u_solarDisplayEnabled<0.5||u_solarDisplaySunAltitude<=-18.0)return body;
  vec3 foreground=clamp(skySolarDisplay(skyRay(pixel),u_solarDisplaySunDirection,u_solarDisplaySunAltitude,vec3(0.0)),0.0,1.0);
  return body+(vec3(1.0)-body)*foreground;
}
`;
