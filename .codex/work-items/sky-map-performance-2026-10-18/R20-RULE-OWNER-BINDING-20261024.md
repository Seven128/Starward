# R20 规则未知保存的原 owner 绑定

2026-10-24，`repair_rule_owner_binding`。承接同一 PLAN 和[唯一实际判别](R20-RULE-OWNER-RETRY-DISCRIMINATION-20261024.md)，只修规则命令的原尝试资格与实际消费者，不改通知评估算法、既有六项修复或整个通知方案。默认启动仍是固定的 single-local-owner POC；可信 resolver 的 A→B 是受控权威变化，不声称 caller 头可改变默认 owner，也不声称已获得 production/multi-user 认证。

## 原问题与结果

原真实 client→HTTP→SQLite 判别已证：A 创建规则 COMMIT 后丢回复、原 pending 尚存；明确读取 B controls 后重试，在 B 下再创建一条同 key/input 规则并清 A pending。A/B 的事务与 receipt 隔离原本正常，缺的是这份原尝试的 owner 亲和性。

现在首次派发前取得真实 server controls 的 owner，把它与原完整 wire input/key 一起持久化；重试只用这份原资格。可信 B 无权把原 A 尝试改成 B effect，原 A pending 保留；A 的当前资格恢复后，原 POST 字节/key 对账并读回原规则，确认后新保存使用新 key。没有给旧 receipt 或历史记录倒推 owner。

## 实现责任

- `pending-api-command.ts` 仅新增可选 `prepare`：原 input/key 仍在第一个 await 前冻结，已有 pending 先阻止新尝试，qualification 完成后才持久存储和 dispatch。只有新命令调用 prepare；retry 不补一个较晚 owner。原 one-in-flight/join、存前发送保护与其他客户端默认行为不变。
- 规则客户端的新本地记录继续使用原 storage key，以 `ownerQualification.schemaVersion = starward-notification-rule-owner-v1` 版本化资格。新命令的 caller owner 只作为按键时的限制，实际资格来自 uncached `/v2/notifications/controls`；caller 字段不能供给授权。完整 wire 从资格记录中投影，local metadata 不发给 API，原 JSON 字段顺序/key/input 在实际重试中保持。
- 原 slot 的无资格历史 bytes 仍可读取；retry 在 HTTP 前保 unknown，不自动重发、清除或改写。即便当前 A/B 都有同 key/full-input receipt，也不能反推这条无资格记录的历史。UI 说明原内容保留，禁止这类重发，已有规则仍可按有效读取资格查看。
- 规则 POST 与 current/history/list 读取都可带 `x-notification-owner` 限制。`owner-restriction.ts` 由规则和 Inbox routes 共用：先取得实际可信 actor，限制只可收窄，不能认证 caller。B 拒绝 A 的原命令发生在效果/receipt lookup前；拒绝本次不确认以前的未知提交。
- 旧无头请求保原 server-derived current-actor 行为，不获新 attempt-affinity 保证。规则 wire/schema、SQLite current/version/receipt 与历史配置 marker 不改。新客户端检验 receipt owner，并在原 owner 限制下读 actual current，旧 replay 不覆盖后续 revision。
- RulesPanel 同步把点击时 owner 限制随完整 input 交给异步 Mutation。原 A 的拒绝带回原 expectedOwnerId，不撤销已经确认的 B 当前观察；读权限403仍撤私有投影，原已确认写也不能覆盖较新的 owner/revision。只调整原表单/重试与恢复提示，不增 router 或新保存流程。
- OpenAPI 的八个通知路径共用一份 owner-header declaration；规则路径补实际限制和 unknown/legacy语义。只改通知路径和这个共用 parameter，其余 JSON 语义与任务前快照逐项相同。

## 兼容与准入条件

本次限定**同版 API/client 配对**。controls 与规则 restriction 必须以同一合格 API 版本部署；本地资格 JSON 不是远端已经执行限制头的证明。`ebb67826` 之前尚无这份 controls 入口，新 client 对其不能取得资格，不派发规则。但“有 controls、规则路由仍忽略头”的旧/混合 server 不能仅凭 schema 名称获得新保证；分步/混合部署未准入，本次没有新增另一能力端点或冒称 Git push 建立部署。

