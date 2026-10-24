# R20 远端接力审查：独立 API / 管理恢复

2026-10-24，审查代理 `review_remote_api_admin`。范围为 `266df53ea48a65013b9a358cfc2ffeb28c274fcf..f9798d794d09332be6eac6ef8651ce50865e2d0b` 中通知规则、现场私人草稿、行程草稿、地点命令与管理 journal/实际消费者，以及受影响基础设施接线。NightReport 由 root 另审，不在本结论内。没有修改生产代码、依赖、PLAN 或 HANDOFF。

## 已确认问题

### P2：已知公共缓存刷新失败，可被没有刷新结果的重试响应误清除

位置：`apps/admin-web/src/app/page.tsx:2798–2803`；事实保存在 `admin-session.ts:106,171`，最终清理发生在 `admin-session.ts:190`。

原操作收到匹配回执和 `postCommit.cacheInvalidation=FAILED` 后，journal 正确保留该事实；刷新/重新认证也会显示“曾有公共缓存刷新失败”。但显式重试的当前响应只要没有再次给出 `FAILED`，即使完全缺少 `postCommit`，页面就在管理读回匹配后置 `confirmed=true`，删除原 pending journal 并显示已确认。它没有读取已持久保存的 `cacheFailureObserved` 来判断缓存责任是否仍未解决。管理数据读回不证明公共缓存已刷新。

实际复现使用原生产 AdminPage、session owner、加密 journal、React/JSDOM 和现有 IndexedDB 事务夹具：先得到 FAILED，重挂并重新认证，保持原 body/key，先经历 403 再重试，返回匹配 receipt/管理读回但省略 postCommit。观测为 `retryStillOffered=false`、journal 仅剩 salt 行、`confirmed=true`；“应继续保留恢复入口”断言 **0通过/1失败**。该响应形状直接来自原 `admin-page.test.mjs` 的 cache-recovered 分支，现有15项绿测试因此没有覆盖这一要求。

触发范围是旧协议或未提供缓存完成信息的响应，不是声称当前 `committedEnvelope` 普通成功路径一定漏字段；当前后端正常会给 COMPLETE/FAILED。本次没有制造实际 Redis 故障或声称观察到线上旧缓存。

建议纳入原管理命令恢复责任的修复逻辑：

1. 已经观察到缓存失败的原 attempt，只能在原身份/key/receipt、必要业务读回均匹配，并得到明确 `COMPLETE`（或既有公共恢复 owner 的等价实际证据）后关闭。缺失、未知、非法状态继续保留原输入/回执/恢复入口。
2. 不把重新认证、管理读回或“不是FAILED”当完成；不丢弃原 key、不另建操作、不新增自动重发。未曾观察到该失败的旧协议兼容路径单独判断，不无条件给所有旧响应加新门槛。
3. 原 cache-recovered 正向夹具应明确给 COMPLETE，并新增 FAILED→重开→缺失状态仍 pending 的反例。保持最终明确 COMPLETE 可关闭的正向控制；该控制本次实际 **1/1通过**。

依据：当前 `project_context/areas/main/screen-contracts/operations.md` 明确要求原操作保存到 receipt/readback/cache completion，并区分公共缓存新鲜度和管理读回。该问题尚未修复，本报告不改变既有通过记录或冒称全绿。

## 可以复用的已完成职责

- **API 私人配置/草稿真实持久化**：通知规则定义及启停、现场私人草稿、行程草稿各有真实 SQLite current/version/receipt owner；同事务效果与回执、actor 隔离、revision 冲突和缺少可信 resolver 拒绝沿实际 routes/service/repository 实现。三个现有真实 HTTP/SQLite 文件在当前拉取源码和锁定依赖下复跑 **25/25通过**。无新 must-fix；不再从 generic token scaffolding 重做这些已完成定义/草稿。
- **管理 journal 核心恢复**：IndexedDB reserve-before-HTTP、按 origin/API/actor/credential 分域的密文、明确重新认证与重试、旧窗口完成不清新行、存储失败保原资料和独立只读能力，均已有实现；当前原 page/session/CLI 文件复跑 **15/15通过**。保留其原工作，只补上方最终缓存确认边界。
- **地点命令和 CLI**：版本化路径与 session capability、actor/key 首次提交串行、完整输入/operation 一致性、PATCH revision CAS、原业务/审计/outbox/回执同事务及 CLI 原输入读回已在源码贯通；新CLI在旧路径目录不回退无key写入。`05f82bc8..f9798d79` 的这些实现和基础设施 runner 没有变化，既有专用PG/HTTP/CLI结果及05f精确CI应继续复用，本次未重新启动PG。
- **基础设施验证**：runner已把物理媒体删除验证移至真实 MEDIA worker 后，并明确读回意图、实际文件和ack；新admin spot commands阶段使用既有隔离run数据库/HTTP/CLI。不能把原无DB unit的条件skip冒充该阶段，也无需重新从零搭该检查。

## 真正保留的后续义务

- 通知规则的评估、权限取得、排程与真实投递尚未实现；定义保存不能关闭通知family。
- Field仍是私人未提交草稿；现场包、公共发布/协作、其它F14实体与真实业务外部效果仍按各owner推进。行程草稿不等于真实路线、天气/天文融合或完整出行执行。
- 管理真实凭据/角色部署、公共缓存实际恢复、原无key旧客户端未知结果核对、origin存储/凭据丢失后的server reconciliation仍需后续证据；不能以journal替代它们。
- 新NightReport WIP和其CI、所有设备/原生资源/性能/OOM均不被本次检查覆盖。

## 命令、证据与界限

任务本地目录：`tmp/remote-api-admin-review-20261024/`。

```text
node tools/run-node.cjs --test tools/miniapp/admin-page.test.mjs tools/miniapp/admin-session.test.mjs tools/miniapp/admin-operations-client.test.mjs
# 15/15, admin-baseline-after-pull.log

# apps/api cwd
node ../../tools/run-node.cjs --bin vitest vitest run src/__tests__/field-report-http-persistence.test.ts src/__tests__/notification-rule-http-persistence.test.ts src/__tests__/itinerary-http-persistence.test.ts
# 25/25, api-durable-after-pull.log
```

`admin-cache-unknown.test.mjs/.log` 为实际页面失败反例；`admin-cache-complete-control.test.mjs/.log` 为明确COMPLETE的正向控制。脚本是现有页面测试的任务内派生，仅改变原缓存恢复段的必要断言/响应并保持真实生产组件；不替换生产实现。它们使用合成账号/输入/响应，不含真实凭据或私有资料。

所有测试均已退出，随机本机HTTP、SQLite、React窗口与连接由夹具关闭。未运行浏览器断电持久性、部署、PG/Redis、微信IDE、手机/ADB、构建、VPN操作、数据上传或Git写入。文档只为root整合修复计划与完成范围提供证据。
