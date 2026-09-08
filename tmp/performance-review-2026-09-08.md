# Starward 性能与体积审查

日期：2026-09-08。代码基线：`86101d3`。本轮只审查、构建和测量，没有修改业务代码或全局环境。

优先级建议：先修复地图重复计算和客户端缓存，再处理上游等待时间、数据库查询和星空绘制；包体积与构建流程随后优化。现有架构有可复用的缓存、空间索引和平台能力，无需为这轮优化引入新框架。

## 测量范围与证据

- 阅读项目 Context、架构、相关小程序约束，以及小程序/BFF、原生 App/API、Android、Docker/CI 入口。重点深入小程序地图和星空链路；不是对全部文件逐行审计。
- 使用 Node 24.16.0 构建当前小程序，输出到项目预留的 `dist/weapp-check`，没有覆盖普通预览目录。
- Webpack 报告编译成功，耗时 13.665 秒。`inspectCandidate` 所有静态检查通过。
- 运行 BFF 现有 `sky-scene-catalog.test.ts` 与 `weather-provider.test.ts`，10 项全部通过。这些功能测试没有覆盖下述端到端缓存容量矛盾。
- 基准使用内存仓库/缓存、合成地点和确定性天气，星场使用项目提交的真实 Gaia 目录（2048 星）。没有调用远端天气、数据库或生产服务。
- 1 与 8 个地点场景是本地顺序微基准，不是线上 P95、真机帧率或压力测试。8 个合成地点使用同一地点属性，因此不能用其压缩率估计真实多地点流量。
- 没有测量 Android release APK、真机内存/启动时间、线上数据库执行计划或 Docker 完整构建时长。相关条目明确保留为配置或代码风险。

可复现材料：[基准脚本](./perf-audit-20260908.mts)、[最后一次基准结果](./perf-audit-20260908.json)、[基准输出](./perf-audit-benchmark.log)、[构建日志](./perf-audit-build.log)、[测试日志](./perf-audit-tests.log)。脚本从仓库根目录以 Node 24 的 `--import tsx` 运行。

## 当前体积

| 产物 | 原始字节数 | 约合体积 |
| --- | ---: | ---: |
| WEAPP 全部产物 | 1,563,001 | 1.49 MiB |
| 主包 | 1,162,401 | 1.11 MiB |
| content 分包 | 245,933 | 240.2 KiB |
| spot 分包 | 76,830 | 75.0 KiB |
| sky 分包 | 77,837 | 76.0 KiB |
| 三张打包照片合计 | 452,762 | 442.2 KiB |

各包没有 source map。以上为本地产物计数，不是微信上传压缩包大小。三张照片占主包约 39%，是比继续压缩小图标更有价值的体积入口。

## 1. 高优先级：地图、详情、星空没有复用计算结果

代码：[地图计算](../workers/miniapp-api/src/miniapp-service.ts:1046)、[详情计算](../workers/miniapp-api/src/miniapp-service.ts:1451)、[星空缓存](../workers/miniapp-api/src/miniapp-service.ts:1589)。

地图每批并发 4 个候选地点，直接调用 `astronomy.compute`。该计算包括整夜目标、天气和所有星场帧；地图输出使用其中的决策和时间信号，没有返回整套星点帧。图层、筛选等参数改变会使地图缓存失效，重新触发整套计算。详情又直接计算，`getSky` 的 30 分钟缓存未被这些调用共用。

实测最后一轮：

| 场景 | 耗时 | 天气接口调用数 | 星场帧投影次数 |
| --- | ---: | ---: | ---: |
| 8 个地点，地图首次查询 | 1,076 ms | 8 | 160 |
| 完全相同的地图缓存命中 | 2 ms | 0 | 0 |
| 同一上下文切换云层 | 876 ms | 8 | 160 |
| 地图之后打开单点星空 | 122 ms | 1 | 20 |
| 1 个地点，4 个相同请求同时未命中 | 423 ms | 4 | 80 |

前一轮 8 点冷查询为 963 ms，云层切换为 803 ms；时延有正常波动，重复调用计数一致。真实网络/数据库耗时没有包含在这些数字里。

建议由现有 AstronomyService 或其紧邻的服务边界统一负责可复用的计算缓存和相同进行中请求合并；将纯星场帧构造延迟到确实需要星场的读取路径。缓存身份须保留地点事实版本、精确选定时间、观测夜、目录/算法、天气/预警有效性等依赖，不能只按地点缓存，不能用过期安全数据换速度。可以先统一读取计算结果，再细分纯天文计算与天气生命周期。

