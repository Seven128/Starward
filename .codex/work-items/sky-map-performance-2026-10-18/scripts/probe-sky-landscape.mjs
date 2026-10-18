// Bounded repeatable software-WebGL evidence. This does not drive WeChat or a phone.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const root = path.resolve(import.meta.dirname, '../../../..');
const require = createRequire(import.meta.url);
const runtime = 'C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const { chromium } = require(runtime + 'playwright');
const sharp = require(runtime + 'sharp');
const [outputArgument, baseline = 'a36aebf8b29da9e6054dc5ecda8c564c7d921291'] = process.argv.slice(2);
assert(outputArgument, 'new_output_directory_required');
const output = path.resolve(root, outputArgument);
assert(output.startsWith(path.join(root, 'output', 'playwright') + path.sep), 'owned_output_required');
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.mkdir(output);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['sky-manual-view.ts', 'sky-landscape.ts'].map(file => 'apps/wechat-miniapp/src/features/sky/' + file);
const before = new Map(files.map(file => [file, execFileSync('git', ['show', baseline + ':' + file], { cwd: root })]));
const source = Object.fromEntries(await Promise.all(files.map(async file => [file, {
  baselineSha256: sha(before.get(file)), candidateSha256: sha(await fs.readFile(path.join(root, file))),
}])));
const manifestPath = 'workers/miniapp-api/assets/landscape/manifest.json';
const publication = JSON.parse(await fs.readFile(path.join(root, manifestPath), 'utf8'));
const resource = publication.resources.find(value => value.id === 'overview');
const imageBytes = await fs.readFile(path.join(root, 'workers/miniapp-api/assets/landscape', resource.image.file));
assert.equal(imageBytes.length, resource.image.bytes);
assert.equal(sha(imageBytes), resource.image.sha256);
const imageRaw = await sharp(imageBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const imageAlpha = Buffer.from(Array.from({ length: resource.image.width * resource.image.height },
  (_, index) => imageRaw.data[index * 4 + 3]));
assert.equal(sha(imageAlpha), resource.alpha.decodedSha256);
const entry = `
import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
import {createSkyViewBasis,validBasis,unprojectSkyPoint,projectSkyDirection} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {dragSkyView} from './apps/wechat-miniapp/src/features/sky/sky-manual-view';
import {skyLandscapeViewOpacity,skyLandscapeViewReveal} from './apps/wechat-miniapp/src/features/sky/sky-landscape-visibility';
import {createSkyPanoramaMask,skyLandscapeMaskWithOpacity,skyLandscapeMaskAlpha} from './apps/wechat-miniapp/src/features/sky/sky-landscape-mask';
import {paintedSkyPointVisible} from './apps/wechat-miniapp/src/features/sky/sky-object-picking';
const input=${JSON.stringify({ publication, resource, image: 'data:image/png;base64,' + imageBytes.toString('base64') })};
const width=390,height=844;
window.geometryProbe=()=>{
  const scenarios=[{name:'horizon-crossing',altitude:12,x:195,roll:0},
    {name:'below-ground-pole',altitude:-78,x:195,roll:0},
    {name:'rolled-ground-crossing',altitude:-65,x:90,roll:30}];
  return scenarios.map(scenario=>{
    const basis=createSkyViewBasis(0,90+scenario.altitude,scenario.roll),start={x:scenario.x,y:640};
    const target=unprojectSkyPoint(start.x,start.y,basis,width,height,45),degrees=Math.atan2(target[0],target[1])*180/Math.PI,altitude=Math.asin(target[2])*180/Math.PI;
    let previous=basis,worst=0,maxGrabError=0,invalid=0;const samples=[];
    for(let y=639;y>=100;y--){
      const next=dragSkyView(basis,start,{x:scenario.x,y},width,height,45,undefined,'horizon');
      if(!validBasis(next))invalid++;
      for(const axis of ['right','up','forward'])worst=Math.max(worst,Math.acos(Math.max(-1,Math.min(1,next[axis].reduce((s,v,i)=>s+v*previous[axis][i],0))))*180/Math.PI);
      const projected=projectSkyDirection(degrees,altitude,next,width,height,45);
      if(projected)maxGrabError=Math.max(maxGrabError,Math.hypot(projected.x-scenario.x,projected.y-y));
      else maxGrabError=null;
      if([639,500,300,100].includes(y))samples.push({y,altitude:Math.asin(next.forward[2])*180/Math.PI,basis:next});
      previous=next;
    }
    return {scenario,worstOnePixelAxisStepDeg:worst,maxGrabErrorPx:maxGrabError,invalid,samples};
  });
};
window.landscapeProbe=async(family,altitude,background,red=false)=>{
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;document.body.replaceChildren(canvas);
  const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false,alpha:false});if(!gl)throw Error('webgl_required');
  const live={},original={};for(const kind of ['Texture','Framebuffer','Renderbuffer','Program','Buffer']){
    live[kind]=new Set();for(const op of ['create','delete'])original[op+kind]=gl[op+kind].bind(gl);
    gl['create'+kind]=()=>{const value=original['create'+kind]();if(value)live[kind].add(value);return value;};
    gl['delete'+kind]=value=>{live[kind].delete(value);return original['delete'+kind](value);};
  }
  const renderer=createSkyGpuRenderer(gl,1);let image=null,mask={kind:'procedural'};
  if(family==='panorama'){
    image=new Image();image.src=input.image;await image.decode();
    const pixels=document.createElement('canvas');pixels.width=image.width;pixels.height=image.height;
    const context=pixels.getContext('2d');context.drawImage(image,0,0);
    const rgba=context.getImageData(0,0,image.width,image.height).data,alpha=new Uint8Array(image.width*image.height);
    for(let index=0;index<alpha.length;index++)alpha[index]=rgba[index*4+3];
    mask=createSkyPanoramaMask(input.publication,input.resource,alpha);
  }
  const view={basis:createSkyViewBasis(0,90+altitude,0),verticalFovDeg:120};
  const opacity=skyLandscapeViewOpacity(view,width,height),sun={direction:[-Math.cos(24*Math.PI/180),0,-Math.sin(24*Math.PI/180)],altitudeDeg:-24};
  renderer.begin(width,height,background,image?[image]:[],red);
  const success=renderer.landscape(view,sun,red,image?{image,mask}:null,opacity);renderer.finish();gl.finish();
  const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const ray=unprojectSkyPoint(width/2,height/2,view.basis,width,height,120);
  const sample=(x,y)=>Array.from(pixels.subarray(((height-1-y)*width+x)*4,((height-1-y)*width+x)*4+4));
  const paintedMask=skyLandscapeMaskWithOpacity(mask,opacity),snapshot={width,height,view:{...view,landscape:paintedMask}};
  const result={success,error:gl.getError(),opacity,reveal:skyLandscapeViewReveal(view,width,height),
    center:sample(195,422),upper:sample(195,100),lower:sample(195,744),
    centerMaskAlpha:skyLandscapeMaskAlpha(paintedMask,ray),centerPickVisible:paintedSkyPointVisible(snapshot,195,422),png:canvas.toDataURL().split(',')[1]};
  renderer.dispose();result.liveAfterDispose=Object.fromEntries(Object.entries(live).map(([kind,set])=>[kind,set.size]));
  gl.getExtension('WEBGL_lose_context')?.loseContext();return result;
};`;
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [], geometry = {}, errors = [];
try {
  for (const variant of ['baseline', 'candidate']) {
    const bundle = await build({ stdin: { contents: entry, resolveDir: root, loader: 'ts' }, bundle: true,
      write: false, platform: 'browser', format: 'iife', plugins: variant === 'baseline' ? [{
        name: 'original-affected-owners', setup(build) {
          build.onLoad({ filter: /sky-(?:manual-view|landscape)\.ts$/ }, async args => {
            const relative = path.relative(root, args.path).replaceAll('\\', '/');
            return before.has(relative) ? { contents: before.get(relative).toString(), loader: 'ts', resolveDir: path.dirname(args.path) } : undefined;
          });
        },
      }] : [] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    page.on('pageerror', error => errors.push(String(error)));
    await page.setContent('<!doctype html><style>body{margin:0}</style>');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    geometry[variant] = await page.evaluate(() => window.geometryProbe());
    for (const family of ['procedural', 'panorama']) {
      for (const condition of [
        { name: 'night-horizon', altitude: 0, background: '#080D17' },
        ...[-3,-7.5,-15,-45].map(altitude => ({ name: 'below-' + Math.abs(altitude), altitude, background: '#080D17' })),
        { name: 'alpha-black', altitude: -45, background: '#000000' },
        { name: 'alpha-white', altitude: -45, background: '#FFFFFF' },
        { name: 'red-below', altitude: -45, background: '#000000', red: true },
      ]) {
        const result = await page.evaluate(async ({ family, condition }) =>
          window.landscapeProbe(family, condition.altitude, condition.background, condition.red), { family, condition });
        assert(result.success && result.error === 0, 'production_landscape_pass_required');
        assert(Object.values(result.liveAfterDispose).every(count => count === 0), 'all_gpu_handles_retired');
        const file = variant + '-' + family + '-' + condition.name + '.png';
        await fs.writeFile(path.join(output, file), Buffer.from(result.png, 'base64'), { flag: 'wx' });
        delete result.png; rows.push({ variant, family, condition, file, ...result });
      }
    }
    await page.close();
  }
} finally { await browser.close(); }
assert.deepEqual(errors, []);
const comparisons = [];
for (const row of rows.filter(value => value.variant === 'baseline')) {
  const candidate = rows.find(value => value.variant === 'candidate' && value.family === row.family && value.condition.name === row.condition.name);
  const previous = await sharp(path.join(output, row.file)).ensureAlpha().raw().toBuffer();
  const next = await sharp(path.join(output, candidate.file)).ensureAlpha().raw().toBuffer();
  let changedPixels = 0, maximumChannelDifference = 0;
  for (let index = 0; index < previous.length; index += 4) {
    let changed = false;
    for (let channel = 0; channel < 4; channel++) {
      const difference = Math.abs(previous[index+channel] - next[index+channel]);
      changed ||= difference > 0; maximumChannelDifference = Math.max(maximumChannelDifference, difference);
    }
    if (changed) changedPixels++;
  }
  assert.equal(candidate.centerMaskAlpha, row.centerMaskAlpha, 'effective_geometry_alpha_unchanged');
  assert.equal(candidate.centerPickVisible, row.centerPickVisible, 'same_alpha_picking_unchanged');
  if (row.condition.name === 'night-horizon' || row.condition.name === 'red-below') assert.equal(changedPixels, 0, 'ordinary_horizon_and_red_unchanged');
  comparisons.push({ family: row.family, condition: row.condition.name, changedPixels, maximumChannelDifference,
    beforeCenter: row.center, afterCenter: candidate.center, centerMaskAlpha: candidate.centerMaskAlpha,
    centerPickVisible: candidate.centerPickVisible });
}
const alphaComparisons = [];
for (const family of ['procedural', 'panorama']) {
  const pixels = async (variant, name) => {
    const row = rows.find(value => value.variant === variant && value.family === family && value.condition.name === name);
    return sharp(path.join(output, row.file)).ensureAlpha().raw().toBuffer();
  };
  const [oldBlack, oldWhite, newBlack, newWhite] = await Promise.all([
    pixels('baseline', 'alpha-black'), pixels('baseline', 'alpha-white'),
    pixels('candidate', 'alpha-black'), pixels('candidate', 'alpha-white'),
  ]);
  let differingChannels = 0, maximumTransmittanceDeltaByte = 0;
  for (let index = 0; index < oldBlack.length; index += 4) for (let channel = 0; channel < 3; channel++) {
    const before = oldWhite[index+channel] - oldBlack[index+channel];
    const after = newWhite[index+channel] - newBlack[index+channel];
    const delta = Math.abs(before - after);
    if (delta) differingChannels++;
    maximumTransmittanceDeltaByte = Math.max(maximumTransmittanceDeltaByte, delta);
  }
  // Subtracting independently rounded RGBA8 blends has at most one byte of
  // quantization uncertainty; the source and shader alpha remain identical.
  assert(maximumTransmittanceDeltaByte <= 1, 'composed_transmittance_unchanged');
  alphaComparisons.push({ family, differingChannels, maximumTransmittanceDeltaByte });
}
const result = { scope: 'SOFTWARE_SWIFTSHADER_GEOMETRY_AND_COMPOSITION_NOT_WECHAT_OR_DEVICE_ACCEPTANCE', baseline,
  source, photograph: { path: manifestPath, publicationId: publication.publicationId,
    imageSha256: resource.image.sha256, decodedAlphaSha256: resource.alpha.decodedSha256,
    credit: publication.source.credit, license: publication.source.derivativeLicense }, geometry, comparisons, alphaComparisons, rows, errors };
await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, comparisons, geometry: Object.fromEntries(Object.entries(geometry).map(([key,value]) =>
  [key,value.map(({scenario,worstOnePixelAxisStepDeg,maxGrabErrorPx,invalid}) => ({scenario,worstOnePixelAxisStepDeg,maxGrabErrorPx,invalid}))])) }, null, 2));
