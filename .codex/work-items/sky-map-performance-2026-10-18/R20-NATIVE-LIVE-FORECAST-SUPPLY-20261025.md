# R20 Native 单次真实天气供给

结论：**真实 GFS 供给 → 合格通知输入 → SQLite 影子基线 → 关闭重开后的实际私有 HTTP 读回已验证；IFS 比较模型未取得资格。** 本轮不验证真实 Inbox 投递、上游模型发布 epoch、区域/持续供应或完整通知 family。没有修改产品源码、正式测试、PLAN、HANDOFF、Context、Git、依赖或共享现场。

## 范围和输入

接续同一 PLAN 的 Independent API / 通知供给责任，复用[通知实现](R20-NOTIFICATION-EVALUATION-20261024.md)、[API 终审](R20-NOTIFICATION-EVALUATION-API-REVIEW-20261024.md)、[App 终审](R20-NOTIFICATION-EVALUATION-APP-REVIEW-20261024.md)。Parent 提供的已交付基线为 `5767cba34ab9f4be7c7a82bf18ae4eefa583dd87`；本次实际导入还包含同期已稳定的 itinerary API 接线，不能把该 WIP 认作 576 的 CI 覆盖。实际依赖另按下述143份原字节绑定。

2026-10-24T16:24:23.906Z 至16:24:27.184Z（本地10月25日），只执行一次正常 forecast acquisition。公开测试 observer 为 Greenwich public observatory，Europe/London、该地当日夜晚、Moon；未读取设备/用户位置。精确点位与输入仅在私有原件，不写入本文。使用真实 Date，没有 mock clock、合成上游、缓存前样本或人为补造先前 false。

沿现有 `OpenMeteoHttpClient` / `ForecastQueryService` 组合：GFS primary、`withModels` 的 IFS comparison、原共享 AQ 请求、既有归一器/天文算法/primary sink 和通知 runtime。使用当前个人非商业 POC 的 free endpoint、无 API key、productionEnabled=false；没有采购、生产资格或区域稳定性新结论。HTTP 请求数也不等于供应商的加权计费调用数。

唯一传输观测端口转调原生 fetch，转交原 URL/init 和真实 JSON，不替换字段或另建供应客户端。原 `requestJson` 的默认有限重试配置保留；此次三个请求均首轮200，**没有重试或第二次 query**。`rawRetentionAllowed=false` 保持：未保存原始响应 body，仅记录状态、有限头信息、解析后 canonical JSON 摘要以及实际归一结果；该摘要不是原始 wire-byte hash，也不能重建原 JSON。

API 使用现有 `buildApi` 的实际预报/通知 routes、parsers、可信 loopback POC resolver，全部通过 Fastify inject，未 listen。未调用的 NightReport/spot 必需依赖为明确拒绝端口；没有执行其供应或把这些端口当验证结果。仅在新隔离 SQLite 创建一条默认 disabled 的合理总云量规则；全局/类别开关保持默认 off。未调用 controls 写入、真实账户、R6、手机或 OS/WeChat/推送通道。

## 实际结果

| 责任 | 实读结果 |
| --- | --- |
| 真实上游 HTTP | `api.open-meteo.com` 的 GFS / IFS 和 `air-quality-api.open-meteo.com` 的共享 AQ 共3次，均200；解析时 hourly 长度分别384 / 384 / 168。 |
| Primary 正常产品输出 | 实际 `/v1/forecast/hourly` 200；GFS384小时，总云384项非空。当前 run 为 partial，保留雾概率及超出 AQ 时域的 missing/null，没有补零。 |
| 天文/窗口资格 | 实际暗夜与 Moon window 均非空；`starward-astronomy@1.0.0+astronomy-engine@2.1.19`；10个真实合格窗口。 |
| 持久接受与评估 | 1条 source、1条 accepted readiness、1条 rule evaluation、10条 edge；source complete=1，处理 payload 已按原 owner 退休。 |
| 实际私有消费者 | activity HTTP200、status=`controls-disabled`、consideredWindows=10、queued=0；Inbox HTTP200、items=0，candidate=0。规则disabled、全局/类别off不变；controls表仍0条默认记录。 |
| 真实关闭/重开 | 关闭原 Fastify/runtime/SQLite，再从同一新文件创建 runtime/API；原 source/readiness 摘要及 lastEvaluation 完全一致，controls仍off，Inbox仍空。重开只读私有状态，没有重拉天气。 |

