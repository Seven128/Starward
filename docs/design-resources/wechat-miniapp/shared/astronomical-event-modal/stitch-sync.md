# Stitch 当前采用资源同步

2026-09-13实际通过已登录的Stitch画布完成同步并读回节点。两个项目刷新恢复后再次读回：十个本轮采用参考/规范节点均保留，五张本轮废案均不在画布中。采用依据为用户本轮确认。没有重新生成页面；上传本地最终原型的精确截图及[当前规则说明](stitch-current-notes.html)。

Stitch中的图片是视觉索引，可编辑/可运行交互源仍为本目录Modal、shared/tabs及Map/Plan完整增量源。Stitch不会执行本地模块，画布图片不代表已具备交互或已完成WEAPP实现。完整需求与Context入口见[开发说明](../../../../requirements/miniapp-uiux-alignment-2026-09-13.md)。

## 地图/地形项目

[观星点反馈 · 已采用](https://stitch.withgoogle.com/projects/13338420663663046308)共享项目保留既有有效反馈范围；本轮同步：

| 当前画布标题 | 实际节点ID | 本地来源 |
| --- | --- | --- |
| 已采用 2026-09-13 · 地形半径轴与图层多选 · 精确参考 | 3867bd78-595c-42f1-a757-099ddf3b9a0b | [terrain.png](reference/terrain.png) |
| 已采用 2026-09-13 · 地图方角图层面板 · 精确参考 | a21c6b18-0313-4993-93ea-82b9437c33b0 | [layers.png](reference/layers.png) |
| 已采用 2026-09-13 · 完整观星点大档 · 精确参考 | 9c487dac-d2dc-449b-9c68-48231e74e4f0 | [map-large.png](reference/map-large.png) |
| 当前采用规范 · 四项完整需求与Context · 2026-09-13 | 551c4052-54a1-42f9-a7f4-e39066dba82b | [当前规范](reference/stitch-current-notes.png) |

本轮未采用的“星湾观星点 · 地形章节展开态”和“地图 · 地形叠加光污染图层态”已通过画板删除菜单清理，并观察到“已删除/撤销”。其原稿包含已否定角度分析、错误导航与虚构数据，不再留作设计方案。

## 计划/事件项目

[观星计划与天文事件 · 已采用](https://stitch.withgoogle.com/projects/1643718854829580633)：

| 当前画布标题 | 实际节点ID | 本地来源 |
| --- | --- | --- |
| 已采用 2026-09-13 · 计划事件单选 · 精确参考 | fa805a9d-6dd2-45c0-b071-a5fb4c2d29e9 | [plan-single.png](reference/plan-single.png) |
| 已采用 2026-09-13 · 完整计划编辑 · 精确参考 | c8ecfb9b-3d63-484e-bcfa-cf1afb8b12e7 | [plan-editor.png](reference/plan-editor.png) |
| 已采用 2026-09-13 · 地图事件浏览 · 精确参考 | 8ee31dda-3f07-41c1-b3c1-5c05f70fbb72 | [map-browse.png](reference/map-browse.png) |
| 已采用 2026-09-13 · 同壳事件详情 · 精确参考 | fad900d2-8aab-4e00-b7f8-695ba91dc15e | [detail.png](reference/detail.png) |
| 已采用 2026-09-13 · 最新B批71份图标 · 精确索引 | 13f65e16-c2aa-4b3d-8a8a-d7f093cdb133 | [当前71份](../icons/adopted/b-matte-256/reference/current-light.png) |
| 当前采用规范 · 四项完整需求与Context · 2026-09-13 | 259c718e-1b24-42a6-b8c2-c503c3718017 | [当前规范](reference/stitch-current-notes.png) |

本轮未采用的“天文事件 · 地图浏览态 Modal”“天文事件 · 观星计划单选态 Modal”“天文事件 · 同 Modal 详情态”三张生成稿已通过画板删除菜单清理并读回移除结果。历史项目内其他既有页面/共享规范不属于上述五张本轮废案的清理集合，未因此删除整个共享项目。

## 本地收敛与检查边界

已将本轮两处stitch-original目录（五张生成HTML）、简化宿主preview.mjs/preview.css及两份过期生成输入移入Windows回收站，可恢复。preview.html保留为当前完整资源的入口转向。原完整地图/计划依赖仍被当前采用源使用，不以目录名称含candidate为由删除；未修改用户Desktop图标原始目录。

图标的三组旧候选、含废案的旧对照图与过期返修提示亦已移入回收站。采用图标入口现在提供71份当前资源的完整明暗底索引；仍可重建selected的母版/光线输入属于必要来源，保留在editable中。

本轮网页控件/动效的可执行检查记录在verification.json，生产开发、真实数据、原生地图合成及设备验收仍属于下一开发对话。Stitch中的旧对话消息不是当前设计指令；以明确命名的本轮采用节点及上述现行源为准。
