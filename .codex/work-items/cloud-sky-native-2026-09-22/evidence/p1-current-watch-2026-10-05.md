# P1：当前 watch 编译身份与一次官方观测

原watch18132不重载新增TAN入口的config，plain构建已有通过结果，watch仍报原TypeScript解析错误。依据此具体变化，仅对核实身份的compiler执行一次更新；原日志封存，BFF24040的60065绑定与IDE13736保持，不重开项目、不重建API、不切测试数据。[执行脚本](../scripts/reload-current-watch-2026-10-05.ps1)及前置输入/launch/原日志在`output/cloud-sky-watch-reload-1005-p1-r1/`，没有更改正式配置或全局环境。

新watch3432于2026-10-05 16:36:24启动，真实初始编译16.92s成功，16:36:44进入Watching。现产物为`apps/wechat-miniapp/dist/weapp/`，300文件、12,950,026逻辑B，treeSHA256 `2c1452a8d3d28f3784d814fcc38d012f1c8561132a8e36f6c5daa770b3208122`。实际JS包含nativeTanDirection、原格WindowOffset/WindowSize和原60065 API origin，app.json保原Map与Sky/detail/sources。既有common CSS次序警告保留，不扩大其它业务修改。

[只读回执](p1-current-watch-readback-2026-10-05.json)及[reader](../scripts/readback-current-watch-2026-10-05.mjs)核启动前有限受影响源码、plain构建源与六项Settings/outbox字节不变，实际compiler/API/IDE身份和API监听读回；旧18132已退出。声明flags为正常非fixture/nonisolated/diagnostics关闭，未读取或输出operator token。这里未封存完整构建前source graph，watch仍活跃，产物身份是该次读回，不是不可变发布候选/完整源码运行时证明。BFF未重载，可能仍保旧模块/迟载混合边界。

编译输入变化后，按官方debugger/startup文档只发一次省略wait/waitForSelector的`simulator_screenshot`，不重复status/auth/open/refresh/auto。该官方客户端在35s截止未返可用截图，原句柄已收完、客户端退出；IDE侧动作是否结束UNKNOWN，不能把客户端期限当服务端取消。结果保于[一次观测](../../../../output/cloud-sky-devtools-observation-1005-p1-r1/result.json)，[脚本](../scripts/observe-current-devtools-once-2026-10-05.mjs)不保存raw stdout/stderr或凭证，没有依赖SDK的后续排队、导航或第二次截图。

当前编译边界已修；实际页面身份、WXML＋Canvas合成、控件/Back/hide仍未取得，历史FAILED_DEVTOOLS与官方MCP_INIT_ERROR保原，不能推断产品黑屏或原生通过。Android/iOS、新版月面手机、图质/独审/物理资源/官方上传包体/容量未验；12.95MB含开发产物，不能当官方上传量或手机内存。初始阶段无新通道线索停止该轮SDK观察，转对应E2本机链；其后编译/出口范围已收口，当前下一只看唯一PLAN，不复跑已闭合矩阵。

后续条件光学共享入口修改触发同watch的2.69s/5.56s增量，未重启compiler、BFF或IDE。当前有限source/300文件12,969,816逻辑B/tree a9594c86ef7ae6504265b11db8ad8a7caf4df1bab7dd8c7d6685032a74fbf8dc见[增量只读回执](p1-current-watch-incremental-readback-2026-10-05.json)。初始结果/一次截图FAILED或UNKNOWN保原；没有新增SDK观测，不将初始source hash当后续source或新compile当WXML/Canvas通过。当前下一依赖仅PLAN拥有。
