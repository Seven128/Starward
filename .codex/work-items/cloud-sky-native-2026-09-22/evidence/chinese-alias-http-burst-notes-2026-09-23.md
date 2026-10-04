# C07 Mini API 生产镜像 HTTP 检查（本地）

- 原镜像 `sha256:839ec7defe214320ea531cc0ba70f61adacf0ef2710e17264b42133225007fb4` 在 `MINIAPP_STORAGE_MODE=MEMORY_TEST`、`MINIAPP_ACCEPTANCE_MODE=1` 下启动即退出：`ERR_MODULE_NOT_FOUND: Cannot find package 'jsdom' imported from .../event-article-extraction.js`。原 Dockerfile 只复制 `/app/node_modules`，而 npm 生产安装的 `jsdom@30.0.1` 位于 `/app/workers/miniapp-api/node_modules`；根 lockfile 另有不同版本，不能据依赖声明或单模块 import 推断完整服务可启动。
- 修复 `infrastructure/deployment/miniapp-api.Dockerfile`，复制 Mini API 工作区级生产依赖，并在 runtime 层断言 `jsdom/package.json`。最终本地镜像 `sha256:d1b6ab9d805f336f0583e991abe31afd1062187cbae5682581fc0fc88e73e5b1`，大小 123098397 B，镜像构建退出 0；其完整 Nest/Fastify 服务启动并映射 `/v2/celestial-objects`。
- 启动方式：512 MiB Docker cgroup，`MINIAPP_STORAGE_MODE=MEMORY_TEST`、`MINIAPP_ACCEPTANCE_MODE=1`，仅本机 `127.0.0.1:18787` 映射。任务脚本 `search-http-burst-trial.mjs` 发 80 个同时起始的 HTTP 请求，覆盖中文 HR、SAO、HD、Messier、行星及无匹配样例。最终原始计时与各首项身份见 `chinese-alias-http-burst-2026-09-23.json`：80/80 HTTP 200、目录态 FRESH，冷首查约 1042 ms，warm burst 约 618 ms，响应 p95 约 583 ms。容器检查 `memory.max=536870912`、`memory.peak=281247744`、`memory.current=242970624` B，`running=true`、`OOMKilled=false`。容器检查后已停止并移除。
- 较早同一镜像的纯模块排队调用见 `chinese-alias-container-burst-2026-09-23.json`，它没有 HTTP 服务启动覆盖，不用于代替上面的证据。
- 边界：本地单实例、内存测试存储、无生产数据库/认证/上游负载、真实云路由或持续压测。80 次请求是一个短促样本，不建立生产并发容量、费用、延迟 SLO 或设备表现；C07 与 Goal 保持开放。
