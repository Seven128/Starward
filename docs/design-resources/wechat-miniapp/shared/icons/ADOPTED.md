# 小程序共享图标 · 当前采用入口

2026-09-13用户明确采用256px版本，并授权本地代码合成最后的地图selected。当前资源为 [最新B行磨砂图标71份](adopted/b-matte-256/README.md)，覆盖62种基础图标、想去轮廓态、2份导航选中态、2份动画分件及地图4态；256×256全彩透明PNG是唯一采用母版。微信发布包因主包2048KB及原生Tab单图40KiB硬限制，分别使用可重建的[224px页面运行时派生](adopted/b-matte-256/platform/weapp-runtime/README.md)和[192px原生Tab派生](adopted/b-matte-256/platform/weapp-tabbar/README.md)，均保留完整画布、RGBA、锚点、颜色、状态和构图。该范围取代此前已覆盖语义的日间图标材质/造型依据，不改变各页面构图、动作及命中规则。

本轮日间71份清单已完成静态资源采用，无待返修图。地图selected以已采用default主体逐像素复制，仅在透明空白叠加原图提取的三条光线，1254px与256px主体RGBA均保持一致；核对记录、可重建母版及独立覆盖层见[本地合成源](adopted/b-matte-256/editable/spot-marker-selected/README.md)。已查看32/64/144px明暗底；生产WEAPP已观察DAY地图点位、工具与原生Tab的B批渲染，四态反复切换和想去快速中断仍按任务验证边界记录。旧候选和过期返修提示词已清理；仅保留当前采用资产与必要可编辑来源。夜间/红光仍未交付。备用素材的采用不要求增加页面功能；`horizon`是入口图标而非真实地形图。

共享语义、消费者和状态由 [Shared State owner](../../../../../project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md#shared-icon-resource)维护；DESIGN拥有通用风格，生产通过SemanticIcon/Asset及地图marker责任接入。DAY资源映射存在不代表旧绘制已退出或呈现符合设计；原“迁移已完成”结论已撤回，当前问题及复验范围见[任务覆盖更正](../../../../task-notes/miniapp-uiux-alignment-2026-09-13/coverage.md)。资源采用保持不变。

本轮消费者补齐记录见[图标应用检查](application-review.md)；材质适配、静态资产采用、生产映射与运行验证分别留证。