原生 API 的 [ForecastQueryService](../apps/api/src/modules/forecast/forecast-query-service.ts:252) 已有 `inFlight` 合并实现，可参考其语义；不能直接混合两套产品状态。

预期收益：减少图层切换和详情切换时的 CPU、上游调用和等待。实际加速倍数要在改完后以同一数据重测。

## 2. 高优先级：星空响应超过缓存阈值，且落盘同步重写全部缓存

代码：[缓存阈值](../apps/wechat-miniapp/src/services/api-client.ts:59)、[缓存写入](../apps/wechat-miniapp/src/services/api-client.ts:206)、[响应完成路径](../apps/wechat-miniapp/src/services/api-client.ts:475)。

单点完整星空响应实测为 680,798 个 JSON 字符、707,203 字节；gzip 约 222.7 KB。其中星场约 569.6 KB，目标时间帧约 96.1 KB。当前 `cacheResponse` 遇到超过 300,000 字符的响应直接返回，因此该完整星空响应既不进入这层内存响应缓存，也不进入持久响应缓存。React Query 在当前会话中仍可保留数据，不能因此说所有缓存都失效；但重启后的离线恢复与条件请求复用受到影响。8 点云层地图样本也超过了阈值。

对于较小响应，每次会先 JSON 序列化检查长度，再把最多 24 项缓存全部写进同一个 `setStorageSync`。写入在网络 Promise resolve 之前执行；缓存越大，响应后的同步工作越多。该实现只限制单响应和数量，没有持久缓存总字节预算，而且把字符数命名为字节数。

建议分离运行中请求缓存与持久离线缓存；按资源分块存储大星空数据，缓存目录/帧复用内容，使用真正的字节预算、明确淘汰策略和异步合并写入。保留账号隔离、数据时效和上下文恢复语义。不要只把阈值调大，否则同步整包落盘和容量问题会扩大。

