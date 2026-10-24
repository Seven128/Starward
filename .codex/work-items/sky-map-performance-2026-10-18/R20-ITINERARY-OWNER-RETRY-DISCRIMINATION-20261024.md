# R20 行程未知提交跨 owner 重试判别

2026-10-24，`discriminate_pending_itinerary_authority`。只执行父任务指定的一条行程判别，另只读追踪共享 pending owner 的真实消费者。没有修改生产、正式测试、Context、PLAN、HANDOFF、Git、依赖；没有启动 listener、外部 HTTP、现有服务、手机/IDE、构建、冻结代、VPN 或用户数据操作。

## 实际结论与资格

**当前 `61953dd1` 的行程 client 在可信服务端 actor A→B 后重试，会在 B 创建第二份行程，并清掉原 A 未知 attempt。** 真实 client → Fastify `inject` → 新隔离 SQLite 已确认；正确期望“B 无新增、原 A pending 保留”是 **0/1 相关失败、无 skip**，不是测试加载或模拟空集的失败。

这不证明默认 POC 可被 caller 改号。`start.ts` 仍绑定 `resolveLocalItineraryOwner`，底层 `resolveLocalPocOwner` 对 loopback 固定返回 `local-owner`，非 loopback 不授予身份。Probe 实际核对 caller `x-actor-id` 不能把默认 owner 改成 B；A/B 只来自现有 `buildApi.resolveItineraryActor` 的可信端口。生产认证、多用户部署和旧/新客户端共存均未由本次资格化。

## 唯一实际路径与效果

1. 新任务 SQLite，可信 actor 为 A。当前 `createItineraryClient.command(create-draft)` 派发完整合成行程；Fastify 返回 200 前已真正提交 draft/version/receipt，fetch 端仅丢掉该已成功回复。
2. Client 报未知，原完整 input/key 已在原持久 slot 中；SQL/服务读回 A 有 1 份、B 为 0。
3. 可信 resolver 改为 B。以同一持久 slot 重建 client；真实 B `list()` 返回空，不修改原 pending。
4. 当前真实 `retry()` 再发原完整 POST 字节和原 key。B 的事务没有 A 的 receipt，合法创建一份 B draft；client 接受 B result 并读回 B current，随后共享 pending owner 清 slot。

| 真实观察 | 结果 |
| --- | --- |
| 重试前 A / B 草稿数 | 1 / 0 |
| 重试后 A / B 草稿数 | 1 / 1 |
| A 原完整草稿保持不变 | 是 |
| 两次完整 POST / key | 逐字相同 |
| 原 A pending 保留 | 否，slot 从 1 变 0 |
| 同 key durable receipt | A / B 各 1 份 |
| 重试结果 | B 新草稿，无错误 |
| 正确结果断言 | 0/1 失败 |

输入仅为本 probe 的合成 title/date/origin 等，真实用户账户、N05、提醒或原环境均未使用。`inject` 通过实际 Fastify 路由、解析、服务和 SQLite 事务；它不是 socket/TLS、Native AsyncStorage 或目标设备证明。

## 负责边界与共享消费者读回

`itinerary-client.ts` 只持久化原 `ItineraryDraftCommand`，没有原 owner 资格、派发限制或结果 owner 对账。`send()` 接受当前 actor 的新 result/current；`pending-api-command.ts` 只在 dispatch resolve 后清原 slot，不能自行推导历史 owner。`itinerary-routes.ts` 正确沿可信 resolver 授权；repository receipt 主键 `(actor_id, command_key)` 也正确隔离 A/B。缺口是原 attempt 的权威亲和性，不能靠 server 现有隔离、原 key 或 B 同内容回执反推。

全仓非测试调用读回只有下列五个客户端，没有把它们的不同业务合同合并：

| 现有消费者 | 本次只读所见原资格责任 | 本次证据限度 |
| --- | --- | --- |
| `night-report-client.ts` | 新 attempt 先取得 server session/storage/owner；retry 按原资格限制，缺历史资格保持 unknown，其他身份可读临时结果而不确认原 attempt | 复用已有 NightReport 证据，未重跑 |
| `notification-rules-client.ts` | shared `prepare` 在新派发前取得 controls owner，版本化本地资格；原 retry 不重新资格化，server owner 头仅限制 | 复用本轮 rule 独审，未重跑 |
| `notification-inbox-client.ts` controls | 原 command 保存 `expectedOwnerId`；server SQLite 在提交前与真实 actor 比较，client receipt/current 也对账 | 只读现合同/调用，不额外称生产验收 |
| `itinerary-client.ts` | 完整原 input/key 与原 slot 已有；缺原 owner 资格/限制 | 本次唯一真实反例已成立 |
| `field-reports-client.ts` | 完整原 input/key 与原 slot 已有；静态未见原 owner 资格/限制 | **仅待判别风险**，本次没有 Field 实际效果 probe，不称已证缺陷 |

`prepare` 是通用 pending owner 的既有可选资格端口，不会自动替尚未提供该端口的消费者保存原归属。已经没有原资格的历史行程记录仍须保留未知事实；本次测试知道 A 是因为确有原服务端提交观察，不能用这个事实为任意旧用户记录补造历史。后续修复、消费者迁移或 Field 判别由 root 沿同一 PLAN 决定，本任务没有实施。

## 原件与收尾

任务目录 `tmp/itinerary-owner-retry-discrimination-20261024/`：

- `itinerary-owner-retry.test.ts` / `vitest.config.mjs`：仅上述一条正确期望；生产 client、routes、service、repository 直接执行，受控的只有可信 actor 和成功回复丢失。
- `correct-result-before.log` / `observed.json`：真实失败和两 owner 效果、原 pending、完整 key/input、receipt 摘要；全部为本次合成资料。
- `source-before.json` / `source-after.json`：6 份负责源码 SHA 首尾相同。
- `resources-closed.json`：Fastify、onClose runtime、额外 SQLite 读句柄全部关闭，未创建 listener；合成 DB 留作证据。
- `artifact-manifest.json`：probe、配置、日志、观察、冻结清单、关闭回执和关闭后的 SQLite 字节身份。

命令：`node tools/run-node.cjs --bin vitest vitest run --config .codex/work-items/sky-map-performance-2026-10-18/tmp/itinerary-owner-retry-discrimination-20261024/vitest.config.mjs`。

首轮并行读取超过输出上限的 routes/fixture 已按真实路径补读；猜错的 repository/controls 文件名通过实际引用解决，没有把失败搜索当能力结论。本次有界问题已回答，不扩大 actor 矩阵或实现范围；子任务结束。
