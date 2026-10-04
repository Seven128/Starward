import { SKY_LANDSCAPE_EYE_HEIGHT, SKY_LANDSCAPE_MAXIMUM_Z, SKY_LANDSCAPE_SOLIDS,
  SKY_LANDSCAPE_CANOPIES, SKY_LANDSCAPE_CANOPY_LOBES, SKY_LANDSCAPE_CANOPY_INNER_RADIUS,
  SKY_LANDSCAPE_CANOPY_OUTER_RADIUS } from "./sky-landscape-geometry";
import type { SkyVector } from "./sky-view-projection";

const glslFloat = (value: number) => Number.isInteger(value) ? `${value}.0` : String(value);
const glslVector = (value: SkyVector) => `vec3(${value.map(glslFloat).join(",")})`;

// Both landscape consumers follow the same exact-frame daylight/ambient curve.
// These fixed display levels preserve a faint night foreground; they do not
// estimate site weather, moonlight or the photograph's original illumination.
const landscapeLighting = `
  float landscapeDaylight(float solarAltitude) {
    return smoothstep(-6.0,6.0,solarAltitude);
  }
  float landscapeAmbient(float solarAltitude) {
    return 0.03+0.10*smoothstep(-12.0,0.0,solarAltitude);
  }`;

/** The same world ray and transparent pixels as the completed CPU mask. */
export function skyLandscapePanoramaFragment(skyRay: string): string {
  return `precision highp float;
  varying vec2 v_pixel;
  ${skyRay}
  uniform sampler2D u_image;
  uniform vec2 u_imageSize;
  uniform float u_seam, u_sunAltitude, u_observationMode, u_opacity;
  ${landscapeLighting}
  void main() {
    vec3 ray=normalize(skyRay(v_pixel));
    float u=fract(atan(ray.x,ray.y)/6.283185307179586-u_seam);
    float v=0.5-asin(clamp(ray.z,-1.0,1.0))/3.141592653589793;
    vec4 material=texture2D(u_image,vec2(u,v));
    // Shared textures retain CLAMP_TO_EDGE. Join the first/last texel manually,
    // avoiding another upload/sampler owner and preserving all other consumers.
    float pixel=u*u_imageSize.x-0.5;
    if(pixel<0.0 || pixel>u_imageSize.x-1.0) {
      vec4 last=texture2D(u_image,vec2(1.0-0.5/u_imageSize.x,v));
      vec4 first=texture2D(u_image,vec2(0.5/u_imageSize.x,v));
      material=mix(last,first,pixel<0.0?pixel+1.0:pixel-u_imageSize.x+1.0);
    }
    if(material.a<=0.0) discard;
    float daylight=landscapeDaylight(u_sunAltitude);
    // The fixed photograph cannot acquire new directional shadows. Apply the
    // shared time-dependent ambient/display exposure without altering alpha.
    vec3 result=material.rgb*(landscapeAmbient(u_sunAltitude)+0.87*daylight);
    if(u_observationMode>0.5) result=vec3(0.005+0.045*dot(material.rgb,vec3(0.2126,0.7152,0.0722)),0.0,0.0);
    gl_FragColor=vec4(result,material.a*u_opacity);
  }`;
}

