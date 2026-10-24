# R20 / F14：私人现场记录的真实状态边界（2026-10-24）

完整 Goal 与 `field-offline-safety` 均未完成。本批只接通用户填写的**私人文字草稿**，不能当作真实离线包、本机离线队列、安全服务、已发送位置、社区实况送审或公开发布。当前 structured family 仍明确 `passes:false`。

本批代码/检查/独审及合同已提交推送为`f2b255ae5d0a686b677094cd1e34f8c5b4002c28`，目标分支精确远端读回、ahead/behind0/0；不含后续管理端restart在途文件。[Context40005868190](https://github.com/Seven128/Starward/actions/runs/40005868190)success；Product终态按[CI证据](R20-CI-INFRASTRUCTURE-20261024.md)实读，不能由前一ab47成功或本地检查代填。

## 要求、责任与现状

本批沿 `docs/source-plan.md#outcome.field-offline-safety` 的实际输入、状态持久化、重试与恢复责任，以及 native App 的 `field-and-account` Screen Contract；界面沿原生 UI skill、原生 DESIGN profile 和现有 tokens。用户当前暂停设备/开发工具调试及新增无障碍功能，未把这些历史未验改成通过。

旧 FieldService 把固定西涌/东涌、字符串散列、固定路线、固定待同步项和 `backgroundPermission:true` 包装成包/权限/队列事实；`save-report` 只改变状态标签，未保存用户正文。旧 generic runtime 的 token/artifact receipt 也不能建立这些效果。本批退役这条生产成功路径，保留其既有 SQLite 文件及 generic 记录，不把旧记录迁移成新的私人草稿。

- `packages/domain/src/offline/field-reports.ts`：纯私人记录输入、Context 快照、版本与 command/result 契约。只接受明确填写的地点摘要、类别、完整正文和带时区的记录时间；不接受精确坐标、坐标授权、到访认证、公开/已送审标记。
- `apps/api/src/modules/field/report-*` 与 `sqlite-report-repository.ts`：field 自有 current/history/receipt 表，复用现有 Node-only `commitWithReceipt`，业务身份/版本/失败仍归 field；未修改共享事务、itinerary 或 notifications owner。
- `apps/mobile/src/data/field-reports-client.ts`：复用现有一个 App JS owner 的 pending lifecycle。完整输入与幂等键在第一次异步读取前固定；未知回复保留原始尝试；核对 receipt 输入并读取 authoritative current 后才解除 pending。
- `FieldReportsPanel.tsx`：实际新建/编辑/列表/当前/冲突/重试消费者。打开表单不写入，后来浏览别的地点/时刻不会改写已打开输入；修改地点名会去掉旧 spot identity。冲突保留表单，读取新版不覆盖当前修改，只能明确取消重编或另存记录。
- `FieldScreen.tsx`、`field-client.ts`、FieldService 和 API composition：移除 API 的第二套 redMode 与无证据的包/路线/会话/分享/队列；共享 `shell-store.displayMode` 控制模式。`/v2/field` 当前只报告六项 capability 不可用；私人记录的真实命令另走 `/v2/field-reports`。旧 `/v1/field` 和 commands 返回 409 upgrade，不再写 generic token receipt。
- `tests/acceptance/structured/field-reports-probe.mjs`：真实私人草稿的 current/history/restart/replay 代表证据，取代 field 的 generic pack/artifact 成功路径；并未让整个 family 通过。

原生表单只在用户明确打开新记录时截取 App 的实际地点/时间选择。Context 自身合法初始 revision 保留原值；只有找到实际 profile owner 才记录其 revision，缺失时为 `profileRevision:null`，不把 Context 中的默认 1 冒充已读取 profile。保存过的旧记录仍保留其原有快照。用户输入只代表用户填写，server 不认证真实观测。

## 持久化、拒绝与恢复

SQLite `field_report_drafts`、`field_report_versions`、`field_report_receipts` 在一个 `BEGIN IMMEDIATE` 事务内提交。receipt 绑定 actor/key 与完整规范 command；同一键同输入可重放旧 receipt，但不会把旧 receipt 当当前版本。旧 revision 不可覆盖较新 current；其他 owner 看不到或修改不了本记录。

新 routes 复用现有 loopback-only local owner POC resolver，默认缺 resolver 拒绝；`x-actor-id`/role 等 caller header 不构成身份。所有私人读写均 `private, no-store`。这不是已完成生产账号鉴权、同步授权或设备加密。

客户端区分两类拒绝：首次 HTTP/body/DTO 明确拒绝可释放这次未生效的 pending；未知尝试重试时，前置拒绝不能证明旧请求没提交，因此保留 pending。只有事务内 receipt 未命中后产生的 revision/not-found 拒绝才可安全释放。权限丢失、读回失败、错误内容的 receipt 与未知存储结果都保留同一尝试。

正文仅校验非空和不支持的控制字符，完整保留前后空白、换行、缩进及用户原文。没有新加 Source 未声明的正文/地点/幂等键长度上限；沿既有 64 KiB HTTP body budget。时间沿现有纯 UTC/observing-night 格式 owner 验证，不接受无时差的瞬间或无效日期。

## 实际检查与修复记录

证据根为 `tmp/field-state-20261024/`（task-local，未作为产品数据提交）；`receipt.json` 记录 final source SHA-256 与日志身份。所有 HTTP 测试均启动自己的随机 `127.0.0.1` port、临时 SQLite，结束后关闭；没有接触共享 PG/API/桥/队列、IDE、手机、ADB、冻结构建、N05、R6 或任何外发通道。

1. `before-http.log`：新真实消费者回归在 composition 尚无 v2 route 时先失败，未读取到任何 current 内容；之后接线修复。
2. `before-full-content.log`：审查发现初稿擅加 4000 字/200 字等上限且 trim 正文。真实 POST 含 >4000 字正文、前后空白/制表缩进、较长地点与幂等键，整个 JSON 小于 64 KiB，先以 400 拒绝。移除无依据上限并保留原文后，该 POST、更新、current 和历史版本精确读回均通过。未把这个初稿缺陷改写成原本通过。
3. API 工作区整合在上述内容修复前实际 **30 files / 130 tests 全通过**，见 `api-workspace-final.log`。内容修复后必要受影响组（8 个真实 HTTP、server 与 capability owner）重跑 **3 files / 21 tests 通过，0 skip**，见 `api-content-final.log`。后一次检查没有重跑完整工作区，不将其改称 131 全绿。
4. 最终原生实际消费者与 client **3 files / 12 tests 通过，0 skip**，见 `native-content-final.log`：打开无写入；用户实际输入；异步前内容固定；丢回复后卸载重建；同键同载荷重试；较新 current 读回；冲突保输入并另存；共享模式；红光输入前提醒；缺 profile/位置时保持未知。DOM/native primitive adapter 是有界开发证据，不是 Android/iOS 渲染或设备恢复验收。
5. 最终 structured field probe **3/3 通过，0 skip**，见 `structured-content-final.log`。正常代表路径建立真实 SQLite 读回；缺 current 或用 current 代历史的 countercheck 会拒绝代表证据；完整 family 始终 `passes:false`。
6. API 与 mobile 完整 `tsc --noEmit` 均 exit 0，见 `api-content-types.log`、`mobile-content-types.log`。日志为空是 noEmit 无诊断，退出码在 `receipt.json` 记录。OpenAPI JSON 解析和 `git diff --check` 均通过。

期间 client 测试初稿曾有括号语法错误；消费者重建测试曾错误等待 pending 状态下“新建”恢复可用。修的是测试语法及正确的等待边界，保留了新建受 pending 阻止的产品断言；后续完整受影响组通过，未把这两项称为产品失败。

## 保留的未完成义务

完整来源要求仍有效：实际包组件/许可/哈希/空间/续传/原子激活/回滚、Expo SQLite-first 本机写入和队列、图片依赖/重试/冲突、设备敏感数据加密/最短保留/撤权/迁移、停车位置与精度/合法路线、确认主备切换及旧计划恢复、安全本地提醒/权限/限时后台/系统杀进程与停止、逐次用户分享预览/策略/接收者/有效期/撤回/真实结果、现场气象天文和返程事实、完整工具集及设备飞行模式/重启/低光验收，均不能由本批草稿效果替代。社区送审/审核/公开发布也是独立未完成边界。

当前 UI 明确没有可用离线包或安全会话，不展示示例窗口、停车箭头、后台已授权、已排程签到、已分享或“全部已同步”。红光键盘先提醒并可稍后填写；尚未核验红光的工具入口保持不可用，其他显示模式可打开既有 Sky/摄影/Map 路由。目标页面的完整红光连续性、键盘/原生视觉及物理交互仍须后续真实 runtime 修复/验收，不能用这次有界适配测试通过来关闭。

作者批次未修改源 PLAN、HANDOFF、总验证或 durable Context。root 负责本批独立复核、总整合、Git 保存和完整 Goal 续行；本文件记录当前 field 责任与证据。

作者同批同步了 OpenAPI 的 field paths/实际私人 v2 契约；其标出的通知/行程旧段已在下述root续批修正，field原有投影未变。

## Root 独审与最终整合续批

独立 Node/domain/API reviewer 发现 P2：category 通过 `String` 做 enum 判断却原样返回，实际 HTTP `category:["sky"]` 被以200存成数组。原独立probe/result完整保留，见`tmp/field-api-independent-review-20261024/review.md`及同目录；其余真实原文/精确offset+毫秒UTC/null profile、UPDATE receipt故障三表逐字节回滚、重启回放/异载荷/stale拒绝及旧generic runtime→新runtime→旧runtime兼容试验通过。旧记录/meta/artifact SHA及原digest/revision未被修改或冒领。旧审查不冒称复核后续修复。

root新增实际HTTP拒绝且三表无效果、原键改正可提交回归，修前失败（HTTP200）；修正为先核字符串类型再核enum，修后field/server/capability三文件22/22。沿同一外部输入机制检查真实通知/行程边界，又实际复现channel数组、transport数组和stage.kind数组三条HTTP200；三条修前失败保留，分别在原validator加同样类型校验，三真实HTTP文件最终25/25。日志`field-category-{before,after}-20261024.log`、`f14-enum-{before,after}-20261024.log`；修前过滤跳过只是选test范围，不计产品验收。新reviewer独立25/25及实际pending clients23/23，另真实HTTP/SQLite核四处拒绝不改已有三表行字节、原键可改正提交及旧合法scalar writer→当前runtime重开/历史receipt兼容；原P2原件hash不变，无本修复范围P1/P2。报告`tmp/f14-enum-repair-review-20261024/review.md`，SHA-256 `675409b9f3bb80a0349d525f4dde6678a605e63a9c857c232dc8d55dcf65d81c`；原作者/全部本批reviewer已结束，资源已关闭。

独立native reviewer未发现本私人草稿接入P1/P2：实际3文件12/12、独立消费者2/2及client2/2，无skip。真实组件有界适配核4201+字完整空白换行、改地点清旧spotId、跨mode保表单、旧GET忽略Abort晚到不能盖新current；实际client核异步前固定输入/key、未知保存遭403仍保原尝试、重建后原键原载荷重试。源hash及原日志见`tmp/field-native-independent-review-20261024/review-receipt.json`；原生像素/键盘/亮度/系统恢复不据此通过。

root最终整合在正文及四处enum修复之后实际运行：API完整类型+**30文件135/135**，mobile fast完整类型+**36文件139/139**，structured3/3，各exit0、0skip。日志与SHA-256分别为`tmp/field-final-api-workspace-20261024.log` / `e276261cfcd809b1610c2e230662db6303fad27b582392ce45736b972db74702`、`tmp/field-final-mobile-fast-20261024.log` / `ee60a060c07673275e25bf7ee4bc6d2a6a860608fdf03f22e666b96d9c5b8fe8`、`tmp/field-final-structured-20261024.log` / `49005b542370c25a588b9c27220aa0d86f90201c7028a0b629de6175d550981d`。这是真实新批次，不改写作者较早130项结果，不与Miniapp fast相加冒一次全产品验收。

通知/行程OpenAPI已由单独owner同步8个真实v2操作/18schema，并修正v1升级与typed兼容分支。root独立核实际routes、validators和完整diff，无范围内P1/P2；复用原verification仅把输出改到`tmp/f14-api-contract-sync-20261024/root-receipt.json`，未覆盖作者receipt，JSON/123个本地ref/35operationId、Ajv2020、实际SQLite service输出及11schema/parser负例/长正文正例均通过，field投影hash保持`fae8638558be13d2b96116d3ec3208de1ba1ae92219413bebe0fb779dba2d5a6`。OpenAPI SHA-256 `ab1ca6df85563bf8a72373f61d47268c77fc5ef428aa2683069aa586e6d24a63`。结构与schema不替代语义validator、HTTP或部署验收。Context结构校验及限定diff检查通过；完整family仍passes:false，完整Goal仍active。
