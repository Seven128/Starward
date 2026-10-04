/** Read-only actual current publications/source boundaries; no hooks, GPU, network or runtime startup. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const bind=name=>{const b=fs.readFileSync(path.join(ROOT,name));return {path:name,bytes:b.length,sha256:hash(b)};};
const sky='apps/wechat-miniapp/src/features/sky/';
const owners=['use-sky-artwork.ts','use-sky-fixed-image.ts','use-sky-moon-texture.ts','use-sky-mars-texture.ts','use-sky-mercury-texture.ts',
 'use-sky-opal-bands.ts','use-sky-jupiter-bands.ts','use-sky-saturn-bands.ts','use-sky-uranus-bands.ts','use-sky-neptune-bands.ts',
 'use-sky-wide-field-w3.ts','use-sky-galactic-image.ts','use-sky-landscape.ts','use-sky-sdss-optical.ts','use-sky-optical-hips.ts',
 'sky-artwork-loader.ts','sky-artwork-request.ts','sky-gpu-textures.ts','sky-gpu-renderer.ts','sky-landscape-resources.ts',
 'sky-galactic-image-window.ts','sky-artwork-texture-window.ts','sky-hips-tile-selection.ts','sky-constellation-visibility.ts',
 'sky-sdss-optical-selection.ts','spot-sky-page.tsx','deep-sky-image-request.ts'].map(p=>sky+p);
owners.push('apps/wechat-miniapp/src/services/sky-public-image-runtime.ts','apps/wechat-miniapp/src/services/sky-public-image-cache.ts');
let output='output/shared-resource-reading-1002-r1';for(let n=2;fs.existsSync(path.join(ROOT,output));n++)output=`output/shared-resource-reading-1002-r${n}`;
const dir=path.join(ROOT,output);fs.mkdirSync(dir);
const sourceBindings=owners.map(bind);
sourceBindings.forEach((b,i)=>fs.copyFileSync(path.join(ROOT,b.path),path.join(dir,`${i}-${path.basename(b.path)}.txt`),fs.constants.COPYFILE_EXCL));
const manifestBindings=[],images=[];
const readManifest=name=>{manifestBindings.push(bind(name));return JSON.parse(fs.readFileSync(path.join(ROOT,name),'utf8'));};
const add=(family,folder,asset,width=asset.width,height=asset.height)=>{
 const file=folder+'/'+asset.file,body=fs.readFileSync(path.join(ROOT,file));
 assert.equal(body.length,asset.bytes);assert.equal(hash(body),asset.sha256);assert.ok(Number.isInteger(width)&&Number.isInteger(height)&&width>0&&height>0);
 images.push({family,file,sha256:asset.sha256,bytes:asset.bytes,width,height,sourceRgbaBytes:width*height*4});
};
const assets='workers/miniapp-api/assets/';
for(const family of ['moon','mars','mercury','jupiter','saturn','uranus','neptune']){
 const m=readManifest(assets+family+'/'+(family==='moon'?'coverage-manifest.json':'manifest.json'));add(family,assets+family,m.image);
}
const galactic=readManifest(assets+'deep-sky/galactic-2mass/manifest.json');add('galactic',assets+'deep-sky/galactic-2mass',galactic.image);
const landscape=readManifest(assets+'landscape/manifest.json');for(const r of landscape.resources)add('landscape',assets+'landscape',r.image);
const wide=readManifest(assets+'deep-sky/wide-field-w3/manifest.json');for(const tile of wide.tiles)add('wide-field-w3',assets+'deep-sky/wide-field-w3',tile,512,512);
for(const object of ['m51','m63','m64','m81','m82','m87']){
 const m=readManifest(assets+'deep-sky/sdss-'+object+'/manifest.json');for(const level of Object.values(m.levels))add('sdss-optical',assets+'deep-sky/sdss-'+object,level,level.pixels,level.pixels);
}
const selected=readManifest(assets+'deep-sky/manifest.json');for(const entry of selected.entries)for(const level of Object.values(entry.levels))add('selected-w3',assets+'deep-sky',level,level.pixels,level.pixels);
const admittedIndexPath='output/selected-w3-server-publication-1002-r2/export/publication/index.json';
manifestBindings.push(bind(admittedIndexPath));
const admitted=JSON.parse(fs.readFileSync(path.join(ROOT,admittedIndexPath),'utf8'));
for(const r of admitted.records.filter(r=>r.route.startsWith('/v2/sky/constellations/')&&r.route.endsWith('.png'))){
 const file=r.route.slice(r.route.lastIndexOf('/')+1),body=fs.readFileSync(path.join(ROOT,assets+'constellations/'+file));
 add('constellations',assets+'constellations',{file,bytes:r.bytes,sha256:r.sha256},body.readUInt32BE(16),body.readUInt32BE(20));
}
assert.equal(images.length,278);assert.equal(images.reduce((n,i)=>n+i.bytes,0),14234205);
const familyTotals=[...new Set(images.map(i=>i.family))].map(family=>{
 const rows=images.filter(i=>i.family===family);return {family,files:rows.length,encodedBytes:rows.reduce((n,i)=>n+i.bytes,0),
  inventorySourceRgbaBytes:rows.reduce((n,i)=>n+i.sourceRgbaBytes,0),dimensions:[...new Set(rows.map(i=>`${i.width}x${i.height}`))]};
});
assert.deepEqual(owners.map(bind),sourceBindings);assert.deepEqual(manifestBindings.map(b=>bind(b.path)),manifestBindings);
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(dir,'executed-script.mjs.txt'),fs.constants.COPYFILE_EXCL);
fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify({status:'READ_ONLY_BOUND',sourceBindings,manifestBindings,images,familyTotals,
 scope:'Actual encoded byte/hash/declared dimensions readback for all 278 current admitted images. Inventory and source-equivalent RGBA arithmetic are not simultaneous wanted sets, decoded physical memory, driver allocation, native latency, acceptance or capacity. Source snapshots identify current API/lifecycle/retention boundaries only; no runtime, hook or frame was executed.'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,result:bind(output+'/result.json'),familyTotals},null,2));
