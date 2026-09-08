import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {projectGaiaDr3SkyFrame,projectGaiaDr3Star} from '../../../../../../packages/astronomy-core/src/gaia-catalog-projection.ts';
import {Body,Equator,Horizon,Observer} from '../../../../../../packages/astronomy-core/src/astronomy-engine-runtime.ts';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../../../..'),require=createRequire(import.meta.url),ts=require(path.join(root,'node_modules/typescript'));
const observer={latitude:22.6,longitude:114.5,elevationM:30};
// Existing test astrometry, used as an explicitly documented named-target fixture.
const vega={sourceId:'fixture-vega',raDeg:279.23473479,decDeg:38.78368896,pmRaMasYr:200.94,pmDecMasYr:286.23,refEpoch:2016,gMag:.03,bpRp:0};
const days=[];
for(let d=0;d<2;d++){const date=`2026-09-${String(9+d).padStart(2,'0')}`,hours=[];for(let i=0;i<25;i++){const at=new Date(Date.parse(date+'T18:00:00+08:00')+i*1800000),frame=projectGaiaDr3SkyFrame({at,observer});const v=projectGaiaDr3Star(vega,{at,observer});const targets=[{id:'vega',name:'织女星',kind:'恒星',...v}];for(const [body,name]of [[Body.Saturn,'土星'],[Body.Moon,'月亮']]){const o=new Observer(observer.latitude,observer.longitude,observer.elevationM),eq=Equator(body,at,o,true,true),h=Horizon(at,o,eq.ra,eq.dec);targets.push({id:body,name,kind:body===Body.Moon?'月球':'行星',azimuthDeg:h.azimuth,altitudeDeg:h.altitude});}hours.push({at:at.toLocaleTimeString('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit'}),instant:at.toISOString(),next:i>=12,localDate:new Date(at.getTime()+8*3600000).toISOString().slice(0,10),stars:frame.stars.filter(s=>s.altitudeDeg>0).map(s=>[+s.azimuthDeg.toFixed(5),+s.altitudeDeg.toFixed(5),s.gMag,s.bpRp]),targets});}days.push({date,hours});}
fs.writeFileSync(path.join(here,'preview/scene.json'),JSON.stringify({observer,catalog:'gaia-dr3-bright-stars.v1',algorithm:'existing astronomy-core projection; no refraction',targetFixture:'Vega astrometry from existing gaia-catalog.test.ts; planets Astronomy Engine',days}));
const camera=fs.readFileSync(path.join(root,'apps/wechat-miniapp/src/features/sky/sky-view-projection.ts'),'utf8');fs.writeFileSync(path.join(here,'preview/camera.mjs'),ts.transpileModule(camera,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
console.log('Generated '+days.reduce((n,d)=>n+d.hours.length,0)+' deterministic scene slices');
