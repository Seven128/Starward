# C07 当前发布镜像 + 独立持久库链（2026-09-23）

用当前工作树和 `infrastructure/deployment/miniapp-api.Dockerfile` 构建本机镜像 `starward-miniapp-api:cloudsky-pg-20260923`，镜像摘要 `sha256:cbe90d4f2fa04962bbddd9a4db1722eaf8ff12570c8a582ef8a8336328baf0a9`、本机大小 123098714 B；原始构建输出 `c07-postgres-release-build-2026-09-23.log`。Dockerfile 在构建内断言商用小程序镜像不含 Gaia DR3 pack，保留 BSC5P 和工作区级 `jsdom`。这是 LOCAL 配置的本地发布镜像，不是已部署的商业云环境。

在独立 Docker network 上新建 `postgis/postgis:17-3.5-alpine` 和 `redis:7.4-alpine`；数据库只映射本机 `127.0.0.1:55433` 供显式测试点写入，API 只映射本机 `127.0.0.1:18789`，未触碰原共享8787。用镜像内 `dist/migrate.js` 显式迁移到 `022_plan_reminder_subscription_challenges`，再以 `LOCAL`/`POSTGRES`/`LOCAL_TEST`/媒体禁用/自动迁移关闭启动镜像内 `dist/main.js`。初始手工搜索请求误用 `query` 参数而得400；改用契约的 `q` 后，真实HTTP“张宿二”200/FRESH→HR:3994。

任务脚本 `../c07-postgres-sky-probe.mts` 用本机源码的测试夹具向隔离数据库写入一条显式合格正式点，所有读取均通过**镜像** HTTP：观察 Context、Sky 与中文搜索。`c07-release-sky-pre-restart-2026-09-23.json` 与 `c07-release-sky-post-restart-2026-09-23.json` 完全一致：同一 Context ID/指纹/2026-09-23T13:00Z、BSC5P v2 的8404目录行、48逐时行与48观察帧、HR:3994/FRESH。中间停止并重新建立 API 容器，数据库保持。由于这组隔离环境没有和风凭证，Sky整体 `UNAVAILABLE` 而星场子状态 `AVAILABLE`；不能宣称完整天气/观测体验可用。

同一镜像的 `dist/worker.js --once` 输出 `scheduled=11`、`enqueued=11`、`complete=11`、`pending=0`、`dead_letter=0`。真实数据库顺序及数量在 `c07-release-worker-order-2026-09-23.json`：小时天气 `UNAVAILABLE`，天文 `PRECOMPUTED`，随后决策 `RECOMPUTED`/`opportunityCount=1`；1条天文夜和1条观测机会快照已持久化。机会状态为 `INSUFFICIENT_DATA`、confidence为空，正确反映无天气凭证，而非可观测承诺。这进一步证明本轮同时间事件排序修复进入了打包 worker，不证明生产凭证、云路由、容量/成本、滚动发布或手机画面。

结束后停止全部专属 `--rm` 容器并移除专属 Docker network；本机临时镜像保留供后续隔离复核。Android、ADB、扫码、用户现有demo容器及8787服务均未使用或改变。C07正式云端与目标机、独立审查仍开放。
