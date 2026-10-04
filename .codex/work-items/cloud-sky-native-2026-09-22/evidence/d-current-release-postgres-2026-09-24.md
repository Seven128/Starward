# D 当前镜像的独立 PostgreSQL 星图组合与重启（2026-09-24）

使用本轮镜像 `starward-miniapp-api:cloudsky-d-http-20260924`（镜像 ID 见 [D HTTP证据](d-release-http-2026-09-24.md)），在新建专属 Docker network 上运行独立 PostGIS 17 / Redis 7.4；PostGIS 仅映射本机 `127.0.0.1:55434` 供测试夹具显式写入，API 仅映射本机 `127.0.0.1:18792`。镜像内 `dist/migrate.js` 返回 `repository=postgres`、当前/期望迁移同为 `022_plan_reminder_subscription_challenges`。API 以 LOCAL/POSTGRES/LOCAL_TEST、开发夹具关闭、自动迁移关闭、媒体禁用启动；没有连接用户 demo 库、共享8787或云环境。

复用 C07 的显式合格正式点测试夹具，但由新 [探针](../d-current-pg-sky-probe.mts)要求当前 BSC v3 及 SAO v2：先写入测试点、经**镜像 HTTP**解析观察 Context，取 Sky 报告、SAO v2 index、中文搜索和 HR 资料、土星清单。返回同一地点/时间 Context 下 48 逐时行及 48 精确观察帧；星场 `AVAILABLE`、BSC v3 8404行、SAO v2 的 base hash 与报告 BSC hash 完全相等；“张宿二”搜索与资料同为 `HR:3994`，土星清单为 CC BY 4.0 且图 URL 绑定出版哈希。停止/移除**仅 API 容器**，保留独立 PostGIS/Redis，再以 `AUTO_MIGRATE=0` 重建 API；[前](d-current-pg-sky-before-2026-09-24.json)与[后](d-current-pg-sky-after-2026-09-24.json)机器结果除阶段字样外逐字段相同，包括 Context ID/指纹、2026-09-23T13:00Z、目录/来源哈希、行数及资料身份。

没有和风正式凭证，该独立实例整体 Sky `UNAVAILABLE`、星场子状态 `AVAILABLE`；这是如实缺测，不是完整观测服务成功。测试点和日期都是显式隔离夹具，不能证明正式用户地点精度、生产 OAuth/权限、天气、云部署、真实负载或目标微信像素。固定图真实图片字节另由 [当前发布镜像 HTTP](d-release-http-2026-09-24.md) 核过，本链仅核 PG 报告与来源/目录兼容，不能据此宣称整个 D/V01 闭合。三个专属 `--rm` 容器和 network 已停止/移除；Android、用户 IDE、现有 demo 容器与活跃 WEAPP 输出未使用。
