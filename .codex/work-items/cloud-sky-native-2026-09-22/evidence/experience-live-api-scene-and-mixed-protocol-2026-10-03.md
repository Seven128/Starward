# 当前 API / 软件 page-Scene 与混合测量入口

本轮只改任务测量脚本、当前计划/恢复入口和必要部署 Context；生产源码及其他业务逻辑保持 r42，六项设置/outbox 保护保持。原工作区、分支和 HEAD 不变，无提交、推送、采购、远端部署、共享 BFF 写入或重启。普通业务使用隔离测试仓库，不写共享业务数据。

## 当前实际消费者

旧 R5 在浏览器进入前已注入 report、附着 BSC、figures 和 positions。本轮重建当前 page 提取器：175 page 与149完整 API source bindings，去重270个当前源身份；六份光学依赖已较旧 R5 变化，不能沿用其 bundle。实际 `api-client` / operation / response-cache / catalog / position / SAO 消费者接真实隔离 HTTP 和已有缓存 Caddy，report/catalog/figures/position/image 均未预注入。仅原生端口、React/query/MapFS/时钟按任务既有受控协议提供；这是实际提取 page effects/paint/lifecycle/Scene 软件开发路径，不是完整 React/WXML/WEAPP 页面。

当前 Nest/Fastify controller/service/filter/Etag、星座与 SAO publication owners 按真实代码装配；BSC/OpenNGC/星座/地景/合法旧光学资产复用本机源。业务正式点、天气、recent 是明确 fixture，AQ 是实际 adapter 的合成 transport，无供应商请求。自有 loopback Caddy 复用已缓存镜像与原 encode/privacy fragments，无下载、TLS trust 安装或生产配置变更。API/driver 共进程、主机源文件暖，不提供隔离 CPU/RSS 或生产冷盘证据。

## r2 五段结果与失败保持

[r2 原任务失败](../../../../output/playwright/cloud-sky-live-mixed-1003-r2/live-failure.json)及[保存字节/帧读回](../../../../output/playwright/cloud-sky-live-mixed-readback-1003-r1/result.json)保持：20幅实际 GL 帧覆盖 cold、selected overview/detail、Source Back、hide-return；PNG 与底部起始 RGBA 逐字节相符，同帧 staged/published、frameAt 和 GL error 已核。来源实际 credit route 精确；hide 后无 CURRENT image/lease/presented，最终 GL 活跃句柄、pending/running/decode/cache lease 与 encoded MapFS 活动资源退休。根读回不是独立审查。

103请求有101成功、2取消；成功编码正文7,279,261B、解码正文10,993,605B，实际 Caddy status/size multiset 相符。取消实际观察0正文，不能推出网络/TLS、供应商或 CPU 工作为零。软件 owner RGBA 峰13,631,488B、pending decode RGBA 峰9,699,328B、encoded MapFS 峰5,155,388B、lease 峰14；各模型分开，禁止相加当物理总峰。任务诊断仍强持有 image/offer bytes，完整 API 解析对象、native/driver/GC/RSS 未量。

普通两个客户端虽被发起，其 HTTP 在实际冷 Scene 请求前已完成，实际交集为零，**FAILED_NO_OVERLAP**。r2 三项暖读均200，不把 r42 手动304移植成实际客户端命中。任务 Taro 缺异步 `setStorage`，只能证明持久化失败恢复；尚无特定 memory/disk eviction 原因证据。

r2 最终因 abort RPC 返回 Node ClientRequest 而序列化失败，不改判成功。当前仅改 task callback 为 void；[两个 held request 有界回归](../../../../output/playwright/cloud-sky-live-abort-rpc-1003-r1/result.json)复现旧返回失败、核新返回 undefined 和两请求关闭，没有重跑五段矩阵。生成器重复 AST 变量、执行器 named export 互操作、任务 getEnv 缺失及 launch cwd 失败均不归因 DevTools；已有 build/import/早期 runtime 失败材料保留。

## r3 只修受影响测量端口

[r3 当前运行](../../../../output/playwright/cloud-sky-live-mixed-1003-r3/result.json)、[真实请求交集](../../../../output/playwright/cloud-sky-live-mixed-1003-r3/dispatch-overlap.json)、[暖 owner / 持久化](../../../../output/playwright/cloud-sky-live-mixed-1003-r3/warm-owner-readback.json)和[根读回 r2](../../../../output/playwright/cloud-sky-live-cold-dispatch-readback-1003-r2/result.json)直接复用上述当前 bundles。最后一项 SHA256 为 `fa69de1796a06ab78c5757d8ab70e917904ae1c5e4721ce47dd3d8f72a8ea342`。

- 补任务原生异步存储 port，不改生产 cache；实际分块写、v2 manifest、restart 单体加载由当前 owner 执行。
- 普通 context/auth 与 Sky API bootstrap 先准备，再将8普通冷读的**请求发起**与首个真实 cold Scene request 协调；没有人为延迟服务响应、rate shaping 或伪造 body。实际37对 HTTP 区间相交，8普通 cold body 共30,981B。它是一个软件 renderer 加两个 fixture 普通客户端的图像需求集成，不是10/20人完整冷入口容量。
- 58响应全部完成：44×200、9×304、5×201；编码成功正文1,925,356B、解码正文3,830,484B，Caddy privacy/status/size 实际读回一致。不同 r2/r3 epoch 不相加。
- bootstrap warm / after-cold warm / persisted module restart warm 三次各 report/catalog/figures 均 conditional304、正文0。12→32实际 async chunk writes，4→23 persisted entries，存储序列化 payload2,306,185→2,775,121B，未越现有3MiB/24项限制。模块重初始化保留任务 Map storage，不冒手机进程/设备重启。
- 仅一个受影响 cold condition 的四幅 PNG/RGBA，同帧、GL error0及最终活动资源退休；当前 normal-settled 实际查看非空。此有限 lane 比原五段压力小，**不能以其9个304解释或覆盖 r2 的三个200**，原缺口与失败保持。

读回首轮把含 `metafileInput/resolvedAbsolute` 的 descriptor 与三字段 binding 全对象比较而误拒绝，保存[失败 r1](../../../../output/playwright/cloud-sky-live-cold-dispatch-readback-1003-r1/failed.json)与执行原文；只修 path/bytes/SHA 比较，r2读回通过，无 HTTP/Scene 重跑。

## 当前唯一后续与未验边界

D 当前真实 HTTP 接入与最小请求交集已取得。后续沿现有 page/Scene，在同一实际上下文/时间/家族 owner 补时间/跟踪、图层/全景及地景渐隐、选中细化失败保粗、取消迟到及返回的组合结果；观察真实 cache/queue/decode 所有权和退休资源，再决定优化。复用此测量端口，不重复冷矩阵/R5/static cohorts或新建框架。普通业务只消费隔离现有 owners，禁止修改其业务逻辑。

新版月面/Android/iOS、WXML+Canvas FAILED_DEVTOOLS、全部实际 UI/Back、物理客户端峰/服务隔离 CPU-RSS-DB-Redis-outbox-media、WEAPP 实际编码/12Mbps/10-20 cold clients/200DAU容量、whole月流量/月费/180GB及远端 mounts/receipts/full backup/rollback保持未验。普通 Prepared registry 空，SDSS暖底/颗粒/绿晕、弱结构/配准/完整来源与批量出版尚缺，未采用。新 legacy DETAIL 实际图查看并未解决这些质量问题。独立审查 MISSING，Goal active、无预算、未完成。
