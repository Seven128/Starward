import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { hash, crc32 } from '../scripts/resource-utils.mjs';
export const json = (file,value) => fs.writeFile(file,JSON.stringify(value,null,2));
export function png(width=390,height=844) {
  const chunk = (kind,body) => {
    const data=Buffer.concat([Buffer.from(kind),body]), output=Buffer.alloc(body.length+12);
    output.writeUInt32BE(body.length); data.copy(output,4); output.writeUInt32BE(crc32(data),output.length-4); return output;
  };
  const header=Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height,4); header[8]=8; header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((width*4+1)*height))),chunk('IEND',Buffer.alloc(0))]);
}
export async function fixture(t) {
  const repo=await fs.mkdtemp(path.join(os.tmpdir(),'starward-resource-test-'));
  t.after(()=>fs.rm(repo,{recursive:true,force:true}));
  const dir=path.join(repo,'run'); await fs.mkdir(dir);
  await fs.writeFile(path.join(repo,'owner.ts'),'export const owner = true;');
  const run={schema:1,runId:'fixture',repository:repo,researchHead:'a'.repeat(40),executionHead:'b'.repeat(40),startedAt:new Date().toISOString(),model:{id:'unknown',effort:'unknown',source:'unit fixture, never real evidence'},versions:{codex:'fixture',node:process.version,runtime:'fixture'},runtime:{path:'unit-fixture',status:'unverified',fileKey:'fixture-file'},usage:{inputTokens:null,outputTokens:null,reason:'not model execution'},sourceFiles:[{path:'owner.ts',sha256:hash(await fs.readFile(path.join(repo,'owner.ts')))}],failures:[],manualInterventions:null};
  await json(path.join(dir,'run.json'),run);
  await json(path.join(dir,'requirements.json'),{rules:[{page:'map',controls:['map-search-entry']},{page:'my',controls:['my-plan-entry']}]});
  const resources={schema:1,assets:[],boards:[]};
  for (const page of ['map','my']) {
    const id=`fixture-${page}`, control=page === 'map' ? 'map-search-entry' : 'my-plan-entry';
    const tree={schema:1,origin:'figma-plugin-api',fileKey:'fixture-file',revision:'r0',capturedAt:new Date().toISOString(),root:{id,type:'FRAME',width:390,height:844,visible:true,children:[{id:`${id}-control`,type:'FRAME',width:100,height:44,visible:true,controlKey:control,children:[{id:`${id}-text`,type:'TEXT',width:100,height:22,visible:true,characters:'中文文案',fontName:{family:'Noto Sans SC',style:'Regular'},fontSize:15}]}]}};
    const picture=png(); await fs.writeFile(path.join(dir,`${id}.png`),picture); await json(path.join(dir,`${id}.json`),tree);
    resources.boards.push({id,candidateId:'group-B-private',page,state:page === 'map' ? 'medium' : 'normal',mode:'day',width:390,height:844,scale:1,round:0,revision:'r0',fileKey:'fixture-file',nodeId:id,screenshot:{path:`${id}.png`,sha256:hash(picture),revision:'r0'},snapshot:{path:`${id}.json`,sha256:hash(await fs.readFile(path.join(dir,`${id}.json`))),revision:'r0'},controls:[control],assetIds:[],codeOwners:['owner.ts']});
  }
  const save=()=>json(path.join(dir,'resources.json'),resources); await save();
  const updateTree=async (page,fn)=>{ const b=resources.boards.find(b=>b.page===page), file=path.join(dir,b.snapshot.path); const tree=JSON.parse(await fs.readFile(file)); fn(tree); await json(file,tree); b.snapshot.sha256=hash(await fs.readFile(file)); await save(); };
  return {repo,dir,run,resources,save,updateTree};
}
