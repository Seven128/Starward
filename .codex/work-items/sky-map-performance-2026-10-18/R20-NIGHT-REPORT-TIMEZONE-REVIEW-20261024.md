# NightReport timezone 合同增量独审

2026-10-24，独立审阅者 `review_night_timezone_contract`。本次仅复核 [前次最终独审](R20-NIGHT-REPORT-FINAL-REVIEW-20261024.md) 之后的 timezone 增量，不重开已闭合的持久化／确认协议研究。未修改生产、正式测试、PLAN、HANDOFF、Context、依赖或 Git。

## 结论

**本限定增量没有未关闭的 P1/P2。** 原“时区必须含 `/`”的形状条件会拒绝公开合同允许、当前 `Intl` 实际支持的 `UTC`；root 保留类型／非空检查，并继续由 `Intl.DateTimeFormat` 校验时区合法性，修复方向正确。合法 `UTC` 的原输入、请求身份、报告 Context 与持久化读回均保持 `UTC`，没有在此边界重新标记或修改原请求。

Source `night-context` 要求实际时区、`night-report-aggregation` 要求服务端校验上下文；当前 OpenAPI 的 NightReport timezone 是 `string`、`minLength:3`，没有 slash-only 限制。新实现没有把 OpenAPI 的字符串形状当合法性证明：未知时区仍由实际 `Intl` 路径拒绝，且不产生 snapshot 或 receipt。

## 独立实际检查

- 原正式 HTTP 持久化文件（含新 UTC 路径）与 service 文件 **16/16 通过，无 skip**。使用实际 Fastify／SQLite／mobile client，保此前协议的正常、失效与恢复覆盖。日志：`tmp/r20-night-timezone-review-http.log`。
- 新增审阅者最小探针 **1/1 通过**：实际 Fastify handler 与真实 SQLite，UTC 返回 200、原 Context／receipt 读回仍为 UTC；`Not/A_Real_Zone` 返回 422 / `night_report_timezone_invalid`，snapshot／receipt 仍为原来的 `[1,1]`，该非法 key 无结果。纯合同另外确认空白时区仍被拒绝。日志与探针：`tmp/r20-night-timezone-review-control.log`、`tmp/r20-night-timezone-review.test.ts`。
- OpenAPI JSON 实际解析与 UTC 声明形状检查通过；限定 `git diff --check` 通过。
- 与前次最终独审保存的 **18 份责任源／协议文件**逐一重算：**17 份字节未变**，仅 `packages/contracts/src/night-report.ts` 为本次 timezone 检查变化。结果：`tmp/r20-night-timezone-review-source-hashes.json`。前审的存储、授权、unknown、消费者、structured 与协议结论继续按其原范围复用，不以本次增量冒一次全仓审查。

root 的修前真实 HTTP 记录 `tmp/r20-night-utc-before-20261024.log` 保留：正确的 UTC 断言 1 fail／8 过滤 skip（422 而非 200）。本审阅者首次探针因测试服务缺少必需 allowedOrigins 在启动前失败，已按现服务器合同修正；失败另留 `tmp/r20-night-timezone-review-harness-origin.log`，不作为产品失败或通过。

## 保留范围与资源

本次没有重新验证设备、生产鉴权／部署、真实 provider、完整 Tonight 内容或整个 family／Goal。旧 unknown 原归属缺证明的条件继续保留，不会因 UTC 修复或本地通过被确认。未启动 default start、共享服务、IDE、手机／ADB、VPN 或冻结构建，未上传资料。

所有测试命令已退出；成功探针在 finally 关闭实际 app／SQLite 并移除经范围验证的自有合成目录。测试日志和初次 Harness 失败原件留任务本地。本审阅者完成后结束，不复用。
