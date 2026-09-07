# 地图基本信息与动效修订

本轮根据用户八项修订生成 Stitch 中档、大档有图两屏，并对照 Screen Contract、数据类型与现有路由核对产品职责。具体资源待评审；用户已明确的规则已进入所属 Context，不自动采用生成工具补出的内容。

- [评审入口](review.html)：中档对比、三档切换、有图/无图、收藏及取消。
- [可编辑交互预览](outputs/interactive/index.html)：Codex 技术与行为补充；构建源为 `prepare-preview.mjs`、`preview.css`、`preview.js`。
- [产品逻辑核对](product-logic-check.md)：信息责任、显示条件、现有路由、数据状态与实现缺口。
- [交互与迁移说明](interaction-notes.md)：静态图不能表达的行为及演示边界。
- Stitch 原始 [中档 HTML](outputs/medium-original/code.html)、[中档图片](outputs/medium-original/screen.png)、[大档 HTML](outputs/large-original/code.html)、[大档图片](outputs/large-original/screen.png)；完整导出 ZIP 与哈希见 `run.json`。
- [浏览器检查记录](verification.md)；`evidence/` 是本轮实际预览截图。

Stitch 项目：https://stitch.withgoogle.com/projects/587088532668047776 。一次提交实际生成两屏及一份图像素材，未额外追加候选。原稿与 Codex 补充保持分离。

照片来自本次 Stitch 生成，用于表达有图时的布局；不是已核实的深圳市天文台实拍，也不是已授权生产素材。生产必须用适用且有授权、署名和来源的真实媒体。预览全部依赖已本地化。

字体沿用已确认尺度。为了让两张 52px 设施卡片在中档完整露出，候选中档高度从 339.7px 增至 368px；这是本轮明确列出的待评审几何变化。小档 156px，大档占据模拟平台头部与底部导航之间的可用空间。云观星候选背景为 `#364158`，静态星点仅在按钮内。

本轮没有修改生产页面。唯一采用入口仍是上级 `ADOPTED.md`；该入口已注明用户新要求优先于旧图的相关表达，未确认的候选参数不能当作生产基准。
