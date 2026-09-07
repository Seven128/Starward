# 地图 · 顶部拖区与共享相册

[评审页](review.html) · [Stitch 未修改原稿](outputs/stitch-original/index.html) · [可交互修订](outputs/interactive/index.html?extent=large) · [多图](outputs/interactive/index.html?extent=large&media=1&photos=3) · [单图](outputs/interactive/index.html?extent=large&media=1&photos=1) · [天文](outputs/interactive/index.html?extent=large&section=astronomy)

## 来源与采用边界

Stitch 本轮成功生成一张「地图·大档首屏·基本信息修订」。完整iframe原始HTML和同尺寸截图保存在outputs/stitch-original；原始链接图片保存于assets/stitch-*.jpg，原稿仍保留其远端链接/字体依赖。具体输出与使用记录见run.json。

原稿的多图露边、照片可辨识区域可用于延续方向；Codex审阅发现把手位于照片之前、深绿云观星更浓、擅增“无路灯/高流明设备”等事实、设施“实景”标签及时间/月相示意未经当前算法对齐，不能直接成为产品事实或采用稿。因此可交互修订在既有反馈稿上落实本轮要求，复用Stitch项目的生成照片作为补充示例，保持生成图/参考图与真实观星点证据的区别；不冒充Stitch原始输出。

## 本轮行为

- 顶部纯白，全宽44逻辑px拖区与名称共用紧凑header；短把手是提示。Header在文档内，照片在它之前；滚走无悬浮拖区，系统/边缘Back大档回中档。
- 场地无图不占位；单图宽幅，多图横向圆角图带露出后图与计数。三档继续一份文档，只在大档揭示媒体。
- 设施为2张图片/相册示例：原授权照片＋对应Stitch生成图。卡片保留明显照片区域，文字侧渐变保护，原图中不虚化。
- 所有相册共用图片查看器：从来源放大，左右分页，图片下拉跟手缩小；明显下拉松手回来源、轻拉/取消回弹。X、Escape、浏览器Back关闭同一层，保留面板/滚动/焦点。生产复用现有媒体/路由owner，样例history不是WEAPP系统Back的完成证明。
- 更多场地信息与数据来源同步执行箭头旋转、内容高度展开/收起，可快速反向；方向图标垂直居中。
- 日期组件与时间尺中心对齐，日期前后箭头各44px命中，今晚控制不推移中心；时间用常规400字重，月相在时间标签下方。−7/+15和逐刻真实离线月相沿用feedback-05。

生产职责分别在map-and-finder、spot-and-sky、shared-state-and-recovery与DESIGN.md。相册下拉门槛85px、翻页60px、展开260ms、图片300ms均为本稿示范参数，需真机定稿，不复制成多处产品硬编码。具体候选仍待评审，没有替换唯一已采用中档入口或迁移生产。

## 复现

仓库根执行 `node docs/design-resources/wechat-miniapp/map/20260907-stitch-b-refinement/feedback-06/prepare-preview.mjs`。编辑源为gestures.js/css（本轮交互）、chapters/content与prepare-preview，outputs/interactive为生成产物。月相数据沿用feedback-05/assets的离线样例。历史原稿不由该命令覆写。

[本轮验证](verification.md) · [上轮月相与服务范围核对](../feedback-05/research.md)
