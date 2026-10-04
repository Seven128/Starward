# 当前真实 Taro React / Query 消费者开发证据

当前安装的 React 18.3.1、Taro React 4.2.1 / reconciler 0.29.0、react-query 5.90.21 / query-core 5.90.20 已实际执行 `QueryClientProvider → useQuery → useResourceQuery → useSkyStellarSupplement`。Taro 自有 DOM 的真实组件文本随结果更新；没有手写 React effect / QueryObserver 端口、安装依赖或修改生产源码。这补充前一 r16 的消费者边界，不认证整个 SpotSkyPage、WXML、Canvas 或微信原生二进制。

[执行脚本](../scripts/experience-real-taro-query-consumer-2026-10-03.mts)使用小程序版本解析 React/Query，复用已安装 Taro renderer；根 React 19 / Query 5.101 未混入。Taro 编译常量来自当前安装 MiniWebpackPlugin 的默认值，项目无 runtime override。164 个实际构建源的前后 bytes/SHA256 精确，r50 的 271 个 checkpoint 源与六项保护文件在根读回时仍精确。缓存工厂和 tile-loader 只插入诊断包装；真实实现、完整 API 科学验证、URL/environment/hash 校验和 UTF8 文件读取实际运行。Native transport/storage/callback 受控，文件是新任务目录内的真实 Node 文件；坐标/时间是明确测试输入，实际 BSC8404 与 Astronomy Engine 几何供应 SAO 转换。

[保存结果](../../../../output/sky-real-taro-query-1003-r7/result.json)、[真实提交](../../../../output/sky-real-taro-query-1003-r7/commits.json)、[阶段账目](../../../../output/sky-real-taro-query-1003-r7/trace.json)记录了以下结果：

| 条件 | 实际结果 |
| --- | --- |
| 冷进入 | 七个真实瓦片、324 点；单文件 owner，47,434B catalog payload，真实逻辑文本相符 |
| 隐藏后实际 API clear | 索引从 Query store 移除；缓存条目/租约/字节归零，epoch 1；disabled observer 暂留旧交付对象不冒新 store 数据 |
| 返回、一个受控 503 | 同源 hash，新交付 identity 1→2；保留其余 279 点、failed true，失效瓦片真实 45 行 |
| 调用真实 Hook retry | 恢复 324 点、failed/loading false；新交付 identity 3；重用公共文件，没有再次传输全部七瓦片 |
| 另一重取、扣住真实 UTF8 delivery 后隐藏/clear | frame 空；租约保 1；API clear 如约报告 `local_cache_cleanup_incomplete`，Query store 仍独立清理，旧七文件进入退休账目 |
| 放行 callback / 等待既有 I/O 结束 / 显式再清理 | 租约 1→0，旧 callback 不恢复可见帧；owner entries/leased/bytes/reserved/running/pending/retired 全 0，卸载逻辑容器为空，仅余 26B 空 v2 inventory |

实际 22 次 UTF8 callbacks 按 descriptor hash/byte 识别 catalog，不依赖 `.json` 后缀；名称属于 `stage-catalog_...` 的已提交文件。最终 `failures` 计数实际为 1，保留原事实，没有改写为零或把累计计数当仍有资源。19 次受控请求的供应正文共 1,224,096B，其中四次 index、两套成功原始瓦片总 94,868B及一次 503 零正文；这是任务 transport 字节，**不是 HTTP 编码出口、公网流量或容量**。不以压缩字节当 parsed/native/GPU/OS 总内存。

此前失败均保留：r1 虚拟 stdin 被误绑真实文件；r2 缺 Taro 编译常量；r3/r4 缺任务 `getEnv`（r4 保存实际 Query error）；r5 将预期不完整清理误当失败；r6 在其他既有 native I/O 尚未结束时过早重试。只修任务接入/期待/即时快照，没有产品改动。r7 的断言和前后源绑定均已保存，但任务 Node 未自然退出；仅停止核实匹配该任务的叶进程，记录于 [process-completion](../../../../output/sky-real-taro-query-1003-r7/process-completion.json)。退出挂起原因未验证，不认证进程静默或把 wrapper 非零退出改成整轮通过。BFF/watch/DevTools 未重启。

[根读回](../../../../output/sky-real-taro-query-readback-1003-r2/result.json)另以保存 JSON/真实字节核实际版本、完整消费者源、科学 index/七原瓦片/行数、组件文本、Query identity、租约与退休及空 inventory，没有重跑请求。首次读回把中间 21 callback 固定成最终数量而失败，r2 改核最后阶段真实 22，失败 r1 保留。根读回是自审；独立审查 MISSING。

当前完整 React-provider **Hook** 边界已有开发证据；实际整页 JSX、report/上下文消费者、Scene 已绘帧/标签/点选、公共重试 UI、来源 route/Back 与 hide/show 原生生命周期尚未由此执行。WXML/Canvas FAILED、Android/iOS 新 Moon、物理总峰、全 200MB、生产 retention refs、200DAU混合成本/容量和 B 背景/接缝/弱结构/配准/覆盖/rights/完整出版仍开放，Prepared/science registry 继续空。没有提交、推送、下载加工、采用、采购、云部署或发布。
