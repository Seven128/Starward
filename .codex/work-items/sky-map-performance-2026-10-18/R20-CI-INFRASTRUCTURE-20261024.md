# R20 实际 CI 与基础设施夹具修复（2026-10-24）

检查点 `2c4bb23574fb4a731725e4fa4fad31c2383a35a3` 已提交并从目标远端分支读回相同 SHA；没有改 main 或使用 force。现 workflow 只自动接 main/PR，故用其已有 workflow_dispatch 手动检查该目标分支。没有部署、上传原始数据或替换冻结候选。

## 远端实际结果

- [Context structure 39985646890](https://github.com/Seven128/Starward/actions/runs/39985646890)：**success**。
- [Product CI 39985637469](https://github.com/Seven128/Starward/actions/runs/39985637469)：**failure**，job `120523964492` 的 `Run isolated infrastructure checks` 失败。
- 此前的 release-code（SDK、三个 Miniapp workspace 类型与各完整测试）、native App/独立 API/admin 消费者、后端 release build、WEAPP release/platform owner、非部署 CI bundle 与 built-candidate inspection 均已通过。OCI 构建因前一步失败 **skipped**，不算通过。
- 构建存在 CSS 顺序 warning，但本次实际失败来自基础设施 assertion。`check:miniapp:release-code` 不等于扩展的 `check:miniapp:fast`；后者仍不据此冒称执行。

旧 run 的失败状态不被本机修后结果覆盖。含下述修复的新检查点 `8fdf9b6b8efe93a98ab2c798446ea057958e2310` 已推送并精确远端读回：

- [Context structure 39993227368](https://github.com/Seven128/Starward/actions/runs/39993227368)：**success**。
- [Product CI 39993219808](https://github.com/Seven128/Starward/actions/runs/39993219808)：**success**，head SHA精确为上述8fdf9b6b；2026-10-23 17:23:27 UTC终态。job120550014445实际通过release-code、native App/API/admin消费者、后端构建、非部署WEAPP包/inspection、此前失败的隔离基础设施及OCI构建。
- 本次工作区后续Sky资源家族及规则配置新改动不在这个提交/CI范围内。

## 两个同责任的夹具假设

1. `miniapp-infrastructure.test.ts` 前阶段将三项 PENDING upload 到期，却没有确认其删除。当前生产契约在对象写入回执丢失时仍沿稳定 object key 保留耐久退休意图，后续 formal expiry 必须能再次发现它们。旧断言只期望一项新 key，真实结果是四项，已在新隔离环境复现。

   修复只在测试补齐责任：写入三份非空合成字节，精确核三项到期 key；确认另一项删除时不能误清这三项；由既有 cleanup owner 真实删文件并读回 null，之后保留 formal `[新 key]` / `[]` 严格断言。没有改生产删除逻辑或将断言降为 includes。

2. 完整入口继续执行后，PNG/JPEG harness 将 HTTP remove 的持久退休回执当成物理文件已经删除。当前 MEDIA worker 才拥有物理删除与确认责任。

   修复统一两种格式的实际链路：HTTP 后在 PG 精确读回 EXPIRED/稳定 key，原字节仍完整；使用已有 OutboxWorkerRuntime 处理本次随机 queue；检查 key 已确认成 null、每个原 remove 事件 COMPLETE 且 effect 数为一，最后核两个实际路径均 ENOENT。没有新增运营/天象任务或把删除移回同步 HTTP 副作用。

改动仅在上述测试和 `tools/miniapp/run-infrastructure-check.mjs`。没有放宽未知提交、幂等、字节删除或持久确认语义。

## 本地真实验证与资源

实际目录：任务 `tmp/ci-infra-repair-20261024/`。

- `before.log`：原失败复现，3 项 integration 中 2 通过/1 失败，actual 4 / expected 1。
- `after.log`：原失败修复后通过并暴露 HTTP 后立即删除的第二条旧断言；保留失败，不当全绿。
- `after-worker.log`：完整 `npm run test:miniapp:infrastructure` **exit0**，run `verify_31fccd6a5d854a89`。实际包含 PG/PostGIS/Redis 重启、备份恢复指纹一致、HTTP、真实 MEDIA worker/effect/删除确认、管理 receipt/replay/RBAC 与成本读回。
- 两文件 diff 检查及 runner `node --check` 通过。此前 worker typecheck 被并发 Sky alias/旧位置参数阻断，日志保留，不冒称当时通过。后续在新 Scene 的纯类型边界修复后，完整 Mini API workspace noEmit **exit0**；修前/后入口归 [Sky证据](R20-SKY-FRAME-INPUTS-20261024.md)。

只使用自建 compose `starward-ci-repair-20261024-d1873e` 的 127.0.0.1:60729/59479、合成随机库/queue。结束已停止且无监听；容器/卷保留，未删除。原共享 Docker 55432/56379 未操作。没有 IDE、手机、ADB、共享 API/桥/队列、VPN 或现用/冻结构建操作。

独立审查已完整核对两文件 diff、生产退休/worker owner及四份失败/修后日志，另行执行 runner 语法和限定 diff 检查，均通过；未发现该范围未解决的 P1/P2。审阅者没有修改文件或重启服务。含修复的远端CI终态见上；本地通过不关闭目标运行时、部署/长期运行或完整Goal。