/** Shading for the original shared virtual scene; no site measurements. */
export function skyLandscapeFragment(skyRay: string): string {
  const solidIntersections = SKY_LANDSCAPE_SOLIDS.map(({ center, radii, material, axis, cosineBound }) => `
    if(dot(ray,${glslVector(axis)})>=${glslFloat(cosineBound)})
      intersectSolid(ray,${glslVector(center)},${glslVector(radii)},${glslFloat(material)},travel,normal,surface);`).join("");
  const canopyIntersections = SKY_LANDSCAPE_CANOPIES.map(({ center, normal, right, halfWidth, halfHeight, axis, cosineBound }) => `
    if(dot(ray,${glslVector(axis)})>=${glslFloat(cosineBound)})
      intersectCanopy(ray,${glslVector(center)},${glslVector(normal)},${glslVector(right)},
        vec2(${glslFloat(halfWidth)},${glslFloat(halfHeight)}),travel,normal,surface);`).join("");
  const canopyOutline = SKY_LANDSCAPE_CANOPY_LOBES.map(({ amplitude, frequency, phase }) =>
    `${glslFloat(amplitude)}*sin(${glslFloat(frequency)}*angle+${glslFloat(phase)})`).join("+");
  return `
  precision highp float;
  varying vec2 v_pixel;
  ${skyRay}
  uniform vec3 u_sunDirection, u_base;
  uniform float u_sunAltitude, u_observationMode, u_opacity;
  ${landscapeLighting}
  float groundHash(vec2 cell) {
    return fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
  }
  float groundNoise(vec2 point) {
    vec2 cell=floor(point), f=fract(point);
    f=f*f*(3.0-2.0*f);
    return mix(mix(groundHash(cell),groundHash(cell+vec2(1.0,0.0)),f.x),
      mix(groundHash(cell+vec2(0.0,1.0)),groundHash(cell+vec2(1.0,1.0)),f.x),f.y);
  }
  void intersectSolid(vec3 ray,vec3 center,vec3 radii,float material,
    inout float nearest,inout vec3 normal,inout float surface) {
    vec3 offset=(vec3(0.0,0.0,${glslFloat(SKY_LANDSCAPE_EYE_HEIGHT)})-center)/radii;
    vec3 direction=ray/radii;
    float a=dot(direction,direction), b=dot(offset,direction);
    float discriminant=b*b-a*(dot(offset,offset)-1.0);
    if(discriminant<0.0) return;
    float distance=(-b-sqrt(discriminant))/a;
    if(distance<=0.0 || distance>=nearest) return;
    nearest=distance;
    vec3 hit=vec3(0.0,0.0,${glslFloat(SKY_LANDSCAPE_EYE_HEIGHT)})+ray*distance;
    normal=normalize((hit-center)/(radii*radii));
    surface=material;
  }
  void intersectCanopy(vec3 ray,vec3 center,vec3 facingNormal,vec3 right,vec2 halfSize,
    inout float nearest,inout vec3 normal,inout float surface) {
    float facing=dot(ray,facingNormal);
    if(facing>=0.0) return;
    float distance=dot(center,facingNormal)/facing;
    if(distance>=nearest) return;
    vec3 hit=vec3(0.0,0.0,${glslFloat(SKY_LANDSCAPE_EYE_HEIGHT)})+ray*distance;
    vec2 point=vec2(dot(hit-center,right),(hit-center).z)/halfSize;
    float radius=length(point);
    if(radius>${glslFloat(SKY_LANDSCAPE_CANOPY_OUTER_RADIUS)}) return;
    if(radius>${glslFloat(SKY_LANDSCAPE_CANOPY_INNER_RADIUS)}) {
      float angle=atan(point.y,point.x);
      float outline=1.0+${canopyOutline};
      if(radius>outline) return;
    }
    nearest=distance;
    // A bounded display normal gives the original cutout some crown volume;
    // it does not change its plane intersection or imply site photometry.
    normal=normalize(facingNormal+0.6*right*point.x+vec3(0.0,0.0,0.6*point.y));
    surface=3.0;
  }
  void main() {
    vec3 ray=skyRay(v_pixel);
    if(ray.z>${glslFloat(SKY_LANDSCAPE_MAXIMUM_Z)}) discard;
    float travel=1.0e20, surface=0.0;
    vec3 normal=vec3(0.0,0.0,1.0);
    if(ray.z<0.0) travel=${glslFloat(SKY_LANDSCAPE_EYE_HEIGHT)}/(-ray.z);
    ${solidIntersections}
    ${canopyIntersections}
    if(travel>=1.0e20) discard;
    vec3 hit=vec3(0.0,0.0,${glslFloat(SKY_LANDSCAPE_EYE_HEIGHT)})+ray*travel;
    // Bound texture frequencies, not the actual geometry distance. All
    // surfaces stay attached to the world while the camera pans and zooms.
    vec2 ground=ray.xy*min(travel,600.0);
    float distanceToEye=length(hit.xy);
    float broad=groundNoise(ground*0.12);
    float detailFade=1.0-smoothstep(8.0,45.0,distanceToEye);
    float detail=mix(0.5,groundNoise(ground*2.4),detailFade);
    float fineFade=1.0-smoothstep(2.0,12.0,distanceToEye);
    float fine=mix(0.5,groundNoise(ground*12.0),fineFade);
    vec3 albedo=mix(vec3(0.17,0.22,0.075),vec3(0.25,0.34,0.115),broad)
      *(0.75+0.36*detail+0.12*fine);
    if(surface<0.5) {
      normal=normalize(vec3(0.08*cos(ground.x*0.12),0.08*sin(ground.y*0.12),1.0));
    } else if(surface<1.5) {
      albedo*=vec3(0.8,0.87,0.95);
    } else if(surface<2.5) {
      albedo=vec3(0.21,0.14,0.075)*(0.75+0.25*groundNoise(hit.xz*3.0));
    } else {
      float foliage=groundNoise(hit.xy*1.1+hit.z*0.7);
      albedo=mix(vec3(0.065,0.12,0.04),vec3(0.13,0.21,0.055),foliage);
    }
    float daylight=landscapeDaylight(u_sunAltitude);
    float direct=max(dot(normal,u_sunDirection),0.0)*smoothstep(-1.0,2.0,u_sunAltitude);
    float ambient=landscapeAmbient(u_sunAltitude);
    vec3 meadow=albedo*(ambient+0.21*daylight+0.66*direct);
    float lowSun=1.0-smoothstep(0.0,18.0,u_sunAltitude);
    float towardSun=max(dot(normalize(vec3(ray.xy,0.001)),u_sunDirection),0.0);
    vec3 haze=u_base+daylight*mix(vec3(0.07,0.12,0.16),vec3(0.19,0.10,0.04),lowSun*towardSun);
    float hazeAmount=smoothstep(18.0,400.0,distanceToEye)*0.88;
    vec3 result=mix(meadow,haze,hazeAmount);
    if(u_observationMode>0.5) {
      // Red-light rendering has no hidden blue/white transition or day texture.
      result=vec3((0.007+0.010*broad)*(1.0-0.55*hazeAmount),0.0,0.0);
    }
    gl_FragColor=vec4(result,u_opacity);
  }`;
}
