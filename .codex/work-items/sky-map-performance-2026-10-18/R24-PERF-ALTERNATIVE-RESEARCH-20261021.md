# 不依赖当前真机调试连接的性能工具候选

2026-10-21。按用户最新要求进行有界一手资料研究；此文件只记录文档能力与验证条件，**没有操作手机、安装/登录工具、开启新采集、上传原件或证明工具已在本机可用**。设备实际资格和采集结果由 root 的现场证据拥有。沿用最新 performance-investigation 方法，不把进程指标等同于 JS 强引用图。

## 当前卡点及选择

用户已明确：云观星高内存场景中，进入页面后真机调试 RTT 升高，随后连接方式变为未连接，手机上的小程序仍可正常操作。Stable r22 对照在 Heap 基线前同样失联，详 [现场](R24-STABLE-RESUMPTION-20261021.md)。这些事实支持停用这条当前失效的实时调试链作为下一次采集前提；尚未证明具体内存阈值、OOM、网络层或 VM 失效是根因。

研究优先级：root 先验证 Android 系统级的本机采集（另由其研究/现场记录拥有），同时可一次检查普通开发版客户端的性能菜单。PerfDog 是独立于 IDE 的外部指标工具候选，但账号权益、当前版本本地保存和是否自动上传必须先核实；不为使用它新建收费服务或上传数据。公共 wx 指标可补充真实页面阶段，不能回答当前缺失的强引用问题。

## 三类候选及能力边界

