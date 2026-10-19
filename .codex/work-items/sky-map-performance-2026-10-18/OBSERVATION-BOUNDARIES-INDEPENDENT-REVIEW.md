# Observation boundaries independent review — 2026-10-19

只读审查本轮官方预览结果保存/分类和 task-local R17 A 关联扩展。已完整读取 AGENTS/global/default manifest、当前 PLAN/HANDOFF、development Skill/performance-investigation、H3-PREVIEW-BOUNDARY-REVIEW 和 R17-A-CORRELATION。未操作手机、ADB、DevTools、feedback 现场、服务或候选构建，未做 Git 变更；本文件是本审查唯一工作区写入。root 已收到以下两项发现，修复及其回归结果尚不在本记录的已验证范围。

## 可行动发现

### P1：authorization task 的成功不能成为原 preview 的成功

位置：`tools/miniapp/device-feedback-session.mjs` 的 `recordOfficialTaskResult`（审查时第 113–142 行）；`device-feedback-boundaries.test.mjs` 的 “only the retained original task…” 用 `taskType: auth` 并断言 poll success 后 `completed`/可 bind（第 247–278 行）。

当前实现只匹配 taskId，然后将任意 `status: success` 分类成原 `auto_preview` 的 `completed`。但官方 Skill CLI 的 `taskType: auth` 表示业务调用连接失败后启动的前置授权：返回 pending 时直接返回，原业务调用没有在后台等待自动重试。查询这个 auth task 得到 success 只完成授权。当前实现会在原预览没有执行成功的情况下开放 bind，并错误报告 `official_auto_preview_terminal_success`。

精确支持出处是安装版公共文件 `E:/微信web开发者工具/resources/app.asar.unpacked/js/common/cli/skill-index.js:1` 的 `startSkillCall`：初次 `D(t,n,u,s)` 遇到 `CONNECT_ERROR/MCP_INIT_ERROR` 后 `runSkillAuth(t)`；若 `h.status === pending && h.taskId`，以 `{ success:true, taskId:h.taskId, taskType:"auth", status:"pending" }` 直接 return。只有同步完成授权的分支才会 resetSession 后再调用 `D(t,n,u,s)`。同一函数对 `auth_` 开头的 `polling_task_result` 直接查询 `getAuthTaskResult`。该公共文件 SHA-256 为 `e4f76600f5082486007d9d186211458cb1a0604ee468c1c247a5e6e7746ad033`；`taskType:"auth"` 字符偏移为 57920。官方 `references/async-task-polling.md` 也将 login/auth 的依赖恢复与其他 pending 区分。

应区分原业务任务与前置 auth 任务，保留原工具/非敏感参数身份。auth success 不能升级成 preview success 或允许 bind；明确继续时，先完成该前置恢复，再执行尚未执行成功的原业务操作。将现有肯定错误语义的测试改成阻止错误升级的回归。

### P2：预览已返回的 pending handle 会被后置完整性错误丢弃

位置：`tools/miniapp/device-feedback-preview.mjs` 的 `createOrdinaryPreview`，审查时第 84–89 行，以及 `device-feedback.mjs` 的两个 caller catch。

`driver.preview` 已返回并分类 `pending + taskId` 后，函数先执行 `assertGenerationCurrent` 才将结果返回给 caller。若官方工具改写了语义配置或 bundle 出现漂移，这个 post-check 抛错，原 sanitized 结果尚未保存；caller 留下 `invoking` 或用一个不含 taskId 的 generic error 替换。于是原操作继续可能运行，但已经不能按其任务身份查询。当前 UNKNOWN 防护仍会阻止重发，所以这里的缺陷是任务与原结果丢失，不能据此宣称已发生重复预览。

已用独立临时 fixture 复现，只有文件/mock-driver 操作，无设备/工具/构建：mock preview 修改其准备目录的 `project.config.json` 后返回 `{status:"pending",taskId:"retained-original-task",taskType:"preview"}`。实际异常为 `device_feedback_generation_config_changed_start_new_preview`；保存状态读取为 `unknown`，`taskId === null`。临时目录按精确拥有范围清理。

在任何可能抛错的后置完整性检查、QR 验证或清理之前，先持久化 sanitized 原结果/handle。完整性漂移继续阻止绑定及依赖操作，但不应抹掉官方任务身份；相关异常路径须做回归。

## 已检查边界及限制

- 旧的无原结果 `completed` 会在读取时降为 UNKNOWN；pending/unknown/error 挡住 bind、refresh、另一 preview 及 stop。历史 gen26 仍不能由本软件检查升级为成功或已送达。
- A 扩展未发现新的可行动阻断缺陷：沿原 v3 preparation/frame owner 关联，固定 Date wall-elapsed、epoch/run 边界、首次 request/paint 去重、2048 retained ring、first 4 + last 4 链、原 prepareToken、normal-only 版本扩展、严格固定字段/32 KiB 和 metrics→terminal 依赖均已追踪。原 producer/consumer 的 historical bytes 不由此迁移。
- Page 三计数只表示同一准备/首次 request/首次 paint 附近的更新状态，不能给 payload 或 intent 建立因果身份，不能测 React CPU 或物理呈现。retained preparation 分布和首尾链的选择偏差仍须保留；未知/低于分辨率不能当零，两个阶段的百分位或最大值不能直接相加。
- 新 revision 的完整 materialization/build、真实服务是否 reload/admit 扩展、手机样本、观察成本及产品 A/B 均未由本审查验证。root 对新观察 session 中原正常 Sky 的实际确认属于 root 的现场证据，不是本审查操作或 H3 验收。后续 A+terrain 集成不在本次审查范围。

## 独立软件检查

合批运行 `node --test`：`device-feedback-boundaries.test.mjs`、`device-feedback-preview.test.mjs`、`device-feedback.test.mjs`、`device-test.test.mjs`、`r17-a-correlation.test.mjs`、`r17-phone-probe-collector.test.mjs`，**79/79 通过**。全部是已有 mock/临时 fixture/纯协议检查，未接触运行现场。通过结果不消除上述 P1（其现有测试错误肯定了 auth 升级）及 P2（独立异常路径复现），也不建立产品通过。
