# 地图小档与大档 · 待确认

用户要求两档一起生成，已完成一次Stitch提交、两张实际输出。中档仍是唯一已采用状态，本轮小/大档未自动采用。

- [三档对照页](review.html)，手机入口：http://192.168.31.26:4282/extents.html 。
- 小档：[预览图](outputs/small-preview.jpg)、[本地HTML](outputs/small-preview/index.html)、[Stitch原始ZIP](outputs/small-original.zip)、[原始HTML](outputs/small-original/code.html)、[原始PNG](outputs/small-original/screen.png)。
- 大档：[预览图](outputs/large-preview.jpg)、[滚动后](outputs/large-scrolled.jpg)、[本地HTML](outputs/large-preview/index.html)、[Stitch原始ZIP](outputs/large-original.zip)、[原始HTML](outputs/large-original/code.html)、[原始PNG](outputs/large-original/screen.png)。
- [生成输入](prompt.txt)、[运行与输出身份](run.json)、[实际尺寸](outputs/render-inspection.json)、[手机入口检查](outputs/phone-inspection.json)。

## 来源与整理

Stitch两张原稿存在共同组件漂移：字体栈、图标、边距、主导航图标和按钮圆角与中档不一致，小档换了地图素材且没有保留完整文档，大档额外填入未提供的时间点与开发解释。原件完整保留，不能把下述整理归功于Stitch直接输出。

Codex独立整理副本：沿用Stitch的小档裁剪构图及大档天文事实布局，复用已采用中档的header、身份、章节、路线、设施、辅助入口、底部动作和主导航。两档由[同一完整文档](outputs/shared-document.html)生成；小档裁剪，大档仅内部文档滚动。删除无依据时间标签、推荐措辞、模型实现说明。地图复用已采用参考素材，小档为覆盖增加的地图区域调整静态背景裁切；点标与背景不具备真实投影对应，不能作为地理基准。

prepare-preview.mjs复现整理HTML；本地index.html另以本轮实际渲染CSS快照及同源地图图片替换远程依赖。修改源码后需重新渲染并更新CSS快照，不能把旧快照视为新源码的证据。手机副本仅调整设备viewport和可用高度，不整体缩放字体/按钮。

## 核对与边界

390×844基准下，小档面板156px，标题18px/700、章节13px/600、三个操作按钮可见40px，与中档一致；小档搜索36px、圆形工具36px。大档顶端避让平台示意栏，隐藏Search/地图工具，主导航不被覆盖。大档文档657px、可见603px；已实际通过章节点击滚动到底部，固定操作位置不变。手机大档390×760另查过仍可滚动、保持字级、使用本地素材。截图为浏览器原样JPEG，并非原始Stitch PNG。

本轮只覆盖日间、无媒体、无天文数据。有效媒体、真实时间切片与事实矩阵、其他主题仍未设计完；无数据时间尺是静态禁用外观，不能代表真实时间交互。浅辅助色对比度仍待共享颜色规则协调。预览没有面板拖拽、真实地图或导航/分享等业务行为；章节滚动只是审阅辅助，WEAPP及真机交互未验证。生产代码与正式采用入口未改。
