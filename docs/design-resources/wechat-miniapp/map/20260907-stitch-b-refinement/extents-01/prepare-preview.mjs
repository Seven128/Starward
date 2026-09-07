import fs from 'node:fs/promises';
const root = new URL('./', import.meta.url);
const read = async p => (await fs.readFile(new URL(p, root), 'utf8')).replaceAll('\r\n', '\n');
const base = await read('reference-medium.html');
const large = await read('outputs/large-original/code.html');
// Preserve adopted shared components; keep Stitch exports immutable.
function divAfter(html, marker) {
  const markerAt = html.indexOf(marker);
  if (markerAt < 0) throw new Error(`Missing source marker: ${marker}`);
  const at = html.indexOf('<div', markerAt);
  const tags = /<\/?div\b[^>]*>/g;
  tags.lastIndex = at;
  let depth = 0;
  for (let m; (m = tags.exec(html));) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (!depth) return html.slice(at, tags.lastIndex);
  }
  throw new Error(`Unclosed component: ${marker}`);
}
const handle = divAfter(base, '<!-- 拖动手柄');
const identityGroup = divAfter(base, '<!-- 顶部点位基础信息');
// The marker must precede the desired opening tag, so select the first inner div explicitly.
const identityStart = identityGroup.indexOf('<div', identityGroup.indexOf('>') + 1);
const identityBlock = divAfter('<!-- identity -->' + identityGroup.slice(identityStart), '<!-- identity -->');
const sections = divAfter(base, '<!-- 章节微导航').replace('class="flex items-center', 'id="section-nav" class="flex items-center');
const route = divAfter(base, '<!-- 路线与到达');
const facilities = divAfter(base, '<!-- 现场保障');
const links = divAfter(base, '<!-- 底部辅助文本');
const actions = divAfter(base, '<!-- 核心操作按键行');
let astronomy = divAfter(large, '<!-- Section 2:');
astronomy = astronomy.replace('<div ', '<div id="astronomy" ')
  .replace('天文与气象条件', '天文信息')
  .replace(/<span[^>]*>基于测站与客观模型<\/span>/, '')
  .replace('推荐可观测天体', '可观测天体')
  .replace('切片暂无数据', '暂无时间数据')
  .replace(/<div class="flex justify-between text-\[10px\][\s\S]*?<\/div>/, '')
  .replace(/<p\b[^>]*>[\s\S]*?<\/p>/, '<div class="flex items-center justify-between text-[12px]"><span class="text-slate-500">数据来源</span><span class="text-slate-400">暂无数据</span></div>')
  .replace('class="relative py-2 px-1"', 'class="relative py-2 px-1" aria-label="观测时间暂无数据" aria-disabled="true"');
const fullDocument = `<div id="overview">${identityBlock}</div>${sections}<div id="overview-facts">${route}${facilities}${links}</div>${astronomy}`;
const header = base.match(/<header\b[\s\S]*?<\/header>/)[0];
const footer = base.match(/<footer\b[\s\S]*?<\/footer>/)[0];
const map = base.slice(base.indexOf('>', base.indexOf('<body')) + 1, base.indexOf('<!-- 2. 顶部'));
const head = base.slice(0, base.indexOf('<body')).replace(/<title>[\s\S]*?<\/title>/, '<title>地图面板 · 共有元素还原预览</title>');
const css = `<style>
/* Codex repair: reuse adopted components and a single shared document. */
body{width:390px;height:844px;margin:0 auto;overflow:hidden;}
header,footer{flex-shrink:0;}
#extent-panel{position:relative;z-index:20;width:100%;background:white;display:flex;flex-direction:column;overflow:hidden;margin-top:auto;}
.small #extent-panel{height:156px;border-radius:24px 24px 0 0;box-shadow:0 -10px 25px #0000000f;flex-shrink:0;}
#handle-band{padding:10px 16px 0;flex-shrink:0;}
#document{padding:0 16px;min-height:0;}
.small #document{flex:1;overflow:hidden;pointer-events:none;}
#section-nav{background:white;margin-top:8px;padding-bottom:10px;border-bottom:1px solid #f1f5f9;}
.large #section-nav{position:sticky;top:0;z-index:2;}
#astronomy{padding-top:18px;}
#fixed-actions{padding:4px 16px 8px;flex-shrink:0;background:white;}
#fixed-actions button{position:relative;}
#fixed-actions button::after{content:"";position:absolute;left:0;right:0;top:50%;height:44px;transform:translateY(-50%);}
.large header{background:white;}
.large header>div:last-child{display:none;}
.large #map-reference{display:none;}
.large #extent-panel{flex:1;min-height:0;margin-top:0;border-radius:0;}
.large #document{flex:1;overflow-y:auto;scrollbar-width:none;}
#document::-webkit-scrollbar{display:none;}
.large #section-nav>div{cursor:pointer;}
.small #map-reference>div>img{height:auto;min-height:640px;object-fit:cover;object-position:top;}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%;}
body.phone{width:100%;height:100svh;}
</style>`;
const script = `<script>
// Review-only section scrolling; no fake map/navigation/data behavior.
const doc=document.querySelector('#document');
const nav=document.querySelector('#section-nav');
if(document.body.classList.contains('large')){
  [...nav.children].forEach((item,i)=>{item.setAttribute('role','button');item.tabIndex=0;
    const go=()=>doc.scrollTo({top:i?document.querySelector('#astronomy').offsetTop-nav.offsetHeight:0,behavior:'auto'});
    item.addEventListener('click',go);item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
  });
}
</script>`;
for(const extent of ['small','large']){
  const folder = new URL(`outputs/${extent}-preview/`, root);
  await fs.mkdir(folder,{recursive:true});
  const html=`${head.replace('</head>',css+'</head>')}<body class="${extent} relative flex flex-col text-slate-900"><div id="map-reference">${map}</div>${header}<main id="extent-panel"><div id="handle-band">${handle}</div><div id="document">${fullDocument}</div><div id="fixed-actions">${actions}</div></main>${footer}${script}</body></html>`;
  await fs.writeFile(new URL('code.html',folder),html);
}
await fs.writeFile(new URL('outputs/shared-document.html',root),fullDocument);
