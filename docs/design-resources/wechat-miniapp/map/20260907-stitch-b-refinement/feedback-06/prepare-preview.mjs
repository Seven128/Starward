import fs from 'node:fs/promises';
const root=new URL('./',import.meta.url);
const out=new URL('outputs/interactive/',root);
await fs.mkdir(out,{recursive:true});
const read=p=>fs.readFile(new URL(p,root),'utf8');
let html=await read('../feedback-02/outputs/interactive/index.html');
html=html.replace('地图 · 基本信息与收藏动效','地图 · 有内容的点位与天文').replaceAll('深圳市天文台','星湾观星点').replaceAll('深圳 · 大鹏','滨海 · 东岸');
html=html.replace('<link rel="stylesheet" href="preview.css">','<link rel="stylesheet" href="preview.css"><link rel="stylesheet" href="content.css">');
const icon=(path)=>`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${path}</svg>`;
const clock=icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
const arrow=icon('<path d="M7 17 17 7M7 7h10v10"/>');
const parking=icon('<path d="M6 20V4h7a5 5 0 0 1 0 10H6"/>');
const toilet=icon('<path d="M5 21V3h14v18M9 21V11h6v10"/><circle cx="12" cy="7" r="1"/>');
function facility(type,title,svg,status,detail){return `<button class="facility-card photo-card" data-photo="${type}" aria-label="${title}，查看设施照片"><img class="facility-background" src="${type}.jpg" alt=""><span class="facility-shade"></span><span class="facility-content"><span class="facility-title">${svg}<strong>${title}</strong><span>${status}</span></span><span class="facility-description" ${type==='toilet'?'id="toilet-hours"':''}>${detail}</span></span><span class="photo-count" aria-hidden="true">▧ 1</span></button>`;}
const facts=`<div id="overview-facts">
<p class="location-facts">东岸路观景步道入口 <span>海拔 128m</span></p>
<div class="route-row"><div><h3>24.6 <small>km</small> <span class="route-duration">驾车约42分钟 · 步行6分钟</span></h3><p>东侧停车区进入，末段步道约200米</p></div><button class="navigation-icon" aria-label="导航" data-target="navigation">${arrow}</button></div>
<div class="hours-row"><span>${clock}开放时间</span><span>18:00–次日06:00</span></div>
<section class="access-compact" aria-label="进入与安全"><dl><div><dt>开放状态</dt><dd>限时开放</dd></div><div><dt>合法进入</dt><dd>预约进入</dd></div><div><dt>夜间安全</dt><dd>注意台阶</dd></div></dl><p>预约后进入，夜间台阶段需自备照明。</p></section>
<div class="facility-stack">${facility('parking','停车设施',parking,'可用 · 入口120m','约20个车位，夜间出场需联系值守')}${facility('toilet','洗手间',toilet,'可用 · 入口80m','开放时段暂无数据')}</div>
<div class="contact-row"><span>门禁 / 负责人电话</span><span id="contact-value" class="muted">暂无数据</span></div>
<div class="source-row"><span>资料：场地管理方 · 09-06核验</span><button data-target="feedback">反馈纠错 ↗</button></div>
<details class="more-site"><summary>更多场地信息 <span>平台、信号与现场指引</span></summary><p>平台位于步道尽头；东北方向开阔。现场有移动通信信号；未设充电设施，不允许露营。</p><p>夜间从东侧入口原路返回，台阶段自备照明。现场资料由场地管理方提供，09-06核验。</p></details>
</div>`;
const metric=(label,value,id='')=>`<div><dt>${label}</dt><dd ${id?`id="${id}"`:''}>${value}</dd></div>`;
const astro=`<section id="astronomy" aria-label="天文信息"><div class="astronomy-heading"><h3>天文信息</h3><span id="selected-time">09月07日 21:00</span></div>
<div id="time-ruler" role="slider" tabindex="0" aria-label="观测时间" aria-valuemin="0" aria-valuemax="4" aria-valuenow="2" aria-valuetext="21:00"><div id="time-track">${['19','20','21','22','23'].map((h,i)=>`<button data-time="${i}" aria-label="${h}:00"><i></i><span>${h}:00</span></button>`).join('')}</div><span class="time-center" aria-hidden="true"></span></div>
<dl class="metric-group clouds">${metric('总云量','30<span>%</span>','cloud-total')}${metric('低云','8<span>%</span>','cloud-low')}${metric('中云','12<span>%</span>','cloud-mid')}${metric('高云','25<span>%</span>','cloud-high')}</dl>
<dl class="metric-group">${metric('气温','22<span>°C</span>','temperature')}${metric('湿度','78<span>%</span>','humidity')}${metric('露点','18<span>°C</span>','dew-point')}</dl>
<dl class="metric-group">${metric('东北风','9<span>km/h</span>','wind')}${metric('阵风','16<span>km/h</span>','gust')}${metric('能见度','24<span>km</span>','visibility')}</dl>
<dl class="metric-group">${metric('降水量','0<span>mm</span>','rain')}${metric('降水概率','10<span>%</span>','rain-chance')}${metric('模型一致性','高','consistency')}</dl>
<p class="measurement-note">透明度、视宁度暂无独立数据</p>
<div class="lunar-section"><dl class="metric-group">${metric('月照比例','18<span>%</span>','moon-lit')}${metric('月亮高度','−12<span>°</span>','moon-alt')}${metric('夜间阶段','天文夜','darkness')}</dl></div>
<div class="night-light"><span>卫星夜光估算</span><strong>较低</strong><span>0.8 nW/cm²/sr</span></div>
<div class="targets"><h3>当前目标</h3><div class="target-row"><span>织女星</span><span id="target-one-direction">西北</span><strong id="target-one-alt">52°</strong></div><div class="target-row"><span>天津四</span><span id="target-two-direction">东北</span><strong id="target-two-alt">61°</strong></div></div>
<div class="source-row weather-source"><span>预报更新18:00 · 天体位置按当前时刻计算</span></div>
<details class="more-site"><summary>来源与有效时间 <span>查看详情</span></summary><p>此预览使用独立示意数据，并非实时预报。正式产品显示所选时间片的provider/model、运行时间、有效期与限制；卫星夜光与场地设施分别追溯。</p><p>透明度、视宁度及结构化日/月升落事件尚无当前接口独立输出；不得用能见度或假值替代。</p></details>
</section>`;
html=html.replace(/<div id="overview-facts">[\s\S]*?(?=<div id="fixed-actions">)/,facts+astro+'</div>');
html=html.replace('<script src="preview.js"></script>','<dialog id="photo-viewer" aria-label="设施图片"><button id="photo-close" autofocus aria-label="关闭图片">×</button><img id="photo-original" alt=""><div><strong id="photo-title"></strong><p>参考照片 · 不属于这个虚构观星点</p><p id="photo-credit"></p></div></dialog><script src="preview.js"></script><script src="content.js"></script>');
const buildRevision=Date.now();
html=html.replaceAll('href="preview.css"',`href="preview.css?v=${buildRevision}"`).replaceAll('href="content.css"',`href="content.css?v=${buildRevision}"`).replaceAll('src="preview.js"',`src="preview.js?v=${buildRevision}"`).replaceAll('src="content.js"',`src="content.js?v=${buildRevision}"`);
await fs.writeFile(new URL('index.html',out),html);
for(const f of ['preview.js','preview.css','rendered.css','map-reference.jpg','site-illustration.jpg'])await fs.copyFile(new URL('../feedback-02/outputs/interactive/'+f,root),new URL(f,out));
const panelScript=await fs.readFile(new URL('preview.js',out),'utf8');
await fs.writeFile(new URL('preview.js',out),panelScript.replace('target.offsetTop-nav.offsetHeight-22','doc.scrollTop+target.getBoundingClientRect().top-doc.getBoundingClientRect().top-nav.offsetHeight').replace('target.tabIndex=-1;target.focus({preventScroll:true});','const focusTarget=target.querySelector("h3,h2")||target;focusTarget.tabIndex=-1;focusTarget.focus({preventScroll:true});'));
for(const f of ['content.js','content.css'])await fs.copyFile(new URL(f,root),new URL(f,out));
for(const f of ['parking.jpg','toilet.jpg'])await fs.copyFile(new URL('assets/'+f,root),new URL(f,out));


