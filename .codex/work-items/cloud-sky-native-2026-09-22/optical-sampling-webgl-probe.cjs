const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {buildSync} = require('esbuild');
const {chromium} = require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../../..');
const out=path.join(root,'artifacts/miniapp/cloud-sky-native/optical-sampling-0928');
fs.mkdirSync(out,{recursive:true});
const code=buildSync({stdin:{contents:'export {createSkyGpuRenderer} from "./sky-gpu-renderer"; export {registerSkyArtwork} from "./sky-artwork-registration";',resolveDir:path.join(root,'apps/wechat-miniapp/src/features/sky'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'Sky',platform:'browser'}).outputFiles[0].text;
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 try {
 const page=await browser.newPage({viewport:{width:540,height:1188}});
 await page.setContent('<style>body{margin:0}</style><canvas id="sky" width="540" height="1188"></canvas>');
 await page.addScriptTag({content:code});
 const imageUrl='data:image/jpeg;base64,'+fs.readFileSync(path.join(root,'workers/miniapp-api/assets/deep-sky/sdss-m51/M-51-overview.jpg')).toString('base64');
 const result=await page.evaluate(async imageUrl=>{
  const img=new Image();img.src=imageUrl;await img.decode();
  const canvas=document.getElementById('sky'),gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false});
  const renderer=Sky.createSkyGpuRenderer(gl,1);
  const rad=Math.PI/180, az=315.2*rad,alt=14.8*rad;
  const f=[Math.sin(az)*Math.cos(alt),Math.cos(az)*Math.cos(alt),Math.sin(alt)];
  const right=[Math.cos(az),-Math.sin(az),0],up=[-Math.sin(az)*Math.sin(alt),-Math.cos(az)*Math.sin(alt),Math.cos(alt)];
  const unit=v=>v.map(n=>n/Math.hypot(...v));
  const half=Math.tan(.22755555555555557*rad/2),theta=-.55;
  const imRight=right.map((v,i)=>v*Math.cos(theta)+up[i]*Math.sin(theta));
  const imUp=up.map((v,i)=>v*Math.cos(theta)-right[i]*Math.sin(theta));
  const registration=Sky.registerSkyArtwork([[0,0],[1,0],[0,1]].map(([u,v])=>({uv:[u,v],direction:unit(f.map((n,i)=>n+(u-.5)*2*half*imRight[i]+(.5-v)*2*half*imUp[i]))})));
  const view={basis:{right,up,forward:f},verticalFovDeg:.2};
  renderer.begin(540,1188,'#000000');const drawn=renderer.artwork(img,registration,view,1,'#FFFFFF','source-over');renderer.finish();
  const actual=new Uint8Array(540*1188*4);gl.readPixels(0,0,540,1188,gl.RGBA,gl.UNSIGNED_BYTE,actual);
  const source=document.createElement('canvas');source.width=source.height=512;const ctx=source.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,512,512).data;
  const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),scale=1188/(2*Math.tan(.2*rad/4));
  const errors=[];
  for(let y=40;y<1148;y+=13)for(let x=20;x<520;x+=13){
   const px=(x+.5-270)/scale,py=-(y+.5-594)/scale,sq=px*px+py*py;
   const camera=[2*px/(1+sq),2*py/(1+sq),(1-sq)/(1+sq)];
   const ray=f.map((n,i)=>right[i]*camera[0]+up[i]*camera[1]+n*camera[2]);
   const denom=dot(ray,f),u=.5+dot(ray,imRight)/denom/(2*half),v=.5-dot(ray,imUp)/denom/(2*half);
   if(u<.01||u>.99||v<.01||v>.99)continue;
   const sx=u*512-.5,sy=v*512-.5,ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
   for(let c=0;c<3;c++){
    const at=(a,b)=>pixels[(b*512+a)*4+c];
    const expected=(1-fy)*((1-fx)*at(ix,iy)+fx*at(ix+1,iy))+fy*((1-fx)*at(ix,iy+1)+fx*at(ix+1,iy+1));
    errors.push(Math.abs(actual[((1187-y)*540+x)*4+c]-expected));
   }
  }
  errors.sort((a,b)=>a-b);const error=gl.getError();renderer.dispose();
  return{drawn,error,samples:errors.length,maxError:errors.at(-1),p99Error:errors[Math.floor(errors.length*.99)],meanError:errors.reduce((a,b)=>a+b,0)/errors.length};
 },imageUrl);
 await page.screenshot({path:path.join(out,'actual-renderer.png')});
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));assert.equal(result.drawn,true);assert.equal(result.error,0);assert.ok(result.samples>1000);assert.ok(result.p99Error<3);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
