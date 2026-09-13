const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const source='C:/Users/777/Desktop/地图图标返修3-核对';
const root='E:/Dev/Starward/docs/design-resources/wechat-miniapp/shared/icons/adopted/b-matte-256';
const edit=path.join(root,'editable/spot-marker-selected');
const output='C:/Users/777/Desktop/地图图标-本地合成完成';
const png={compressionLevel:9,adaptiveFiltering:true,palette:false};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function encode(data,w,h,file){await sharp(data,{raw:{width:w,height:h,channels:4}}).png(png).toFile(file);if(!data.equals(await sharp(file).ensureAlpha().raw().toBuffer()))throw Error('Lossless roundtrip failed '+file);}
function component(raw,roi){
 const [left,top,width,height]=roi,W=raw.info.width,d=raw.data;let seed=-1,maxAlpha=-1;
 for(let y=top;y<top+height;y++)for(let x=left;x<left+width;x++){const k=(y*W+x)*4;if(d[k+3]>maxAlpha){maxAlpha=d[k+3];seed=y*W+x;}}
 const seen=new Set([seed]),queue=[seed];let loX=W,loY=raw.info.height,hiX=-1,hiY=-1;
 for(let n=0;n<queue.length;n++){const p=queue[n],x=p%W,y=Math.floor(p/W);loX=Math.min(loX,x);loY=Math.min(loY,y);hiX=Math.max(hiX,x);hiY=Math.max(hiY,y);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,q=yy*W+xx;if(xx<left||xx>=left+width||yy<top||yy>=top+height||seen.has(q)||d[q*4+3]===0)continue;seen.add(q);queue.push(q);}
 }
 if(loX===left||loY===top||hiX===left+width-1||hiY===top+height-1)throw Error('Ray touches extraction boundary');
 const w=hiX-loX+5,h=hiY-loY+5,data=Buffer.alloc(w*h*4);for(const p of queue){const x=p%W-loX+2,y=Math.floor(p/W)-loY+2;d.copy(data,(y*w+x)*4,p*4,p*4+4);}
 return {data,w,h,sourceBounds:[loX,loY,hiX+1,hiY+1],connectedPixels:queue.length};
}
(async()=>{
 fs.mkdirSync(edit,{recursive:true});fs.mkdirSync(output,{recursive:true});
 const basePath=path.join(source,'spot-marker--day--default.png'),raysPath=path.join(source,'spot-marker--day--selected.png');
 const baseBytes=fs.readFileSync(basePath),rayBytes=fs.readFileSync(raysPath),base=await sharp(baseBytes).ensureAlpha().raw().toBuffer({resolveWithObject:true}),old=await sharp(rayBytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 fs.writeFileSync(path.join(edit,'base-default-1254.png'),baseBytes);fs.writeFileSync(path.join(edit,'ray-source-1254.png'),rayBytes);
 const W=base.info.width,H=base.info.height,result=Buffer.from(base.data),decor=Buffer.alloc(result.length),specs=[{name:'left',roi:[240,225,180,170],center:[335,210]},{name:'top',roi:[560,55,135,180],center:[627,65],scale:.62},{name:'right',roi:[835,225,180,170],center:[919,210]}],layers=[];
 for(const s of specs){const c=component(old,s.roi);await encode(c.data,c.w,c.h,path.join(edit,`ray-${s.name}-original.png`));
  const w=Math.round(c.w*(s.scale||.72)),h=Math.round(c.h*(s.scale||.72)),raw=await sharp(c.data,{raw:{width:c.w,height:c.h,channels:4}}).resize(w,h,{kernel:'lanczos3'}).ensureAlpha().raw().toBuffer();
  const x=Math.round(s.center[0]-w/2),y=Math.round(s.center[1]-h/2);await encode(raw,w,h,path.join(edit,`ray-${s.name}-placed.png`));
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const a=(yy*w+xx)*4,b=((y+yy)*W+x+xx)*4;if(!raw[a+3])continue;if(base.data[b+3])throw Error(`Ray ${s.name} overlaps base at ${x+xx},${y+yy}`);if(decor[b+3])throw Error('Rays overlap');raw.copy(result,b,a,a+4);raw.copy(decor,b,a,a+4);}
  layers.push({name:s.name,sourceBounds:c.sourceBounds,sourceConnectedPixels:c.connectedPixels,scale:s.scale||.72,left:x,top:y,width:w,height:h});
 }
 let basePixels=0,changedBasePixels=0,changedOutsideDecoration=0,addedPixels=0;
 for(let k=0;k<result.length;k+=4){const changed=!result.subarray(k,k+4).equals(base.data.subarray(k,k+4));if(base.data[k+3]){basePixels++;if(changed)changedBasePixels++;}if(changed&&!decor[k+3])changedOutsideDecoration++;if(decor[k+3])addedPixels++;}
 if(changedBasePixels||changedOutsideDecoration)throw Error('Composition invariant failed');
 const master=path.join(edit,'spot-marker--day--selected.png');await encode(result,W,H,master);await encode(decor,W,H,path.join(edit,'rays-overlay-1254.png'));
 fs.copyFileSync(master,path.join(output,'spot-marker--day--selected-1254.png'));
 const resized=await sharp(master).resize(256,256,{kernel:'lanczos3'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const mobile=path.join(output,'spot-marker--day--selected-256.png');await encode(resized.data,256,256,mobile);
 // After resampling, any pixel differences must remain inside the resampling support of the decoration.
 const base256=await sharp(path.join(root,'assets/spot-marker--day--default.png')).ensureAlpha().raw().toBuffer();
 let rasterDifferences=0,outsideRayRegions=0;
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const k=(y*256+x)*4;if(resized.data.subarray(k,k+4).equals(base256.subarray(k,k+4)))continue;rasterDifferences++;if(!layers.some(r=>x>=Math.floor(r.left*256/W)-4&&x<=Math.ceil((r.left+r.width)*256/W)+4&&y>=Math.floor(r.top*256/H)-4&&y<=Math.ceil((r.top+r.height)*256/H)+4))outsideRayRegions++;}
 if(outsideRayRegions)throw Error('256px changed beyond decoration support');
 const report={method:'Copy exact default RGBA; extract three connected ray components; resize only rays with Lanczos3; copy into empty alpha pixels.',width:W,height:H,baseSource:{path:basePath,sha256:hash(baseBytes)},raySource:{path:raysPath,sha256:hash(rayBytes)},layers,basePixels,changedBasePixels,changedOutsideDecoration,addedPixels,output256:{bytes:fs.statSync(mobile).size,sha256:hash(fs.readFileSync(mobile)),rasterDifferences,outsideRayRegions},masterSha256:hash(fs.readFileSync(master)),sourceHashesUnchanged:hash(fs.readFileSync(basePath))===hash(baseBytes)&&hash(fs.readFileSync(raysPath))===hash(rayBytes)};
 fs.writeFileSync(path.join(edit,'composition.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(output,'像素核对.json'),JSON.stringify(report,null,2));
 for(const dark of [false,true]){
  const comp=[],inputs=[basePath,master,path.join(source,'spot-marker--day--draft.png'),path.join(source,'spot-marker--day--pending.png')],names=['Default','Selected / fixed','Draft','Pending'];
  for(let i=0;i<4;i++)for(let j=0;j<3;j++){const size=[32,64,144][j],top=[45,105,205][j];comp.push({input:await sharp(inputs[i]).resize(size,size).png().toBuffer(),left:i*190+Math.round((190-size)/2),top});}
  comp.push({input:Buffer.from(`<svg width="760" height="365"><style>text{font:13px Arial;fill:${dark?'#ddd':'#333'}}</style>${names.map((n,i)=>`<text x="${i*190+95}" y="24" text-anchor="middle">${n}</text>`).join('')}</svg>`),left:0,top:0});
  await sharp({create:{width:760,height:365,channels:4,background:dark?'#20242c':'#fff'}}).composite(comp).png(png).toFile(path.join(output,`preview-${dark?'dark':'light'}.png`));
 }
 console.log(JSON.stringify(report));
})();