// Fourth revision: semantic grouping, brand roles and source-image transition.
let refined=await fs.readFile(new URL('index.html',out),'utf8');
refined=refined.replace('class="absolute right-3 top-[268px]','id="map-tool-dock" class="absolute right-3 top-[268px]');
const groupIcons=[['云层','<path d="M7 18h11a4 4 0 0 0 .6-8A6 6 0 0 0 7 8a5 5 0 0 0 0 10Z"/>'],['温湿','<path d="M9 14V5a3 3 0 0 0-6 0v9a5 5 0 1 0 6 0ZM6 9v9M16 4s-4 5-4 8a4 4 0 0 0 8 0c0-3-4-8-4-8Z"/>'],['风与能见度','<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h5a3 3 0 1 1-3 3"/>'],['降水','<path d="M7 14a4 4 0 0 1 0-8 6 6 0 0 1 11 1 4 4 0 0 1 0 8M7 17l-1 3M12 17l-1 3M17 17l-1 3"/>'],['月亮与夜间','<path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z"/>']];
let groupIndex=0;
refined=refined.replace(/<dl class="metric-group[^"]*">[\s\S]*?<\/dl>/g,block=>{const [label,path]=groupIcons[groupIndex++];if(label==='降水')block=block.replace(/<div><dt>模型一致性<\/dt>[\s\S]*?<\/div>/,'').replace('class="metric-group"','class="metric-group two"');return '<section class="evidence-group" aria-label="'+label+'"><h4>'+icon(path)+label+'</h4>'+block+'</section>';});
refined=refined.replace('<div class="night-light"><span>卫星夜光估算</span>','<div class="night-light"><span>'+icon('<path d="M3 20h18M5 20V9h5v11M14 20V4h5v16M7 12h1M16 8h1M16 12h1"/>')+'卫星夜光估算</span>');
refined=refined.replace('<h3>当前目标</h3>','<h3>'+icon('<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>')+'当前目标</h3>');
refined=refined.replace('预报更新18:00 · 天体位置按当前时刻计算','预报更新18:00 · 模型一致性高<br>天体位置按所选时刻计算');
refined=refined.replace('<script src="content.js?v=', '<script src="content.js?v=');
refined=refined.replace('</body>','<script src="refinement.js?v='+Date.now()+'"></script></body>');
refined=refined.replace('</head>','<link rel="stylesheet" href="refinement.css?v='+Date.now()+'"></head>');
await fs.writeFile(new URL('index.html',out),refined);
for(const f of ['refinement.js','refinement.css'])await fs.copyFile(new URL(f,root),new URL(f,out));
console.log('Built feedback-06 companion (production unchanged).');

