# R27 现有桥接恢复准备

后续Root已在[原服务恢复结果](R27-LIVE-COLLECTOR-RESUME-RESULT-20261023.md)执行一次性host-only恢复；新PID56520，原19件字节未变，手机普通gen16/冻结gen32均未切换或激活。下文为准备时事实，不再沿用“服务尚未执行”作为当前状态，也不能重放已存在intent/receipt的命令块。

## 结论与范围

2026-10-23。已只读定位当前任务桥接的原入口、启动 owner、实际私有 runtime 配置及原 collector 目录；**无需新服务、目录、协议或清理旧文件，尚未执行恢复或取得真实 R27 包。** 原桥接进程与 r26 成功重启回执相符，但运行中仍是当时加载的旧 collector；磁盘 collector 已与冻结 gen32 一致。

本代理只新增本报告及原私有任务 owner 中的只读证据/未执行命令说明。没有修改 PLAN、HANDOFF、生产、Harness、配置或活动 collector 目录，没有构建、IDE、手机、ADB、预览、服务启动/停止/reload 或合成 POST。当前用户双指时间问题 pending，手机与 UI/叠层优先级仍归 Root。

## 入口及身份读回

实际读取当前 AGENTS、开发 Skill/性能方法、development feedback owner、当前 HANDOFF、[r26 手机结果](R26-OWNER-PHONE-RESULT-20261022.md)、[R27 集成](R27-QUERY-CALLBACK-INTEGRATION-20261023.md)、[当前 UI 准备](R27-CURRENT-UI-PREPARATION-20261023.md)及[最终独审](R27-CURRENT-UI-FINAL-REVIEW-20261023.md)，再沿原 r26 originals manifest 定向读取启动回执与既有文件；未扫描私人历史、全盘或凭据。

| 边界 | 本次实际结果 |
| --- | --- |
| bridge 入口 | [tmp/r17-normal-phone-bridge.mjs](tmp/r17-normal-phone-bridge.mjs)，SHA `90c9a2911c390b2085fbf8da2fcd2bb8c5e93d9976e54ce39367a53aa6fd48d9` |
| 原启动 owner | [tmp/restart-r26-owner-bridge.ps1](tmp/restart-r26-owner-bridge.ps1)，SHA `6d847f87f16512d55c35b8c16cc21129886c8a250b427a8c9bafef88de0ae528` |
| 当前实例 | 唯一 bridge 监听、node 名称/入口与原成功回执匹配；进程创建至成功回执约 2 秒。精确 PID、创建时间、可执行文件、命令 hash 与端口快照只在原私有 owner。不是下一次 Stop 的永久授权。 |
| 实际 runtime | 原 launcher 明确设置原 USB runtime 文件；当前只有 `apiOrigin` / `collectorDirectory` / `transport` 三键，USB、loopback、绝对现存非链接目录均成立；文件 mtime 早于该 bridge 启动。SHA `f10f5a7e0dc77d701fc788e19fa1643b49692f589d4152aea8391410daccb4fc`。没有读取进程 env。 |
| 当前健康 | 唯一一次 GET：upstream 200、anonymousOnly=true、accountRoutesAvailable=false、reminderWorker=false、H3 inactive。health 的通用 collector 字符串不能证明 R27 已加载。 |
| 磁盘与冻结绑定 | collector SHA `073fafe0fc685e666af06270b0ab544ed016b319881b3c17251396548d133a19`，R27 protocol SHA `1931b8fcb6f7a96a65b0fa8cac776f65074b1069499b9a226a5a3838f4096c52`；12 个 collector/递归 protocol owner 全与 gen32 template bindings 匹配。原回执的 collector hash 不同。 |

原 launcher 已有成功回执，且内置待替换实例是更旧的一代；**不能直接重跑或改写该原件。** 其 env 设置、原 Node 可执行文件、工作目录、hidden 启动及 public-only 健康守卫是恢复模板。gen32 的 build-only origin 只有构建选择字段，不能替代这里的真实 runtime。

## 现有目录与预算

### Root 后续只读预检（2026-10-23）

普通 gen15 UI 批次已回完整 Map，无 Play、输入、录制或导出在途；原生双指时机答复仍 pending，未发“开始”。Root 只执行原准备命令中 intent/Stop 之前的只读部分，**没有重载服务或激活 gen32**。首个预检在 `bridge_instance_changed` 停止，原因已定向查明：当前 PowerShell 的 `ConvertFrom-Json` 将原 ISO 创建时间自动解析为 `System.DateTime`，原脚本用字符串严格比较因而失败。进程名称/可执行文件相同，规范化后的创建时间完全相同；不是实际 bridge 被替换。

原私有命令 `ba407f74f2300755bfa492f687340afa69801ce21de7ab753d636e8c3c649913` 已先另存并 hash 读回；当前同一命令仅在 snapshot JSON 解析增加 `-DateKind String`，保留原 ISO 字符串和原有全部严格进程/监听/hash/服务守卫，没有放宽身份判断。当前命令 SHA `0a5c70e1a1769ae5e4f57d14ee4e9dd09cdaa5ebe46ded9df94dcd6896be0c8a`，完整块 AST 解析通过；随后重新执行同一只读前缀全部通过：12 个 protocol owner、19 个原文件/13 空位、原服务身份及 public-only health 不变。预检 SHA `af71f8ffbb4de4ed1c8f4569beb9ce421952351217869883807f3ee9903fd97d`；首错详情和原命令备份均在原私有 owner。intent/receipt 仍不存在，没有 Stop/Start 副作用。后续真正重载仍须当时重新过全部守卫；这些读回不提供永久 PID 授权或真实 R27 准入。

