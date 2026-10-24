# R20 行程草稿之后的最小实际模块

2026-10-24，只读准备，检查 main `61953dd160b6dc77eaff44c3b4b12e2dd4dbcb51`。本报告是同一 PLAN 下的模块入口，不是另一实施方案或新的唯一下一步。不改源码、PLAN、HANDOFF、Context 或 Git；没有运行测试、构建、设备、IDE、数据库、服务或外部请求。root 继续拥有这些操作。

## 推荐结果

**让用户在 App 查看已保存行程的历史，与当前版本比较，并明确将历史内容恢复为一个新的 revision。** 取消不写入；并发更新须重新比较，丢回复后仍能用原输入/key 对账并在重启后读回真实结果。

这直接补 `docs/source-plan.md:2334` 的“保存/查看/恢复历史版本”和 `:2616` 的“恢复版本前显示差异”。不需要先取得路线供应商 key、真实手机网络、通知通道或协作账号。它只交付现有私人草稿的恢复能力；不会把草稿变成可执行行程，也不关闭 AC refresh-version 的天气刷新、完整 F14、真实离线/分享/协作或 Native 设备验收。

## 已有的实际责任

| 当前 owner | 现有实际效果 | 本次结论 |
| --- | --- | --- |
| `apps/api/src/modules/itinerary/sqlite-itinerary-repository.ts:42` | actor/id/current 或指定 revision 的 SQL 读取；每次提交保存不可变 version，current/version/receipt 同事务。 | 历史数据和逐版本读回已存在，不能重做一个 history 库或继续用 generic operation token。 |
| `itinerary-service.ts:21`、`draft-command.ts`、`packages/domain/src/itinerary/index.ts::applyItineraryPatch` | 严格输入、actor、完整 command digest、baseRevision CAS；新 revision/sequence/operationLog，时间线校验。 | 恢复应复用现有真实修改/回执责任，不能改写旧 snapshot 或将 current 指针直接退回旧版本号。 |
| `itinerary-routes.ts` | `/v2/itineraries/:id/revisions/:revision` 已有；私有 no-store、缺 actor 拒绝、其他 owner 无历史读取权限。 | 不是缺 HTTP 历史入口；目前没有可分页的历史摘要列表。 |
| `apps/mobile/src/data/itinerary-client.ts:35` | 当前 `get(id)`、library、create/patch、原 pending 和 exact retry；成功后另取 current，旧 receipt 不能盖过新 revision。 | 没有暴露指定 revision/history；恢复不应另造 pending slot 或 bypass 此 owner。 |
| `apps/mobile/src/features/itinerary/ItineraryScreen.tsx:16` | 真实新建/编辑/当前草稿；仅显示版本号。路线/刷新/分享/协作明确 unavailable。 | 没有历史浏览、差异预览、恢复入口；这不是已有完整模块只差验收。 |

现有 App 输入保存只改变 `title` 和完整 `inputs`；API 还支持经过校验的用户 `stages`。同 id 的 timezone/owner/id/createdAt/state/evidence 当前不允许用户修改。旧记录的 route/weather/astronomy 仍 missing，spot 仍 unverified；历史内容不能被称为历史天气或已核路线。

现有证据 [行程草稿持久化](R20-ITINERARY-DRAFT-PERSISTENCE-20261023.md) 已证明真实 HTTP/SQLite 重启、历史读回、CAS/并发、回执失败回滚和 client 丢回复恢复，应按未变责任复用。`tests/acceptance/structured/itinerary-probe.mjs` 仍只读旧 revision 并明确 `passes:false`；它从未执行“将旧内容恢复为新的 current”。本报告没有重跑或升级这些旧检查。

## 模块边界和最小接线

正常旅程：当前草稿 → 打开历史 → 选定同一 id 的旧 revision → 看到当前/旧值差异与双方版本 → 明确恢复 → 新 current revision → 重开 App/API 后仍可读，并保留旧两版与新恢复版。历史 preview 始终只读，不因选中某版本改写 shell Context、当前草稿或触发外部效果。

首选复用现有 `patch-draft`：以显示差异所依据的当前 revision 作 baseRevision，完整冻结旧版的 `title + inputs + stages` 作为恢复输入，再走原 pending/HTTP/事务/current readback。当前 DTO 的历史可编辑内容由这三项完整覆盖；timezone 等不可编辑身份和元数据留在同一 aggregate，恢复产生新 sequence、操作日志和时间。没有必要仅为“恢复”字样新建第二业务工作流、命令 broker 或复制整份旧 aggregate。未来 schema 新增可编辑字段时，恢复投影须与负责版本合同共同演进，不能静默遗漏。

