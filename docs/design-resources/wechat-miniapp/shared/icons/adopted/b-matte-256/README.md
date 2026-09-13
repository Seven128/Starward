# 最新B行磨砂图标 · 256px已采用

采用日期2026-09-13。当前71份256×256 RGBA PNG合计2,216,122 bytes（2.11MiB），覆盖62种基础图标、想去轮廓态、2份导航selected、2份动画分件及地图四态。无待返修项，当前唯一入口为[ADOPTED.md](../../ADOPTED.md)。

- [assets/](assets/)：当前采用的独立透明图标。
- [manifest.json](manifest.json)：语义ID、状态、母版位置/尺寸/哈希及256px输出哈希。原始高清素材位于用户Desktop相关目录，未修改。
- [当前完整图标预览](review.html)、[71份明底](reference/current-light.png)、[71份深底](reference/current-dark.png)：只显示当前71份。深底用于透明边缘检查，不代表夜间主题资源已交付。
- [最终地图明底](reference/marker-final-light.png)、[最终地图深底](reference/marker-final-dark.png)：32/64/144px四态检查。
- [压缩质量比较](reference/comparison-3x.png)：同144物理像素下原图、256和512的质量实验，512不属于采用包。
- [地图selected可编辑合成源](editable/spot-marker-selected/README.md)：default母版、仅用于提取光线的输入、独立透明覆盖层、高清合成母版与重建脚本。这些是当前输出的必要源依赖，不能作为废案删除。

来源为用户Web GPT最新加磨砂后的B行及同家族补充；母版是1254px透明栅格，不宣称矢量、3D或PSD。派生保持画布/透明边距/锚点，Lanczos3降采样后全彩PNG无损编码，不量化调色板、不自动抠图或重绘。分辨率缩小相对母版有采样损失，编码回读对重采样RGBA保持一致。各来源和压缩测量保留于provenance，当前清单以manifest为准。

地图selected由已采用default主体逐像素复制，仅在原透明区域叠加三条光线；1254px主体526,174个非透明像素及256px主体可见像素均一致。重建已匹配当前输出哈希。favorite-star轮廓/填充、map/account-user默认/选中、favorite-trail/favorite-satellite分件均已采用；place-pin不替代正式点位marker。备用素材有对应用途时再消费，不为凑图标增加功能。

普通UI使用256px；后续补图保留高清透明母版再派生。44px触控、页面可见尺寸、状态语义、主题和动效由既有组件/Context保证。本轮已清理旧候选目录、包含废案的旧对照图和过期返修提示；必要可编辑来源保留。生产图标整体迁移、四态切换、拼接动效和真机验证尚未完成，night/observation主题资源未交付。