| 路径 | 一手资料确认 | 不能据此声称 | 最小有界验证与停止条件 |
| --- | --- | --- | --- |
| 普通开发版客户端“显示性能窗口”；条件成立时 Trace 导出 | [官方性能面板](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/panel.html)写明从胶囊菜单打开，Android 指标包含小程序进程 CPU、Total PSS，并提供渲染/路由等指标。[官方 Trace 页](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tools.html)描述 USB adb、IDE Trace Panel、手机性能面板后重启、操作、手机导出及电脑拉取；这与真机调试 2.0 实时连接是不同的文档入口。 | Trace 页仍是 6.5.10 时代说明，当前客户端/Stable 是否保留该入口未验；未说明能给当前 V8 retaining graph。性能窗口读数不是整个产品泄漏结论，不能与另一会话数字拼增长曲线。 | 在当前普通 r23 的胶囊菜单中检查一次实际入口，若可打开只读确认指标和目标。只有当前手机导出与当前工具接收入口实际存在，且保存当前候选/状态后才考虑短 Trace；不依据旧教程直接重启、循环找面板或声称有导出。 |
| PerfDog 桌面 USB 外部性能采集 | [WeTest 产品说明](https://www.wetest.net/labs/221)明确列普通小程序和小游戏、无 root/越狱、CPU/GPU/Memory/FPS 等指标。[官方多进程说明](https://kr.wetest.net/labs/110)列 Android 子进程、iOS extension 支持；因此可作为独立于 IDE 调试连接的进程/显示层观察候选。官方下载入口是 [中国站](https://perfdog.qq.com/)或[国际站](https://perfdog.wetest.net/)，不能混用两站账号/客户端。 | 官网能力不证明当前 N2401/Android 14 可获得全部 GPU、FPS 或内存分类。外部 PSS/FPS 不能定位 JS 对象保留链，也不直接证明 Canvas 已呈现哪个时间意图。广告的无干扰/精度不是本项目实测。 | 若已安装且有可用权益，先确认版本、原授权设备、正确 AppBrand 子进程、只本地保存和关闭无关整机日志/截图；录一个短已知操作，再要求非空带时间数据和真实本地文件读回。若账号/付费/本地导出策略未满足，停止在该边界，不自动注册、申请 token、购买或上传。 |
| 公共 wx 性能 API，加现有本地有界 collector | [wx.getPerformance](https://developers.weixin.qq.com/miniprogram/dev/api/base/performance/wx.getPerformance.html)当前公开类型是 navigation、render、script、loadPackage、resource，涵盖启动/首次绘制/脚本注入/包和视图资源时段。[wx.onMemoryWarning](https://developers.weixin.qq.com/miniprogram/dev/api/device/memory/wx.onMemoryWarning.html)提供系统内存告警，Android level 5/10/15。可在普通预览执行，无需持续远程调试链。 | getPerformance 不提供 JS heap snapshot、retainer、分配栈或连续内存 bytes；onMemoryWarning 不是泄漏检测，没有告警也不表示无泄漏。初次绘制不等于 Sky 完整负载就绪，官方还说明 vConsole 可提前 firstPaint/FCP。 | 只在某个未决阶段问题需要它时，在现有 owner 中有限订阅/导出、明确 disconnect 和字段白名单；先校验实际非空事件、时钟语义、观察区间。当前任务已有 intent/prepare/accepted 关联，不为重新收相同问题新增全套埋点或重建候选。 |

## PerfDog 权益、原件与本地导出

- [WeTest 自有作者的历史功能说明](https://developer.cloud.tencent.com/article/1693875)区分“提交到后台”和“记录保存到本地”，并展示本地表格与回放。它证明曾有本地路径，不证明 2026 当前版本/权益仍允许无云端落盘；不把 PerfDog 一概判为必须上传，也不默认只要勾本地就没有上传。
- [当前官方帮助入口](https://perfdog.wetest.net/helpCenter)强调云端数据看板和中/国际站隔离。[官方 FAQ](https://www.wetest.net/n/faqs/)说明开启 Log 会捕获整机日志，USB 截图可用。此次目标无需整机日志、账号内容或云端报告，按最小范围使用。
- [官方 Service FAQ](https://www.wetest.net/blog/common-questions-about-perfdogservice-968.html)明确 PerfDogService 是与桌面 PerfDog 分开的付费模块；[token 流程](https://www.wetest.net/blog/how-to-apply-token-for-perfdogservice-966.html)要求登录和申请。新首页虽宣传 CLI/MCP，不代表当前账号已拥有服务或允许免费本机采集，不新搭 Service/MCP 作为先决条件。
- [当前价格页](https://www.wetest.net/n/prices/)可读取但价格字段为未解析占位，未取得有效现价/免费额度。旧 2020 免费说法不用于当前结论；没有采购、外联或数据上传。

## 排除与复用

- [2026-07-28 更新的普通小程序内存指南](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips/runtime_memory.html)仍将精细逻辑层内存分析指向模拟器调试器或真机调试 2.0。模拟器可做可重现对象生命周期的辅助反例，不能替代手机 Canvas/native/GPU 的实际泄漏验收。
- [FPS 面板](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/fps_panel.html)是 app.json 的 `debugOptions.enableFPSPanel`，官方明说基于 webview RAF、使用 Canvas 绘制。它有观察开销，也不是硬件呈现或每个 Sky accepted frame；当前无需为它单独重编译。
- 小游戏 `Take Heap Snapshot`/Unity dump 教程不能自动推广为本项目小程序的新能力。历史手机导出和后续失败已经在 [r22 研究](R22-HEAP-CAPTURE-RECOVERY-RESEARCH-20261021.md)记录，不重新包装为未试过的替代路线。旧微信开发者版和已废弃 profiler 不重装。
- 上述公开页面已实际查阅；web 索引无法打开部分微信页时，本机 HTTPS GET 返回 200 并读取正文。没有改 VPN、代理或客户端设置。PerfDog 当前帮助详情的一部分链接只返回前端空壳，故保留当前版本本地导出/权益未知，不由营销首页补造结论。

此研究没有得到新的 JS 强引用图。哪条路线已取得可解释的手机样本、哪个仅已发现入口，必须由 root 后续实测分别记录；完整 Goal 不因此完成。
