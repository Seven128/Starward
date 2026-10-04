# 当前隔离业务冷入口与真实编码出口（2026-10-03）

状态：**DEVELOPMENT_MEASURED / PARTIAL**。没有生产代码变更、共享 BFF 业务写入、服务重启、供应商网络请求、再导出影像、部署或采用。Goal active、无预算；工作区/分支/HEAD 保持。r41 的 190 currentSources 和六保护先完整核字节，运行前后输入保持。

[执行脚本](../scripts/experience-business-cold-egress-2026-10-03.mts)使用现有 Nest/Fastify controller、MiniappService、真实 EtagInterceptor/ApiExceptionFilter、StellarCatalogPublicationService；复用测试仓库与天气端口，明确一条 TEST_FIXTURE 正式点、确定性天气/近期天气。AQ 使用实际 QWeather adapter 与内存生成签名配置、合成 transport，无供应商调用；输出的官方来源标签只属 adapter 输出，不能当实际天气/权限证据。BSC5P v3、OpenNGC/天文算法、当前地形 publication 和 PNG 为现有真实输入。真实目录 8,404 行、deepSky 51 行、报告 48 时段是本次现有输入结果，不是需求上限或每时段真实天气完整性。

使用已缓存、digest 固定的 Caddy 2.11.4 镜像与当前 Caddyfile/隐私日志 fragment，在独占 loopback TLS 容器中保留 `encode zstd gzip`，只测请求声明 gzip/identity 的结果。readonly mounts、128MiB/1CPU 容器约束与 Docker Desktop 不代表预期生产机器。使用当前业务 HTTP owners，API 和 driver 同进程，未测隔离服务器 CPU/RSS，也未节流到 12Mbps。只停止/移除本次 owned 容器；原 BFF/watch 保持。

| 实际响应单位 | gzip/实际编码正文 B | 解码后正文 B |
| --- | ---: | ---: |
| 正式 context resolve | 725 | 1,253 |
| 正式 context read | 725 | 1,253 |
| 正式 v3 Sky report | 225,861 | 824,999 |
| BSC5P v3 publication | 568,366 | 1,280,199 |
| 上述四项入口 | **795,677** | **2,107,704** |
| 当前地形 PNG（identity） | 1,874,610 | 1,874,610 |
| 正式 12 项冷读小计 | **2,689,271** | **4,100,979** |

12 项包括 context resolve/read、NORMAL map、overview/guides/field、Sky report、BSC、近期天气、AQ、terrain overlay/PNG。栏目和地形是独立按需单位，不声称每位 Sky 用户均加载，更不据此乘 200 DAU。整个测量含 identity 对照、暖请求、图层改变、提案与失败探针共 26 响应，编码正文 4,206,557 B，解码后 6,269,063 B；此总量不是一个用户旅程、月流量或公网账单。

context/map/report/catalog 的真实 If-None-Match 各返回 304、正文零；近期天气保持 no-store，无响应 Etag，同条件请求仍 200 有正文。AQ 冷读合成 transport 两调用，暖读仍两调用，只证明本次实际 adapter 缓存消费，不供应真实请求费用、多位置/压力/重启结论。gzip BSC 与 identity 同 publication 解码字节完全相同。Caddy 编码响应的 Vary 实际包含 If-None-Match/Accept-Encoding；不外推 WEAPP 实际请求头或 zstd。地形原 PNG hash/长度与 publication 精确、overlay PARTIAL，light pollution UNAVAILABLE 保真。

提案在隔离 owner 建立：本人匹配坐标 report 有审核中警告；匿名 403、其他账号 404、错误正式 context 400，正式点引用提案 context 400。token/密钥只在内存、无正文/完整 headers/URL/query/账号/提案坐标日志或证据输出；proposal 响应只存计量/摘要。此处不是实际 WeChat 登录、真实用户/正式 population 或 PostgreSQL/Redis/outbox 验证。

任务失败保留：r1 对重复 progress 文件错误使用 wx，r2 把 overview 误读为 report context，两项属于任务记录/断言问题；修正后 r3 完成 26 次 HTTP 与前述语义检查，最后把 Caddy 空 `user_id` 误要求必须缺字段而失败。实际 request/resp_headers 已删除、user_id 空，无账号值。当前脚本仅修成接受缺字段/空值，**未重执行整轮**；旧 failure.json 不改判通过。[保存响应/日志读回](../scripts/readback-business-cold-egress-2026-10-03.py)独立于 TS 测量路径按 raw/gzip/JSON 与 status/size multiset 校验全部 26 条日志、已存 public fixture 响应及原源 pins，确认只发生上述断言改变。非空 user_id / request / resp_headers 控制均拒绝；把 decoded 当已传正文会与真实 Caddy size 不等。Root 读回不是独立审查，独审 **MISSING**。

决定性结果为 [readback result](../../../../output/business-cold-egress-readback-1003-r1/result.json)，SHA `9df3bd0aabca56ac7e177a30c85fe05fdd7cd3835ed58bbb260008e33aa777ba`；来源 r3 response/log/inputs/executed-script 与 failure 保留在同列路径。新的[部分单位账本](../../../../output/business-cold-unit-ledger-1003-r2/result.json)，SHA `4bdf7ae883a859a3069a8520210edc9e29e2bda83cca45f0674c10a924fa469c`，保 supplier/使用人口/每 DAU 次数为 null。账本 r1 误读旧 capacity 字段而失败，已封存源和 failed.json；r2 按原 capacityPassed 合同核，不改旧模型。

旧 R5 [实际 Scene 准备 owner](../scripts/experience-current-scene-journey-2026-10-03.mts)在浏览器前供 current/figures/at/positions，BSC 已 attach，不只是 report 预注入；旧成功 callback 表示和新的 gzip 出口属不同 context/time/epoch/表示层，**joint 编码旅程总量仍 null**。未重跑 R5/HTTP/cohort/旧库存/源加工，未借旧失败/取消 offered bytes 当实际已传或零。下一依赖：让隔离真实 context/report/catalog/constellation/position HTTP 进入实际 page/Scene，并与普通业务同时消费，分冷暖/失败/可选需求与编码正文、队列/完成时刻；不得把 request replay 当实际 Scene 首次可用或200DAU当200并发。WEAPP 接受编码、平台/package/投稿媒体/provider/DB/worker、实际公网/物理资源/整机容量及180GB全集仍未验；B完整图质/rights/批量出版/Source Back、native/手机与独审义务保持。