历史入口可复用已有逐 revision GET。若要提供历史列表，只在原 repository/routes 增加私有摘要分页，复用既有 50 条分页基线，按 revision 游标；不要为列表逐个全量拉取所有 snapshot。真正比较某一版时才读取它的完整内容。历史详情必须校验 id、指定 revision 和 schema，不能把 GET current 或别的 id 当成选中的旧版。

取消差异预览不 POST。未保存的编辑表单必须保留，恢复写入需等该表单明确保存/取消；不能在后台用恢复结果清空未保存输入。一次恢复的按钮防重、pending 展示、重试与失败反馈交给现有 client/Screen owner，不把“取消查看”解释为删除结果未知的 pending。

并发更新返回原 revision conflict，保留选定历史和比较输入，再读取当前版本重新比较；不得自动将 baseRevision 换成新 current 后无声覆盖。若恢复已提交但回复/当前读回失败，保留完整原恢复 input/key；恢复后旧 receipt 只能确认当次效果，显示内容仍读权威 current，不能把后来已有的更高 revision 拉回恢复时的旧响应。

## 扩展前的一次必要判别

**行程原 owner 资格尚不能直接按规则模块的结论写成已证缺陷。** 当前默认 resolver 只接受真实 loopback 的固定 local-owner，caller actor/role 头不能改号，原用户基本条件不能被改写。既有 HTTP 用可信 resolver 测过 owner 隔离；client 测过 owner 缺失/403 保留 pending，但没有实际覆盖可信 A 已提交丢回复 → 同 base URL 的可信 B → 原 pending retry。

当前 itinerary client 的 pending 只有原 command，没有 rule 新增的 owner qualification/prepare；当前 POST 也没有与原 owner 绑定的限制。扩大写入前，应在新的隔离真实 HTTP/SQLite 路径做上面这一条判别，检查 **B 零效果、A 原 pending 不清、恢复 A 原 body/key 读回**。若正确结果失败，再复用 `pending-api-command.ts` 已有 optional prepare 和现有 server actor 边界修实际行程缺口，保旧 wire/receipt、legacy unknown 与固定 POC 边界。不要把 caller owner 头作为授权，也不扩成新生产鉴权框架。

同一可信 actor 改变条件下，当前 App library/detail queryKey 没有 owner 域，应同时判别实际拒权/旧私有投影与迟到 current 结果是否能覆盖新 owner；只有实际对应消费者失败才修。默认固定 POC 与生产、多 owner、混合版本部署分别判断；新 rule 模块的同版资格不能自动认证行程或旧客户端。

## 相称完成证据和外部条件

必要检查按责任复用已有 fixture/真实端口：

- API：一份非空旧内容（至少两项实际差异，含用户阶段）恢复为新 revision；原 versions 字节不变；current/version/receipt 的真实回滚；并发 baseRevision 冲突不覆盖。可与一次新进程/连接重开和原键 replay 合在同一正常/恢复旅程，不重跑整个旧矩阵。
- 真实 App consumer：历史选中只读、差异与明确恢复、取消零 POST、原编辑保留；历史读取失败保 current/所选版本与重试；真实提交丢回复→client 重建→原 body/key→current 读回。页面和 HTTP/SQLite 联测用来证明新增效果，不能只做字符串标记或与实现相同的断言。
- 原 owner 判别若证实缺口，补对应 A/B 原反例及实际拒权/迟到发布消费者，再做受影响类型、旧 command/helper 与新模块检查；不要无变化扩成全仓反复测试。
- 新共享写入和用户恢复语义需独立审阅。App 实际 AsyncStorage、键盘/触摸、系统 Back、前后台/进程杀死及目标画面仍需 Native App 条件，单元/React primitives 不冒验收；原家族 `passes:false` 和所有其他外部义务继续保留。

本模块在自有隔离 SQLite/随机 loopback 和实际 React consumer 下可推进，不依赖这次 WeChat 手机到8806的拓扑恢复。生产身份、真实位置/坐标权限、可执行路线/天气/天文生成、共享/邀请/公开投影和离线文件都另有真实条件，不因这一局部恢复完成而被删减。UI → 叠层 → Sky 的目标结果顺序及 root HANDOFF 的唯一下一步不变。
