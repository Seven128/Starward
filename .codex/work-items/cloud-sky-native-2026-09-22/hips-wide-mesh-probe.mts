import { pix2VecNest, pixcoord2VecNest, vec2PixNest } from 'healpix-ts';
import { prepareSkyHipsTile, projectSkyHipsTileMesh } from '../../../apps/wechat-miniapp/src/features/sky/sky-hips-tile-mesh.ts';
import { selectSkyHipsTiles } from '../../../apps/wechat-miniapp/src/features/sky/sky-hips-tile-selection.ts';
import { projectSkyDirectionUnclipped, unprojectSkyPoint, type SkyViewBasis } from '../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';

const width=390.4,height=844,fov=267.8;
const view={basis:{right:[1,0,0],up:[0,-1,0],forward:[0,0,1]} as SkyViewBasis,verticalFovDeg:fov};
const identity=[1,0,0,0,1,0,0,0,1] as const;
let visible=0,mismatched=0;
const samples:unknown[]=[];
for(let pixel=0;pixel<12;pixel++){
  const tile=prepareSkyHipsTile(0,pixel,8)!;
  const mesh=projectSkyHipsTileMesh(tile,identity,view,width,height)!;
  for(let i=0;i<mesh.length;i+=12){
    const x=(mesh[i]!+mesh[i+4]!+mesh[i+8]!)/3;
    const y=(mesh[i+1]!+mesh[i+5]!+mesh[i+9]!)/3;
    if(x<0||x>=width||y<0||y>=height)continue;
    const ray=unprojectSkyPoint(x,y,view.basis,width,height,fov)!;
    if(ray[2]<=0)continue;
    visible++;
    const exact=vec2PixNest(1,ray);
    if(exact!==pixel){mismatched++;if(samples.length<20)samples.push({pixel,exact,x,y,ray});}
  }
}
console.log(JSON.stringify({visible,mismatched,samples},null,2));
for(const field of [45,60,90,120,150,180,210,240,267.8])console.log(JSON.stringify({field,
  order1:selectSkyHipsTiles({frame:{equatorialToEnu:identity} as never,
    view:{basis:view.basis,verticalFovDeg:field},width,height,maxOrder:11}).state}));

const cross=(a:readonly number[],b:readonly number[])=>[a[1]!*b[2]!-a[2]!*b[1]!,a[2]!*b[0]!-a[0]!*b[2]!,a[0]!*b[1]!-a[1]!*b[0]!];
const unit=(a:readonly number[])=>a.map(x=>x/Math.hypot(...a)) as [number,number,number];
const projection=(q:readonly number[],b:SkyViewBasis,field:number)=>projectSkyDirectionUnclipped(
  Math.atan2(q[0]!,q[1]!)*180/Math.PI,Math.asin(q[2]!)*180/Math.PI,b,width,height,field);
for(const field of [45,60,120,180,240,267.8])for(const divisions of [8,16]){
  let max=0,visibleCells=0;
  for(let pixel=0;pixel<12;pixel++){
    const forward=pix2VecNest(1,pixel);
    const target=field===267.8?[0,0,1]:forward;
    const right=unit(cross(target,Math.abs(target[2]!)<.9?[0,0,1]:[0,1,0]));
    const up=unit(cross(right,target));
    const b={right,up,forward:target} as SkyViewBasis;
    for(let v=0;v<divisions;v++)for(let u=0;u<divisions;u++){
      const sample=(x:number,y:number)=>projection(pixcoord2VecNest(1,pixel,x,y),b,field);
      const corners=[sample(u/divisions,v/divisions),sample((u+1)/divisions,v/divisions),
        sample(u/divisions,(v+1)/divisions),sample((u+1)/divisions,(v+1)/divisions)];
      const actual=sample((u+.5)/divisions,(v+.5)/divisions);
      const actualRay=pixcoord2VecNest(1,pixel,(u+.5)/divisions,(v+.5)/divisions);
      if(!actual||!corners.every(Boolean)||actualRay[2]<=0||actual.x<0||actual.x>width||actual.y<0||actual.y>height)continue;
      visibleCells++;
      max=Math.max(max,Math.hypot(actual.x-corners.reduce((a,p)=>a+p!.x,0)/4,
        actual.y-corners.reduce((a,p)=>a+p!.y,0)/4));
    }
  }
  console.log(JSON.stringify({field,divisions,visibleCells,maxScreenPx:max}));
}