这不是一个“成功空输入”的检查：实际预报非空，SQL中有1条评估和10条 edge。**一次首次采集只能建立真实基线**，没有可比较的先前真实 false；本轮又保持 opt-in off，因此没有人为制造 Inbox。正确空 Inbox 不等于验证了实际投递。

runId/modelRunTimeUtc 继续保留原 Native POC 的本地采集身份含义，dataVersion 为内容摘要；没有把它们认证成真实上游模型发布 epoch。

## IFS 未通过边界

IFS 的384小时 JSON 已实际解析（canonical摘要 `6dc96b346dde8832983eac0dc18679c21c198d7b5dc87cc182026b9cf5a3a255`），但其 source load 未形成正常比较 run：最终 `comparison=null`、comparison hours=0、modelComparison=`missing`，保原“对比模型不可用；主模型仍可独立使用”警告。

结合既有 `OpenMeteoHttpClient.load` / `ForecastQueryService`，当前可定位的边界是 **已解析 IFS payload → comparison load/normalization 未通过，随后沿既有 catch 降级**。本次观测器没有保存该 load 的异常文本/具体字段，且遵守 raw 禁留，所以不能从摘要重建确切原因。未将 HTTP200写成比较资格、未把未知归因推成已证产品 P2、没有再发供应请求或切换模型。完整双模型/共识能力继续未确认；其确切原因只能由后续确有必要的正常执行补足该边界观测。

## 原件、输入身份与资源

唯一私有目录：既有 private owner 的 `device-resume/native-live-forecast-supply-20261025-G00IDW/`。其中保存：

- 正常查询/规则 intent、实际归一 bundle/acquisition、HTTP有限元数据、关闭前/重开后的实际 HTTP及SQL读回、只属本轮的新数据库；没有原始响应 body。
- `source-pins-before.private.json` / `source-pins-after.private.json` 各143项，字节相同，SHA256均为 `591883a8c820007125e1333d76a728dca77982f1c5c5678ad71617c136bc573c`。这是现有 esbuild解析的静态运行导入图（工作区裸引用也解析）加声明/lock输入，不冒 VM 完整模块追踪或全仓覆盖。
- **143项原字节全量保存在 `source-inputs/<repo-relative-path>`，逐件重新读回长度/SHA一致，0缺失。** 包含本次实际读取的并发稳定 API WIP，不能仅凭 parent 的提交号替代这些输入。
- `result.private.json` SHA256 `77b635964e148c9f7266785212d732bdfa5337ac70fa95814d63ae1b165a30da`；后续限定 verdict `620af40805101d466aa037aa9035376a15ddd0961496e3bf86f406c480ffdd68` 明确保留 IFS/投递/epoch缺口，未改原结果回执。
- 数据库352,256B，SHA256 `d88594fa0ea32192d9578c573354d9acccb33188062f144acba9246fbfa6ac2e`。归一文件/原件完整性清单同目录保留，未上传。

任务 tmp 仅有本次有限脚本及单次派发回执；回执拒绝自动重放。实际 helper工具调用 exit0；normal source promises全部settled，原/重开 API由onClose关闭 runtime，两份只读SQL连接在finally关闭，未消费HTTP body也在finally取消。随后实读该 helper 的 Node进程数 **0**；没有TCP listener、后台 worker、数据库/HTTP客户端进程遗留。所有原件保留，没有删除或触碰用户数据、网络/VPN、服务、IDE或冻结构建。

本轮仅取得一个公开地点/一个时点的 primary实际供应与持久影子基线。IFS具体拒绝原因、真实 false→true与显式 opt-in后的合法投递、连续/区域供给、生产身份/许可资格、上游epoch、Native实际存储/生命周期/交互、OS/外部通道与完整family仍保留；不据此关闭完整Goal；执行顺序以后续2026-10-25用户后置层叠/云观星播放性能的指令及最新PLAN/HANDOFF为准。

Root后续直接复核：143份source-inputs长度/SHA、前后manifest/原result/SQLite SHA均一致；以readonly SQLite独立查询8表counts与原结果吻合，关闭前/重开后sql对象完全相同，DB读后SHA未改。记录root-integrity-and-sql-readback-20261025.private.json保本机；该复核没有新供应请求，未扩IFS/投递/epoch/生产资格。
