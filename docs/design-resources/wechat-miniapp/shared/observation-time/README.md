# 公共观测日期与时间 · 浏览器设计资源

按2026-09-08用户要求，从已采用观星点天文原型提取日期栏、日历、刻度与手势，供两个资源消费者使用同一份 [control.js](control.js) 和 [control.css](control.css)：

- [观星点天文](../../map/adopted/spot-information/preview/index.html?extent=large&scenario=full&section=astronomy)：提供每个切片的月相图标。
- [图层面板](../../map/adopted/layer-selector/preview/index.html)：不提供月相槽，其余日期/时间几何与规则相同。

日期、切片与事实由调用方提供；组件处理日期选择、保留同一钟表时间、日历取消/焦点返回、横拖预览、释放提交、方向竞争与取消恢复。日历来自实际传入的日期数组；浏览器样本使用原观星点隔离数据，不是生产能力。每个独立预览实例的选择由其调用方持有，不把跨iframe页面当作已接入真实Observation Context。

提取保留已采用字号、66px刻度间距、浅弧和暖黄中心轴，移除了各原型重复的控制器与样式。日期栏与日历使用所选切片的实际当地日期；跨午夜底部说明保留起始观测夜，不再重复中心时间；窄屏省略视觉星期以容纳日期与图标，日期名的辅助语义仍完整。日期箭头、今晚和日历格保持至少44px，移除月相槽时不留空占位。

这是可交互设计资源的共享实现。生产实现仍应使用现有Taro enhanced ScrollView、公共components层和唯一Observation Context，不能直接把DOM控制器移植到WEAPP。产品语义由 [Spot and sky](../../../../../project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md#lunar-facts-and-date-selection) 与 [Map and Search](../../../../../project_context/areas/main/screen-contracts/wechat-miniapp/map-and-finder.md) 拥有。

2026-09-08补充：共享控制器独占时间尺呈现与语义，消费者只更新事实。拖动使用连续进度，松手用220ms减速吸附；重抓中断并从当前进度继续，取消恢复提交值，减少动态效果直接归位。日历按实际切片日期推导可用性，选择日期保持钟表时间并映射回正确的夜记录。
