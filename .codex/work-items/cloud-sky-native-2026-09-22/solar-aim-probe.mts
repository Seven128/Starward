import { dragSkyView, INITIAL_MANUAL_SKY_VIEW } from '../../../apps/wechat-miniapp/src/features/sky/sky-manual-view.ts';
import type { SkyViewBasis } from '../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';

const rad=Math.PI/180,deg=180/Math.PI;
const target:[number,number,number]=[
  Math.cos(3.441*rad)*Math.sin(268.821*rad),
  Math.cos(3.441*rad)*Math.cos(268.821*rad),
  Math.sin(3.441*rad),
];
const score=(b:SkyViewBasis)=>Math.acos(Math.min(1,Math.max(-1,b.forward.reduce((v,x,i)=>v+x*target[i]!,0))))*deg;
const heading=(b:SkyViewBasis)=>({az:(Math.atan2(b.forward[0],b.forward[1])*deg+360)%360,alt:Math.asin(b.forward[2])*deg});
const moves=[] as Array<{start:{x:number;y:number};end:{x:number;y:number}}>;
for(const y of [200,422,640]) for(const [a,b] of [[50,380],[380,50],[50,250],[250,50],[140,340],[340,140]]) moves.push({start:{x:a,y},end:{x:b,y}});
for(const x of [80,195,310]) for(const [a,b] of [[100,740],[740,100],[200,600],[600,200],[320,520],[520,320]]) moves.push({start:{x,y:a},end:{x,y:b}});
for(const [a,b] of [[180,220],[220,180],[195,205],[205,195]])moves.push({start:{x:a,y:422},end:{x:b,y:422}});
for(const [a,b] of [[400,440],[440,400],[415,425],[425,415]])moves.push({start:{x:195,y:a},end:{x:195,y:b}});
let basis=INITIAL_MANUAL_SKY_VIEW;
for(let i=0;i<15;i++){
  const ranked=moves.map(move=>({move,basis:dragSkyView(basis,move.start,move.end,390.4,844,45)})).sort((a,b)=>score(a.basis)-score(b.basis));
  const next=ranked[0]!;
  if(score(next.basis)>=score(basis)-.001)break;
  basis=next.basis;
  console.log(JSON.stringify({step:i+1,move:next.move,heading:heading(basis),errorDeg:score(basis)}));
  if(score(basis)<.5)break;
}
