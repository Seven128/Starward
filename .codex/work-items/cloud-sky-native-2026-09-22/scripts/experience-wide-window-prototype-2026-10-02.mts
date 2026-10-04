import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {skyArtworkViewRayHull,artworkIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {skyArtworkTextureWindow} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-texture-window.ts';
import {skyArtworkUvAtDirection,type SkyArtworkRegistration,type SkyArtworkView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts';
import {unprojectSkyPoint,type SkyVector} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';

const dot=(a:readonly number[],b:readonly number[])=>a.reduce((n,value,i)=>n+value*b[i]!,0);
const clip=(polygon:readonly SkyVector[],normal:SkyVector,margin:number):SkyVector[]=>{
  const result:SkyVector[]=[];
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!,da=dot(normal,a)+margin,db=dot(normal,b)+margin;
    if(da>=0)result.push(a);
    if((da>=0)!==(db>=0)){
      const t=da/(da-db);result.push(a.map((value,axis)=>value+(b[axis]!-value)*t) as unknown as SkyVector);
    }
  }
  return result;
};
export function clippedArtworkWindow(registration:SkyArtworkRegistration,view:SkyArtworkView,
  width:number,height:number,imageWidth:number,imageHeight:number){
  const hull=skyArtworkViewRayHull(view,width,height);if(!hull)return;
  let polygon=hull.map(ray=>ray.map(value=>value/dot(ray,view.basis.forward)) as unknown as SkyVector);
  if(polygon.some(ray=>!ray.every(Number.isFinite)))return;
  const sign=Math.sign(registration.determinant),den=registration.rows[0].map((_,i)=>
    sign*registration.rows.reduce((sum,row)=>sum+row[i]!,0)) as unknown as SkyVector;
  const u=den.map((_,i)=>sign*registration.rows.reduce((sum,row,j)=>sum+row[i]!*registration.anchorU[j]!,0)) as unknown as SkyVector;
  const v=den.map((_,i)=>sign*registration.rows.reduce((sum,row,j)=>sum+row[i]!*registration.anchorV[j]!,0)) as unknown as SkyVector;
  const maxRay=Math.max(...polygon.map(ray=>ray.reduce((n,value)=>n+Math.abs(value),0)));
  for(const normal of [u,den.map((value,i)=>value-u[i]!) as unknown as SkyVector,v,
    den.map((value,i)=>value-v[i]!) as unknown as SkyVector,[0,0,1] as SkyVector]){
    const margin=64*2**-23*maxRay*Math.max(1,normal.reduce((n,value)=>n+Math.abs(value),0));
    polygon=clip(polygon,normal,margin);if(polygon.length<3)return;
  }
  const minDen=Math.min(...polygon.map(ray=>dot(den,ray))),magnitude=registration.rows.reduce((sum,row)=>sum+row.reduce((n,value)=>n+Math.abs(value),0),0);
  const roundoff=64*2**-23*magnitude*maxRay;if(!(minDen>roundoff))return;
  const uv=polygon.map(ray=>skyArtworkUvAtDirection(registration,ray));if(uv.some(point=>!point||!point.every(Number.isFinite)))return;
  const edges=[imageWidth,imageHeight].map((size,axis)=>{
    const values=uv.map(point=>point![axis]!),anchors=axis===0?registration.anchorU:registration.anchorV;
    const error=roundoff*(Math.max(...anchors.map(Math.abs))+Math.max(...values.map(Math.abs)))/(minDen-roundoff);
    return [Math.max(0,Math.min(size,Math.floor(((Math.min(...values)-error)*size-3)/32)*32)),
      Math.max(0,Math.min(size,Math.ceil(((Math.max(...values)+error)*size+3)/32)*32))];
  });
  const [x,right]=edges[0]!,[y,bottom]=edges[1]!;
  if(!(right!>x!&&bottom!>y!)||(x===0&&y===0&&right===imageWidth&&bottom===imageHeight))return;
  return{x:x!,y:y!,width:right!-x!,height:bottom!-y!};
}
const task='.codex/work-items/cloud-sky-native-2026-09-22',folder='output/playwright/cloud-sky-wide-resource-composition-1002';
const result=JSON.parse(await fs.readFile(folder+'/result.json','utf8')),sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const reportBytes=await fs.readFile(result.report.path);assert.equal(sha(reportBytes),result.report.sha256);
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data;
const metadata=async(route:string)=>{
  const record=result.inputs.find((row:any)=>row.route===route);assert(record);
  const bytes=await fs.readFile(folder+'/input-'+(result.inputs.indexOf(record)+1)+'.json');assert.equal(sha(bytes),record.sha256);return JSON.parse(bytes.toString());
};
const catalog=raw.skyScene.catalog!,stars=(await metadata(`/v2/sky/catalogs/${catalog.catalogVersion}/${catalog.catalogHash}`)).data;
const figures=(await metadata('/v2/sky/constellations')).data;
const rows=[];
for(const condition of result.rows.filter((row:any)=>row.figureCount&&row.fov>=45&&row.fov<180)){
  const report=attachSkyCatalog(presentSkyTime(raw,condition.at)!.report,stars),frame=resolveConstellationFrame(figures,report.skyScene,condition.at)!;
  const width=390,height=844,view={basis:condition.basis,verticalFovDeg:condition.fov};
  const changes=[];let before=0,after=0,sampleChecks=0;
  for(const figure of frame.images.filter(figure=>artworkIntersectsView(figure.registration,view,width,height))){
    const {width:imageWidth,height:imageHeight}=figure.source;
    const old=skyArtworkTextureWindow(figure.registration,view,width,height,imageWidth,imageHeight);
    const next=clippedArtworkWindow(figure.registration,view,width,height,imageWidth,imageHeight);
    const bytes=(window:typeof old)=>(window?window.width*window.height:imageWidth*imageHeight)*4;
    before+=bytes(old);after+=bytes(next);
    if(bytes(next)!==bytes(old))changes.push({id:figure.source.id,old:old??null,next:next??null,beforeBytes:bytes(old),afterBytes:bytes(next)});
    if(next)for(let y=0;y<=height;y+=height/40)for(let x=0;x<=width;x+=width/20){
      const ray=unprojectSkyPoint(x,y,view.basis,width,height,view.verticalFovDeg)!,uv=skyArtworkUvAtDirection(figure.registration,ray);
      if(ray[2]<0||!uv||uv.some(n=>n<0||n>1))continue;
      for(const [value,start,extent,size] of [[uv[0],next.x,next.width,imageWidth],[uv[1],next.y,next.height,imageHeight]]){
        const pixel=Math.max(0,Math.min(size!-1,value!*size!-.5));
        assert(Math.floor(pixel)>=start!&&Math.ceil(pixel)<start!+extent!,'LINEAR source neighbour escaped '+figure.source.id);
      }
      sampleChecks++;
    }
  }
  rows.push({name:condition.name,beforeArtworkBytes:before,afterArtworkBytes:after,changes,sampleChecks});
}
await fs.writeFile(task+'/evidence/experience-wide-window-prototype-2026-10-02.json',JSON.stringify({scope:'Source-geometric CPU proposal only; sampled original LINEAR neighbours, not GPU/native/correctness completion. No production change yet.',rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(rows.map(({name,beforeArtworkBytes,afterArtworkBytes,sampleChecks})=>({name,beforeArtworkBytes,afterArtworkBytes,sampleChecks}))));
