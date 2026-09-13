const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const source='C:/Users/777/Desktop/icons/补充',out='C:/Users/777/Desktop/icons-supplement-256-2026-09-13';
const pack='E:/Dev/Starward/docs/design-resources/wechat-miniapp/shared/icons/adopted/b-matte-256';
const inventory=JSON.parse(fs.readFileSync(path.join(out,'review/source-inventory.json')));
const mapping=[['spot-marker','default'],['wifi-off','default'],['map','selected'],['favorite-trail','default'],['walking','default'],['spot-marker','pending'],['restroom','default'],['parking','default'],['spot-marker','draft'],['favorite-star','default'],['tent','default'],['charging','default'],['favorite-satellite','default'],['transit','default'],['signal','default'],['spot-marker','selected'],['account-user','selected']];
const base=new Set(['wifi-off','walking','restroom','parking','tent','charging','transit','signal']);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const png={compressionLevel:9,adaptiveFiltering:true,palette:false};
(async()=>{
fs.mkdirSync(path.join(out,'png-256'),{recursive:true});
const manifest=[];
for(let i=0;i<inventory.length;i++){
 const row=inventory[i],[id,state]=mapping[i],input=path.join(source,row.file),buffer=fs.readFileSync(input);
 if(hash(buffer)!==row.sha256)throw Error('Source changed');
 const {data,info}=await sharp(buffer).resize(256,256,{kernel:'lanczos3'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const filename=`${id}--day--${state}.png`,file=path.join(out,'png-256',filename);
 await sharp(data,{raw:{width:info.width,height:info.height,channels:info.channels}}).png(png).toFile(file);
 if(!data.equals(await sharp(file).ensureAlpha().raw().toBuffer()))throw Error('PNG mismatch');
 const meta=await sharp(file).metadata();if(meta.width!==256||meta.height!==256||!meta.hasAlpha)throw Error('Invalid output');
 const displayComparison={};
 for(const size of [72,96,144,192]){
  const a=await sharp(buffer).resize(size,size).ensureAlpha().raw().toBuffer(),b=await sharp(file).resize(size,size).ensureAlpha().raw().toBuffer();
  let sum=0,n=0;for(const bg of [255,32])for(let k=0;k<a.length;k+=4)for(let c=0;c<3;c++){const d=a[k+c]*a[k+3]/255+bg*(1-a[k+3]/255)-b[k+c]*b[k+3]/255-bg*(1-b[k+3]/255);sum+=d*d;n++;}
  displayComparison[size]={rgbRmse255:Math.sqrt(sum/n)};
 }
 manifest.push({id,state,status:base.has(id)?'adopted':'needs-state-review',sourceFile:row.file,sourceRoot:source,sourceWidth:row.width,sourceHeight:row.height,sourceSha256:row.sha256,outputs:{256:{file:`png-256/${filename}`,bytes:fs.statSync(file).size,sha256:hash(fs.readFileSync(file)),losslessPngRoundtrip:true}},displayComparison});
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
const old=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json')));
const pairs=['favorite-star','map','account-user'];
const overlays=[];
for(let i=0;i<pairs.length;i++)for(let j=0;j<2;j++){
 const r=(j?manifest:old).find(r=>r.id===pairs[i]);
 overlays.push({input:await sharp(path.join(j?out:pack,r.outputs[256].file)).resize(144,144).png().toBuffer(),left:200+j*220,top:40+i*185});
}
overlays.push({input:Buffer.from(`<svg width="700" height="600"><style>text{font:16px Arial;fill:#444}</style><text x="200" y="24">Previous</text><text x="420" y="24">Supplement</text>${pairs.map((s,i)=>`<text x="12" y="${120+i*185}">${s}</text>`).join('')}</svg>`),left:0,top:0});
await sharp({create:{width:700,height:600,channels:4,background:'#e7e9ee'}}).composite(overlays).png(png).toFile(path.join(out,'review/state-pairs.png'));
for(const dark of [false,true]){
 const overlays=[];
 for(let i=0;i<manifest.length;i++){
  const r=manifest[i],x=(i%6)*165,y=Math.floor(i/6)*110;
  overlays.push({input:await sharp(path.join(out,r.outputs[256].file)).resize(64,64).png().toBuffer(),left:x+50,top:y+4});
  overlays.push({input:Buffer.from(`<svg width="165" height="40"><text x="82" y="14" text-anchor="middle" font-family="Arial" font-size="11" fill="${dark?'#ccc':'#333'}">${r.id}</text><text x="82" y="29" text-anchor="middle" font-family="Arial" font-size="10" fill="${dark?'#ccc':'#333'}">${r.state}</text></svg>`),left:x,top:y+70});
 }
 await sharp({create:{width:990,height:330,channels:4,background:dark?'#20242c':'#fff'}}).composite(overlays).png(png).toFile(path.join(out,`review/small-${dark?'dark':'light'}.png`));
}
const stats={count:manifest.length,sourceBytes:inventory.reduce((s,r)=>s+r.bytes,0),outputBytes:manifest.reduce((s,r)=>s+r.outputs[256].bytes,0),adoptedBase:manifest.filter(r=>r.status==='adopted').length,maxRmse:Math.max(...manifest.flatMap(r=>Object.values(r.displayComparison).map(x=>x.rgbRmse255)))};
fs.writeFileSync(path.join(out,'review/metrics.json'),JSON.stringify(stats,null,2));console.log(JSON.stringify(stats));
})();