let chapterHtml=await fs.readFile(new URL('index.html',out),'utf8');
chapterHtml=chapterHtml.replace(/<div id="time-track">[\s\S]*?<\/div><span class="time-center"/, '<div id="time-track">'+Array.from({length:25},(_,i)=>{const h=(18+Math.floor(i/2))%24,t=String(h).padStart(2,'0')+':'+(i%2?'30':'00');return '<button data-time="'+i+'" aria-label="'+t+'"><img class="tick-moon" alt=""><i></i><span>'+t+'</span></button>';}).join('')+'</div><span class="time-center"');
chapterHtml=chapterHtml.replace('aria-valuemax="4"','aria-valuemax="24"').replace('<script src="content.js?v=','<script src="moon-data.js"></script><script src="content.js?v=');
chapterHtml=chapterHtml.replace('</head>','<link rel="stylesheet" href="chapters.css?v='+Date.now()+'"></head>').replace('</body>','<script src="chapters.js?v='+Date.now()+'"></script></body>');
chapterHtml=chapterHtml.replace('src="moon-data.js"','src="moon-data.js?v='+Date.now()+'"');
await fs.writeFile(new URL('index.html',out),chapterHtml);
let oldPanel=await fs.readFile(new URL('preview.js',out),'utf8');
oldPanel=oldPanel.replace(/const items=\[\.\.\.nav.children\];[\s\S]*?(?=document.querySelector\('#favorite'\))/,'').replace('activeNav(0);','');
await fs.writeFile(new URL('preview.js',out),oldPanel);
for(const f of ['chapters.js','chapters.css'])await fs.copyFile(new URL(f,root),new URL(f,out));
await fs.copyFile(new URL('assets/moon-data.js',root),new URL('moon-data.js',out));
await fs.cp(new URL('assets/moon/',root),new URL('moon/',out),{recursive:true});

let gestureHtml=await fs.readFile(new URL('index.html',out),'utf8');
gestureHtml=gestureHtml.replace('</head>','<link rel="stylesheet" href="gestures.css?v='+Date.now()+'"></head>').replace('</body>','<script src="gestures.js?v='+Date.now()+'"></script></body>');
await fs.writeFile(new URL('index.html',out),gestureHtml);
for(const f of ['gestures.js','gestures.css'])await fs.copyFile(new URL(f,root),new URL(f,out));

for(const n of ['site','parking','toilet'])await fs.copyFile(new URL('assets/stitch-'+n+'.jpg',root),new URL('stitch-'+n+'.jpg',out));
