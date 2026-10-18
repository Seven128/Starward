# H4 真实天气入口核对 — 2026-10-18

当前结论：存在已授权的 GitHub staging 固定诊断入口，但本次实际只读运行未越过 API 容器身份保护。真实 QWeather v1 响应、当前资料时效、真实 Map 采样及手机 selected-hour 联动仍未验证。8791/8796 的 fixture 天气证据不改写为真供应证据。

本轮只新增此任务证据；没有修改生产代码、PLAN、INDEX、HANDOFF、配置、密钥、数据库、权限、手机或 DevTools。没有运行 worker、提醒、部署或 providers 模式，也没有更改诊断连接 mirror。

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

## 下一条最小路径及停止条件

当前固定 runtime/providers 诊断选择正式 `starward-staging` API；选中的部署 lane 是 operator-preview。两者的差异是下一步首先要由现有远端运行/receipt owner 解决的身份问题，不能猜容器名后绕过检查。`operator-preview.mjs --operation check` 本身会创建 operation lock/receipt，并可能读取全部静态产品；它不是当前固定只读诊断的直接替代，本轮未运行。

可由 root 后续复用现有 owner，先取得 operator-preview 实际 current receipt、对应镜像 revision、Compose project/service、运行用户和环境的一致身份，再选择或实现受限的只读观察入口。观察仍只输出健康状态、配置是否齐备与枚举、资料年龄范围、有效小时数、采样/请求/重用数和一致性布尔值。不要导出 SSH/runtime secret，不删除原来的身份保护，也不要部署、造正式点、改数据库或读取任意 SQL 来使检查通过。仅有 secret 名和 staging lane 不足以替代这一步。

身份成立后，真实供应检验仍须区分两层：

- 现成 `providers` 模式只有在它支持的 staging 身份、数据库可读、readiness 正常、合格正式人口为零时才准入。它会调用既有供应服务；这不是纯只读 SQL，可能产生正常供应费用/用量。其受限输出只证明一次隔离计算，不能关闭 Map/手机要求，亦不能从 provider 名推断实际 v1 端点或完整时效。
- H4 最终需要普通真实 Map 入口：实际查询单元与原足迹、真实 v1 来源及 UTC 源小时、取得时间/年龄、所选小时与值、缺测/零值、有效格保留和切换小时后的实际效果一致。重用现有 `cloudSnapshot`/`requestBudget` 字段；不记录私人位置、完整上游响应、token 或密钥。手机候选若仍接 fixture 后端，这一层保持未验；诊断成功不能替代它。

现在可继续独立的地图静态资源、R17 真机性能和当前 CI 工作；不需要为本缺口立刻打断离开的用户。没有实际运行身份或供应准入的变化，不重复调度同一失败。
