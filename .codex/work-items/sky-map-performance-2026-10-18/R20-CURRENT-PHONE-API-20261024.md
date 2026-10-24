# 当前 schema 的手机 API 任务副本（2026-10-24）

本次只准备完整 Goal 的既有本机环境责任：保留原 22-schema 数据库，在新任务目标恢复、迁移并启动当前 API。用户已授权 USB 手机及推送开发反馈；root 明确委托本副本准备及其选定物理 LAN host 绑定。没有生产或 staging 部署、平台上传、手机操作、IDE、构建、推送或 Git 写入。完整 Goal 和 UI → 叠层 → Sky 顺序仍由 HANDOFF/PLAN 控制。

## Requested operation / Candidate identity

- 源码 checkout 为本机 main，检查时 HEAD `1a8147e3de9b6cd3368f8e10f7abc72edf9180a8`；本轮 root 的工作区修复仍未提交。API 从当前仓库 `workers/miniapp-api/src/main.ts` 启动，未使用旧 readonly/SAMPLE_DATA wrapper。
- 原 PG55441 的 CIM 创建时刻、postgres executable、归一化 `-D` 参数和 SQL `data_directory`/port 均与原 private owner 匹配。没有启动第二 cluster 或更改原 PG 配置。
- 使用新的 `starward_restore_` 任务数据库；名称、完整连接和新 config 仅存私有 owner。先确认目标不存在，再经原 backup/restore owner 创建。原库仍为 22，只有新副本经当前 migration owner 升至 26。

## Executed owner / Verified

1. 复用 `tools/miniapp/backup-restore.mjs` 的 `createBackup` / `restoreBackup`：本机原始 dump **841,655 B**，manifest/hash 与恢复指纹核验成功。备份、manifest 和完整恢复 receipt 留在同一私有目录，没有上传或覆盖原件。
2. 复用 `workers/miniapp-api/src/migrate.ts` → `PostgresMiniappRepository.initialize({migrate:true})`，只对新副本应用 `023_account_avatar_write_intents`、`024_contribution_media_cleanup_attempts`、`025_avatar_cleanup_attempts`、`026_account_media_retirement_progress`。随后当前 `checkBackendDatabase` 实读 26 个精确版本及锁定 r6 PUBLISHED inventory；公开运行文件 **1544 件／234,624,578 B** 验证通过。
3. 原库再次只读核验：migration 仍 22，原 backup owner 的业务指纹未变；新旧库的 active-account、plan、outbox、favorite 聚合数量相同。没有 seed、清账号、改 N05 或重发 R6。上述是恢复/逻辑状态证据，不把运行中 PG 文件字节称为固定快照。
4. 原 `api-environment.private.json` 未改。原 URL 的唯一 `default_transaction_read_only=on` 选项继续用于所有原库读回；为使用现有严格 external backup owner，仅在新任务 admin/目标连接去掉该只读 query 选项。没有改变原库 URL 或将旧库作为写入目标。
5. 新 private config 延续 session secret 和已恢复的账号/计划身份，publication 根按当前 lock 绑定。保 `LOCAL`、`LOCAL_TEST`、`POSTGRES`；禁自动迁移和 reminder delivery，不启 worker，不接 Redis。媒体仍 `DISABLED`。新手机 API 不带任何 `MINIAPP_ADMIN_*` 凭据，管理写能力关闭。
6. 经现有 `tools/resources/backend-data.mjs start --config` 的 files/database guard 启动 API。最初 loopback ready 后，按 root 的 `selected-origin.private.json` 将**同一新副本**重绑到唯一当前物理接口，端口 **8806**。最终 `/health/ready` 为 `ready=true`；唯一 listener 地址匹配 root 选择，listener 属于已核 PID／CIM 创建时刻／executable／config argument 的 API 子树。
7. 实际 HTTP GET：无 token 的 `/v2/me/profile` 和 `/v2/me/observation-plans` 均 **403**；只给 asserted admin actor 的 `/v2/admin/session` 为 **503**，对应关闭的管理能力。未签发、构造或借用其他用户 token 来制造“正常 My”结果。

## Unverified / external

- 手机到当前 host 的 TCP/HTTP、当前手机 session 与恢复账号的对应，以及正常 My／合法 Picker 的实际画面与返回仍由 root 下一旅程核验。DB 有 active accounts/plans 不证明当前手机账号或该账号的已结束计划可用。
- 新 API 没有注入 SAMPLE_DATA weather；真实 QWeather／WeChat 凭据仍未配置。`LOCAL_TEST` 是既有本机开发认证，不能当真实 WeChat 身份或生产鉴权。真实 Cloud、H4 的供应/权利/时效、当前场景和目标效果均未通过。
- 媒体仍关闭，真实头像/受保护媒体读取及其目标 UI 结果未验。未扩大到共享原件的可写文件存储。
- files/schema/publication/API readiness 不证明 WEAPP 可用、科学图像质量、持续手势、资源退休、OOM 或完整 Goal 完成。没有修改冻结 gen18/gen34、Harness 或原私有资料。

## Failure / recovery

- 第一次 backup 在原 URL 的只读 query 上被现有 strict external URL guard 拒绝，尚未创建 backup/目标；仅在核明其唯一选项后按上述限定方式恢复。原失败记录保留。
- loopback → selected-host 重绑中，第一次 CIM 原/UTC 比较拒绝了尚未修改的目标；归一化修正后，退出中的子进程触发保护中止。只操作了本任务 API 树，随后确认旧 root 不存在、8806 无 listener，再从同一新 config 正常启动。原 PG 未停，原库未改；没有绕网络、auth 或 schema guard。
- 没有改 VPN、TUN、防火墙、路由，未建 bridge 或 `adb reverse`。实际手机连接的首个失败边界如存在，由 root 按既有网络 owner 处理。

## Receipts / cleanup

当前私有目录：

`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/current-phone-api-20261024T043928429Z/`

- `api-environment.current.private.json`：当前新任务 config，绑定 root 选定 host/8806。
- `api-owner.private.json`：**当前** API root PID／UTC 创建时刻／executable／config argument／host；`lan-readiness.private.json` 是当前 listener/HTTP 读回。最初 `ready.private.json` / `api-owner-loopback.private.json` 仅是 loopback 阶段历史。
- `original-before-migration.dump`、manifest、`restore.private.json`、`migration.private.log`、`qualification.private.json`、`aggregate-preservation.private.json`：原备份、恢复、迁移及读回证据。
- `stop-current-api.private.ps1`：先核当前 root 与唯一 listener 的归属，再只停止已证明属于该树的 API server，等待 launcher 退出并确认 listener 消失；PG 属另一 owner，绝不由该脚本停止。脚本只做了语法解析，**尚未实际执行**，当前 API 按 root 需要保留运行。
- 原 PG 的停止仍归 [前置服务 owner](R20-PHONE-DATA-LANE-20261024.md) 指向的 `data-lane-20261024-20261024T042902704Z/owner.private.json`；停止前须重新核 PID／UTC 创建时刻／data 及 root 的后续依赖。

本子任务命令已结束，仅留下已交 root 的必要 API8806 与原 PG55441 服务。新副本、原始 backup 和私有日志保留；没有清理其他目录、数据库、账号、配对、会话或资料。
