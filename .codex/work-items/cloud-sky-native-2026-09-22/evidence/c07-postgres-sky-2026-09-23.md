# C07/C10 隔离 Postgres/Redis 搜索与观察上下文重启验证

2026-09-23 在本机另启 `postgis/postgis:17-3.5-alpine`（仅 `127.0.0.1:55433`）和 `redis:7.4-alpine`（仅 `127.0.0.1:56380`），用当前 Mini API 源码在 `127.0.0.1:18789` 的 `LOCAL`/`POSTGRES`/`LOCAL_TEST` 配置运行。第一次 `MINIAPP_AUTO_MIGRATE=1`，第二次同一持久数据库以 `MINIAPP_AUTO_MIGRATE=0` 重启；未连接或改动用户现有 Starward demo 容器及共享8787。测试库和容器均为新建、`--rm`，结束后停止自动移除，复核仅8787继续监听。媒体测试产物保留在 ignored `artifacts/miniapp/cloud-sky-native/c07-postgres-media-20260923`。

真实 HTTP 查询 `张宿二`、`SAO 1`、`Vega` 分别返回 `HR:3994`、`SAO:1`、`HR:7001`，均为200/FRESH，无 unavailable catalog；不存在的名称返回200/FRESH/空结果，没有借用旧命中。任务脚本 `../c07-postgres-sky-probe.mts`向隔离 Postgres 写入一个显式合格的正式点，通过HTTP解析正式点观察 Context，再取该点天空和中文别名。服务重启后同一 `contextId`、context fingerprint、所选UTC时刻仍可读取；BSC星场子状态 `AVAILABLE`、正式目录8404行，48行逐时天文值与48个观察帧在首时刻和观察者纬度一致，中文别名仍为 `HR:3994`/FRESH。原始前后摘要分别为 `c07-postgres-sky-before-2026-09-23.json`、`c07-postgres-sky-after-2026-09-23.json`；服务日志为 `c07-postgres-service-2026-09-23.log`、`c07-postgres-service-restart-2026-09-23.log`。

此隔离实例未配置和风天气凭证，故整体 Sky 响应 `dataState=UNAVAILABLE`；不能从星场 `AVAILABLE` 推断完整天气/天空产品正常。这是本机源码实例加真实 Postgres/Redis 的功能和重启检查，不是生产镜像、云数据库容量、滚动发布或目标手机验证。C07生产云服务与成本、C10手机组合仍开放。

同时试跑仓库已有 `test:integration`：首轮缺 `MINIAPP_MEDIA_STORAGE_ROOT`，属于本次环境配置错误；补齐后复用被首轮部分写入的测试库，事件目录二次回滚版本断言失败。全新隔离数据库从一开始带齐配置再跑时，该断言通过，证明前一失败是测试状态污染；原始两次失败见 `c07-postgres-integration-2026-09-23.log`。全新库随后暴露真正的首次扫描缺陷：同一事务入列的小时事件有相同 `created_at`，原派发排序不稳定，`OperationalDECISIONRequested` 在 `OperationalASTRONOMYRequested` 前执行，结果 `NO_INPUT`、没有观测机会快照。修复 `outbox-worker.ts` 同时间事件天气→天文→决策的排序，并在现有集成测试中断言天文完成早于小时决策开始。修前全新库日志为 `c07-postgres-integration-clean-2026-09-23.log`（2项1通过、1失败）；修后再用第三个全新 Postgres/Redis 和媒体目录运行 `c07-postgres-integration-order-2026-09-23.log`，2/2通过。数据库记录中小时决策 `RECOMPUTED`、`opportunityCount=2`。这验证本地隔离持久库的首轮任务链，不等于云发布、真实天气凭证或手机验证。

同源码服务端全量 `npm run test -w workers/miniapp-api`：353通过、11跳过、0失败；原始输出 `c07-postgres-worker-unit-2026-09-23.log`。`npm run typecheck -w workers/miniapp-api`、`npm run context:validate`、`git diff --check`退出0。第三组专属容器已停止并由`--rm`移除；18789/55433/56380不再监听，仅原有8787保留。C04数值DEM现有研究已确认缺正式站位/高度精度，不能把俯视地形源当成Sky遮挡成果。
