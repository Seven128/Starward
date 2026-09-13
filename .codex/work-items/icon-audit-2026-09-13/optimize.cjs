const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root='C:/Users/777/Desktop/icons-optimized-2026-09-13',source='C:/Users/777/Desktop/icons';
const inventory=JSON.parse(fs.readFileSync(path.join(root,'review/source-inventory.json'),'utf8'));
const ids=['temperature','plan-suv','check','save','layers','low-cloud','note','backpack','clock','warning','droplet','four-point-star','chevron-down','bell','calendar','meteor','undo','terrain','verified','add','favorite-star','binoculars','camera','place-pin','trash','search','download','eye','map','bulb','checklist','close','horizon','chevron-right','refresh','cloud','more','telescope','location','arrow-left','moon','navigation','chevron-up','images','info','filter','settings','bell-off','compass','account-user','pencil','sun','wind','share'];
if(ids.length!==inventory.length||new Set(ids).size!==ids.length)throw Error('Invalid semantic mapping');
const png={compressionLevel:9,adaptiveFiltering:true,palette:false};
const manifest=[];
(async()=>{
  for(const size of [256,512])fs.mkdirSync(path.join(root,`png-${size}`),{recursive:true});
  for(let i=0;i<inventory.length;i++){
    const row=inventory[i],id=ids[i],input=path.join(source,row.file);
    const state=id==='favorite-star'?'selected':'default';
    const result={...row,id,state,outputs:{}};
    for(const size of [256,512]){
      const out=path.join(root,`png-${size}`,`${id}--day--${state}.png`);
      const {data,info}=await sharp(input).resize(size,size,{fit:'inside',kernel:'lanczos3',withoutEnlargement:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      await sharp(data,{raw:{width:info.width,height:info.height,channels:info.channels}}).png(png).toFile(out);
      const decoded=await sharp(out).ensureAlpha().raw().toBuffer();
      if(!data.equals(decoded))throw Error('PNG roundtrip changed RGBA: '+out);
      const meta=await sharp(out).metadata();if(!meta.hasAlpha||meta.width!==size||meta.height!==size)throw Error('Unexpected dimensions or alpha');
      result.outputs[size]={file:`png-${size}/${path.basename(out)}`,bytes:fs.statSync(out).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex'),losslessPngRoundtrip:true};
    }
    // Compare composited pixels at retina display sizes against direct rendering from original.
    result.displayComparison={};
    for(const physical of [72,96,144,192]){
      const original=await sharp(input).resize(physical,physical).ensureAlpha().raw().toBuffer();
      const compressed=await sharp(path.join(root,result.outputs[256].file)).resize(physical,physical).ensureAlpha().raw().toBuffer();
      let sum=0,n=0;for(const bg of [255,32])for(let k=0;k<original.length;k+=4){for(let c=0;c<3;c++){
        const a=original[k+3]/255,b=compressed[k+3]/255;
        const diff=(original[k+c]*a+bg*(1-a))-(compressed[k+c]*b+bg*(1-b));sum+=diff*diff;n++;
      }}
      result.displayComparison[physical]={rgbRmse255:Math.sqrt(sum/n)};
    }
    manifest.push(result);
  }
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
  const csv=['id,state,source_file,source_bytes,png_256_file,png_256_bytes,png_512_file,png_512_bytes,true_alpha,png_roundtrip_rgba_equal',...manifest.map(r=>[r.id,r.state,r.file,r.bytes,r.outputs[256].file,r.outputs[256].bytes,r.outputs[512].file,r.outputs[512].bytes,true,true].join(','))].join('\r\n');
  fs.writeFileSync(path.join(root,'manifest.csv'),csv);
  const totals={source:manifest.reduce((a,r)=>a+r.bytes,0),png256:manifest.reduce((a,r)=>a+r.outputs[256].bytes,0),png512:manifest.reduce((a,r)=>a+r.outputs[512].bytes,0)};
  const quality={};for(const p of [72,96,144,192])quality[p]={meanRmse:manifest.reduce((a,r)=>a+r.displayComparison[p].rgbRmse255,0)/manifest.length,maxRmse:Math.max(...manifest.map(r=>r.displayComparison[p].rgbRmse255))};
  fs.writeFileSync(path.join(root,'review/metrics.json'),JSON.stringify({totals,quality},null,2));
  const picks=['telescope','plan-suv','terrain','temperature','favorite-star','compass'];
  const comps=[];
  for(let j=0;j<picks.length;j++){
    const record=manifest.find(r=>r.id===picks[j]);
    for(let variant=0;variant<3;variant++){
      const file=variant===0?path.join(source,record.file):path.join(root,record.outputs[variant===1?256:512].file);
      const x=180+variant*220,y=45+j*190;
      const thumb=await sharp(file).resize(144,144).png().toBuffer();
      comps.push({input:thumb,left:x,top:y});
    }
  }
  const labels=Buffer.from(`<svg width="860" height="1200"><style>text{font:15px Arial;fill:#555}</style><text x="180" y="25">Original at 144px</text><text x="400" y="25">256px PNG at 144px</text><text x="620" y="25">512px PNG at 144px</text>${picks.map((id,i)=>`<text x="12" y="${120+i*190}">${id}</text>`).join('')}</svg>`);
  comps.push({input:labels,left:0,top:0});
  await sharp({create:{width:860,height:1200,channels:4,background:'#e7e9ee'}}).composite(comps).png(png).toFile(path.join(root,'review/comparison-3x.png'));
  // Full small-use contact sheets on light and dark backgrounds.
  for(const bg of ['#ffffff','#20242c']){
    const overlays=[];
    for(let i=0;i<manifest.length;i++){
      const r=manifest[i],x=(i%9)*112,y=Math.floor(i/9)*108;
      overlays.push({input:await sharp(path.join(root,r.outputs[256].file)).resize(64,64).png().toBuffer(),left:x+24,top:y+6});
      overlays.push({input:Buffer.from(`<svg width="112" height="26"><text x="56" y="15" text-anchor="middle" font-family="Arial" font-size="11" fill="${bg==='#ffffff'?'#333':'#ccc'}">${r.id}</text></svg>`),left:x,top:y+78});
    }
    await sharp({create:{width:1008,height:648,channels:4,background:bg}}).composite(overlays).png(png).toFile(path.join(root,`review/small-${bg==='#ffffff'?'light':'dark'}.png`));
  }
  console.log(JSON.stringify({totals,quality,output:root}));
})();
