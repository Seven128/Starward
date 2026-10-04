const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {buildSync}=require('esbuild');
const {chromium}=require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../../..');
const candidate=path.resolve(process.argv[2]);
const mutated=process.env.MOON_WHITE_FALLBACK_MUTATION==='1';
const output=path.join(root,'artifacts/miniapp/cloud-sky-native/moon-coverage-0928'+(mutated?'-mutation':''));
fs.mkdirSync(output,{recursive:true});
let code=buildSync({stdin:{contents:'export {createSkyGpuRenderer} from "./sky-gpu-renderer";',resolveDir:path.join(root,'apps/wechat-miniapp/src/features/sky'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'Sky',platform:'browser'}).outputFiles[0].text;
if(mutated){assert.ok(code.includes('"#6F7175"'));code=code.replace('"#6F7175"','"#DEE3EB"');}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:512,height:512}});
  await page.setContent('<style>body{margin:0}</style><canvas id="sky" width="512" height="512"></canvas>');
  await page.addScriptTag({content:code});
  const result=await page.evaluate(async url=>{
   const image=new Image();image.src=url;await image.decode();
   const source=document.createElement('canvas');source.width=image.width;source.height=image.height;
   const ctx=source.getContext('2d');ctx.drawImage(image,0,0);
   const input=ctx.getImageData(0,0,image.width,image.height).data;
   const canvas=document.getElementById('sky'),gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false});
   const renderer=Sky.createSkyGpuRenderer(gl,1);
   const view={basis:{right:[1,0,0],up:[0,-1,0],forward:[0,0,1]},verticalFovDeg:1};
   const disc={x:256,y:256,radiusPx:240,illuminatedFraction:1,sunward:[0,-1],surfaceOrientation:{observerBody:[1,0,0],rightBody:[0,1,0],downBody:[0,0,-1]}};
   function render(source){renderer.begin(512,512,'#000000');const drawn=renderer.moon(disc,view,false,source);renderer.finish();const out=new Uint8Array(512*512*4);gl.readPixels(0,0,512,512,gl.RGBA,gl.UNSIGNED_BYTE,out);return {drawn,out};}
   const plain=render(null),actual=render(image),errors=[],missing=[],valid=[];
   const tint=[222,227,235],fallback=[111,113,117];
   for(let y=35;y<477;y++)for(let x=35;x<477;x++){
    const px=(x+.5-256)/240,py=(y+.5-256)/240,sq=px*px+py*py;
    if(sq>.85)continue;
    const facing=Math.sqrt(1-sq),lon=Math.atan2(px,facing),lat=Math.asin(-py);
    const u=(lon+Math.PI)/(2*Math.PI),v=.5-lat/Math.PI;
    const sx=u*image.width-.5,sy=v*image.height-.5,ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
    const sample=[0,0,0,0];
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)for(let c=0;c<4;c++)sample[c]+=input[((iy+dy)*image.width+ix+dx)*4+c]*(dx?fx:1-fx)*(dy?fy:1-fy)/255;
    const brightness=.045+.62+.335*facing,index=((511-y)*512+x)*4;
    for(let c=0;c<3;c++){
     const expected=brightness*(fallback[c]*(1-sample[3])+tint[c]*sample[3]*(.3+1.2*sample[0]));
     errors.push(Math.abs(actual.out[index+c]-expected));
    }
    if(sample[3]===0)missing.push(Math.max(...[0,1,2].map(c=>Math.abs(actual.out[index+c]-fallback[c]*brightness))));
    if(sample[3]===1)valid.push(Math.abs(actual.out[index]-plain.out[index]));
   }
   renderer.dispose();errors.sort((a,b)=>a-b);
   return {drawn:actual.drawn,comparedChannels:errors.length,p99Error:errors[Math.floor(errors.length*.99)],maxError:errors.at(-1),
    missingPixels:missing.length,missingMaxDifference:Math.max(...missing),validPixels:valid.length,validMeanDifference:valid.reduce((a,b)=>a+b,0)/valid.length};
  },'data:image/png;base64,'+fs.readFileSync(candidate).toString('base64'));
  await page.screenshot({path:path.join(output,'moon-coverage.png')});
  assert.equal(result.drawn,true);assert.ok(result.missingPixels>0);assert.ok(result.missingMaxDifference<=1);
  assert.ok(result.validPixels>1000&&result.validMeanDifference>10);assert.ok(result.p99Error<3);
  console.log(JSON.stringify({...result,screenshot:path.join(output,'moon-coverage.png')},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
