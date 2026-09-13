const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const repo='E:/Dev/Starward',root=path.join(repo,'docs/design-resources/wechat-miniapp/shared/icons');
const pack=path.join(root,'adopted/b-matte-256'),candidate=path.join(root,'candidates/b-matte-supplement');
const supplement='C:/Users/777/Desktop/icons-supplement-256-2026-09-13',combined='C:/Users/777/Desktop/icons-mobile-256-complete-2026-09-13';
const rows=JSON.parse(fs.readFileSync(path.join(supplement,'manifest.json')));
const adopted=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json'))),candidates=[];
for(const r of rows){
 if(r.id==='favorite-star')r.status='adopted';
 const target=r.status==='adopted'?pack:candidate;
 const filename=path.basename(r.outputs[256].file),input=path.join(supplement,r.outputs[256].file);
 fs.mkdirSync(path.join(target,'assets'),{recursive:true});
 fs.copyFileSync(input,path.join(target,'assets',filename));
 const record={...r,outputs:{256:{...r.outputs[256],file:`assets/${filename}`}}};
 if(r.status==='adopted'){if(!adopted.some(x=>x.id===r.id&&x.state===r.state))adopted.push(record);}else candidates.push(record);
 if(hash(fs.readFileSync(path.join(r.sourceRoot,r.sourceFile)))!==r.sourceSha256)throw Error('Original changed');
}
fs.writeFileSync(path.join(supplement,'manifest.json'),JSON.stringify(rows,null,2));
fs.writeFileSync(path.join(pack,'manifest.json'),JSON.stringify(adopted,null,2));
fs.writeFileSync(path.join(candidate,'manifest.json'),JSON.stringify(candidates,null,2));
for(const name of ['small-light.png','small-dark.png','state-pairs.png'])fs.copyFileSync(path.join(supplement,'review',name),path.join(pack,'reference','supplement-'+name));
fs.copyFileSync(path.join(supplement,'review/metrics.json'),path.join(pack,'provenance/supplement-metrics.json'));
fs.copyFileSync(path.join(supplement,'review/source-inventory.json'),path.join(pack,'provenance/supplement-source-inventory.json'));
const all=[];
for(const [list,src,folder] of [[adopted,pack,'assets'],[candidates,candidate,'needs-review']]){
 fs.mkdirSync(path.join(combined,folder),{recursive:true});
 for(const r of list){
  const file=`${folder}/${path.basename(r.outputs[256].file)}`;
  fs.copyFileSync(path.join(src,r.outputs[256].file),path.join(combined,file));
  if(hash(fs.readFileSync(path.join(combined,file)))!==r.outputs[256].sha256)throw Error('Copy mismatch');
  if(hash(fs.readFileSync(path.join(r.sourceRoot,r.sourceFile)))!==r.sourceSha256)throw Error('Source changed');
  all.push({...r,status:folder==='assets'?'adopted':'needs-state-review',outputs:{256:{...r.outputs[256],file}}});
 }
}
if(adopted.length!==63||candidates.length!==8||new Set(all.map(r=>r.id+'/'+r.state)).size!==71)throw Error('Coverage mismatch');
fs.writeFileSync(path.join(combined,'manifest.json'),JSON.stringify(all,null,2));
fs.writeFileSync(path.join(combined,'manifest.csv'),['id,state,status,file,bytes,sha256',...all.map(r=>[r.id,r.state,r.status,r.outputs[256].file,r.outputs[256].bytes,r.outputs[256].sha256].join(','))].join('\r\n'));
const stats={total:all.length,adopted:adopted.length,candidates:candidates.length,totalBytes:all.reduce((s,r)=>s+r.outputs[256].bytes,0),adoptedBytes:adopted.reduce((s,r)=>s+r.outputs[256].bytes,0)};
fs.writeFileSync(path.join(combined,'README.md'),`# 最新B行磨砂图标 · 256px合集\n\n共71份透明PNG，合计${stats.totalBytes} bytes。assets为已采用的63份（62种基础图标+想去轮廓态）；needs-review为8份需要状态/几何校准的素材，不能直接当作完成的生产资源。manifest记录状态、源文件和哈希。\n\n原始高清PNG保留在桌面icons及其补充目录，未修改。Lanczos3缩小后使用全彩PNG无损编码，无调色板量化、改色、锐化或重新抠图。已验证256px、透明通道、编码回读和原图哈希；已看明暗底64px及状态144px对比。静态检查不代表真机或动画验收。\n\n待修正：导航两态主要靠换色；审核时钟位于右下而非右上；四态点针需要统一主体尺寸与定位尖端；拖尾缺少黄绿渐隐，小流星朝向需要匹配左上到右下轨迹。详见FIX-REQUEST.md。夜间与红光主题仍未交付。\n`);
fs.writeFileSync(path.join(supplement,'README.md'),`# 本次补充 · 256px\n\n17份原图共11,628,533 bytes，派生为555,372 bytes（约542KiB）。png-256保留本轮全部导出；manifest标明语义与采用状态。8枚基础图标及想去轮廓态已合入项目，其余8份保留待校准。全71份合集：${combined}。原始文件未修改。\n`);
console.log(JSON.stringify({...stats,combined}));
