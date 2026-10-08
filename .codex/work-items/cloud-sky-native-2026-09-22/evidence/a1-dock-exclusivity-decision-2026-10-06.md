# I05 控件互斥与日期面板下的时间尺修复

当前完整普通page的原M31选择作为身份前提，随后公开时间轴/收起、列表切换、重新校准/收起都取消活动时间尺预览，保持提交13:00、同Context与选择。日期选择打开亦先取消，但原时间尺仍scrollX=true，原活动拖动的迟到scroll将显示从13:00改到14:00，日期面板仍开、Context提交仍13:00。该实际反例与原FAILED完整保留；不是日期提交或代理预期错误。

只改原OrientationTimeRuler caller一处interactionLocked，将datePickerOpen纳入既有锁定条件。复用原cancelInteraction/scroll-settlement/nativePosition取消与恢复，未改共享组件或新建时态框架。一个新回归测试执行原页面日期onOpenChange、原ruler锁定prop及持久Hook重绘/原settlement，验证旧捕获scroll/release/end/150ms计时不复活或提交，关闭后一次正常提交；修前失败、修后相关21检查与Mini Program类型通过。

修前复用525输入普通bundle，58Scene/71请求，实际退出1/最终退休模型MISSING；仅一次必要构建后，同小样60Scene/73请求、退出0，八关闭或切换回执、日期下迟到scroll保持13:00且scrollX=false、日期关闭后正常预览及收起恢复。合计118Scene/144请求，不重复日月行星/图层/校准编辑迟到矩阵。成功encoded/decode/GPU逻辑模型、请求与传感器最终0，两browser/API关闭；非物理峰或真实账号验收。

一个产品源码/一个新测试；原watch只更新详情页JS/map，map中的完整页面原文与当前源码精确一致。六项Settings/outbox原样不动，原watch/BFF/IDE无重启，0下载/加工/缓存预算改动/新DevTools请求/提交推送。普通Prepared空/HiPS关、Mellinger低分辨率DISPLAY与全部33账保持。原生CSS/中文/44px/焦点滚动、DevTools/WXML/Android-iOS新版月面、完整日期/88/图质与物理200DAU/独审仍缺；所有旧FAILED/UNKNOWN保持。

见[当前读回](dock-exclusivity-readback-2026-10-06.json)、[原失败滚动](../../../../output/playwright/dock-exclusivity-1006-r1/dock-calendar-late-scroll.json)、[修复后动作](../../../../output/playwright/dock-exclusivity-1006-r2/dock-exclusivity-result.json)。下一公共时间跨午夜按[PLAN](../PLAN.md)唯一顺序。
