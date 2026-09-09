import fs from 'node:fs';
const base='docs/design-resources/wechat-miniapp/search/adopted/search-page/preview';
const out='docs/design-resources/wechat-miniapp/search/candidates/context-audit-2026-09-09';
let html=fs.readFileSync(`${base}/index.html`,'utf8');
let js=fs.readFileSync(`${base}/interactions.mjs`,'utf8');
for(const label of ['今晚推荐','最佳窗口时长']){
 html=html.replace(new RegExp(`<button[^>]*data-filter-option="${label}"[^>]*>[\\s\\S]*?<\\/button>`,'g'),'');
 js=js.replaceAll(`"${label}", `,'');
}
html=html.replaceAll('摄影前景','有实拍照片').replaceAll('距离/驾车时间','驾车时长');
html=html.replace(/(data-filter-option="驾车时长" data-selected=")false/g,'$1true').replace(/(data-filter-option="停车" data-selected=")true/g,'$1false');
js=js.replaceAll('摄影前景','有实拍照片').replaceAll('距离/驾车时间','驾车时长');
html=html.replaceAll('data-spot-photo="assets/','data-spot-photo="../../../adopted/search-page/preview/assets/').replaceAll('src="assets/','src="../../../adopted/search-page/preview/assets/').replace('href="styles.css"','href="../../../adopted/search-page/preview/styles.css"><link rel="stylesheet" href="revision.css"').replace('href="/shared/','href="/docs/design-resources/wechat-miniapp/shared/');
js=js.replace("from '/shared/","from '/docs/design-resources/wechat-miniapp/shared/");
html=html.replace(/(<button[^>]*data-filter-option="驾车时长"[^>]*>)([\s\S]*?)(<\/button>)/g,(m,start,body,end)=>start.includes('filter-chip')?`${start}${body.replace('<span>驾车时长</span>','<span data-drive-strip>驾车时长</span>')}${end}`:`<div class="drive-config" data-drive-config>${start}${body}${end}<label class="drive-input-row"><input data-drive-minutes aria-label="驾车时长分钟数" inputmode="numeric" type="text" value="180" aria-describedby="drive-error"><span>分钟以内</span></label><p id="drive-error" class="drive-error" role="alert" hidden>请输入30—360之间的整数</p></div>`);
html=html.replace('<div class="search-surface" data-search-surface>','<div class="search-surface" data-search-surface>');
html=html.replace('<div class="filter-row">','<div class="filter-row">');
html=html.replace('<span class="sr-only" data-search-status>','<span class="sr-only" data-search-status>');
// Existing adopted shell/cards/disclosure remain the integration base. New driver composition is from Stitch refined source.
js=js.replace('draft: null,','draft: null,\n      driveMinutes: 180, draftMinutes: "180",');
js=js.replace('category: CATEGORIES[0].id,','category: "arrival",');
js=js.replace('function renderFilters() {',`function renderFilters() {
      const drive = one('[data-drive-minutes]');
      if(drive && document.activeElement!==drive) drive.value=state.draft?state.draftMinutes:String(state.driveMinutes);
      if(drive) drive.disabled=!(state.draft??state.selected).has('驾车时长');
      const driveBox=one('[data-drive-config]');
      if(driveBox) driveBox.dataset.enabled=String((state.draft??state.selected).has('驾车时长'));
      const driveLabel=one('[data-drive-strip]');
      if(driveLabel) driveLabel.textContent=state.selected.has('驾车时长')?'驾车'+state.driveMinutes+'分钟内':'驾车时长';`);
js=js.replace('state.draft = new Set(state.selected);','state.draft = new Set(state.selected);\n      state.draftMinutes=String(state.driveMinutes);\n      one("#drive-error").hidden=true;');
js=js.replace('if (commit && state.draft) state.selected = new Set(state.draft);',`if(commit && state.draft?.has('驾车时长')) {
        const value=state.draftMinutes.trim();
        if(!/^\\d+$/.test(value)||Number(value)<30||Number(value)>360){one('#drive-error').hidden=false;one('[data-drive-minutes]').setAttribute('aria-invalid','true');focus(one('[data-drive-minutes]'));return;}
      }
      if(commit && state.draft){state.selected=new Set(state.draft);const n=Number(state.draftMinutes);if(/^\\d+$/.test(state.draftMinutes.trim())&&n>=30&&n<=360)state.driveMinutes=n;}`);
js=js.replace('state.draft.clear();','state.draft.clear();\n        state.draftMinutes="180";one("#drive-error").hidden=true;');
js=js.replace('const label = target.dataset.filterOption;','const label = target.dataset.filterOption;\n        if(label==="驾车时长" && !dialog.contains(target)){state.category="arrival";openFilters(target);return;}');
js=js.replace('root.addEventListener("click", (event) => {',`one('[data-drive-minutes]').addEventListener('input',event=>{state.draftMinutes=event.target.value;one('#drive-error').hidden=true;event.target.removeAttribute('aria-invalid');});
    root.addEventListener("click", (event) => {`);