同步 API 的语义可见 [Taro 官方文档](https://docs.taro.zone/docs/apis/storage/setStorageSync)。本轮未在真机测量落盘时间，卡顿程度仍待验证。

## 3. 高优先级：天气组合缺少应用级上游等待上限

代码：[fetchJson](../workers/miniapp-api/src/weather-provider.ts:199)、[组合读取](../workers/miniapp-api/src/weather-provider.ts:1114)、[调用方](../workers/miniapp-api/src/astronomy-service.ts:255)。

组合等待主天气、预警、多模型证据三路结果。底层直接调用 transport，允许传入 signal，但 AstronomyService 这条调用没有传 signal，也没有在适配器内建立请求 deadline。客户端请求在 10 秒超时，不能据此认定服务端上游工作已取消。补充证据慢响应会拖住整个组合。

建议给上游适配器与整体请求设置可观测的等待预算、取消传播和有界并发。超时沿现有 `UNAVAILABLE/PARTIAL` 路径返回；预警不可用仍必须阻止肯定的出行结论。天气缓存与纯天文缓存分开控制有效期。收益主要是长尾时延和外部服务预算保护，需通过可控慢响应测试验证。

## 4. 中优先级：地图先拉全量，再做空间查询

代码：[地图候选读取](../workers/miniapp-api/src/miniapp-service.ts:995)、[空间查询](../workers/miniapp-api/src/postgres-repository.ts:397)。

有 viewport 时仍先 `listSpots()` 拉取全部可公开点位，再 `listSpotsInRadius()` 拉一次局部点位，最终通过 ID 求交。后者已经包含同样的发布、可见性和审核约束，前一遍全量读取是明确的收敛入口。之后每个点还有 getSpot/getDetail 等独立读取。

建议让仓库查询直接返回满足可见性/发布条件的视口候选，尽量下推静态筛选，批量获取后续所需事实。保留空间索引与发布门槛；不要为减计算随意截掉会影响排名和筛选的候选。当前 migration 已有 GiST 空间索引，因此首选修查询调用路径，不是再加同类索引。

数据量增长时收益更显著。本轮没有连接实际数据库，未取得 EXPLAIN ANALYZE 或线上行数。

## 5. 中优先级：星空每次姿态更新都会重新测量 Canvas

代码：[姿态更新](../apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx:1096)、[绘制](../apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx:1308)。

传感器更新生成新的 pose state；draw 依赖 pose，每次 draw 都发起 selector query/boundingClientRect，并创建 canvas context，再全量画星。旧绘制 revision 保护能防止过期结果写入，但不能消除已经发出的测量操作。

建议缓存布局尺寸和绘制 context，在布局/方向变化时更新；合并同一绘制周期内的传感器事件，只使用最新姿态重绘，分离高频画布工作与低频文字/状态渲染。保留现有隐藏/取消、传感器过期、精确时间帧与错误清屏规则。

这是代码层面确定的重复工作，尚未证明真机掉帧。改动后需测转动手机时的绘制耗时、交互延迟和隐藏页面资源回收。

## 6. 中优先级：照片和缩略图没有分级

代码：[全量资源复制](../apps/wechat-miniapp/config/index.ts:102)、[媒体声明](../packages/miniapp-contracts/src/catalog.ts:59)、[图片来源清单](../apps/wechat-miniapp/src/assets/media/extraction-manifest.json)。

三张照片共 442.2 KiB，全在主包。媒体声明中的 `thumbnailPath` 与 `localPath` 指向同一大图；主地图详情中确实有缩略图消费者，所以不能把全部图片直接移到文章分包。

建议保留选定设计和来源，生成合适尺寸的独立缩略图；主包留必须的预览资源，大图再按实际消费者安排到分包或经授权的媒体服务。总收益须实测，442.2 KiB 是可优化资源池，并非承诺可全部删除。

## 7. 中优先级：原生 Android release 有裁剪空间

代码：[release 配置](../apps/mobile/android/app/build.gradle:69)、[架构配置](../apps/mobile/android/gradle.properties:31)、[Expo 配置](../apps/mobile/app.json)。

仓库默认 release 的 minify 和 shrinkResources 都关闭；默认列出四种 ABI。现有模拟器验证器会显式选择 x86_64，因此不能把开发验证 APK 体积直接当成正式分发体积。

建议在正式 release 配置中评估 R8/资源裁剪，并按实际分发方式生成 AAB 或 ABI 分包，验证反射、原生模块与启动路径。不要为了省包移除仍需支持的设备架构。官方依据：[Android 减小包体积](https://developer.android.com/topic/performance/reduce-apk-size)。本轮未构建 release APK，无法给出缩减百分比。

## 8. 中优先级：Docker 缓存层与 CI 可减少重复安装

代码：[Dockerfile](../infrastructure/deployment/miniapp-api.Dockerfile:6)、[Product CI](../.github/workflows/product-ci.yml)。

build 阶段先 `COPY . .` 再 `npm ci`，因此被复制的业务/文档文件变化会使依赖安装层失效。production-dependencies 阶段已经把 manifest 复制与安装分开，可以沿用这个边界。Product CI 在宿主安装/检查/构建后，还执行 Docker 内部安装/构建；不同责任的检查不能直接删掉，但可以复用正确的缓存。

建议 build 阶段先复制依赖 manifest/lock 并安装，再复制必要源码；缩小 Docker context，设置 BuildKit npm 缓存和 CI 外部层缓存。保留可复现的锁文件和多阶段 runtime。依据：[Docker 官方缓存优化](https://docs.docker.com/build/cache/optimize/)。本轮未测完整容器构建，收益未量化。

## 9. 低成本优先处理：本机 Node 路径混用

初次构建实际调用微信开发者工具自带 Node 16.13.1，而 npm 来自 nvm 的 Node 24 目录，构建报 `bundle.findLastIndex is not a function`。使用本机已安装的 Node 24.16.0，并仅调整本次命令进程 PATH 后，构建成功。

建议固定项目开发命令使用匹配的 Node/npm，启动时校验实际 `process.version` 和执行路径，避免失败重跑。仓库已有 Node >=24 约束；本轮没有修改系统 PATH、npm 配置或微信开发者工具。

## 已有的合理优化与后续观察

- WEAPP 已分包并配置 `lazyCodeLoading: requiredComponents`，使用生产压缩；不需要重新做一套分包机制。
- 已有 React Query 缓存、请求取消、ETag、Redis TTL、空间索引；问题主要在不同路径没有共用计算，以及缓存预算未与真实数据联测。
- Caddy 配置已开启 zstd/gzip，不应把“加 HTTP 压缩”列为尚未做的主要工作；压缩也不会减少解压后对象大小和 JSON 处理成本。
- Taro 持久缓存与 prebundle 的关闭有历史构建正确性原因，不建议仅按工具提示直接开启。
- 原生 API 的 ForecastQueryService 有请求合并，但其 Map 缓存没有容量上限和主动过期清理，可在实际原生服务负载增长时补充；不应将此测试/低流量风险置于已测出的地图重复计算之前。
- 需要补上的性能基线应覆盖：地图冷/热/切层请求数、单响应和累计离线缓存字节、慢供应商等待预算、星空转动时绘制/测量次数。功能测试通过不能替代这些性能指标。
