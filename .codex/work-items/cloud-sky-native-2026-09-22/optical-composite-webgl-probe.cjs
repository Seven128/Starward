const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const { chromium } = require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '../../..');
const label = process.argv[2];
assert.ok(['before','after'].includes(label));
const out = path.join(root, 'artifacts/miniapp/cloud-sky-native/optical-composite-0928');
fs.mkdirSync(out, {recursive:true});
const code = buildSync({stdin:{contents:'export {createSkyGpuRenderer} from "./sky-gpu-renderer"; export {registerSkyArtwork} from "./sky-artwork-registration";',
  resolveDir:path.join(root,'apps/wechat-miniapp/src/features/sky'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'Sky',platform:'browser'}).outputFiles[0].text;
(async () => {
  const browser = await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
  const page = await browser.newPage();
  await page.setContent('<canvas id="sky" width="128" height="128"></canvas>');
  await page.addScriptTag({content:code});
  const result = await page.evaluate(() => {
    const canvas=document.getElementById('sky'), gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false});
    const renderer=Sky.createSkyGpuRenderer(gl,1);
    const image=document.createElement('canvas');image.width=image.height=2;
    const ctx=image.getContext('2d');ctx.fillStyle='rgb(40,80,120)';ctx.fillRect(0,0,2,2);
    const direction=(x,y)=>{const r=Math.hypot(x,y,1);return[x/r,y/r,1/r];};
    const registration=Sky.registerSkyArtwork([{uv:[0,0],direction:direction(-1,1)},
      {uv:[1,0],direction:direction(1,1)},{uv:[0,1],direction:direction(-1,-1)}]);
    const view={basis:{right:[-1,0,0],up:[0,1,0],forward:[0,0,1]},verticalFovDeg:45};
    const draw=(background,composite,opacity=1)=>{
      renderer.begin(128,128,background);
      const drawn=renderer.artwork(image,registration,view,opacity,'#FFFFFF',composite);
      renderer.finish();const pixel=new Uint8Array(4);gl.readPixels(64,64,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
      return {drawn,pixel:[...pixel],error:gl.getError()};
    };
    const opticalDark=draw('#000000','source-over'),opticalBright=draw('#506478','source-over');
    const decorative=draw('#506478',undefined),partial=draw('#506478','source-over',.5);
    // The next ordinary draw must see restored source-over blend state.
    renderer.begin(128,128,'#000000');renderer.artwork(image,registration,view,1,'#FFFFFF');
    renderer.disc(64,64,10,'#FF0000',.5,0);renderer.finish();
    const restored=new Uint8Array(4);gl.readPixels(64,64,1,1,gl.RGBA,gl.UNSIGNED_BYTE,restored);
    const finalError=gl.getError();renderer.dispose();
    return {opticalDark,opticalBright,decorative,partial,restored:[...restored],finalError};
  });
  await page.screenshot({path:path.join(out,label+'.png')});
  await browser.close();
  const rgb=value=>value.pixel.slice(0,3);
  Object.values(result).filter(v=>v&&v.pixel).forEach(v=>{assert.equal(v.drawn,true);assert.equal(v.error,0);});
  assert.deepEqual(rgb(result.opticalDark),[40,80,120]);
  assert.deepEqual(rgb(result.decorative),[120,180,240]);
  if(label==='before')assert.notDeepEqual(rgb(result.opticalBright),[40,80,120]);
  else {assert.deepEqual(rgb(result.opticalBright),[40,80,120]);
    assert.ok(rgb(result.partial).every((value,i)=>Math.abs(value-[60,90,120][i])<=1));}
  assert.ok(result.restored.slice(0,3).every((value,i)=>Math.abs(value-[148,40,60][i])<=1));
  assert.equal(result.finalError,0);
  fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({label,...result}));
})().catch(error=>{console.error(error);process.exitCode=1;});
