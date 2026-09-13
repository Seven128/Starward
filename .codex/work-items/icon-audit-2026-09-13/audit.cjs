const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const source = process.argv[2] || 'C:/Users/777/Desktop/icons';
const output = process.argv[3] || 'C:/Users/777/Desktop/icons-optimized-2026-09-13';
const review = path.join(output,'review');
fs.mkdirSync(review,{recursive:true});
const files=fs.readdirSync(source).filter(f=>f.endsWith('.png')).sort();
const rows=[];
(async()=>{
  for(let i=0;i<files.length;i++){
    const file=files[i], input=path.join(source,file), meta=await sharp(input).metadata();
    const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let zero=0,partial=0,opaque=0,minX=info.width,minY=info.height,maxX=-1,maxY=-1,edge=0;
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
      const a=data[(y*info.width+x)*4+3];
      if(a===0)zero++;else if(a===255)opaque++;else partial++;
      if(a>8){minX=Math.min(x,minX);minY=Math.min(y,minY);maxX=Math.max(x,maxX);maxY=Math.max(y,maxY);if(x===0||y===0||x===info.width-1||y===info.height-1)edge++;}
    }
    rows.push({index:i+1,file,bytes:fs.statSync(input).size,width:meta.width,height:meta.height,space:meta.space,hasProfile:meta.hasProfile,hasAlpha:meta.hasAlpha,transparentPixels:zero,partialPixels:partial,opaquePixels:opaque,bounds:[minX,minY,maxX+1,maxY+1],edgePixels:edge,sha256:crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex')});
  }
  fs.writeFileSync(path.join(review,'source-inventory.json'),JSON.stringify(rows,null,2));
  for(let page=0;page<Math.ceil(files.length/18);page++){
    const comp=[];
    for(let k=0;k<18;k++){
      const index=page*18+k;if(index>=files.length)break;
      const left=(k%6)*180,top=Math.floor(k/6)*215;
      const thumb=await sharp(path.join(source,files[index])).resize(172,172,{fit:'inside'}).png().toBuffer();
      comp.push({input:thumb,left:left+4,top:top+2});
      const label=Buffer.from(`<svg width="180" height="40"><text x="8" y="17" font-family="Arial" font-size="15" fill="#222">${index+1} · ${files[index].slice(0,8)}</text></svg>`);
      comp.push({input:label,left,top:top+176});
    }
    await sharp({create:{width:1080,height:645,channels:4,background:'#e7e9ee'}}).composite(comp).png().toFile(path.join(review,`inventory-${page+1}.png`));
  }
  console.log(JSON.stringify({files:rows.length,totalBytes:rows.reduce((a,r)=>a+r.bytes,0),allAlpha:rows.every(r=>r.hasAlpha&&r.transparentPixels>0),touchingEdges:rows.filter(r=>r.edgePixels>0).map(r=>r.index),output}));
})();
