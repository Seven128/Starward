import fs from 'node:fs/promises';
const root = new URL('./', import.meta.url);
let html = await fs.readFile(new URL('outputs/original/code.html',root),'utf8');
html=html.replace('<!-- 地图Pin标记（深圳市天文台精确标注） -->','<!-- 静态地图参考点标；地理准确性未验证 -->');
html=html.replace('<title>今晚去观星 - 方向B（连贯底抽屉·极简现代排版版）</title>','<title>地图页 · 原 B 尺度与纯图标导航 · 技术整理预览</title>');
html=html.replace('</style>',`/* Codex: transparent hit extensions; visible geometry stays unchanged. */
button[aria-label="导航"] {position:relative;}
button[aria-label="导航"]::after {content:"";position:absolute;width:44px;height:44px;left:50%;top:50%;transform:translate(-50%,-50%);}
.map-tool {position:relative;pointer-events:auto;}
.map-tool::after {content:"";position:absolute;width:44px;height:44px;left:50%;top:50%;transform:translate(-50%,-50%);}
.search-entry {position:relative;cursor:pointer;}
.search-entry::after {content:"";position:absolute;width:100%;height:44px;left:0;top:50%;transform:translateY(-50%);}
</style>`);
let toolIndex=0;
html=html.replaceAll('<button class="w-9 h-9',()=>'<button aria-label="'+(['定位','图层'][toolIndex++])+'" class="map-tool w-9 h-9');
html=html.replace('<div class="h-9 px-3','<div role="button" tabindex="0" aria-label="搜索观星点" class="search-entry h-9 px-3');
await fs.mkdir(new URL('outputs/technical-preview/',root),{recursive:true});
await fs.writeFile(new URL('outputs/technical-preview/code.html',root),html);
