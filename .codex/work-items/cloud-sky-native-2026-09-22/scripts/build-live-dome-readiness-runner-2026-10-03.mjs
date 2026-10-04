/** Correct numeric camera input and loaded panorama readiness; affected cases only. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));let s=fs.readFileSync(path.join(dir,'experience-live-combination-2026-10-03.mts'),'utf8');
const once=(before,after)=>{assert.equal(s.split(before).length,2,before.slice(0,100));s=s.replace(before,after);};
once('currentGpuExecutor,currentJourneyExecutor,currentHideExecutor','currentGpuExecutor,currentJourneyExecutor:baseJourneyExecutor,currentHideExecutor');
once('/** Isolated current HTTP owners',`const journeySource=baseJourneyExecutor.toString();
const pendingReadiness='w.counters().decodedPending === 0 && true';
if(journeySource.split(pendingReadiness).length!==2)throw Error('task readiness wait source mismatch');
const currentJourneyExecutor=Function('return ('+journeySource.replace(pendingReadiness,'w.counters().decodedPending === 0 && (!result.landscapeImage.panorama || result.landscapeImage.opacity >= 1)')+')')();
/** Isolated current HTTP owners`);
const begin=s.indexOf(' const conditions=['),end=s.indexOf(" save('conditions.json'",begin);assert(begin>0&&end>begin);
s=s.slice(0,begin)+` const conditions=[{name:'live-corrected-full-sphere',pose:[0,80,0],fov:'DOME',reference:null},
  {name:'live-settled-landscape-return',pose:[0,135,0],fov:45,reference:null}];
`+s.slice(end);
once('const row=await page.evaluate(currentJourneyExecutor,{condition});',`const resolvedCondition=condition.fov==='DOME'?{...condition,fov:await page.evaluate(()=>globalThis.fullHookProbe.skyDomeFieldOfView(390,844,globalThis.fullHookProbe.NO_SKY_INSETS))}:condition;
  const row=await page.evaluate(currentJourneyExecutor,{condition:resolvedCondition});
  if(condition.fov==='DOME')assert.equal(row.passes.at(-1).actualPaintCamera.fov,resolvedCondition.fov);`);
once("return {landscape:landscape?{kind:landscape.kind,opacity:landscape.opacity??1}:null,tracking:","return {readiness:w.lastPageResult.landscapeImage.opacity,landscape:landscape?{kind:landscape.kind,opacity:landscape.opacity??null,background:landscape.background?{kind:landscape.background.kind,opacity:landscape.background.opacity}:null,foreground:landscape.foreground?{kind:landscape.foreground.kind,opacity:landscape.foreground.opacity}:null}:null,tracking:");
once("status:'LIVE_CURRENT_API_COMBINATION_DEVELOPMENT'","status:'LIVE_NUMERIC_DOME_AND_SETTLED_READINESS_DEVELOPMENT'");
fs.writeFileSync(path.join(dir,'experience-live-dome-readiness-2026-10-03.mts'),s,{flag:'wx'});
console.log(JSON.stringify({generated:'experience-live-dome-readiness-2026-10-03.mts',productionChanged:false}));
