import fs from 'node:fs/promises';
import path from 'node:path';
import {hash} from '../../../../../.agents/skills/starward-design-resource/scripts/resource-utils.mjs';
const task=path.resolve(import.meta.dirname,'..'),experiment=Number(process.argv[2]);if(![2,3,4].includes(experiment))throw Error('expected trial 2, 3 or 4');
const dir=path.join(task,'experiment-'+experiment),baseRun=JSON.parse(await fs.readFile(path.join(task,'run.json'),'utf8'));
await fs.mkdir(path.join(dir,'shared-assets'),{recursive:true});await fs.copyFile(path.join(task,'assets/osm-reference.png'),path.join(dir,'shared-assets/osm-reference.png'));
await fs.cp(path.join(task,'assets/icons'),path.join(dir,'shared-assets/icons'),{recursive:true});
await fs.copyFile(path.join(task,'retests/v2/frozen/brief.md'),path.join(dir,'brief.md'));await fs.copyFile(path.join(task,'requirements.json'),path.join(dir,'requirements.json'));
const sourceFiles=[...baseRun.sourceFiles];
for(const entry of await fs.readdir(path.join(task,'retests/v2/frozen'),{recursive:true,withFileTypes:true}))if(entry.isFile()){const f=path.join(entry.parentPath,entry.name);sourceFiles.push({path:path.relative(baseRun.repository,f).replaceAll('\\','/'),sha256:hash(await fs.readFile(f))});}
const run={schema:1,runId:'20260907-retest-'+experiment,repository:baseRun.repository,researchHead:baseRun.researchHead,executionHead:baseRun.executionHead,startedAt:new Date().toISOString(),model:baseRun.model,modelPolicy:baseRun.modelPolicy,versions:baseRun.versions,runtime:baseRun.runtime,sourceFiles,failures:[],manualInterventions:0,usage:{inputTokens:null,outputTokens:null,reason:'No reliable independent experiment token/billing attribution from host.'},adoption:'unselected',production:'unchanged',trial:experiment};
try{const old=JSON.parse(await fs.readFile(path.join(dir,'run.json'),'utf8'));run.startedAt=old.startedAt;run.failures=old.failures;}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.writeFile(path.join(dir,'run.json'),JSON.stringify(run,null,2)+'\n');
const assets=JSON.parse(await fs.readFile(path.join(task,'assets/icon-sources.json'),'utf8')).map(a=>({...a,path:a.path.replace(/^assets\//,'shared-assets/')}));assets.push({id:'osm-reference',path:'shared-assets/osm-reference.png',sha256:hash(await fs.readFile(path.join(dir,'shared-assets/osm-reference.png'))),source:'Same actual OSM capture as experiment 1; fixed fixture, not WEAPP',license:'OpenStreetMap contributors / ODbL; https://www.openstreetmap.org/copyright'});
const resources={schema:1,assets,boards:[],notices:[{text:'固定任务示例，非实时天气或真实个人资料；地图为公开OSM参考截图，未验证当前微信原生地图。'},{text:'地图 © OpenStreetMap贡献者，ODbL。',href:'https://www.openstreetmap.org/copyright'}]};
for(const group of ['A','B'])for(const folder of (await fs.readdir(path.join(dir,group))).filter(n=>/^round-[012](?:-technical-\d+)?$/.test(n)).sort()){
const location=path.join(dir,group,folder);let boards;try{boards=JSON.parse(await fs.readFile(path.join(location,'boards.json'),'utf8'));}catch(e){if(e.code==='ENOENT')continue;throw e;}
for(const b of boards){const {fingerprint,...board}=b;const ref=async ext=>{const f=path.join(location,b.id+ext);return{path:path.relative(dir,f).replaceAll('\\','/'),sha256:hash(await fs.readFile(f)),revision:b.revision};};resources.boards.push({...board,id:b.id+'-'+folder,screenshot:await ref('.png'),snapshot:await ref('.json'),assetIds:b.page==='map'?['osm-reference']:[],codeOwners:b.page==='map'?['apps/wechat-miniapp/src/pages/map/index.tsx','apps/wechat-miniapp/src/pages/map/spot-panel.tsx']:['apps/wechat-miniapp/src/features/my/my-library-page.tsx']});}}
await fs.writeFile(path.join(dir,'resources.json'),JSON.stringify(resources,null,2)+'\n');console.log(`Trial ${experiment}: ${resources.boards.length} actual exports indexed`);
