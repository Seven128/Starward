const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const src='C:/Users/777/Desktop/icons/补充/补充2',out='C:/Users/777/Desktop/icons-supplement2-256-2026-09-13';
const pack='E:/Dev/Starward/docs/design-resources/wechat-miniapp/shared/icons/adopted/b-matte-256';
const inventory=JSON.parse(fs.readFileSync(path.join(out,'review/source-inventory.json')));
const ids=[['favorite-satellite','default'],['spot-marker','pending'],['spot-marker','default'],['favorite-trail','default'],['account-user','selected'],['spot-marker','selected'],['spot-marker','selected'],['map','selected']];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),png={compressionLevel:9,adaptiveFiltering:true,palette:false};
(async()=>{
 fs.mkdirSync(path.join(out,'png-256'),{recursive:true});const manifest=[],duplicates=[],seen=new Map();
 for(let i=0;i<inventory.length;i++){
  const r=inventory[i],[id,state]=ids[i];
  if(seen.has(r.sha256)){duplicates.push({file:r.file,duplicateOf:seen.get(r.sha256),sha256:r.sha256});continue;}seen.set(r.sha256,r.file);
  const input=fs.readFileSync(path.join(src,r.file));if(hash(input)!==r.sha256)throw Error('Source mismatch');
  const {data,info}=await sharp(input).resize(256,256,{kernel:'lanczos3'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const file=`png-256/${id}--day--${state}.png`,output=path.join(out,file);
  await sharp(data,{raw:{width:info.width,height:info.height,channels:info.channels}}).png(png).toFile(output);
  if(!data.equals(await sharp(output).ensureAlpha().raw().toBuffer()))throw Error('Roundtrip mismatch');
  const meta=await sharp(output).metadata();if(!meta.hasAlpha||meta.width!==256||meta.height!==256)throw Error('Invalid output');
  manifest.push({id,state,status:id==='spot-marker'?'needs-family-alignment':'adopted',sourceFile:r.file,sourceRoot:src,sourceWidth:r.width,sourceHeight:r.height,sourceSha256:r.sha256,outputs:{256:{file,bytes:fs.statSync(output).size,sha256:hash(fs.readFileSync(output)),losslessPngRoundtrip:true}}});
 }
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));fs.writeFileSync(path.join(out,'review/duplicates.json'),JSON.stringify(duplicates,null,2));
 const adopted=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json')));
 for(const dark of [false,true]){
  const layers=[];
  for(let i=0;i<manifest.length;i++){const r=manifest[i],x=i*150;
   layers.push({input:await sharp(path.join(out,r.outputs[256].file)).resize(64,64).png().toBuffer(),left:x+43,top:10});
   layers.push({input:Buffer.from(`<svg width="150" height="40"><text x="75" y="15" text-anchor="middle" font-family="Arial" font-size="11" fill="${dark?'#ccc':'#333'}">${r.id}</text><text x="75" y="30" text-anchor="middle" font-family="Arial" font-size="10" fill="${dark?'#ccc':'#333'}">${r.state}</text></svg>`),left:x,top:85});
  }
  await sharp({create:{width:1050,height:130,channels:4,background:dark?'#20242c':'#fff'}}).composite(layers).png(png).toFile(path.join(out,`review/small-${dark?'dark':'light'}.png`));
 }
 const layers=[];
 for(let i=0;i<2;i++)for(let j=0;j<2;j++){
  const id=['map','account-user'][i],r=(j?manifest:adopted).find(r=>r.id===id),input=path.join(j?out:pack,r.outputs[256].file);
  for(let k=0;k<2;k++){
   let img=sharp(input).resize(32,32);if(k)img=img.grayscale();
   const small=await img.png().toBuffer();
   layers.push({input:small,left:160+j*240,top:30+i*200+k*80});
   layers.push({input:await sharp(small).resize(96,96,{kernel:'nearest'}).png().toBuffer(),left:210+j*240,top:10+i*200+k*80});
  }
 }
 layers.push({input:Buffer.from('<svg width="650" height="450"><style>text{font:14px Arial;fill:#333}</style><text x="160" y="440">Default: 32px + 3x pixel view</text><text x="400" y="440">Selected: 32px + 3x</text><text x="10" y="50">map / color</text><text x="10" y="130">map / gray</text><text x="10" y="250">user / color</text><text x="10" y="330">user / gray</text></svg>'),left:0,top:0});
 await sharp({create:{width:650,height:450,channels:4,background:'#e7e9ee'}}).composite(layers).png(png).toFile(path.join(out,'review/navigation-32px.png'));
 const stats={receivedFiles:inventory.length,uniqueFiles:manifest.length,duplicateFiles:duplicates.length,sourceBytes:inventory.reduce((s,r)=>s+r.bytes,0),uniqueSourceBytes:inventory.filter(r=>!duplicates.some(d=>d.file===r.file)).reduce((s,r)=>s+r.bytes,0),png256Bytes:manifest.reduce((s,r)=>s+r.outputs[256].bytes,0),adopted:manifest.filter(r=>r.status==='adopted').length};
 fs.writeFileSync(path.join(out,'review/metrics.json'),JSON.stringify(stats,null,2));console.log(JSON.stringify(stats));
})();