旧 server wire 客户端继续按当前 server actor 工作，新保证只属于取得并保原资格的 client。旧 native parser 看到带新 local qualification 的 slot 会拒绝未知字段并保记录，不能视作已支持降级或多版本同时写入；实际生产升级/版本退休和共存仍欠。无原资格历史的可证明恢复仍未知，不用现在匹配的 key/receipt 伪造来源。

## 实际检查

| 检查 | 结果及范围 |
| --- | --- |
| 原判别核心正确结果 | **1/1通过**。复制原 probe/config 到本任务 tmp 执行，原失败目录不动；真实 A 已落库/B为空，B 重试不产生 B effect、原 pending 保留。原 POST 字节/key不变。 |
| 新 owner binding 三 case + 旧规则 HTTP 持久文件 | **2文件11/11、0skip**，`api-paths-current.log`。覆盖真实 A丢回复→B不改/不清→A显式恢复资格/原body/key对账→新key；legacy 原 bytes 即便 A/B同key/full-input receipt仍unknown、不HTTP；存储等待中的 owner变化、私有空读限制、fake caller actor头不授权及旧无头 wire 的真实归属。 |
| 当前 App 规则/Inbox 与旧 Itinerary/Field pending 消费者 | **5文件32/32、0skip**，`affected-callers-final.log`。原输入/key/Context、重试/冲突/临时失败/权限/迟到结果保护保留；新增旧无资格 pending 的真实 Rules UI 保留/不重发检查。 |
| NightReport 真实 HTTP/client pending 兼容 | **1文件9/9**，`night-helper-compat.log`。首次 App 命令曾带不存在的 `night-report-client.test.ts`，实际只执行5文件，不把该路径算已跑；随后才运行真实 API 内的该文件。 |
| API / mobile typecheck | 均 **exit0**，`api-types.log` / `mobile-types-current.log`。 |
| OpenAPI | JSON可解析，**173个内部 ref、0未解析**；除八个通知路径和共用参数外，与任务前 JSON 语义完全相同。没有整文件重新格式化。 |
| 限定 source diff | 通过。既有 CRLF/LF提示保留，不等于内容问题。 |

上述是各自不同范围，不相加冒全仓或 Native/生产验收。父任务 Root 接完整 API/mobile/structured 整合和新的独立审查；本作者不以自测替代独审，也不标完整 Goal 或 family 通过。

Root随后已在同一冻结源完成完整整合：**API typecheck + 35文件158/158**、**mobile fast typecheck + 39文件157/157**；原件 `root-api-integration.log` / `root-mobile-integration.log` 归本任务tmp。这是Root的整合结果，不冒成本作者独立执行；新独立审阅仍按其最终报告判断，未由整合替代生产/设备或完整family义务。

## 原件、冻结与清理

原件归 `tmp/rule-owner-binding-20261024/`：初始8份 `source-before/` 副本及其 `source-backup-before-implementation.json`、复制原 probe、`first-bound-path.log`、实际 synthetic SQLite/observed读回、上述 checks。probe自身的 `source-before.json` / `source-after.json` 只绑定修后执行时的输入，不与实现前副本混称。一次新正式测试缺括号导致加载前 parse失败，原 `api-paths-first.log` 保留；修正后11项实际通过，前者不算产品反例。一次 OpenAPI mapped-file直接覆盖被Windows拒绝，未认作写成；后续使用同卷原子替换、保原 bytes 并核 hash/JSON读回。

生产/正式测试/契约**12份已冻结**，清单 `tmp/rule-owner-binding-20261024/source-freeze.json`。冻结后只写本文，不再修改这12份。Root可据此独审/整合；其原通知 API17/App10 freeze 是此前层级，不能代替这批输入。

本作者没有 Git 写入、build、IDE/手机、共享 API8806/PG、网络/VPN、冻结代/Harness或原件上传操作，没有发真实消息。所有新 Fastify/runtime/SQLite 句柄均已关闭；测试仅在已校验归属的专用目录清理，作为证据的本任务合成 DB保留但无监听。无包依赖/lockfile变化，原历史与用户未提交成果未清理。

生产身份、实际供应、Native设备/真实storage、OS/远端通知、合法深链、完整业务 family 与原 Goal全部未完成义务继续保留。本次仅为已证规则原尝试边界补真实资格；没有把受控多owner问题外推为默认单owner被伪造，也没有把同版源码证明当远端部署事实。
