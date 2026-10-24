# R20 旧规则未知提交跨 owner 重试的判别

2026-10-24，`verify_legacy_rule_owner_retry`。本次只做父任务指定的一条判别验证，没有实现或修改生产、正式测试、Context、PLAN、HANDOFF、INDEX、Git、依赖。未构建、操作IDE/手机/共享API/PG/网络/VPN、冻结代或上传原件，也未发消息/通知。当前通知评估/Inbox的限定独审结论和完整family缺口保持各自范围。

## 结论与适用条件

**可信服务端 actor 从A变到B时，现规则重试会在B下创建第二条规则，并清掉原A pending。** 实际client → 随机loopback Fastify → SQLite已确认这个结果；共享Inbox client在重试前已明确观察到B，并没有阻止旧rule命令重发。正确结果“B保持空、原A attempt仍保留”的断言 **0/1失败**，不是harness加载错误或空状态推断。

这不是已证明的默认单owner路径问题。当前真实 `start.ts` 绑定 `resolveLocalNotificationOwner`，其底层 `resolveLocalPocOwner` 只接纳loopback并固定返回 `local-owner`，不会因调用者的user/role头变号。本次A/B由 `buildApi` 已有可信resolver端口控制，代表服务端权威变化的受控条件；没有声称普通用户可伪造B或当前POC已支持production/multi-user。这正是[当前App独审](R20-NOTIFICATION-EVALUATION-APP-REVIEW-20261024.md)已保留、未宣称解决的旧rule命令亲和性边界。它不撤销本轮四项私有投影/controls结果修复的限定结论。

## 唯一实际路径

1. 新隔离SQLite和真实API启动，可信actor为A。规则client的同一 `inboxClient.controls()` 真正读到A。
2. 通过原rule client提交完整新规则；真实HTTP返回前SQLite已COMMIT，fetch端仅在收到成功响应后丢回复。客户端报未知并保原完整input/key；实际A有1条规则、B为空。
3. 可信resolver改为B，仍用同一API/client。实际GET controls读回B，client authority为 `ready/B/revision0`。
4. 调用真实 `client.retry()`，也就是当前Rules按钮调用的原入口。第二次POST和第一次原body逐字相同、key相同；没有重新生成输入或key。
5. SQLite实际读回：A仍1条且原记录逐字未变，B由0变1；同key在A/B各有1份receipt，两个规则身份不同。retry返回B规则，pending slot由1变0。

| 实际观察 | 结果 |
| --- | --- |
| A已落库/B原为空 | 1 / 0 |
| 重试前明确的当前authority | B，ready |
| 重试后A/B规则数 | 1 / 1 |
| A记录未改变 | 是 |
| 原key及两次完整POST字节 | 相同 |
| 原A pending保留 | 否，slot为0 |
| 同key的durable receipt | A/B各一份 |
| 正确结果断言 | 0/1失败、0skip |

输入使用现有 `tests/fixtures/notification-rules.ts` 的明确合成规则；未使用用户账户、N05或真实通知资料。所有开关/通道仍未产生任何实际通知投递。

## 负责边界的代码读回

- `notification-rules-client.ts` 派发前确实经既有pending owner保存完整command/key，但其持久command不含原owner资格；POST无owner限制头。共享 `inboxClient` 当前观察并未成为旧rule command的资格。
- `pending-api-command.ts::retry` 从原slot读取原command后交回该client dispatch；dispatch接受B新创建结果和B的current读回，因而通用owner按成功结果清slot。
- `rule-routes.ts` 使用服务端可信resolver，未把caller头当授权，也没有针对这份rule attempt接纳原owner限制。`NotificationRuleService` 按当次可信actor提交；SQLite receipt主键为 `(actor_id, command_key)`，所以B没有A receipt时会合法执行一份B create。服务器的按owner隔离和事务幂等未被绕过；缺的是原attempt的权威亲和性。
- 当前Rules重试按钮直接调用 `client.retry()`。原A未知命令得到B结果时，当前authority也正是B，新的私有投影/发布检查不能反向证明该命令原本属于B。这不是通过私有投影helper即可修复的历史资格问题。

本次未给旧receipt补造原owner，也未提出或实施新的资格方案；只把这条静态缺口转为有条件的实际效果证据，交root沿同一PLAN和原owner决定后续。原始资格缺失的历史记录、production/多owner及整个通知family仍保留，不能从B的相同key/内容回执倒推出A的原归属。

## 可复核原件与收尾

统一目录 `tmp/rule-owner-retry-discrimination-20261024/`：

- `rule-owner-retry.test.ts` / `vitest.config.mjs`：只执行这一条正确结果断言；实际service/client/pending/SQLite均直接调用生产模块，受控的仅可信actor和已COMMIT回复的传输丢失。
- `correct-result-before.log`：Vitest真实相关失败，1file/1test、0skip，无harness前置失败。
- `observed.json`：原pending、前后真实数据、原POST字节比较、A/B receipt和retry结果；全为本次合成数据。
- `source-before.json` / `source-after.json`：8份实际源输入SHA首尾相同；`artifact-manifest.json`另绑定probe/config/log/观察与关闭后的SQLite字节。
- `resources-closed.json`：API、runtime和额外SQLite读句柄均已关闭；合成SQLite留在该task目录作证据，没有活动服务或监听。

命令：`node tools/run-node.cjs --bin vitest vitest run --config .codex/work-items/sky-map-performance-2026-10-18/tmp/rule-owner-retry-discrimination-20261024/vitest.config.mjs`。

已读取完整当前通知实现、两份独审、旧rule配置证据、默认Context、PLAN独立API/Conditional相关段及上述负责代码。首次并行输出截断的独审已分别补读，猜错的local-poc-owner/配置文件路径已从真实引用/本任务新配置解决，不把失败搜索当能力结论。本次有界问题已有答案，不扩Itinerary/Field/其他actor矩阵，子任务交付后结束。
