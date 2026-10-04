// Independent saved-output reader. No browser/GPU/HTTP/source decoding or production mutation.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const source='output/playwright/cloud-sky-prepared-optical-pixels-1003-r4';
const out='output/prepared-pixels-independent-1003-r1';
assert(!fs.existsSync(path.resolve(ROOT,out)));fs.mkdirSync(path.resolve(ROOT,out));
const read=p=>fs.readFileSync(path.resolve(ROOT,p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const json=p=>JSON.parse(read(p).toString('utf8'));
const binding=p=>{const b=read(p);return {path:p,bytes:b.length,sha256:sha(b)};};
const inputs=new Map();
const admit=(p,expected)=>{const b=binding(p);if(expected?.bytes!==undefined)assert.equal(b.bytes,expected.bytes,p);if(expected?.sha256)assert.equal(b.sha256,expected.sha256,p);if(inputs.has(p))assert.deepEqual(b,inputs.get(p));inputs.set(p,b);return b;};
const write=(name,value)=>fs.writeFileSync(path.resolve(ROOT,out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
fs.copyFileSync(fileURLToPath(import.meta.url),path.resolve(ROOT,out,'executed-reader.mjs'),fs.constants.COPYFILE_EXCL);

// Independent PNG chunk CRC / zlib / filters 0..4. No author image helper is used.
const crc32=b=>{let c=0xffffffff;for(const x of b){c^=x;for(let k=0;k<8;k++)c=c&1?(c>>>1)^0xedb88320:c>>>1;}return(c^0xffffffff)>>>0;};
function png(b,width,height){
 assert.deepEqual(b.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));
 let at=8,ended=false,header=false;const chunks=[],filters=new Set();
 while(at<b.length){assert(at+12<=b.length);const n=b.readUInt32BE(at),tag=b.toString('ascii',at+4,at+8),end=at+12+n;assert(end<=b.length);assert.equal(crc32(b.subarray(at+4,end-4)),b.readUInt32BE(end-4));const data=b.subarray(at+8,end-4);
  if(tag==='IHDR'){assert(!header&&at===8);assert.equal(n,13);assert.equal(data.readUInt32BE(0),width);assert.equal(data.readUInt32BE(4),height);assert.deepEqual([...data.subarray(8)],[8,6,0,0,0]);header=true;}
  if(tag==='IDAT'){assert(header);chunks.push(data);}at=end;if(tag==='IEND'){assert.equal(n,0);ended=true;break;}
 }assert(ended&&header);assert.equal(at,b.length);
 const stride=width*4,z=inflateSync(Buffer.concat(chunks),{maxOutputLength:(stride+1)*height});assert.equal(z.length,(stride+1)*height);const rgba=Buffer.alloc(stride*height);
 for(let y=0;y<height;y++){const filter=z[y*(stride+1)];assert(filter<=4);filters.add(filter);for(let x=0;x<stride;x++){const a=x>=4?rgba[y*stride+x-4]:0,u=y?rgba[(y-1)*stride+x]:0,ul=x>=4&&y?rgba[(y-1)*stride+x-4]:0;let p=0;if(filter===1)p=a;if(filter===2)p=u;if(filter===3)p=(a+u)>>1;if(filter===4){const q=a+u-ul,da=Math.abs(q-a),du=Math.abs(q-u),dul=Math.abs(q-ul);p=da<=du&&da<=dul?a:du<=dul?u:ul;}rgba[y*stride+x]=(z[y*(stride+1)+x+1]+p)&255;}}
 return {rgba,filters:[...filters].sort()};
}
function diff(a,b){assert.equal(a.length,b.length);let rgbPixels=0,rgbaPixels=0,bytes=0,max=0;for(let i=0;i<a.length;i+=4){let rgb=false,any=false;for(let c=0;c<4;c++){const d=Math.abs(a[i+c]-b[i+c]);if(d){any=true;if(c<3)rgb=true;bytes++;max=Math.max(max,d);}}if(rgb)rgbPixels++;if(any)rgbaPixels++;}return {rgbPixels,rgbaPixels,changedBytes:bytes,maxChannelDifference:max,exact:bytes===0};}
try{
 admit(fileURLToPath(import.meta.url));
 for(const name of fs.readdirSync(path.resolve(ROOT,source)))if(fs.statSync(path.resolve(ROOT,source,name)).isFile())admit(source+'/'+name);
 admit(source+'/result.json',{bytes:6988,sha256:'cd0871213b33b5a4de5b1b97b3d864e1513903e528801e432b1e603d0806db11'});
 const r=json(source+'/result.json');assert.equal(r.status,'PASSED_BOUNDED_PREPARED_SOFTWARE_SCENE_PIXELS');assert.deepEqual(r.errors,[]);
 const host=json(source+'/inputs-before.json'),hostAfter=json(source+'/inputs-after.json'),parsed=json(source+'/parsed-inputs.json'),parsedAfter=json(source+'/parsed-inputs-after.json');
 assert.deepEqual(host,hostAfter);assert.deepEqual(parsed,parsedAfter);assert.equal(host.length,15);assert.equal(parsed.length,97);for(const b of [...host,...parsed])admit(b.path,b);
 const protectedPath=task+'/tmp/resume-preserved-hashes-2026-10-01.json';admit(protectedPath);const protectedRows=json(protectedPath);assert.equal(protectedRows.length,6);for(const b of protectedRows){admit(b.path,b);assert(host.some(i=>i.path===b.path&&i.sha256===b.sha256));}
 const authorPath=task+'/scripts/experience-prepared-optical-pixels-2026-10-03.mjs';admit(authorPath,{bytes:13850,sha256:'9177e28befcc169eb902beed13f2e7725de0d1f3fb0511595baa7d8dfa0a294b'});assert.deepEqual(read(authorPath),read(source+'/executed-script.mjs'));
 const meta=json(source+'/bundle-metafile.json');assert.deepEqual(Object.keys(meta.inputs).filter(k=>k!=='<stdin>').sort(),parsed.map(b=>b.path).sort());for(const b of parsed)assert.equal(meta.inputs[b.path].bytes,b.bytes);
 const output=Object.values(meta.outputs);assert.equal(output.length,1);assert.equal(output[0].bytes,read(source+'/executed-browser-bundle.js').length);assert.equal(output[0].imports.length,0);
 const require=createRequire(path.resolve(ROOT,'apps/wechat-miniapp/package.json'));const ts=require('typescript');assert.equal(ts.version,'5.9.3');
 const entry=read(source+'/executed-browser-entry.ts').toString('utf8'),ast=ts.createSourceFile('entry.ts',entry,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(ast.parseDiagnostics.length,0);const nodes=[];const walk=n=>{nodes.push(n);ts.forEachChild(n,walk);};walk(ast);
 const declaration=name=>{const all=nodes.filter(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)===name);assert.equal(all.length,1,name);return all[0].initializer;};
 const pub=JSON.parse(declaration('publication').getText(ast)),data=JSON.parse(declaration('data').getText(ast));const manifestPath='output/prepared-optical-publication-1003-r4/publication/manifest.json';const manifest=json(manifestPath);assert.deepEqual(pub,manifest);assert.equal(pub.publicationHash,'8eb8336aa5a75d104807327acab5990f38e0e22000713ab639a4c95cd443a802');assert.equal(pub.source.nominalAvm.accuracy,'UNVERIFIED_APPROXIMATE_PUBLISHER_AVM');
 const calls=nodes.filter(n=>ts.isCallExpression(n)&&n.expression.getText(ast)==='createSkyGpuRenderer');assert.equal(calls.length,1);assert.equal(calls[0].arguments[0].getText(ast),'gl');assert.equal(calls[0].arguments[1].getText(ast),'1');assert(ts.isObjectLiteralExpression(calls[0].arguments[2]));assert.deepEqual(calls[0].arguments[2].properties.map(p=>p.name.getText(ast)),['imageFailed']);
 const report=declaration('report').getText(ast);assert(report.includes("skyScene:{state:'UNAVAILABLE',catalog:null"));assert(report.includes("deepSky:{state:'UNAVAILABLE',catalog:null"));assert(report.includes('equatorialToEnu:[1,0,0,0,1,0,0,0,1]'));
 for(const fragment of ['await image.decode()','if(condition.retireFine)active[condition.level]=false','args[37]={surface:renderer','else args[36]={surface:renderer','gl.readPixels(0,0,width,height','renderer.dispose();retire.forEach(fn=>fn())'])assert(entry.includes(fragment));
 const sourcePng=[];for(const[level,a]of Object.entries(pub.levels)){const p='output/prepared-optical-publication-1003-r4/publication/'+a.file,b=read(p);admit(p,a);assert.deepEqual(Buffer.from(data[level].split(',')[1],'base64'),b);const decoded=png(b,512,512),counts={opaque:0,partial:0,zero:0};let validBlack=0;for(let i=0;i<decoded.rgba.length;i+=4){const alpha=decoded.rgba[i+3];counts[alpha===255?'opaque':alpha===0?'zero':'partial']++;if(alpha&&decoded.rgba[i]===0&&decoded.rgba[i+1]===0&&decoded.rgba[i+2]===0)validBlack++;}assert.deepEqual(counts,a.alphaPixels);assert.equal(a.displayAlpha,'geometric-source-area');assert.equal(a.scientificAvailability,'UNKNOWN');sourcePng.push({level,encoded:binding(p),width:512,height:512,filters:decoded.filters,decodedRgbaSha256:sha(decoded.rgba),alphaPixels:counts,alphaPositiveBlackPixels:validBlack});}
 const sourceBytes=sourcePng.reduce((s,a)=>s+a.encoded.bytes,0);assert.equal(sourceBytes,1315239);
 const rows=[],raws=new Map(),names=['overview','medium-parent','detail-parent-rotated','retired-detail-coarse','medium-only-same-view','wrong-family-port'];assert.deepEqual(r.rows.map(x=>x.condition.name),names);
 for(const row of r.rows){const stem=source+'/'+row.condition.name;admit(stem+'.rgba',row.rgba);admit(stem+'.png',row.png);admit(stem+'-baseline.rgba',{bytes:390*844*4,sha256:row.baselineRgbaSha256});const raw=read(stem+'.rgba'),bg=read(stem+'-baseline.rgba'),decoded=png(read(stem+'.png'),390,844);assert.equal(raw.length,390*844*4);
  for(let y=0;y<844;y++)assert.deepEqual(decoded.rgba.subarray(y*1560,(y+1)*1560),raw.subarray((843-y)*1560,(844-y)*1560));const d=diff(raw,bg);assert.equal(d.rgbPixels,row.differentPixels);assert.equal(d.rgbaPixels,d.rgbPixels);for(let i=3;i<raw.length;i+=4){assert.equal(raw[i],255);assert.equal(bg[i],255);}assert.equal(row.error,0);assert.equal(row.done,1);assert.equal(row.completed,null);assert.equal(row.liveTextureObjects,0);assert.equal(row.textureObjects.created,row.textureObjects.deleted);assert.deepEqual(row.decoded,{OVERVIEW:[512,512],MEDIUM:[512,512],DETAIL:[512,512]});
  const summary=json(stem+'-actual-summary.json');assert.deepEqual(summary,{condition:row.condition,error:row.error,done:row.done,failed:row.failed,completed:row.completed,textureObjects:row.textureObjects});
  rows.push({condition:row.condition,pngAndBottomFirstRgbaExact:true,pngFilters:decoded.filters,differenceFromBackground:d,actualTextureObjectCounts:row.textureObjects,liveTrackedTextureObjects:row.liveTextureObjects,failed:row.failed,completion:row.completed});raws.set(row.condition.name,raw);
 }
 assert.deepEqual(raws.get('retired-detail-coarse'),raws.get('medium-only-same-view'));assert.deepEqual(read(source+'/retired-detail-coarse.png'),read(source+'/medium-only-same-view.png'));assert.deepEqual(r.rows[3].failed,['DETAIL']);assert.deepEqual(r.rows[4].failed,[]);assert.equal(rows[5].differenceFromBackground.exact,true);assert.equal(r.rows[5].textureObjects.created,0);
 const fineEffect=diff(raws.get('detail-parent-rotated'),raws.get('medium-only-same-view'));assert(fineEffect.rgbPixels>0);
 const oneByte=Buffer.from(raws.get('detail-parent-rotated'));oneByte[0]^=1;const mutation=diff(oneByte,raws.get('detail-parent-rotated'));assert.equal(mutation.changedBytes,1);assert.equal(mutation.rgbPixels,1);assert(!mutation.exact);
 const az=(90-pub.center.raDeg+360)%360,alt=pub.center.decDeg,rad=Math.PI/180;const target=[Math.cos(pub.center.decDeg*rad)*Math.cos(pub.center.raDeg*rad),Math.cos(pub.center.decDeg*rad)*Math.sin(pub.center.raDeg*rad),Math.sin(pub.center.decDeg*rad)];const forward=[Math.cos(alt*rad)*Math.sin(az*rad),Math.cos(alt*rad)*Math.cos(az*rad),Math.sin(alt*rad)];const maxForward=Math.max(...target.map((x,i)=>Math.abs(x-forward[i])));assert(maxForward<1e-14);
 const bundle=read(source+'/executed-browser-bundle.js').toString('utf8');for(const owner of ['sky-target-optical-scene.ts','sky-prepared-optical-scene.ts','sky-sdss-optical-completion.ts','sky-gpu-artwork-contributions.ts'])assert(bundle.includes(owner));const budget=read('apps/wechat-miniapp/src/features/sky/sky-gpu-artwork-contributions.ts').toString('utf8');assert(budget.includes('if (disposed || !enabled) return;'));assert(budget.includes('if (!enabled || disposed || !frameOpen || faulted || !draw.submitted) return;'));assert(budget.includes('if (!entry) return unknownContribution;'));
 const before=[...inputs.values()],after=before.map(b=>binding(b.path));assert.deepEqual(before,after);
 write('bindings.json',{inputsBefore:before,inputsAfter:after,unchanged:true});
 write('result.json',{status:'INDEPENDENT_SAVED_PREPARED_PIXEL_READBACK_PASS_WITH_QUALITY_FAILURE',authorResult:binding(source+'/result.json'),authorExecutedScript:binding(authorPath),actualBundle:binding(source+'/executed-browser-bundle.js'),manifest:binding(manifestPath),publicationHash:pub.publicationHash,hostBindings:host.length,parserSameBufferBindings:parsed.length,protectedFiles:6,currentBeforeAfterExact:true,sourceBytes,sourcePng,fullPngToRgbaFrames:6,rows,retiredDetailExactlyMediumOnly:true,wrongFamilyExactlyBackground:true,defaultAllOpticalCompletionsNull:true,actualDetailVersusMediumOnly:fineEffect,readerSingleByteCounterexample:mutation,identityRotationTargetCameraError:maxForward,scope:{browser:'Chromium 151.0.7922.34 via recorded Playwright 1.62.1/SwiftShader',catalog:'UNAVAILABLE',view:'390x844 controlled fixed report with six frames and six image-free backgrounds',visualFinding:'Actually inspected overview.png and detail-parent-rotated.png. Overview has a plainly bounded tilted photograph rectangle and hard sky/background seam; detail crop displays source structure but does not test footprint boundary closure. Quality adoption remains failed.',resource:'Actual wrapped texture-object counts return to zero for each renderer; no full texture-byte/buffer/FBO/program/driver ledger was captured. These counters cannot establish GPU/native total memory.',bindings:'97 exact parser buffers and 15 selected host identities match recorded pre/post and current; saved bundle closes execution bytes. No complete vendor/tool loaded-module trace or independently reproducible build claim.',unverified:['ordinary page/Hook/accepted display or full visible attribution','auxiliary contribution budget and completed source credit','scientific validity, absolute AVM astrometry, PSF/physical resolution, edge quality','native WEAPP decode/Canvas/GPU/FS/driver memory, timing or capacity','default registry/adoption; full interactive star-sky composition'],execution:'Read saved files and decode saved PNG only; no browser/GPU/HTTP/source JPEG/FITS decode/reprojection/test matrix/production changes'}});
 console.log(JSON.stringify({result:binding(out+'/result.json'),bindings:binding(out+'/bindings.json'),inputs:before.length,fullPngFrames:6,sourcePng:3,fineEffect}));
}catch(error){write('failed.json',{status:'FAILED_INDEPENDENT_SAVED_READER',message:String(error),inputs:[...inputs.values()]});throw error;}
