# 地图反馈13 · 单圈冲入与底栏换位

状态：已采用（2026-09-08，包含最后方向/副星避让修正）。当前开发入口为[三档采用包](../../adopted/spot-information/README.md)。入口：[评审页](review.html) · [手机中档](outputs/interactive/index.html?extent=medium) · [天文](outputs/interactive/index.html?extent=large&section=astronomy)。

- [本轮设计与动效参数](brief.md) · [实际验证](verification.md)
- [Stitch原稿](outputs/stitch-original/index.html) · [原稿截图](outputs/stitch-original/rendered.jpg) · [提示词](prompt.txt) · [运行记录](run.json) · [输入指纹](inputs.json)
- [默认](outputs/evidence/inactive.jpg) · [选中](outputs/evidence/active.jpg) · [天文](outputs/evidence/astronomy.jpg) · [逐帧状态采样](outputs/evidence/motion-samples.json)

可编辑变更：meteor.js、meteor.css、scenes.js；使用node prepare-preview.mjs重建（依赖前序基础壳），outputs/interactive可独立运行。唯一采用入口仍为../../ADOPTED.md，明确行为规则见所属Screen Contract，精确视觉已随三档采用包确认。
