# 新增观星点 · 统一采用入口

[当前交互预览](review.html)。新增、编辑草稿、反馈共用[统一表单资源](../../../feedback/adopted/spot-feedback/README.md)，完整字段、样式和手动远端多草稿规则均以该包为准。旧单草稿实现已退役，不作为开发依据。地图、表单和审核中点位过渡复用该统一实现；正式生产服务尚未迁移。

生产 Map 的入场/退出呈现由 `pages/map/spot-editor-presentation.ts` 持有，关闭、返回、切点及提交回执沿用同一编辑器与 `bottomPresentation`；表单的数据、媒体和确认仍由 contribution owner 持有。退出完成前保留节点，减少动态效果不作位移，隐藏、卸载及账户/地图身份变化使迟到的消费者切换失效。当前实际验证范围与未验项见 [Map 采用入口](../../ADOPTED.md)，资源本身未重新采用或扩大。
