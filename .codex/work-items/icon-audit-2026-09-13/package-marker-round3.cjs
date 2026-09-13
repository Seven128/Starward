const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const repo='E:/Dev/Starward',root=path.join(repo,'docs/design-resources/wechat-miniapp/shared/icons');
const input='C:/Users/777/Desktop/地图图标返修3-核对',pack=path.join(root,'adopted/b-matte-256'),candidate=path.join(root,'candidates/b-matte-marker-round3');
const output='C:/Users/777/Desktop/icons-mobile-256-revision3-2026-09-13';
const latest=JSON.parse(fs.readFileSync(path.join(input,'manifest.json'))),adopted=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json'))),pending=[];
for(const r of latest){
 r.status=r.state==='selected'?'needs-family-alignment':'adopted';
 const dest=r.status==='adopted'?pack:candidate,filename=path.basename(r.outputs[256].file);fs.mkdirSync(path.join(dest,'assets'),{recursive:true});
 fs.copyFileSync(path.join(input,r.outputs[256].file),path.join(dest,'assets',filename));
 const row={...r,outputs:{256:{...r.outputs[256],file:'assets/'+filename}}};
 if(r.status==='adopted'){if(adopted.some(a=>a.id===r.id&&a.state===r.state))throw Error('Unexpected overwrite');adopted.push(row);}else pending.push(row);
}
fs.writeFileSync(path.join(input,'manifest.json'),JSON.stringify(latest,null,2));
fs.writeFileSync(path.join(pack,'manifest.json'),JSON.stringify(adopted,null,2));fs.writeFileSync(path.join(candidate,'manifest.json'),JSON.stringify(pending,null,2));
for(const name of ['small-light.png','small-dark.png'])fs.copyFileSync(path.join(input,'review',name),path.join(pack,'reference','marker-round3-'+name));
fs.copyFileSync(path.join(input,'review/source-inventory.json'),path.join(pack,'provenance/marker-round3-source-inventory.json'));
fs.copyFileSync(path.join(input,'manifest.json'),path.join(pack,'provenance/marker-round3-review.json'));
const records=[];
for(const [list,source,folder] of [[adopted,pack,'assets'],[pending,candidate,'needs-review']]){
 fs.mkdirSync(path.join(output,folder),{recursive:true});
 for(const r of list){const file=folder+'/'+path.basename(r.outputs[256].file);fs.copyFileSync(path.join(source,r.outputs[256].file),path.join(output,file));
  if(hash(fs.readFileSync(path.join(output,file)))!==r.outputs[256].sha256||hash(fs.readFileSync(path.join(r.sourceRoot,r.sourceFile)))!==r.sourceSha256)throw Error('Hash mismatch');
  records.push({...r,status:folder==='assets'?'adopted':r.status,outputs:{256:{...r.outputs[256],file}}});
 }
}
if(adopted.length!==70||pending.length!==1||new Set(records.map(r=>r.id+'/'+r.state)).size!==71)throw Error('Coverage mismatch');
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(records,null,2));
const total=records.reduce((s,r)=>s+r.outputs[256].bytes,0),used=adopted.reduce((s,r)=>s+r.outputs[256].bytes,0);
fs.writeFileSync(path.join(output,'README.md'),`# 最新B行256px图标 · 地图第3轮\n\n70份静态资源已采用，另1份地图selected候选。71份PNG合计${total} bytes；采用部分${used} bytes。assets为采用资源，needs-review仅存selected。地图其他3态已通过静态对齐检查，selected仍小约8.4%且下移。\n\n高清原图保留。Lanczos3缩小后全彩PNG无损编码，编码回读及源文件哈希已验证；没有完成生产接入、动效和地图四态切换真机验收。夜间/红光主题仍未交付。\n`);
const prompt=path.join(repo,'docs/design-resources/wechat-miniapp/terrain-icon-exploration-2026-09-12/marker-round3-fix-request.md');for(const dir of [output,input])fs.copyFileSync(prompt,path.join(dir,'返修提示词.md'));
console.log(JSON.stringify({adopted:70,pending:1,totalBytes:total,adoptedBytes:used,output}));
