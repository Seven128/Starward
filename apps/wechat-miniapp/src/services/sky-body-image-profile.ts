import type {BodyImageKind} from "@starward/miniapp-contracts";

/** Instance identity/content only. Resource state and interactions live in shared consumers. */
export const SKY_BODY_IMAGE_PROFILES={
  moon:{kind:'moon',reference:'SOLAR:MOON',body:'MOON',label:'月面影像',id:'moon:uv750:coverage-v2',queryKey:["moon-texture-manifest","coverage-v2"],style:'surface',fallback:'月相和月球位置仍可查看'},
  mars:{kind:'mars',reference:'PLANET:MARS',body:'MARS',label:'火星表面影像',id:'mars:mdim21',queryKey:["mars-texture-manifest"],style:'surface',fallback:'火星位置和相位仍可查看'},
  mercury:{kind:'mercury',reference:'PLANET:MERCURY',body:'MERCURY',label:'水星表面影像',id:'mercury:messenger-2013',queryKey:["mercury-texture-manifest"],style:'surface',fallback:'水星位置和相位仍可查看'},
  jupiter:{kind:'jupiter',reference:'PLANET:JUPITER',body:'JUPITER',label:'木星历史云带',id:'jupiter:opal-2024c-bands',queryKey:["jupiter-bands-manifest"],style:'bands',fallback:'木星位置、扁球轮廓和相位仍可查看'},
  saturn:{kind:'saturn',reference:'PLANET:SATURN',body:'SATURN',label:'土星历史云带',id:'saturn:opal-2025a-bands',queryKey:["saturn-bands-manifest"],style:'bands',fallback:'土星位置、环与相位仍可查看'},
  uranus:{kind:'uranus',reference:'PLANET:URANUS',body:'URANUS',label:'天王星历史云带',id:'uranus:opal-2025a-bands',queryKey:["uranus-bands-manifest"],style:'bands',fallback:'天王星位置、扁球轮廓和相位仍可查看'},
  neptune:{kind:'neptune',reference:'PLANET:NEPTUNE',body:'NEPTUNE',label:'海王星历史云带',id:'neptune:opal-2025b-bands',queryKey:["neptune-bands-manifest"],style:'bands',fallback:'海王星位置、扁球轮廓和相位仍可查看'},
} as const satisfies Record<BodyImageKind,unknown>;
export type SkyBodyImageProfile=typeof SKY_BODY_IMAGE_PROFILES[BodyImageKind];
export type SkyBodyImageReference=SkyBodyImageProfile['reference'];
export function skyBodyImageProfile(reference:string):SkyBodyImageProfile|undefined {
  return Object.values(SKY_BODY_IMAGE_PROFILES).find(profile=>profile.reference===reference);
}
