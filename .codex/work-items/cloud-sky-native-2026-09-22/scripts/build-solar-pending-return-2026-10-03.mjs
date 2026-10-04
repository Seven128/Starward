/** Repair only task restoration submission; preserve completed solar lane. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));let s=fs.readFileSync(path.join(dir,'experience-solar-pending-page-2026-10-03.mts'),'utf8').replaceAll('\r','');
const once=(before,after)=>{assert.equal(s.split(before).length,2,before);s=s.replace(before,after);};
once('w.lifecycle.show();commit();',"w.lifecycle.show();commit();submit('pending-hide-return-before-ready');commit();");
once('w.counters().decodedPending === 0 && (!result.landscapeImage.panorama', 'w.counters().decodedPending === 0 && Boolean(result.moonTexture.image) && (!result.landscapeImage.panorama');
const start=s.indexOf(' const conditions=['),end=s.indexOf(' const sceneRows:',start);assert(start>0&&end>start);
s=s.slice(0,start)+` const conditions=[{name:'solar-moon-pending-return-corrected',manualPan:true,body:'MOON',fov:1,reference:null,pendingHide:true}];
 save('conditions.json',{conditions,scope:'One affected task resume-before-ready submission and positive actual Moon image readiness. Prior r13 first pending-return Moon0 retained; no seven-planet/solar matrix replay or source rebuilding.'});
`+s.slice(end);
once("status:'LIVE_SOLAR_AND_PENDING_PAGE_SINGLE_OWNER_DEVELOPMENT'","status:'LIVE_PENDING_RETURN_MOON_IMAGE_POSITIVE_DEVELOPMENT'");
fs.writeFileSync(path.join(dir,'experience-solar-pending-return-2026-10-03.mts'),s,{flag:'wx'});
console.log(JSON.stringify({generated:'experience-solar-pending-return-2026-10-03.mts',productionChanged:false,conditions:1}));
