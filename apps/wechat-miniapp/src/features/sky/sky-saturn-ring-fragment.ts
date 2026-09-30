import {SATURN_BANDS,SATURN_REFERENCE_RADIUS_KM,SATURN_EQUATORIAL_RADIUS_KM,
  SATURN_POLAR_RADIUS_KM} from "./sky-saturn-rings";

/** One fragment per ring pixel avoids overlapping radial strokes and chord joints.
 * The same published radii, observer projection and Sun frame drive picking/fallback. */
export function saturnRingFragment(skyRay: string): string {
  return `
  precision highp float;
  varying vec2 v_pixel;
  ${skyRay}
  uniform vec2 u_discCenter,u_ringMajor,u_ringMinor,u_minorDirection;
  uniform vec2 u_globeRadii;
  uniform float u_opening,u_pixelRatio,u_sunAvailable;
  uniform vec3 u_majorEnu,u_planeMinorEnu,u_poleEnu,u_sunEnu,u_tint,u_shadowTint;
  void main(){
    if(skyRay(v_pixel).z<0.0)discard;
    vec2 delta=v_pixel-u_discCenter;
    float determinant=u_ringMajor.x*u_ringMinor.y-u_ringMajor.y*u_ringMinor.x;
    vec2 q=vec2(delta.x*u_ringMinor.y-delta.y*u_ringMinor.x,
      u_ringMajor.x*delta.y-u_ringMajor.y*delta.x)/determinant;
    float radial=length(q);
    float radius=radial*${SATURN_REFERENCE_RADIUS_KM.toFixed(1)};
    vec2 gradient=vec2(q.x*u_ringMinor.y-q.y*u_ringMajor.y,
      -q.x*u_ringMinor.x+q.y*u_ringMajor.x)/(max(radial,0.00001)*determinant);
    float edge=max(1.0,length(gradient)*${SATURN_REFERENCE_RADIUS_KM.toFixed(1)}*0.6/u_pixelRatio);
    float opacity=0.0;
    ${SATURN_BANDS.map(({innerKm,outerKm,opacity})=>`
    opacity=max(opacity,${opacity.toFixed(3)}*smoothstep(${innerKm.toFixed(1)}-edge,${innerKm.toFixed(1)}+edge,radius)
      *(1.0-smoothstep(${outerKm.toFixed(1)}-edge,${outerKm.toFixed(1)}+edge,radius)));`).join("\n")}
    if(opacity<=0.0)discard;
    vec2 majorDirection=vec2(-u_minorDirection.y,u_minorDirection.x);
    vec2 globe=vec2(dot(delta,majorDirection),dot(delta,u_minorDirection))/u_globeRadii;
    if(q.y*sign(u_opening)>=0.0&&dot(globe,globe)<1.0)discard;
    vec3 point=(u_majorEnu*q.x+u_planeMinorEnu*q.y)*${(SATURN_REFERENCE_RADIUS_KM/SATURN_EQUATORIAL_RADIUS_KM).toFixed(9)};
    float k=${((SATURN_EQUATORIAL_RADIUS_KM/SATURN_POLAR_RADIUS_KM)**2-1).toFixed(9)};
    float sp=dot(u_sunEnu,u_poleEnu), pp=dot(point,u_poleEnu);
    float qa=dot(u_sunEnu,u_sunEnu)+k*sp*sp;
    float qb=dot(point,u_sunEnu)+k*pp*sp;
    float qc=dot(point,point)+k*pp*pp-1.0;
    bool shadow=u_sunAvailable>0.5&&qb<0.0&&qc>0.0&&qb*qb>=qa*qc;
    gl_FragColor=vec4(shadow?u_shadowTint:u_tint,opacity);
  }`;
}
