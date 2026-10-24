# 手机数据服务准备（2026-10-24）

本次承接用户最新 USB 手机／自动推送授权，仅准备下一消费者的数据服务。完整 Goal、唯一 PLAN 及 UI → 叠层 → Sky 顺序不变；没有操作 IDE、手机、构建、推送、冻结代、账号或原件上传。root 在发现 schema 条件后明确要求只完成本报告，由 root 后续在原库之外准备当前 schema 的任务副本。

## 当前事实

- 原隔离 PostgreSQL 已恢复到 `127.0.0.1:55441`。先确认原 `PG_VERSION=17`、`postmaster.opts` 的 exact data/host/port、`pg_ctl status` 无 server 和端口无监听，再沿原 `pg_ctl` owner 启动。启动后已核 ready 日志、唯一 loopback listener、实际 postgres.exe、PID／创建时间和 data 参数一致。
- 没有迁移、seed、恢复覆盖、清理、账户写入或提醒/队列 worker。原私有配置和数据库内容保留。PG 启动包含正常 recovery；不能把重启后的进程内 cache/Context 当旧性能比较条件。
- 当前 `backend-data.mjs status` 实读 `LOCKED_PUBLIC_FILES_VERIFIED`：1544 文件／234,624,578 B，r6 dataset `eog-vnl-v22-2025-gba-fixed-20261017-r6`。选定 Map static publication hash 仍为 `89f3491ed136bb24c18a49ce8b92cd484dd2378bf889610153ab8f52cff514d0`；未重新下载、重产或替换。
- `backend:data:check-db` **失败**：`backend_data_database_schema_mismatch`。随后的独立 `REPEATABLE READ READ ONLY` 核对确认原库 **22** 个 migration，当前代码期望 **26**；唯一差额为 `023_account_avatar_write_intents`、`024_contribution_media_cleanup_attempts`、`025_avatar_cleanup_attempts`、`026_account_media_retirement_progress`，无 unexpected migration。原 r6 的 PUBLISHED inventory/version/hash/assetCount 全部与当前 lock 匹配。
- API8799、bridge8798 本次仍无监听；**没有绕过 schema guard 启动旧 task wrapper**。此前的成功 health 不代表本次服务 readiness。

## 服务和原输入 owner

PG executable/data/start 的新私有 owner 与日志目录为：

`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/data-lane-20261024-20261024T042902704Z/`

`owner.private.json` 保存实际 PID、创建时间、完整 data directory、pg_ctl 与 shutdown owner；`postgres.private.log` 保存本次启动，`database-check.private.log` 保存 guard 失败，`readonly-database-qualification.private.json` 保存只读资格摘要。PG 保留运行供 root 后续使用；停止前再次核 PID／创建时间／data 及当前依赖，再通过原 pg_ctl 停止，不 taskkill、不改其他 cluster。

原私有配置继续归 `device-resume/api-environment.private.json` 及 `r19-ui-20261022/terrain-r20-activation-20261023/api-environment-terrain-r20.private.json`。它们的 session secret、DB credential、发布根和只读条件没有改写，值不进入任务文档。media/nightlight/terrain/Map static 根均实际存在；目录存在不替代 publication/版权或业务结果资格。

## 正常 My 和真实 Cloud 的边界

原 `start-readonly-api-terrain-r20.private.ps1` 指向现有 `tmp/r17-normal-profile-api.mts`，其实际组合是只读 PG、SAMPLE_DATA weather、禁上传和可选只读公开媒体。原 `start-existing-data-lane.ps1` 的 bridge scope 是 `anonymousOnly=true`、`accountRoutesAvailable=false`、`reminderWorker=false`，且脚本包含条件创建 USB reverse 的分支。

这些原入口不能提供正常 My 的账户/计划成功证据，也不能认证真实 Cloud/QWeather 供给。此次未执行旧 bridge 脚本、未重试历史 policy rejection、未新建 adb reverse、未改变 VPN、路由或防火墙。凭据、原账号、N05、已送达 R6、8791 和受保护反馈/冻结包均未操作。

## 现有恢复和迁移入口（仅发现，未执行）

- `npm run miniapp:backup -- --database <owned-source> --output <private-dump>` 和 `npm run miniapp:restore -- --input <private-dump> --target starward_restore_<new-name>` 由 `tools/miniapp/backup-restore.mjs` 负责 manifest/hash/fingerprint 及新目标恢复。restore 只接受新 `starward_restore_` 数据库，拒绝已有目标。其 external 模式配置由 `tools/miniapp/infrastructure-runtime.mjs` 的 `MINIAPP_INFRA_MODE`、显式 admin URL、PostgreSQL bin directory 等负责；不得让默认 Compose endpoint 指向错误的 cluster。
- 当前 migration owner 是 `workers/miniapp-api/src/migrate.ts` → `PostgresMiniappRepository.initialize({migrate:true})`／`migration-runner.ts`。它读取进程私有 `DATABASE_URL`；本次没有调用。root 后续只对新任务副本按该 owner 迁移，原 22-schema 库保持。
- 新副本准备后继续使用现有 `backend:data:check-db`，再通过 `dev:miniapp:published` 的 files/database guard。该入口禁自动迁移和提醒，不新建发布或 worker。正式 phone origin、实际合法账户只读旅程、真实 provider/权利与当前目标数据仍需 root 分别确认。

没有另建备份/迁移流水线、安装依赖、修改生产代码/PLAN/HANDOFF/Context，亦未把文件材料化、PG 启动或旧 fixture 输出说成产品通过。
