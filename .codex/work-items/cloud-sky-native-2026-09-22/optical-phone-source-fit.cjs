// Private phone pixels remain in the supplied directory. This is an image
// comparison, not an astrometric solution or a source WCS measurement.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../../..'),dir=process.argv[2],file=process.argv[3]||'m51-c-020.png';
if(!dir||!path.isAbsolute(dir))throw Error('Private image directory required');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage();
 const data=file=>'data:image/'+(file.endsWith('.jpg')?'jpeg':'png')+';base64,'+fs.readFileSync(file).toString('base64');
 const result=await page.evaluate(async ({source,phone})=>{
  const decode=async url=>{const image=new Image();image.src=url;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return{w:c.width,h:c.height,p:ctx.getImageData(0,0,c.width,c.height).data};};
  const s=await decode(source),p=await decode(phone),samples=[];
  for(let y=700;y<1800;y+=19)for(let x=80;x<1000;x+=19){
   if(x>440&&x<680&&y>1070&&y<1210)continue;
   const i=(y*p.w+x)*4,c=[p.p[i],p.p[i+1],p.p[i+2]];
   if(Math.min(...c)>210)continue;
   samples.push([x,y,...c]);
  }
  const cost=v=>{const[scale,angle,cx,cy]=v;if(scale<2||scale>9)return 1e9;const co=Math.cos(angle),si=Math.sin(angle);let sum=0,n=0;
   for(const[x,y,r,g,b]of samples){const dx=(x-cx)/scale,dy=(y-cy)/scale,sx=256+co*dx+si*dy,sy=256-si*dx+co*dy;
    if(sx<1||sx>510||sy<1||sy>510){sum+=10000;n++;continue;}
    const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
    for(let k=0;k<3;k++){const at=(xx,yy)=>s.p[(yy*s.w+xx)*4+k];const expected=(1-fy)*((1-fx)*at(ix,iy)+fx*at(ix+1,iy))+fy*((1-fx)*at(ix,iy+1)+fx*at(ix+1,iy+1));sum+=Math.min(10000,(expected-[r,g,b][k])**2);n++;}
   }return sum/n;};
  let best=[5,0,540,1120],score=1e9;
  for(let a=-Math.PI;a<Math.PI;a+=Math.PI/36)for(const scale of[4,5,6]){const v=[scale,a,540,1120],q=cost(v);if(q<score){score=q;best=v;}}
  for(const factor of[1,.4,.15,.06,.02,.006]){const steps=[.3,.08,35,35].map(n=>n*factor);for(let iter=0;iter<25;iter++){let improved=false;for(let k=0;k<4;k++)for(const sign of[-1,1]){const v=[...best];v[k]+=sign*steps[k];const q=cost(v);if(q<score){score=q;best=v;improved=true;}}if(!improved)break;}}
  return{samples:samples.length,scale:best[0],angleRadians:best[1],centerPixel:best.slice(2),clippedRgbRmse:Math.sqrt(score),scope:'Pixel appearance fit only; no astrometric, photometric or phone runtime identity claim'};
 },{source:data(path.join(root,'workers/miniapp-api/assets/deep-sky/sdss-m51/M-51-overview.jpg')),phone:data(path.join(dir,file))});
 fs.writeFileSync(path.join(dir,file+'.fit.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
