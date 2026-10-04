import { SKY_LANDSCAPE_EYE_HEIGHT, SKY_LANDSCAPE_MAXIMUM_Z, SKY_LANDSCAPE_SOLIDS } from "./sky-landscape-geometry";
import type { SkyVector } from "./sky-view-projection";

const glslFloat = (value: number) => Number.isInteger(value) ? `${value}.0` : String(value);
const glslVector = (value: SkyVector) => `vec3(${value.map(glslFloat).join(",")})`;

/** Shading for the original shared virtual scene; no site measurements. */
export function skyLandscapeFragment(skyRay: string): string {
  const solidIntersections = SKY_LANDSCAPE_SOLIDS.map(({ center, radii, material, axis, cosineBound }) => `
    if(dot(ray,${glslVector(axis)})>=${glslFloat(cosineBound)})
      intersectSolid(ray,${glslVector(center)},${glslVector(radii)},${glslFloat(material)},travel,normal,surface);`).join("");
  return `
  precision highp float;
  varying vec2 v_pixel;
  ${skyRay}
  uniform vec3 u_sunDirection, u_base;
  uniform float u_sunAltitude, u_observationMode;
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
  void main() {
    vec3 ray=skyRay(v_pixel);
    if(ray.z>${glslFloat(SKY_LANDSCAPE_MAXIMUM_Z)}) discard;
    float travel=1.0e20, surface=0.0;
    vec3 normal=vec3(0.0,0.0,1.0);
    if(ray.z<0.0) travel=${glslFloat(SKY_LANDSCAPE_EYE_HEIGHT)}/(-ray.z);
    ${solidIntersections}
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
    float daylight=smoothstep(-18.0,2.0,u_sunAltitude);
    float direct=max(dot(normal,u_sunDirection),0.0)*smoothstep(-1.0,2.0,u_sunAltitude);
    // Display exposure keeps a recognizable foreground in the night chart;
    // this ambient floor is not a claim of moonlight or measured luminance.
    float ambient=mix(0.30,0.12,daylight);
    vec3 meadow=albedo*(ambient+0.22*daylight+0.68*direct);
    float lowSun=1.0-smoothstep(0.0,18.0,u_sunAltitude);
    float towardSun=max(dot(normalize(vec3(ray.xy,0.001)),u_sunDirection),0.0);
    vec3 haze=u_base+daylight*mix(vec3(0.07,0.12,0.16),vec3(0.19,0.10,0.04),lowSun*towardSun);
    float hazeAmount=smoothstep(18.0,400.0,distanceToEye)*0.88;
    vec3 result=mix(meadow,haze,hazeAmount);
    if(u_observationMode>0.5) {
      // Red-light rendering has no hidden blue/white transition or day texture.
      result=vec3((0.007+0.010*broad)*(1.0-0.55*hazeAmount),0.0,0.0);
    }
    gl_FragColor=vec4(result,1.0);
  }`;
}
