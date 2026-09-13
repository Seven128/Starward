const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const repo='E:/Dev/Starward',root=path.join(repo,'docs/design-resources/wechat-miniapp/shared/icons');
const pack=path.join(root,'adopted/b-matte-256'),candidate=path.join(root,'candidates/b-matte-supplement2');
const supplement='C:/Users/777/Desktop/icons-supplement2-256-2026-09-13',combined='C:/Users/777/Desktop/icons-mobile-256-revision2-2026-09-13';
const rows=JSON.parse(fs.readFileSync(path.join(supplement,'manifest.json'))),adopted=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json'))),pending=[];
for(const row of rows){
 const target=row.status==='adopted'?pack:candidate,file=path.basename(row.outputs[256].file);
 fs.mkdirSync(path.join(target,'assets'),{recursive:true});fs.copyFileSync(path.join(supplement,row.outputs[256].file),path.join(target,'assets',file));
 const record={...row,outputs:{256:{...row.outputs[256],file:`assets/${file}`}}};
 if(row.status==='adopted'){if(adopted.some(r=>r.id===row.id&&r.state===row.state))throw Error('Unexpected replacement');adopted.push(record);}else pending.push(record);
}
const oldCandidates=path.join(root,'candidates/b-matte-supplement'),draft=JSON.parse(fs.readFileSync(path.join(oldCandidates,'manifest.json'))).find(r=>r.id==='spot-marker'&&r.state==='draft');
pending.push({...draft,status:'previous-round-reference',note:'补充2未交付draft；保留旧图参考，未确认与本轮主体对齐。'});
fs.copyFileSync(path.join(oldCandidates,draft.outputs[256].file),path.join(candidate,draft.outputs[256].file));
fs.writeFileSync(path.join(pack,'manifest.json'),JSON.stringify(adopted,null,2));fs.writeFileSync(path.join(candidate,'manifest.json'),JSON.stringify(pending,null,2));
for(const name of ['small-light.png','small-dark.png','navigation-32px.png'])fs.copyFileSync(path.join(supplement,'review',name),path.join(pack,'reference','supplement2-'+name));
for(const name of ['metrics.json','source-inventory.json','duplicates.json'])fs.copyFileSync(path.join(supplement,'review',name),path.join(pack,'provenance','supplement2-'+name));
const all=[];
for(const [records,source,folder] of [[adopted,pack,'assets'],[pending,candidate,'needs-review']]){
 fs.mkdirSync(path.join(combined,folder),{recursive:true});
 for(const row of records){const file=`${folder}/${path.basename(row.outputs[256].file)}`;fs.copyFileSync(path.join(source,row.outputs[256].file),path.join(combined,file));
  if(hash(fs.readFileSync(path.join(combined,file)))!==row.outputs[256].sha256)throw Error('Copy mismatch');
  if(hash(fs.readFileSync(path.join(row.sourceRoot,row.sourceFile)))!==row.sourceSha256)throw Error('Original changed');
  all.push({...row,status:folder==='assets'?'adopted':row.status,outputs:{256:{...row.outputs[256],file}}});
 }
}
const inv=JSON.parse(fs.readFileSync(path.join(supplement,'review/source-inventory.json')));for(const r of inv)if(hash(fs.readFileSync(path.join(rows[0].sourceRoot,r.file)))!==r.sha256)throw Error('Supplement original changed');
if(adopted.length!==67||pending.length!==4||new Set(all.map(r=>r.id+'/'+r.state)).size!==71)throw Error('Coverage failed');
fs.writeFileSync(path.join(combined,'manifest.json'),JSON.stringify(all,null,2));
fs.writeFileSync(path.join(combined,'manifest.csv'),['id,state,status,file,bytes,sha256',...all.map(r=>[r.id,r.state,r.status,r.outputs[256].file,r.outputs[256].bytes,r.outputs[256].sha256].join(','))].join('\r\n'));
const stats={adopted:67,pending:4,adoptedBytes:adopted.reduce((s,r)=>s+r.outputs[256].bytes,0),totalBytes:all.reduce((s,r)=>s+r.outputs[256].bytes,0)};
const summary=`# 最新B行磨砂图标 · 补充2后的256px合集\n\n当前采用67份（62种基础图标、想去轮廓态、2份导航selected和2份动画分件），另4份地图点针保留待统一，其中draft为上一轮参考。本包71份PNG共${stats.totalBytes} bytes，采用部分${stats.adoptedBytes} bytes。\n\nassets为已通过静态资源检查的文件；needs-review为地图点针。地图selected主体约小8%，本轮缺少draft。详见FIX-REQUEST.md。透明PNG已验证尺寸、编码回读与原图哈希；已查看明暗底小尺寸与导航灰度配对。没有完成生产替换、地图锚点或动画真机验收。\n\n使用Lanczos3派生256px后进行全彩PNG无损编码，不做调色板量化或重绘；缩小分辨率本身不是相对原图无损。高清母版和旧合集保留未修改。manifest记录语义、状态、来源和SHA-256；完全重复的下载文件未重复打包。\n`;
fs.writeFileSync(path.join(combined,'README.md'),summary);fs.writeFileSync(path.join(supplement,'README.md'),'# 补充2 · 256px\n\n收到8个文件，7张不同图片，1个完全重复；全部1254px真透明PNG，派生256px共223,825 bytes（约219KiB）。4份通过静态资源检查，3份地图点针待成套校准，缺draft。原文件全部保留。\n\n最新合集：'+combined+'。返修说明见FIX-REQUEST.md。');
const prompt=path.join(repo,'docs/design-resources/wechat-miniapp/terrain-icon-exploration-2026-09-12/supplement2-fix-request.md');for(const dest of [combined,supplement])fs.copyFileSync(prompt,path.join(dest,'FIX-REQUEST.md'));
console.log(JSON.stringify({...stats,combined}));