// Scenario selector is outside the phone; its fixtures do not claim live provider behavior.
js=js.replace('const cards = all("[data-result-card]");',`const cards = all("[data-result-card]");
    const note=document.createElement('div');note.className='coverage-note';note.hidden=true;note.setAttribute('role','status');scrollOwner.prepend(note);
    const scenario=new URLSearchParams(location.search).get('scenario')||'normal';
    const notes={partial:'少云：5个地点中3个可判断，其余2个暂不能判断',low:'低云数据暂不可用',zero:'没有符合当前条件的地点',events:'当前日期与地点没有符合条件的天象'};
    if(notes[scenario]){note.hidden=false;note.textContent=notes[scenario];const remove=button('移除条件','coverage-action');remove.addEventListener('click',()=>{const removed={partial:'少云',low:'低云阈值',zero:'少云',events:'特定天象'}[scenario];location.href=location.pathname+'?remove='+encodeURIComponent(removed);});note.append(remove);if(scenario==='low'){const retry=button('重试','coverage-action');retry.addEventListener('click',()=>{note.firstChild.textContent='低云数据仍暂不可用';});note.append(retry);}}
    if(scenario==='zero'||scenario==='events')for(const group of all('[data-result-group]'))group.hidden=true;`);
js=js.replace('let routeAnimation = null;',`if(scenario==='low')state.selected.add('低云阈值');if(scenario==='events')state.selected.add('特定天象');
    const removed=new URLSearchParams(location.search).get('remove');if(removed)state.selected.delete(removed);
    let routeAnimation = null;`);
js=js.replace('announce(`${matching.size}个匹配的观星点`);',"announce(scenario==='partial'||scenario==='low'?`${matching.size}个地点，部分条件待核对`:`${matching.size}个匹配的观星点`);");
js=js.replace('function matchingCards() {',`function matchingCards() {
      if(scenario==='zero'||scenario==='events')return [];`);
js=js.replace('if (empty) empty.hidden = matching.size !== 0;',"if (empty) empty.hidden = matching.size !== 0 || scenario==='zero'||scenario==='events';");
js=js.replace('const start = () => document.querySelectorAll("[data-search-prototype]").forEach(setup);',`const start = () => {document.querySelectorAll('[data-search-prototype]').forEach(setup);if(new URLSearchParams(location.search).get('panel')==='filters')setTimeout(()=>document.querySelector('[data-filter-open]').click(),150);};`);
fs.writeFileSync(`${out}/preview/index.html`,html);
fs.writeFileSync(`${out}/preview/interactions.mjs`,js);
fs.writeFileSync(`${out}/preview/revision.css`,`/* Codex integration: Stitch refined driving configuration within the unchanged adopted Search shell. */
.drive-config{grid-column:1/-1;border:1px solid #bedaff;border-radius:12px;background:#f6faff;padding:4px 12px 10px;min-width:0}
.drive-config[data-enabled="false"]{background:#fafbfc;border-color:#e5e8ed}
.drive-config>.filter-option{border:0;background:transparent!important;width:100%;padding:0;min-height:44px;text-align:left}
.drive-config .chip-face{justify-content:flex-start}
.drive-input-row{display:flex;align-items:center;gap:8px;border-top:1px solid #e2edff;padding-top:6px;color:#475569;font-size:12px}
.drive-input-row input{width:64px;min-height:44px;text-align:center;font-size:14px;font-weight:600;color:#1d2129;background:white;border:1px solid #c3dcff;border-radius:6px}
.drive-input-row input:disabled{opacity:.5}.drive-error{font-size:11px;color:#a52937;line-height:16px;margin:6px 0 0}.coverage-note{font-size:12px;line-height:18px;padding:8px 0;color:#546275}.coverage-action{border:0;background:transparent;color:#356583;min-height:44px;padding:0 8px;font-size:12px}
`);
fs.writeFileSync(`${out}/review.html`,`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>搜索筛选 · 待审</title><style>body{margin:0;background:#edf0f4;color:#273244;font:14px system-ui}main{display:flex;gap:28px;justify-content:center;padding:24px;align-items:flex-start}aside{max-width:280px}h1{font-size:20px}p{line-height:1.7}select,button{font:inherit;min-height:40px;margin:4px 0}iframe{border:0;background:white;width:390px;height:844px;flex-shrink:0}a{color:#356583}@media(max-width:760px){main{flex-direction:column;align-items:center;padding:10px}aside{max-width:430px}iframe{max-width:100%}}</style><main><aside><h1>搜索筛选 · 局部修订</h1><p>待你审查，尚未采用。保留原搜索页的构图与交互；驾车输入区来自 Stitch 精修，Codex 接入参数与状态演示。</p><label>查看宽度 <select id="width"><option>320</option><option>375</option><option selected>390</option><option>430</option></select></label><br><label>示例状态 <select id="scenario"><option value="normal">正常</option><option value="partial">少云部分覆盖</option><option value="low">总云有、低云缺失</option><option value="zero">真实零匹配</option><option value="events">目录覆盖、无适用天象</option></select></label><p><button id="open">打开到达方式筛选</button><br><a href="stitch-refined/index.html">Stitch 精修源</a> · <a href="README.md">来源与范围</a></p><p>先启用驾车时长，再输入30—360分钟；确认提交，关闭或 Escape 取消。5类共16项。数据状态为画外选择的样例，不调用真实服务。浏览器无法证明真实微信键盘与原生地图行为。</p></aside><iframe title="搜索页设计候选" src="preview/index.html?panel=filters"></iframe></main><script>const f=document.querySelector('iframe');document.querySelector('#width').onchange=e=>f.style.width=e.target.value+'px';document.querySelector('#scenario').onchange=e=>f.src='preview/index.html?scenario='+e.target.value;document.querySelector('#open').onclick=()=>f.src='preview/index.html?panel=filters';</script></html>`);
console.log('Wrote candidate review, adopted base preserved.');
