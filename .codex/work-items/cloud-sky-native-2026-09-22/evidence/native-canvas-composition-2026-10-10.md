# 原生控件遮挡：用户确认与有界图形比较

用户确认开发者工具实际模拟器“看不到，只有星空”，因此不能再仅归为截图异常。用户另确认“目前没有可用测试手机”；Android/iOS 与产品／工具归因继续未验证。沿已有原生 Canvas2D 呈现桥和 CoverView／普通 View，不增加 Canvas UI 引擎、显示模式或图像输入。

本次只使用原 s1 的 SKY1010CP1 构建（bundle SHA `5c0f31032d70ed5d672d0ebb8f0506ed6df632ea1c68d94fbe900b5b407ad1f4`），不是当前全部源码的重新验收。公共 SDK 读取实际页面、视口、GL 与元素，再执行真实“手动查看”点击及官方截图。SDK 3.17.4、webview、DPR3；截图已直接查看。试验前后274个构建文件均与原绑定相同；没有产品源码或工程配置改动。

| 启动比较 | 实际读回 | 结论 |
| --- | --- | --- |
| 官方 CLI `--disable-gpu` | 实际启动标志成立；GL renderer 为 null，控件出现但星空不绘制，显示“天空图暂不可绘制” | UNSUITABLE_WEBGL_UNAVAILABLE，不能作为修复 |
| 仅 `--disable-accelerated-2d-canvas` | 实际启动标志成立、GPU 未禁用；ANGLE NVIDIA RTX3060 D3D11；星空绘制，返回与底部控件仍不可见 | FAILED_NO_COMPOSITION_IMPROVEMENT |

官方 CLI 退出前核验仅有本任务窗口；两个连接均由公共 SDK disconnect 退休，不关闭未知项目。比较后执行无图形禁用标志的正常启动；其 CLI 在 AppID 权限获取阶段未完成有界启动，提前连接9450的 `gpu-restored.json` 保留为 harness FAILED。超时只退休核验过身份的 CLI 客户端 PID5772，未杀 IDE；该 exec session 随后 exit0 不代表服务端成功。最终管理员只读核验：四个可读主进程均无两项禁用标志，HTTP23977仍监听，但项目窗口0、9450未监听。独立官方截图仍 `MCP -32603 Bad Request`，项目运行恢复 UNKNOWN；不能写成已恢复画面，也不再循环启动或改图形标志。

前次正斜杠窗口匹配失败、open 未知结果、raster 首次 IDE-port 超时、提前 restore 连接失败、原 SDK／布局／z-index／渲染模式反例均保留。公共工具重启后的身份与连接失败不是产品图质结论；Source 页面可见、WXML 和可程序化点击也不能补齐 Sky 权益呈现。

精确 JSON、实际截图、执行脚本与退休记录见 [统一回执](../../../../output/native-canvas-composition-2026-10-10-r1/result.json)。当前权益 PARTIAL、普通 Prepared 采用0，HiPS仍关；真实设备、原生完整画质／交互／恢复、物理峰和独审缺口不变。继续唯一 PLAN 中不依赖设备的分发、缓存和容量责任，不重做已合格的三区域 React／GPU 检查或已收敛的同机制照片加工。
