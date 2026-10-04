# 当前缓存压力、相交地景返回及 SAO 原始文件边界

本增量在原工作区、`codex/remote-main-20260908`、HEAD `72e65cf309d700cb7d40c5b7afd53660fd39fa35` 继续 active、无预算、未完成的 Goal。只修改云观星 SAO 源读取/controller、Sky 公共资源 header 及对应新测试；没有改变其他业务逻辑、通用响应缓存策略、六项设置/outbox 保护项，也没有提交、推送、部署、发布或重启共享 BFF。下列开发结果不代替原生或最终验收。

## 实际缓存 owner 已解释暖 200

[r7 保存结果](../../../../output/playwright/cloud-sky-live-mixed-1003-r7/result.json)复用当前完整 API 消费者，通过 task-only 只读闭包快照/trace 观察生产 `response-cache.ts`；原始字节、逐项注入及观察源均保存并读回。没有替换 keys、freshness、limits、generation fence、写入或淘汰政策。Taro HTTP/storage 为受控端口，隔离 Nest/Fastify + 本地 Caddy，业务/weather/report 仍为已披露 fixture/test-astronomy。此前旅程实际需求的 tileId 来自 hash-bound r4 final-owner；串行读取真实 index/tile 并显式 flush，仅为确定性观察，不重放完整冷矩阵，也不倒填旧并发时间线。

基线 report/BSC/figures 三响应为 304、零正文。22 个有效 SAO 瓦片后，这三个仍 fresh 的条目在 memory/disk 都被第 25 项挤出，随后实际 MISS_BOTH → 三个 200。六条淘汰 trace 的累计字节均未达到原 6MiB memory / 3MiB disk 上限；直接原因是共同的 **24 项 cardinality 限制**。最后暖读前 memory 24 项、436357B，disk 24 项、462409B。服务器 settled LRU64 是另一 owner，不能作为客户端容量。

[r6 失败](../../../../output/playwright/cloud-sky-live-mixed-1003-r6/live-failure.json)来自任务错误地读 `response.data.rows`，真实合同是 `response.data.tile.rows`；保存失败和执行源，修任务后 r7 完成。生产通用响应缓存仍未优化，较大旅程暖进入问题没有因此验收。不能直接扩大其他业务缓存名额、伪造 PNG descriptor 或另建不受总预算管理的 SAO 文件库。

## 相交视场的实际材质渐隐与返回

[r8](../../../../output/playwright/cloud-sky-live-mixed-1003-r8/result.json)四个命名条件的实际相机完全相同。已捕获的总览按既有 owner 保持朝向，改变 follow 样本不等于执行手动拖动；该结果保为 **FAILED_TASK_MANUAL_DELIVERY**，不改产品总览行为，也不当成功渐隐。

[r9](../../../../output/playwright/cloud-sky-live-mixed-1003-r9/result.json)只修任务输入，向实际 `browsingCamera.pan` 和页面 manual ref 交付明确手动方向，保当前 page effects/Scene、真实 HTTP/文件/native callback/软件 GL。四个 85° 相交视场的实际相机与条件 basis 一致，已加载 readiness 均为 1；地景 opacity 依次 1、0.5、0.07407407407407393、1。16 个已绘软件帧的 PNG 与翻转 RGBA、同提交快照、已绘时刻和 GL error0 均逐一读回。上方和返回最终像素 hash 同为 `07a489ff741a94322272210db174c73c08d94716494083087c7588b829008830`，中间两个画面不同；实际上方/下方图已查看。

返回仍有三次 SAO metadata 条件请求，均 304/零正文；该段没有图片下载，不能写成零请求。hide/final clear 后当前帧撤销，活动 GPU handle/native current、运行 decode/native 请求和文件租约/退休项为零，只证明已观测 owner 的逻辑释放，不是物理总内存。受控 manual command 不证明完整 `onSkyTouchMove`、真机姿态、跟随/校准或公共 UI 导航。独立审查仍缺。

