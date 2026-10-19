# H4 真实天气入口核对

## 2026-10-19 当前已取得的增量证据

最新受审identity补齐已作为fde9049f进入main，完整Product39266613880（含OCI）与Context39266613824 success。本批仅诊断改动、quota未变，root在release-owner重检期间取消自动发布39268074761，实际cancelled、镜像push/host preflight/promote全skipped；没有为新观察重复同样额度失败或修改CD。现场稳定后的[identity39269225549](STOPPED-API-IDENTITY-REMOTE-20261019.json)已读到固定唯一exited API的合法1ccd/de4b创建引用，running0、原准入仍failure。该revision的旧发布36039611583实际push/preflight成功、start-writers失败，push digest吻合；具体停止原因/current receipt未知，未跑runtime/provider。Console MFA不阻止现有获权SSH固定观察；下一窄current链入口的[只读边界](RELEASE-REFERENCE-OBSERVATION-BOUNDARY.md)已核，但新文件读取mode尚未实现，不能当已观察或删tag依据。

固定identity实现及已审生产源码已随`ba4ea423cd7b55bfb184fa57557434d740081711`进入远端main，精确main的Product/Context CI均success。现有CD=true/operator-preview自动[发布39258892651](https://github.com/Seven128/Starward/actions/runs/39258892651)在镜像push遭TCR个人仓库100标签上限拒绝，host preflight和promote均skipped，未部署服务器。连接镜像已依现有owner刷新；不能将此次构建发布失败解释为它停止了API。

现场稳定后只运行一次[identity39261198368](https://github.com/Seven128/Starward/actions/runs/39261198368)：固定`starward-staging`/`api`总1、running0、exited1、`selectedContainer=null`。这已细分此前`ambiguous`，未读到停止对象的revision/digest、停止原因或current receipt；未调度runtime/provider。真实QWeather v1、资料时效、Map及手机selected-hour联动仍未验。

随后核实现有probe已读停止对象的revision/Config.Image但未投影，完成[窄补齐](STOPPED-API-IDENTITY-OBSERVATION.md)与[独审](STOPPED-API-IDENTITY-REVIEW.md)：唯一匹配对象可保合法身份，原运行准入保持，无配置/receipt读取或新远端入口。22/22及实际生成模块fake边界5/5通过；旧run的未知仍保留，新证据须沿main-only固定owner实际取得，现场由HANDOFF拥有。

Chrome既有腾讯云会话可读原唯一TCR和主机；OrcaTerm主机登录实际停在MFA。未发送验证码、改MFA、执行远端命令、删tag或付费升级，不要求携手机外出的用户立即配合。[单个tag只读审计](REGISTRY-QUOTA-CANDIDATE-AUDIT-20261019.md)已核历史push成功但promote skipped，不证明当前无引用；停止镜像、current pointer、回滚/备份引用及精确OCI恢复仍须现有operator能力核实。当前不重复相同发布/诊断失败。实际交付结果见[交付读回](DELIVERY-RUN-20261019.json)，当前现场及后续动作由[HANDOFF](HANDOFF.md)拥有。

## 2026-10-18 历史只读调查

当时结论：存在已授权的 GitHub staging 固定诊断入口，但该次实际只读运行未越过 API 容器身份保护。operator-preview 与固定诊断使用同一个 `starward-staging` Compose project，不能将 lane 名称差异当作原因。已核对历史部署摘要和后续运行诊断，当时尚无当前 receipt、实际镜像与包含停止状态的容器集合读回；真实 QWeather v1 响应、当前资料时效、真实 Map 采样及手机 selected-hour 联动仍未验证。8791/8796 的 fixture 天气证据不改写为真供应证据。

本轮只更新此任务证据；没有修改生产代码、PLAN、INDEX、HANDOFF、配置、密钥、数据库、权限、手机或 DevTools。没有运行 worker、提醒、部署、operator-preview check 或 providers 模式，也没有更改诊断连接 mirror。后续身份审计仅读取 GitHub 元数据和在内存中提取白名单日志字段，没有再次调度 workflow。

## 已复用的边界

- 配置、凭证与诊断责任：[data-and-operations](../../../project_context/deployment/data-and-operations.md#configuration-and-secret-boundary)、[pipeline-and-host](../../../project_context/deployment/pipeline-and-host.md#product-ci-image-promotion-and-host-lifecycle)。部署凭证留在 GitHub Environment Secrets；其 API 不返回现存 secret 明文。诊断与部署是不同入口。
- 真实云量要求继续由 [PLAN](PLAN.md) 的 Cloud 责任及 [Map 合同](../../../project_context/areas/main/screen-contracts/wechat-miniapp/map-and-finder.md) 管理。已完成的 v1 迁移、整段小时缓存及 receipt-clock 修复直接复用，不重做供应商选择或 v1 调研。
- [CLOUD-CLOCK-REPAIR](CLOUD-CLOCK-REPAIR.md) 已保存普通 Android 的 fixture 云格、小时变化和有效旧格保留证据；它明确保留真实供应与时效缺口。

当前源码 `weather-provider.ts` 使用 `/weather/v1/hourly/纬度/经度`、`hours`、`localTime=false`，按实际供应坐标/配置缓存完整小时序列。`map-cloud-forecast.ts` 保留最多九个实际查询单元、取得时间、源小时、完整序列重用和实际请求数；`map-cloud-presentation.ts` 校验原查询格、所选小时、源年龄与值的对应关系。这些是代码责任的核对，不是本轮真实供应执行结果。

## 实际执行

1. 当前 checkout 的 remote 是 `Seven128/Starward`；授权 `gh` 会话有效。仅检查 staging secret/variable 的名称。所需 `STARWARD_DIAGNOSTIC_CONNECTION`、`STARWARD_SSH_PRIVATE_KEY`、`STARWARD_SSH_KNOWN_HOSTS` 名均存在；没有获取 secret 值。现成 `STARWARD_STAGING_LANE` 的受限枚举读回为 `operator-preview`。
2. 远端 main 是 `32ec61a4f5321e571d499be6430a09918d65242e`。对该 main 的 workflow、runner、固定 runtime probe、connection parser、provider simulation 五个文件逐一比较 Git blob，均与本次阅读的本地源码相同。因此确认调度的是已审固定程序，不是将当前未提交源码送往远端。
3. 只调度一次：`gh workflow run backend-diagnostics.yml --repo Seven128/Starward --ref main -f mode=runtime`。实际 [run 39126102107](https://github.com/Seven128/Starward/actions/runs/39126102107) 于 `2026-10-18T12:09:09Z` 创建，`12:09:28Z` 完成，结论 failure。报告通过固定白名单从日志内存提取，只保留：

   ```json
   {"status":"failed","code":"runtime_diagnostic_container_ambiguous"}
   ```

4. 该错误由远端固定 shell 的最早容器选择产生：它要求唯一、运行中、标签为 `starward-staging` / `api` 的容器；后续还要求现有 `node` 用户、staging 环境身份，然后才会检查 readiness、配置枚举及只读 SQL。当前失败发生在这些后续观察之前。它同时覆盖空集合和多集合，不能据此断言没有任何 API、SSH 失效、QWeather 密钥无效或数据库数据为空。没有重试同一失败，也没有转调部署以获得诊断访问。
5. 仅对已知两份本机 `runtime.private.json` 检查五个 QWeather 键的存在布尔值：原恢复 r6 与当前 Map 副本均没有 `QWEATHER_API_HOST`、`QWEATHER_CREDENTIAL_ID`、`QWEATHER_DEVELOPER_ID`、`QWEATHER_PROJECT_ID`、`QWEATHER_PRIVATE_KEY_PEM`；本任务进程同样无这些值。两份配置仍是 LOCAL/POSTGRES，迁移与提醒关闭。没有打印任何凭证字段值。用户目录 `.ssh/config` 不存在，因此未发现可直接复用的具名 Starward operator SSH 入口；没有扩展扫描其他凭证位置。

历史 [providers run 35504921510](https://github.com/Seven128/Starward/actions/runs/35504921510) 的限定报告仍可读：`ISOLATED_TEST_SIMULATION`、`FORMAL_POPULATION_MISSING`，和风天气 FRESH、24 个组合总云量小时、20 个报告小时。这是 2026-09-20 的历史模拟，不证明当前部署 revision、v1 端点、当前资料年龄、Map 或手机结果。

## 已有运行身份审计

- 当前 validator 要求 staging 的 `COMPOSE_PROJECT_NAME=starward-staging`；`operator-preview-checks.mjs` 也明确要求渲染配置的 project 为 `starward-staging`。固定 runtime/providers 的 project/service 选择与这条 lane 一致，不存在已证实的“正式 project 与 preview project 不同”。这仍不能证明当前容器存在、唯一或运行中。
- 读取最近 200 条 staging run 元数据，并检查可查询的全部 32 条 workflow-level success 对应的实际部署 job。最近一条总体 success [37520173117](https://github.com/Seven128/Starward/actions/runs/37520173117) 实际只有 `qualify` 成功，`publish-and-deploy` skipped；它和其后同类 skipped 记录均不是部署证据。
- 最近实际 `Promote exact image to staging` 成功的是 [34771917251](https://github.com/Seven128/Starward/actions/runs/34771917251)，job 于 `2026-09-13T17:37:29Z` 完成。候选 revision 为 `262d7531916c0b1b995fe8937321c044c9fb9ca5`；日志中只有一条符合固定白名单的成功摘要：`environment=operator-preview`，`imageDigest=sha256:824bc03eaac9c2b2afe63e61767b3cc50c571e5ffdead65bc29de0b9605e5ba5`，远端 receipt 路径存在。未复制该路径、连接字段或完整日志；该 run 的可下载 artifacts 数量为 0。这个历史摘要没有读取服务器当前 pointer，也不能排除后续手工操作。
- 历史 [runtime run 35502020935](https://github.com/Seven128/Starward/actions/runs/35502020935) 的日志通过当前 `sanitizeRuntimeReport` 再校验。它在 `2026-09-20` 读到同一 revision、staging / TRIAL / POSTGRES / LOCAL_TEST、readiness 200、配置和只读数据库 ready、18 个 migration、合格正式点 0、`qweatherConfigured=true`、`forecastHours=24`。这把历史部署与一周后的实际运行关联起来，不能延长成 10 月 18 日的当前证据，也不证明当前源码已部署。
- 最近五条失败发布记录（[39033565745](https://github.com/Seven128/Starward/actions/runs/39033565745)、[36487051953](https://github.com/Seven128/Starward/actions/runs/36487051953)、[36459581061](https://github.com/Seven128/Starward/actions/runs/36459581061)、[36447288916](https://github.com/Seven128/Starward/actions/runs/36447288916)、[36441311098](https://github.com/Seven128/Starward/actions/runs/36441311098)）均失败于 `Build and publish the immutable release image`，SSH trust、host preflight 和 promote 未执行。不能把这五次构建发布失败解释为它们停止了当前 API；也没有把它们解释为当前服务健康。
- 已完整核对现成 `host` 模式：它只有 OS/架构、CPU/内存/磁盘、Node/Docker/Compose 和受限路径权限预检，不读取 `docker ps -a`、服务状态、镜像 revision 或 `operator-preview-current.json`。它不能细分本次身份失败，因此没有为此调度一次无判别力的检查。其他现成模式都先经过同一个唯一运行 API 保护，不能提供缺失的停止状态或 current pointer 观察。

## 下一条最小路径及停止条件

当前缺口是同一 project 的实际运行身份，而非已证实的 lane 选择错误。仍需区分：运行 API 为零、运行 API 多个，或后续的 user / label / environment / image 不匹配。`operator-preview.mjs --operation check` 本身会创建 operation lock/receipt，并可能读取全部静态产品；它不是当前固定只读诊断的直接替代，本轮未运行。

现有 [固定诊断程序](../../../tools/deployment/runtime-diagnostics.mjs)、[runner 输出白名单](../../../tools/deployment/run-host-diagnostics.mjs) 和 [main-only 调度入口](../../../.github/workflows/backend-diagnostics.yml) 已加入显式`identity`模式。它只观察固定project/service的全部/Running标志数、状态数，以及唯一对象的user/label布尔值和合法revision/digest元数据；不读取配置、DB、provider或current receipt，不接受任意命令、路径或selector。24项受影响检查及独立生成程序复核通过，独审P2的状态/标志矛盾已修，paused/restarting不会报可用，见[RUNTIME-IDENTITY-DIAGNOSTIC](RUNTIME-IDENTITY-DIAGNOSTIC.md)与[独审](RUNTIME-IDENTITY-INDEPENDENT-REVIEW.md)。

这项补齐目前仍是当前分支的本地实现，尚未在远端运行。main-only、SSH、原runtime/API/DB保护和CD条件保持；要先让受审代码进入允许的revision，再运行一次identity分清此前歧义，不能绕guard或用部署/重启造成功。main合并须核对现有自动staging CD的实际触发与既有授权；诊断实现本身不是远端部署或当前身份的证明。receipt仍待既有release/preview owner，在确需其路径时处理，不为第一边界增加私有配置路径解析。

身份成立后仍先复用当前 runtime 的 readiness、配置与只读 DB 观察；之后的供应观察只输出健康状态、配置是否齐备与枚举、资料年龄范围、有效小时数、采样/请求/重用数和一致性布尔值。仅有 secret 名、staging lane 或历史镜像摘要不足以替代当前身份。没有证据表明现在必须由用户提供 secret 或立即操作手机；可继续诊断 owner 的独立实现工作，将确需外部 operator 登录或平台授权的动作后置。

身份成立后，真实供应检验仍须区分两层：

- 现成 `providers` 模式只有在它支持的 staging 身份、数据库可读、readiness 正常、合格正式人口为零时才准入。它会调用既有供应服务；这不是纯只读 SQL，可能产生正常供应费用/用量。其受限输出只证明一次隔离计算，不能关闭 Map/手机要求，亦不能从 provider 名推断实际 v1 端点或完整时效。
- H4 最终需要普通真实 Map 入口：实际查询单元与原足迹、真实 v1 来源及 UTC 源小时、取得时间/年龄、所选小时与值、缺测/零值、有效格保留和切换小时后的实际效果一致。重用现有 `cloudSnapshot`/`requestBudget` 字段；不记录私人位置、完整上游响应、token 或密钥。手机候选若仍接 fixture 后端，这一层保持未验；诊断成功不能替代它。

现在可继续独立的地图静态资源、R17 真机性能和当前 CI 工作；不需要为本缺口立刻打断离开的用户。没有实际运行身份或供应准入的变化，不重复调度同一失败。
