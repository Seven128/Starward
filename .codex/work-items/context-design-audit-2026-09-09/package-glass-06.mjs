import fs from 'node:fs';
const root='docs/design-resources/wechat-miniapp/',candidate='/candidates/context-audit-2026-09-09/';
for(const owner of ['sky','my']){
 const p=root+owner+candidate+'review.html';let s=fs.readFileSync(p,'utf8');
 s=s.replace(/<p><strong>当前最新：<\/strong>.*?<\/p>/,'<p><strong>当前最新 · 第六轮：</strong>公共材质改为曲面折射与定向细高光，中心透光，文字独立清晰。沿用小字级、原有内容与交互。网页候选待审，小程序渲染路线尚未选定。</p>');
 s=s.replace('<strong>最新：</strong>第四轮','<strong>历史：</strong>第四轮');fs.writeFileSync(p,s);
 fs.appendFileSync(root+owner+candidate+'README.md','\n\n## 第六轮材质修订\n\n使用[共享曲面材质](../../../shared/liquid-glass/README.md)，保留原有内容、紧凑字级和交互。原稿与本地光学适配明确分开；候选待审，未采用、无生产迁移。\n');
}
const lab=root+'shared/liquid-glass/review.html';let s=fs.readFileSync(lab,'utf8');
s=s.replace('top:165px;left:105px','top:240px;left:105px');
s=s.replace('<h1>公共液态玻璃 · 待审材质</h1>','<h1>公共液态玻璃 · 曲面候选</h1><p><a href="../../sky/candidates/context-audit-2026-09-09/review.html?v=6">云观星实际页面</a> · <a href="../../my/candidates/context-audit-2026-09-09/review.html?v=6">我的实际页面</a> · <a href="before-feedback-06/review.html">上一版材质对照</a></p>');
s=s.replace('移动背后的网格，检查光线与颜色是否穿过表面，以及靠近圆角的线条是否弯折。','第六轮：中心透光，曲面边缘折射，定向细高光。移动背后的网格，观察线条在边缘的弯折；“仅透光”关闭位移，便于对照。真实星空稀疏、My背景柔和时，效果自然更轻。');
fs.writeFileSync(lab,s);
const doc=root+'shared/liquid-glass/README.md';s=fs.readFileSync(doc,'utf8');
s=s.replace(/选用薄透明主体[\s\S]*?当前增强分支限已检查的 Chromium 预览，其余是明确的透光降级，不称为折射已支持。/,'第六轮候选改为凸面剖面导出的位移：以四阶曲面截面、法线与 Snell 弯折角近似投射到背景面，折射限制在边缘，中心位移中性；定向细高光使用同一几何法线，较弱的反向反射与暗边表达厚度。文字层不参与滤镜。低 alpha 的主体保留真实背景，暗色表面轻微提亮；浅/暗/暖红使用同一模块的参数。具体值以 material.css/material.mjs 为准。无页面截图、无复制星场；图只在可见尺寸变化时重建，唯一 filter ID 与销毁仍属材质职责。当前增强路径仅在本地 Chromium 预览检查，其余是明确透光降级，不称为折射已支持。');
s+='\n\n## 第六轮来源、路线与实际验证\n\n- [Kube 曲面折射文章](https://kube.io/blog/liquid-glass-css-svg/)作为曲面/定向高光机制参考；本地适配不是复制生产库，也不声称复刻 Apple 完整材料。没有色散、完整多界面光线追踪或自动背景亮度采样。\n- [Stitch 原稿和输入](../../sky/candidates/context-audit-2026-09-09/stitch-feedback-06/README.md)仅提供视觉修订；Codex 本地适配实现实际 SVG 位移。原稿的跨端低开销声称不继承。\n- [上一版完整材质](before-feedback-06/review.html)保留；[当前对照](review.html)可切换位移、透光与不透明，并移动测试背景。测试网格与文字不属于产品。\n- 生产路线和前置小范围真机比较由[架构 owner](../../../../../project_context/architecture/runtime-and-domain.md#shared-material-rendering-boundary)维护：目前未选定 WEAPP renderer；HTML SVG 是设计实验，shader 仅在真实场景纹理可用时成为候选，DOM 捕获库不是当前直接接入方案。\n- 第六轮实际查看 Stitch、网格折射/无折射/移动背景及 My/Sky 真实候选截图；检查320/390/430宽度、长文滚动、关闭重开、暖红、不透明与缩放窗口后降级保持。没有执行 WEAPP 真机或性能测试，设计待用户审查。\n';fs.writeFileSync(doc,s);
fs.appendFileSync('DESIGN.md','\n2026-09-09 glass refinement: within the My/Sky shared-material scope, translucency is only one attribute. Seek smooth curved-edge lensing, directional fine highlights and restrained depth on both bright and dark real backgrounds; keep foreground type clear. A uniform bright outline or stronger blur alone does not meet this direction. Exact experimental values remain in the candidate; no Apple parity or target-device acceptance is implied.\n');
