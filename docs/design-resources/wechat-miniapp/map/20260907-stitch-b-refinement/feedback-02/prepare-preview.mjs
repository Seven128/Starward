import fs from 'node:fs/promises';
const root = new URL('./', import.meta.url);
const read = p => fs.readFile(new URL(p,root),'utf8');
let html = await read('../extents-01/outputs/large-preview/index.html');
html = html.replace(/<script>[\s\S]*?<\/script>/g,'').replace('class="large relative','class="relative');
html = html.replace(/<title>.*?<\/title>/,'<title>地图 · 基本信息与收藏动效</title>');
html = html.replace('width=390, height=844, initial-scale=1.0, user-scalable=no','width=device-width, initial-scale=1.0');
html = html.replace('</head>','<link rel="stylesheet" href="preview.css"></head>');
html = html.replace('<div id="handle-band">','<div id="handle-band" role="slider" aria-label="观星点面板高度" aria-valuemin="0" aria-valuemax="2" tabindex="0">');
html = html.replace('<div id="overview">','<figure id="site-media" aria-hidden="true"><img src="site-illustration.jpg" alt="海岸观测建筑示意图，非真实场地照片"><figcaption>设计示意图 · 非场地实拍</figcaption></figure><div id="overview">');
html = html.replaceAll('概览','基本信息');
const icon = path => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const clock = icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
const parking = icon('<path d="M6 20V4h7a5 5 0 0 1 0 10H6"/>');
const toilet = icon('<path d="M7 4h10v10a5 5 0 0 1-10 0V4zm3 15v2m4-2v2M5 21h14"/>');
const arrow = icon('<path d="M7 17 17 7M7 7h10v10"/>');
const facts = `<div id="overview-facts">
  <div class="route-row"><div><h3>路线与到达</h3><p>距离、预计到达暂无数据</p></div><button class="navigation-icon" aria-label="导航" data-target="navigation">${arrow}</button></div>
  <div class="hours-row"><span>${clock}开放时间</span><span class="muted">暂无数据</span></div>
  <div class="facility-stack"><div class="facility-card"><span>${parking}停车设施</span><span class="muted">暂无数据</span></div><div class="facility-card"><span>${toilet}洗手间</span><span class="muted">暂无数据</span></div></div>
  <div class="source-row"><span>资料来源：暂无数据</span><button data-target="feedback">反馈纠错 <span aria-hidden="true">↗</span></button></div>
  <section class="access-info" aria-label="进入与安全"><h3>进入与安全</h3><dl><div><dt>开放状态</dt><dd>尚未核验</dd></div><div><dt>合法进入</dt><dd>尚未核验</dd></div><div><dt>夜间安全</dt><dd>尚未核验</dd></div></dl><p>进入限制与安全指引暂无资料</p></section>
  <div class="address-row"><span>详细地址</span><span class="muted">暂无数据</span></div>
</div>`;
html = html.replace(/<div id="overview-facts">[\s\S]*?(?=<div id="astronomy")/,facts);
// An unavailable time series cannot acquire invented slice nodes from a design tool.
html = html.replace(/<!-- Arc Track Indicator -->[\s\S]*?(?=<!-- Objective Weather)/,'</div>\n');
const starPath='M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.07 3.29a1 1 0 0 0 .95.69h3.46c.97 0 1.37 1.24.59 1.81l-2.8 2.03a1 1 0 0 0-.36 1.12l1.07 3.29c.3.92-.76 1.69-1.54 1.12l-2.8-2.03a1 1 0 0 0-1.18 0l-2.8 2.03c-.78.57-1.84-.2-1.54-1.12l1.07-3.29a1 1 0 0 0-.36-1.12l-2.8-2.03c-.78-.57-.38-1.81.59-1.81h3.46a1 1 0 0 0 .95-.69z';
const star = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${starPath}"/></svg>`;
const favorite = `<button id="favorite" aria-label="想去" aria-pressed="false" class="h-10 rounded-lg border border-slate-200 bg-white text-slate-800 text-[13px] font-medium flex items-center justify-center"><span class="star-stage" aria-hidden="true"><span class="meteor main-meteor"><i class="tail"></i><span class="rolling-star">${star}</span></span><span class="meteor satellite satellite-one"><i class="tail"></i>${star}</span><span class="meteor satellite satellite-two"><i class="tail"></i>${star}</span></span><span>想去</span></button>`;
html = html.replace(/(<div id="fixed-actions"><div[^>]*>)\s*<button[\s\S]*?<\/button>/,'$1'+favorite);
html = html.replace('<button class="h-10 rounded-lg bg-slate-900','<button id="cloud-action" data-target="sky" class="h-10 rounded-lg bg-slate-900');
html = html.replace('</body>','<dialog id="route-note"><h2></h2><p></p><button autofocus>返回地图</button></dialog><script src="preview.js"></script></body>');
await fs.mkdir(new URL('outputs/interactive/',root),{recursive:true});
await fs.writeFile(new URL('outputs/interactive/index.html',root),html);
for(const name of ['rendered.css','map-reference.jpg']) await fs.copyFile(new URL('../extents-01/outputs/large-preview/'+name,root),new URL('outputs/interactive/'+name,root));
for(const name of ['preview.css','preview.js']) await fs.copyFile(new URL(name,root),new URL('outputs/interactive/'+name,root));
await fs.copyFile(new URL('outputs/site-illustration.jpg',root),new URL('outputs/interactive/site-illustration.jpg',root));
console.log('Built separate Codex interactive companion; Stitch originals untouched.');
