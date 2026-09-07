# 地图 · 第七轮修订

[评审入口](review.html) · [手机交互](outputs/interactive/index.html?extent=large&media=1&photos=3) · [天文](outputs/interactive/index.html?extent=large&section=astronomy) · [Stitch完整原稿](outputs/stitch-original/index.html)

本轮七项要求见[brief](brief.md)，当前检查见[verification](verification.md)。用户明确规则已同步Context/DESIGN；此候选尚待评审，不替代ADOPTED中未受新要求影响的已采用尺度，也不表示生产已迁移。

可编辑源：prepare-preview.mjs、content/chapters/gestures/polish的JS与CSS，素材在assets，输出在outputs/interactive。构建从仓库根运行：

`node docs/design-resources/wechat-miniapp/map/20260907-stitch-b-refinement/feedback-07/prepare-preview.mjs`

构建沿用反馈02基础壳，目录不应脱离仓库单独当源工程搬迁；outputs/interactive是自足静态预览。Stitch原稿保留原始外部字体/CDN依赖，独立保存真实渲染截图。

日期延续过去7天/未来15天；月相由既有Astronomy Engine样本计算，场地与天气是示意。生产服务覆盖限制见[此前核对](../feedback-05/research.md)。照片许可与类型见assets/credits.json及评审页，生成图片不是实拍。