[根读回 r2](../../../../output/playwright/cloud-sky-cache-material-readback-1003-r2/result.json)同时核上面缓存决策、图像字节和释放。读回 r1 错把 native transfer 的 route 字段用于刻意去路径的 wire 记录，失败及执行源保存在[失败文件](../../../../output/playwright/cloud-sky-cache-material-readback-1003-r1/failed.json)；r2 以条件 phase/status/零正文核对应结果，没有扩日志隐私字段。执行前后输入一致；两个 SAO 服务源在测量后才被下述实现改变，旧 hash 与 r44 一致但旧字节未另存，不声称旧 backend 字节现仍 current/独立归档。页面/API bundle 去重 270 源仍当前精确，历史 backend 与当前源 epoch 分开。

## 已实现首个 SAO 原始文件出口

`SaoPublicationService.asset()` 只接受当前已验证出版 hash/index 中的 tileId，复用原文件读取和科学合同。每次原始文件交付校验 index 的 byte length/SHA256，再验证 tile 合同；原始 Buffer 仅在 pending/read/delivery 生命周期中存在，不放进既有 64 项 parsed-envelope LRU。raw 与 envelope 的未完成同 key 读取共用同一 Promise；成功/失败移除 pending，既有 settled 退休、失败重试和旧 JSON envelope API 保持。

新增 `/v2/sky/supplements/sao/v2/:publicationHash/assets/:tileId` 返回固定出版 JSON 的**原始字节**，动态 envelope 的生成时间不进入 tile hash。复用 `skyPublicAssetHeaders` 的 public immutable/nosniff 合同，SAO data-source 和 hash ETag 明确；GET、HEAD、匹配条件 304、错误 hash/id 404 开发验证。没有把原始数据伪装成图像，也没有改变原 legacy/v2 index/tile 路由。该新路由尚未接标准静态 artifact/export、当前客户端持久文件读取或部署；共享 BFF 未重启，是否载入这些最新源码未证实。

验证命令在 `workers/miniapp-api`：

```text
node ../../tools/run-node.cjs --import tsx --test src/sao-public-asset.test.ts src/sao-publication-concurrency.test.ts src/sky-public-asset-export.test.ts
node ../../tools/run-node.cjs ./node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.json
```

第一条 6 项通过；第二条通过。新测试实际 Nest/Fastify inject + 原 source 文件证明 GET/HEAD/304 的 bytes/SHA/size/header、旧 envelope 数据兼容；受控 read hold 验 raw/envelope unfinished coalescing，后续 raw 重读不额外长期留 Buffer。有效 JSON 前置空白可保持 canonical scientific tile，却改变原始字节；当前字节 guard 拒绝，局部移除 guard 的 bounded mutation 逃逸，证明该防线有实际作用。既有 65-key 突发 pending 及静态 headers/path 回归仍通过。Fastify inject 不是真实静态 Caddy 出口、云部署或微信原生验收。新 Buffer 峰值/服务容量仍待测。

## 唯一下一依赖和保留项

沿这条小路径完善标准静态导出分类、以兼容的版本化合同复用现有 Sky 公共 encoded 文件 owner 处理 JSON，并保共同 32MiB 上限、完整性、租约、并发/取消迟到、clear/迁移及旧图像消费者；再在实际 page/Scene 核 SAO 压力后的暖进入与取消迟到组合。不得通过扩大通用业务 cache、取消已有验证或新建重复状态源掩盖问题。是否采用这一共享扩展必须由其真实旧/新消费者和资源结果决定，不预称完成。

完整 UI/时间来源 Back、手机 Android/iOS/new Moon、WXML FAILED_DEVTOOLS、质量矩形/接缝/绿晕/弱结构/覆盖配准、完整出版和独审、物理总峰、真实云成本/磁盘保留及生产同等配置的混合容量仍开放。普通 Prepared/science registry 空且未采用，商业排除/200DAU 全小程序/4GB 测试服与预期生产配置边界不变。
