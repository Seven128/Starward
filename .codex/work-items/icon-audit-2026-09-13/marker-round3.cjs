const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root='C:/Users/777/Desktop/地图图标返修3-核对',png={compressionLevel:9,adaptiveFiltering:true,palette:false};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 fs.mkdirSync(path.join(root,'png-256'),{recursive:true});const records=[];
 for(const state of ['default','selected','draft','pending']){
  const file=`spot-marker--day--${state}.png`,input=path.join(root,file),meta=await sharp(input).metadata();
  const raw=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let x0=1254,y0=1254,x1=-1,y1=-1;
  if(state==='default'||state==='selected')for(let y=0;y<1254;y++)for(let x=0;x<1254;x++){const k=(y*1254+x)*4,d=raw.data;if(d[k+3]>64&&d[k+2]>d[k]+15&&d[k+2]>d[k+1]+8){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}
  const {data,info}=await sharp(input).resize(256,256,{kernel:'lanczos3'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const output=path.join(root,'png-256',file);await sharp(data,{raw:{width:info.width,height:info.height,channels:info.channels}}).png(png).toFile(output);
  if(!data.equals(await sharp(output).ensureAlpha().raw().toBuffer()))throw Error('PNG mismatch');
  records.push({id:'spot-marker',state,status:'needs-family-alignment',sourceRoot:root,sourceFile:file,sourceWidth:meta.width,sourceHeight:meta.height,sourceSha256:hash(fs.readFileSync(input)),blueBodyBounds:x1>=0?[x0,y0,x1+1,y1+1]:null,outputs:{256:{file:`png-256/${file}`,bytes:fs.statSync(output).size,sha256:hash(fs.readFileSync(output)),losslessPngRoundtrip:true}}});
 }
 fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(records,null,2));
 for(const dark of [false,true]){
  const layers=[];
  for(let i=0;i<4;i++)for(let j=0;j<3;j++){
   const size=[32,48,64][j],r=records[i];layers.push({input:await sharp(path.join(root,r.outputs[256].file)).resize(size,size).png().toBuffer(),left:i*170+Math.floor((170-size)/2),top:35+j*90});
  }
  layers.push({input:Buffer.from(`<svg width="680" height="310"><style>text{font:12px Arial;fill:${dark?'#ddd':'#333'}}</style>${records.map((r,i)=>`<text x="${i*170+85}" y="20" text-anchor="middle">${r.state}</text>`).join('')}${[32,48,64].map((s,i)=>`<text x="6" y="${55+i*90}">${s}px</text>`).join('')}</svg>`),left:0,top:0});
  await sharp({create:{width:680,height:310,channels:4,background:dark?'#20242c':'#fff'}}).composite(layers).png(png).toFile(path.join(root,`review/small-${dark?'dark':'light'}.png`));
 }
 console.log(JSON.stringify({records:records.map(r=>({state:r.state,body:r.blueBodyBounds})),bytes256:records.reduce((s,r)=>s+r.outputs[256].bytes,0)}));
})();
