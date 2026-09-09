import fs from 'node:fs';
const root='.codex/work-items/context-design-audit-2026-09-09/';
for(const name of ['build-map-review.mjs','build-plan-review.mjs','check-controls-feedback.js','check-glass-07.js','check-map-browser.js','check-map-final.js','check-sky-browser.js']){const p=root+name;fs.writeFileSync(p,fs.readFileSync(p,'utf8').trimEnd()+'\n');}
const check=root+'check-links.mjs';fs.writeFileSync(check,fs.readFileSync(check,'utf8').replace("['diff','--name-only']","['diff','HEAD','--name-only']"));
const d='docs/design-resources/wechat-miniapp/shared/liquid-glass/before-feedback-07/';let s=fs.readFileSync(d+'review.html','utf8').replaceAll('../../sky/','../../../sky/').replaceAll('../../my/','../../../my/').replace('before-feedback-06/review.html','../before-feedback-06/review.html');fs.writeFileSync(d+'review.html',s);fs.writeFileSync(d+'README.md','# 第六轮材质归档\n\n这是增加6px模糊之前的共享材质（0.5px）。保留原材质CSS/JS，审查页只修正归档目录导致的相对链接。历史对照，不是当前实现源；当前源见[上级说明](../README.md)。\n');
