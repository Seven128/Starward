// Current actual observation + current original TAN/ray/UV owners. Nominal only.
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {registerSkyTanOpticalField} from '../../../../apps/wechat-miniapp/src/features/sky/sky-tan-optical-registration.ts';
import {unprojectSkyPoint} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {skyArtworkUvAtDirection} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const lane='output/playwright/cloud-sky-prepared-boundary-medium-1004-r1',out=path.join(root,'output/prepared-boundary-geometry-1004-r1');
const load=async(p:string)=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const bind=async(p:string)=>{const b=await readFile(path.join(root,p));return {path:p,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
const files=[lane+'/boundary-observation.json',lane+'/boundary-comparisons.json','output/hubble-m82-prepared-publication-1004-r2/manifest.json',
 'apps/wechat-miniapp/src/features/sky/sky-tan-optical-registration.ts','apps/wechat-miniapp/src/features/sky/sky-view-projection.ts',
 'apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts','apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts',
 path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/')];
const before=await Promise.all(files.map(bind)),observation=await load(files[0]),comparison=await load(files[1]),pub=await load(files[2]);
assert.equal(observation.at,comparison.at);const {view}=comparison,width=390,height=844;
const f=registerSkyTanOpticalField(pub,pub.levels.DETAIL,observation),c=registerSkyTanOpticalField(pub,pub.levels.MEDIUM,observation);assert(f&&c);
const mask=new Uint8Array(width*height),fineUvs=new Float64Array(width*height*2),coarseUvs=new Float64Array(width*height*2);
const inside=(uv:readonly number[])=>uv[0]>=0&&uv[0]<=1&&uv[1]>=0&&uv[1]<=1;
const counts=[0,0,0,0];
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const d=unprojectSkyPoint(x+.5,y+.5,view.basis,width,height,view.verticalFovDeg,view.center)!;
 const fu=skyArtworkUvAtDirection(f,d)!,cu=skyArtworkUvAtDirection(c,d)!;const index=y*width+x;
 fineUvs.set(fu,index*2);coarseUvs.set(cu,index*2);mask[index]=(inside(fu)?2:0)+(inside(cu)?1:0);counts[mask[index]]++;
}
const pairs=[];
for(let y=60;y<height;y++)for(let x=0;x<width;x++)for(const [dx,dy] of [[1,0],[0,1]]){
 if(x+dx>=width||y+dy>=height)continue;const a=y*width+x,b=(y+dy)*width+x+dx;
 if((mask[a]&1)===0||(mask[b]&1)===0||((mask[a]&2)>0)===((mask[b]&2)>0))continue;
 const fi=(mask[a]&2)>0?a:b,co=fi===a?b:a;
 pairs.push({fineXY:[fi%width,Math.floor(fi/width)],coarseXY:[co%width,Math.floor(co/width)],
  fineUvOnCoarse:[...coarseUvs.slice(fi*2,fi*2+2)],coarseUv:[...coarseUvs.slice(co*2,co*2+2)]});
}
assert(counts[1]>1000&&counts[3]>1000&&pairs.length>100);assert.deepEqual(await Promise.all(files.map(bind)),before);
await mkdir(out);await writeFile(path.join(out,'nominal-domain.mask'),mask,{flag:'wx'});
await writeFile(path.join(out,'executed-script.mts'),await readFile(fileURLToPath(import.meta.url)),{flag:'wx'});
const result={status:'CURRENT_ACTUAL_OBSERVATION_NOMINAL_TAN_BOUNDARY_GEOMETRY',at:comparison.at,view,observation,publicationHash:pub.publicationHash,width,height,
 counts:{neither:counts[0],coarseOnly:counts[1],fineOnly:counts[2],both:counts[3]},maskEncoding:'top-first; bits1 coarse nominal domain,2 fine nominal domain; no RGB/science support inference',
 adjacentBoundaryPairs:pairs,inputsBefore:before,
 limits:['Current higher-parent epoch observation only. Not a captured observation matrix or completion/retirement for the earlier failed pair epoch.',
 'Nominal geometry domains, not actual material/science coverage, registration acceptance or a GPU pixel mask equality claim.',
 'Saved output quality diagnostics may compare earlier exact view/instant frames at this nominal boundary; this does not fill their missing runtime facts.']};
await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,counts:result.counts,boundaryPairs:pairs.length}));
