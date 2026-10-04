import { dragSkyView, INITIAL_MANUAL_SKY_VIEW } from '../../../apps/wechat-miniapp/src/features/sky/sky-manual-view.ts';
import { projectSkyDirection, unprojectSkyPoint, type SkyVector, type SkyViewBasis } from '../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import { captureSkyDomeTarget } from '../../../apps/wechat-miniapp/src/features/sky/sky-browsing-camera.ts';

const dot = (a: SkyVector, b: SkyVector) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const rad = Math.PI/180;
const deg = 180/Math.PI;
const levelBasis = (az: number, alt: number, roll: number): SkyViewBasis => {
  const sA=Math.sin(az), cA=Math.cos(az), sE=Math.sin(alt), cE=Math.cos(alt), sR=Math.sin(roll), cR=Math.cos(roll);
  const right0: SkyVector=[cA,-sA,0], up0: SkyVector=[-sE*sA,-sE*cA,cE];
  return {right:[0,1,2].map(i=>right0[i]! * cR + up0[i]! * sR) as unknown as SkyVector,
    up:[0,1,2].map(i=>-right0[i]! * sR + up0[i]! * cR) as unknown as SkyVector,
    forward:[cE*sA,cE*cA,sE]};
};
const angleDiff = (a:number,b:number) => Math.atan2(Math.sin(a-b),Math.cos(a-b));
function levelDrag(basis:SkyViewBasis,start:{x:number,y:number},end:{x:number,y:number},width:number,height:number,fov:number):SkyViewBasis {
  const E0=Math.asin(basis.forward[2]);
  const A0=Math.atan2(basis.forward[0],basis.forward[1]);
  const initial=levelBasis(A0,E0,0);
  const roll=Math.atan2(dot(basis.right,initial.up),dot(basis.right,initial.right));
  const target=unprojectSkyPoint(start.x,start.y,basis,width,height,fov)!;
  const localEnd=unprojectSkyPoint(end.x,end.y,basis,width,height,fov)!;
  const u=dot(localEnd,basis.right),v=dot(localEnd,basis.up),w=dot(localEnd,basis.forward);
  const p=u*Math.cos(roll)-v*Math.sin(roll),q=u*Math.sin(roll)+v*Math.cos(roll), h=Math.hypot(q,w);
  if(h<Math.abs(target[2])-1e-10)return basis;
  const alpha=Math.asin(Math.max(-1,Math.min(1,target[2]/h)));
  const phase=Math.atan2(q,w);
  const candidates=[alpha-phase,Math.PI-alpha-phase,-Math.PI-alpha-phase].flatMap(e=>[e-2*Math.PI,e,e+2*Math.PI]);
  const valid=candidates.filter(e=>e>=-Math.PI/2-1e-10&&e<=Math.PI/2+1e-10).sort((a,b)=>Math.abs(a-E0)-Math.abs(b-E0));
  if(!valid.length)return basis;
  const E=valid[0]!;
  const t=w*Math.cos(E)-q*Math.sin(E);
  const A=Math.atan2(target[0],target[1])-Math.atan2(p,t);
  return levelBasis(A,E,roll);
}
const direction=(b:SkyViewBasis)=>({az:Math.atan2(b.forward[0],b.forward[1])*deg,alt:Math.asin(b.forward[2])*deg,
  roll:Math.atan2(dot(b.right,levelBasis(Math.atan2(b.forward[0],b.forward[1]),Math.asin(b.forward[2]),0).up),dot(b.right,levelBasis(Math.atan2(b.forward[0],b.forward[1]),Math.asin(b.forward[2]),0).right))*deg});
for(const fov of [240,180,120,45,6,1.5]){
  const basis=levelBasis(350*rad,-20*rad,30*rad);
  const start={x:195,y:390},end={x:258,y:293};
  const target=unprojectSkyPoint(start.x,start.y,basis,390,780,fov)!;
  const moved=levelDrag(basis,start,end,390,780,fov);
  const result=projectSkyDirection(Math.atan2(target[0],target[1])*deg,Math.asin(target[2])*deg,moved,390,780,fov);
  console.log('directness',fov,result ? Math.hypot(result.x-end.x,result.y-end.y):null,direction(moved));
}
let arc:SkyViewBasis=INITIAL_MANUAL_SKY_VIEW,lev:SkyViewBasis=INITIAL_MANUAL_SKY_VIEW;
for(let i=0;i<5;i++){
  const start={x:50,y:450},end={x:380,y:450};
  const target=unprojectSkyPoint(start.x,start.y,lev,390.4,844,45)!;
  arc=dragSkyView(arc,start,end,390.4,844,45);
  lev=levelDrag(lev,start,end,390.4,844,45);
  const projected=projectSkyDirection(Math.atan2(target[0],target[1])*deg,Math.asin(target[2])*deg,lev,390.4,844,45);
  console.log('sweep',i+1,'arc',direction(arc),'level',direction(lev),'finger-error',projected?Math.hypot(projected.x-end.x,projected.y-end.y):null);
}
const dome= captureSkyDomeTarget(INITIAL_MANUAL_SKY_VIEW);
for(const [start,end] of [[{x:195,y:422},{x:380,y:422}],[{x:50,y:450},{x:380,y:450}],[{x:195,y:200},{x:380,y:200}]]){
  const oldDome=captureSkyDomeTarget(levelDrag(dome,start,end,390.4,844,267.8));
  const newDome=captureSkyDomeTarget(dragSkyView(dome,start,end,390.4,844,267.8));
  console.log('dome',start,end,'old right',oldDome.right,'new right',newDome.right);
}
for(const fov of [240]) for(const basis of [INITIAL_MANUAL_SKY_VIEW,levelBasis(350*rad,-20*rad,30*rad)]) {
  for(let y=612;y<=622;y++){
    const b=dragSkyView(basis,{x:50,y:450},{x:50,y},390.4,844,fov);
    console.log('vertical-wide',JSON.stringify({start:direction(basis),y,result:direction(b)}));
  }
}
