# C01 原生模拟器手动缩放往返（2026-09-23）

在已打开的正式微信开发者工具源项目 `apps/wechat-miniapp` 中，MCP 版本检查为 skill `0.3.10` / `equal`、登录有效；CLI 独立调用曾报 `mcp_token_required`，MCP 控制面可用，未读取或写出任何 token。开始时 Map 已选 `MEMORY_TEST` 的 `spot:test-published` 示例点；点击当前点位面板的“云观星”进入 `/sky/detail/index`，原生方向不可用时点击“手动查看”。这是本地测试出版点，不是生产真实正式点。

Canvas 的可访问文案在操作前报垂直视场 **45.0°**、4,045 个当前帧亮星对象、报告时刻 `2026-10-08T06:00:00.000Z`（本地14:00）、手动视角。对原生 Canvas `#spot-night-sky-scene` 实际发送三组 `touchstart`→`touchmove`→`touchend` 双指事件：第一组距离260→42逻辑像素，视场至**203.7°**；第二组200→20，至**267.8°**；第三组20→250，回到**42.6°**。每一步文案中的对象计数/报告时刻仍相同；运行时页栈上的 spot/context/date/selectedAt/dataRevision 也未因缩放改变。截图 `artifacts/miniapp/cloud-sky-native/c01-dome-2026-09-23.png`（SHA-256 `cb8d75d8228d222990d06c0ba07c7c4723c83c56dfeff33578d10d09e58c206c`）显示整个地平圆盘留在427×920画面内；返回局部截图 `c01-local-return-2026-09-23.png`（SHA-256 `d69d060755ea7311e2763f8d70174acac971079dd80282e3f7d40226695e4f13`）重新显示局部经纬网。`get_simulator_console` 针对 `error|failed|exception|sky_gpu|shader` 无命中；这只说明该过滤下没有匹配行。

结束后 `navigateBack(1)` 回到原 `pages/map/index`，没有使用 Android、ADB、二维码、无线调试、预览发布或服务重启。此次补足正式 DevTools 的**手动**“局部→全天圆盘→局部”实际触摸与画面证据；截图没有保存进入总览前手动模式的像素/相机基向量，故不能证明放大后绝对方向完全相同。没有模拟真实手机姿态变化，不能证明返回时取最新传感器方向、真机 Canvas/WXML 合成、手势手感、性能或 iOS。当前官方模拟器 Canvas 挂载后仍把普通 WXML 控件视觉盖住；既有 Android 旧代预览和来源返回故障是另一证据层，均不因本轮自动消失。未修改生产代码，C01 与 goal 保持开放。