collector 的责任仍是同一路由、串行 store、先严格验证再用 incoming 值构路径、32 个 JSON 总限额、`wx` 不可变文件、完全相同内容返回 200、冲突 409；normal terminal 还要求先存在且关联正确的 metrics（缺项 424）。本次没有改变这些规则。

本次原目录有 **19 个 JSON / 剩余 13 个位置**：r25 checkpoint 9、r26 checkpoint 6、normal metrics 2、terminal 2。没有 R27 文件。一次 R27 最多 10 checkpoint 加 1 metrics / 1 terminal，共 12 件，可直接复用；无需迁移、删除、扩大限额或创建新目录。运行前须重数并核已有文件稳定；若其他 Map/native-region 导出已占位，不能沿用这次 13 的快照。原目录中的 runId、文件名、hash 与时刻留在私有清单。

## Root 的最小恢复步骤

原私有 `r24-independent-20261021` owner 新增 `r27-live-collector-resume-preparation.readback.private.json`（SHA `cff16668354f9e7162696951392f0d3ec375e05a5e2458e2e560c107385c9baa`）与 `r27-existing-collector.readback.private.json`（SHA `164bdeb9746874883f3a457704e5fbd8f64749e73668ba5f7264ff8625b3b7f1`）。同处 `r27-live-collector-resume-commands.private.md` 保存精确路径与未执行 PowerShell，供 Root 在恢复时使用；没有新可执行 launcher 或运行框架。

1. 先结束当前人类手势窗口，确认原产品没有 Play、导出或手机输入在途。保持当前 gen14；gen32 已冻结，不再 prepare/refresh/build。
2. 针对当时实例重新核对私有快照的 PID + 创建时间 + executable + command hash + 唯一 bridge 监听、入口/配置/12 个 protocol hash、public-only health，以及原 API/PG/legacy 端口身份不变。任一变化先停，只处理变化的责任。
3. 沿原 launcher 的同一方式，仅替换已验证的 bridge；复用原 runtime、collector 目录、原 Node/entry/CWD，hidden 启动。用新的一次性 intent/日志/回执保留结果，避免未知结果后重放；不能覆盖旧 r26 文件。API、PG、legacy 账户服务、N05、R6、VPN 不动。
4. 重核新 bridge 身份、health、原服务身份和已有 collector 字节未变。重启只证明新实例已从当前磁盘导入模块；不凭通用 health 晋升真实 R27 准入。之后候选推送/绑定沿原设备 owner，复用冻结 gen32。

## 第一真实检查点与到达日志缺口

**本次只读审查时发现 [r25-watch-checkpoint-arrivals.mjs](scripts/r25-watch-checkpoint-arrivals.mjs) 仅支持无参 / `--review-r26`，固定旧 gen29/30 manifest，不能用于 R27/gen32。** 随后Root已在该原owner完成[有限R27/current-ui接线与隔离检查](R27-CURRENT-UI-ARRIVAL-WATCHER-20261023.md)，没有运行真实watcher。本代理未修改它；这里只保留首个缺口及恢复责任，不继续把已修的接线当未完成。实际新run/目录/手机绑定仍须运行时成立，不能借此重放旧压力或另建watcher。

实际 normal Play 同一 owner 才调用 memory start；R27 的 runId 仍合法沿 `r25-…` 形式，不按文件名前缀猜版本。第一份真实文件须是新文件名、schema `starward-r27-memory-checkpoint-v1`、`validateR27MemoryCheckpoint` 通过、sequence=1 / phase=baseline，`observation.binding.generation=32`、source=`3808382a6b7fc8dee945b1bfe42e563fa6793182d80dd6a99253c58f4aa88c3c`，并与冻结 manifest、实际新手机 session 的产品入口绑定。私有命令说明保留了不写 collector 的直接读回校验片段。保存实际读取时刻、原字节大小/SHA 及源文件；mtime 或最后统一整理不能冒首次到达日志。

baseline 可以没有 aggregate / query observation，仅认证新协议与来源传输。真正的 R27 可用性须看后续 active-5：原 aggregate 样本非空，queryCallbacks 为 supported 且关联所需原 ID、真实 page callback / wrapper / Query owner 的生命状态与选项占位；unknown、outside-render、missing、overflow 或时钟失效保持各自意义。后续 active-15/paused/end 携带旧观察时刻不能算新扫描；首个 drain-10 才是另一原观察阶段。normal metrics 和 memory 使用不同 runId，不能强行相等或把相近时间当直接关联。

现有 15 秒 metrics、20 秒同 run 产品 Pause、90 秒 seal/release 继续由产品内 owner 控制，不能由 host 读屏速度决定停止。校验失败时保原件与独立成功点，最多沿原同字节重送规则处理缺项；不重新 Play 生成替代结果。

## 停止条件与尚未验证

身份、配置、源 hash、限额或 public-only 边界不符即在 Stop 前停；Stop/Start 后结果未知则读 intent/监听/日志，不再次执行替换；401/400/409/424/429 或 transport 不通定位首错，不发合成包。原 stdout 被当前进程占用，常规 Get-FileHash 一次失败后未重试、未解锁或改变服务；本次只保其长度/原回执与私有进程证据。两次 PowerShell 只读命令的 `foreach` 管道语法错误修正后重读，未产生服务或产品副作用。

实际 R27 手机 WeakRef、非空关联、回调替换时序、观察成本和新包提前落盘仍未验证。回调被收集可在合格原样本中排除相应链；Query options 阳性不证明闭包到 aggregate 的强引用根。UI、叠层连续交互/退出资源、Sky 六字段、完整 SAO、持有根与真实 OOM 的未完成义务全部保留。
