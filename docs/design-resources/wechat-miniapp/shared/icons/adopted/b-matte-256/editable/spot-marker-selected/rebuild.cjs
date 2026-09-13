// Rebuild the adopted raster from the retained base and placed ray layers.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let sharp;try{sharp=require('sharp');}catch{sharp=require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
const png={compressionLevel:9,adaptiveFiltering:true,palette:false};
(async()=>{
 const config=JSON.parse(fs.readFileSync(path.join(__dirname,'composition.json')));
 const base=await sharp(path.join(__dirname,'base-default-1254.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const result=Buffer.from(base.data);
 for(const layer of config.layers){const ray=await sharp(path.join(__dirname,`ray-${layer.name}-placed.png`)).ensureAlpha().raw().toBuffer();
  for(let y=0;y<layer.height;y++)for(let x=0;x<layer.width;x++){const a=(y*layer.width+x)*4,b=((y+layer.top)*base.info.width+x+layer.left)*4;
   if(!ray[a+3])continue;if(base.data[b+3])throw Error('Decoration overlaps base');ray.copy(result,b,a,a+4);
  }
 }
 const encoded=await sharp(result,{raw:{width:base.info.width,height:base.info.height,channels:4}}).png(png).toBuffer();
 const sha=crypto.createHash('sha256').update(encoded).digest('hex');if(sha!==config.masterSha256)throw Error('Rebuilt master hash differs');
 const mobileRaw=await sharp(encoded).resize(256,256,{kernel:'lanczos3'}).ensureAlpha().raw().toBuffer();
 const mobile=await sharp(mobileRaw,{raw:{width:256,height:256,channels:4}}).png(png).toBuffer();
 if(crypto.createHash('sha256').update(mobile).digest('hex')!==config.output256.sha256)throw Error('Rebuilt mobile hash differs');
 if(process.argv[2]){fs.mkdirSync(process.argv[2],{recursive:true});fs.writeFileSync(path.join(process.argv[2],'spot-marker--day--selected-1254.png'),encoded);fs.writeFileSync(path.join(process.argv[2],'spot-marker--day--selected-256.png'),mobile);}
 console.log(JSON.stringify({rebuildMatchesMaster:true,rebuildMatches256:true}));
})();
