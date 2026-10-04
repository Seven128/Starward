/** Only material-intersecting steady views; reuse repaired native/readiness ports. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));let s=fs.readFileSync(path.join(dir,'experience-live-dome-readiness-2026-10-03.mts'),'utf8');
const once=(before,after)=>{assert.equal(s.split(before).length,2,before.slice(0,80));s=s.replace(before,after);};
once('current-execution-state-2026-10-03-r43.json','current-execution-state-2026-10-03-r44.json');
const begin=s.indexOf(' const conditions=['),end=s.indexOf(" save('conditions.json'",begin);assert(begin>0&&end>begin);
s=s.slice(0,begin)+` const conditions=[
 {name:'live-material-upper',pose:[0,105,0],fov:85,reference:null},
 {name:'live-material-centre',pose:[0,90,0],fov:85,reference:null},
 {name:'live-material-below',pose:[0,80,0],fov:85,reference:null},
 {name:'live-material-return',pose:[0,105,0],fov:85,reference:null}];
`+s.slice(end);
once("status:'LIVE_NUMERIC_DOME_AND_SETTLED_READINESS_DEVELOPMENT'","status:'LIVE_INTERSECTING_MATERIAL_FADE_RETURN_DEVELOPMENT'");
fs.writeFileSync(path.join(dir,'experience-live-material-fade-2026-10-03.mts'),s,{flag:'wx'});
console.log(JSON.stringify({generated:'experience-live-material-fade-2026-10-03.mts',productionChanged:false}));
