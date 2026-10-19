# main 同步、H4 恢复与剩余交付动作

2026-10-19，12:03 UTC 前的有限只读快照。沿当前完整 Goal 和同一 [PLAN](PLAN.md)，复用 [H4 readiness](H4-REAL-WEATHER-READINESS.md)、[剩余交付核对](REMAINING-DELIVERY-AUDIT.md)及既有独审；这不是新方案或新的批准门槛。实际运行现场继续由 root / [HANDOFF](HANDOFF.md)拥有。

本代理只读 Git、本仓库 release owners 和受限 GitHub 元数据；唯一工作区写入是本文。未执行 Git 写入、远端 workflow、连接镜像刷新、部署、构建、服务/设备/IDE/ADB 操作、账号/数据库读写或私密配置扫描；8791、N05、R6、配对及 VPN 未触碰。

## 已核事实

| 项目 | 本次实际结果 |
| --- | --- |
| 分支与远端 | 本地 HEAD 和远端 `codex/remote-main-20260908` 均为 `69401c097572799234e6b97478a4a1ddfe06c810`；远端 main 仍为 `32ec61a4f5321e571d499be6430a09918d65242e`。 |
| 快进条件 | `git merge-base --is-ancestor 32ec61a4… 69401c09…` exit 0。当前可以不切工作分支，使用普通非强推快进 main；执行前仍须重读远端，不能据本快照覆盖之后的新工作。 |
| 当前 CI | Product `39246751994`、Context `39246759692` 均为 completed / success，head 精确为 `69401c09…`，事件为当前分支 `workflow_dispatch`。这两次没有部署。 |
| main / 环境访问 | 当前授权 `gh` 会话有该仓库 push / maintain / admin 能力；main protection API 明确返回 Branch not protected。staging 的自定义 deployment branch policy 只有 `main`，保护规则未出现 required-reviewer 项。没有发现当前等待人类批准的环境门。 |
| CD 选择 | 仓库级 `STARWARD_STAGING_CD_ENABLED` 实际为 `true`；staging 的 `STARWARD_STAGING_LANE` 为 `operator-preview`，没有环境级同名 CD 开关。 |
| 凭据能力 | 既有连接镜像、SSH 私钥、SSH known-hosts、registry password 四项 secret 名均存在；现有七项连接变量及三项 registry 变量均非空。只输出存在性，未获取 secret 明文，也未输出任何连接/仓库值。存在性不证明远端登录、配置或服务当前可用。 |
| 新部署状态 | 最近六条 Backend staging release 均为 workflow_run / skipped；最近一条 `39248293516` 创建于 `2026-10-19T11:56:37Z`。没有新的发布或健康证据。 |
| identity 代码 | 固定 identity 诊断已由 `944a1d6c` 提交并包含在 69401；远端 main 尚无此入口。main 与 69401 的 staging workflow 唯一 diff 是 LFS cache key 纳入运行数据 lock，既有触发与部署语义未变。 |

本次只读快照形成时，[CURRENT-DELIVERY](CURRENT-DELIVERY-VERIFICATION.md)与HANDOFF中的HEAD/CI描述尚落后；root已随后对齐至69401及双CI success。本文只保形成时的操作依据，实时状态由HANDOFF拥有。

## main 同步会发生的实际效果

依现有 [pipeline owner](../../../project_context/deployment/pipeline-and-host.md)、[IP preview owner](../../../project_context/deployment/operator-preview.md)、[运行入口](../../../infrastructure/deployment/README.md)和 [staging workflow](../../../.github/workflows/backend-staging.yml)：

1. 普通 main push 会产生该精确 head 的 Product CI / Context 检查。本次 main→69401 的差异含真实应用、服务和发布实现，走完整 product 分支；任务文档的轻量成功不能触发发布资格。
2. 成功的 trusted-main push Product CI 必须实际完成 `Construct production OCI image`，staging 才准入。当前分支的手动 CI 不能转作这条发布资格。
3. CD 开关保持当前值时，staging 会重新构建该精确 revision 的发布镜像、推到既有唯一 registry、解析 immutable digest，使用 staging 凭据预检主机，再传送 hash 绑定的控制包并执行现有 promotion owner。
4. operator-preview deploy 会校验配置/现有数据服务、拉取并核对镜像来源；若配置静态出口则先准备对应成品。其后短暂停止 Caddy / API / worker，生成加密数据库备份并做隔离恢复检查，执行有锁的顺序迁移，再启动 API / worker / edge、检查私有端口、公开可信 IP TLS、精确 release identity 及受限真实供应 smoke。它保留现有 PostgreSQL / Redis 卷，不是空环境初始化。
5. 该 smoke 可产生正常的供应请求、缓存和用量记录；worker 启动会按服务器原有配置处理工作，本文没有取得其当前提醒配置，不能宣称 worker 被禁用。不会借用本机 8791 或恢复的 r6 数据来完成服务器检查。
6. 失败只保其失败阶段、receipt 和停写事实；在已经 stop writers 后失败时 owner 会继续保持这些 writer 停止。没有自动选旧镜像或恢复旧数据库。修复实际故障后，对同一候选重发是原 owner 的前向恢复路径。

R1 已明确要求推当前分支再推 main，且当前长期 owner 已采用 main→本人 IP 内测自动链路；root 应在该既有授权范围内继续，并保留上述副作用事实。本文不把 main 同步包装成只读动作，也不建议临时关闭 CD、换 lane、绕环境限制或用部署代替身份诊断。它仍不是正式 staging 资格、production、微信上传/审核/公开发布。

## 最小可执行顺序

以下动作由 root 串行执行；本文没有执行它们。无需等待所有 H1–H8 的人类依赖才交付一个已经相称检查/独审的完整源码批次；也不能用这次交付关闭其余未验结果。

1. 选定要交付的精确 revision。69401 的生产修复已提交、push、双 CI success；正在变化的 r10 task builder / 证据按各自 owner 完成后单独交付。保留所有无关 dirty，不把 ignored tmp、私人输入、原始 profile/媒体或整个外部归档 force-add。沿旧审阅分组核对实际新增内容，不重跑旧全矩阵。
2. 对这次最终交付文本做相称的 staged 路径、结构和隐私核对，并把当前 HEAD/CI/候选状态写回原事实 owner。若只是保存 task 证据/方法文字，不为历史实现重开 profiler 或全量本地检查。
3. 在 main 同步前运行既有 `node tools/deployment/sync-diagnostic-connection.mjs`，从既有 staging 变量在内存刷新受保护连接镜像；这会更新一个既有 Secret，按 release owner 执行，绝不下载/导出私钥。其成功仅代表镜像更新，失败只保固定 code，不打印原 gh 输出。
4. 再读远端 main / 当前分支精确 SHA，确认 main 仍是所选 revision 祖先；将所选完整 revision 推当前分支，再用普通 `git push origin <完整revision>:refs/heads/main` 快进 main。无需 checkout、reset、clean 或新 worktree；不强推。不再是祖先时先检查新远端差异，保留他人工作，不能套用本文旧 SHA。
5. 读回 main 精确 SHA，并跟踪该次 main push 的 Product CI、Context 和真正的 staging job / step。分别保留 success / failed / skipped；不能把 workflow 外层 success、skipped 发布或旧 branch CI 当成新服务生效。若现有受审 owner 失败，定位第一个实际失败边界并修复，不盲重发。
6. 在该次发布/诊断现场稳定后，运行一次 `gh workflow run backend-diagnostics.yml --repo Seven128/Starward --ref main -f mode=identity`。保存这次 run identity 与严格白名单 JSON；连接已经变更/恢复才重新观察，不能沿用旧失败反复调度。若希望在自动部署之前观察原歧义，必须确知未与发布变更重叠；不得把竞态读数当成稳定身份。

## H4 按第一条实际结果分支

| 观察 | 下一步 |
| --- | --- |
| identity 为唯一 state=running、running=true、node 用户匹配 | 记录合法 revision / image digest 与这次实际发布摘要的关系；再跑既有 `runtime` 一次，取得 staging 环境、readiness、配置枚举/QWeather 配置齐备布尔值和只读 DB 聚合。身份成功本身不证明这些。 |
| matching=0、running=0，或只有 created/exited/dead | 保留实际集合/状态；不能再称旧 ambiguous 不知是零还是多个，也不能说 SSH 或 QWeather 密钥坏了。沿已有 operator / cloud 管理访问核对现有 preview receipt 和停止原因；不 fresh-init、不创建替代卷，不为检查通过直接 deploy。 |
| running 多个、paused/restarting、用户或其他身份不符 | 保留该次 identity 报告，停止后续 runtime/provider。使用归属明确的现有 operator 恢复路径处理这一个边界，不任取容器、不弱化 guard。 |
| 传输/运行身份仍失败 | 保留首个固定 failure code 与未知范围。先恢复该次实际边界；不转 `host`、providers 或 deployment 取得一个无关绿灯。 |
| runtime 健康、配置与只读 DB ready | 使用现有真实 Map / cloud 入口；合格正式人口为空时，既有 `providers` 仅可作一次获准隔离服务检验，产生正常供应用量，仍标 ISOLATED_TEST_SIMULATION。它不能替代 Map 或手机。 |

最终 H4 必须把真实 v1 来源、UTC 源小时、取得时间/源年龄、实际查询单元/足迹、所选小时和值、缺测/零值、有效旧格保留及切换小时后的实际画面对齐。复用 `cloudSnapshot` / `requestBudget` 与已修的整段小时缓存/receipt-clock，不重做 v1 迁移、不借 SAMPLE_DATA 关账。phone 若仍接 8799 fixture，H4 就保持未验。

本机两份既有 runtime 配置无 QWeather 键、进程无这些键、SSH config 未提供具名入口，均复用 H4 readiness 的原存在性核对，本次没有再扫描。服务器侧凭据历史上只准入 staging IP 和既有 API families；不能拷到本机绕来源限制，也不授权套餐/充值。GitHub Secrets 仅能由已定义 Actions owner 使用，不是本机可下载的 operator 私钥。若身份或 receipt 恢复确需直接操作服务器，再使用既有获权云控制台/明确 operator 入口；当前还没有证据要求用户补 secret 或立刻操作手机。

## 其余交付继续与真正外部缺口

- 可自行继续：当前 r10 / 跨日修复 / Sky A、普通预览 B、地形同次阶段事实、H3 已归档实物交付，以及同类 native / 文件流程的独立准备；root 继续独占运行现场。任务归档不恢复旧试验、不输入旧 session、不重发 gen26 UNKNOWN。
- 仓库交付：旧 REMAINING-DELIVERY 的 160 文件分组和 hash 是历史快照，不能直接当当前 stage 清单。已有设备工具、方法/Context、task owner 审查复用各自范围；当前新 builder、observer 和新报告以其本次独审/实际字节为准。当前 reference 已 tracked 的事实也不能被旧文档的 untracked 描述覆盖。
- 数据交付：复用 EOG exact bytes、Drive readback/fresh receiver、r6 数据和 937 LFS 对象；不重哈希 17GB、不重恢复 DB。H3 ignored tmp / 原片在任何清理前保留到已有外部私有归档；不把 Markdown 描述当作可恢复源本身。
- 真正需要后置人类条件的已知项目：未知的自然微信真实接收身份、必要 iOS / 其他未有设备条件、平台文件接收与打开/保存动作，以及只有在实际诊断证明不可用之后才需要的外部 operator/MFA。先准备具体对象和剩余最小动作，再合并询问，不能擅选联系人或因“缺 automation”提前判人类阻塞。
- 未获本 Goal 自动扩大授权的边界：付费服务/采购、OSS 新目标/远端写入、正式 domain/public staging 资格、production、微信上传/审核/公开发布。保留其各自 owner 条件，不拿本人 IP 内测或 Git main 当替代。
- 最终清理仍由原 owner 精确执行：先保全所需证据，再退役任务候选/窗口/feedback、LAN 桥和精确防火墙等；保留当前有效源码入口、8787/必要 watch、原账号/草稿/历史、R6 已送达事实、配对与 VPN。本文不授予路径级删除权限。

main 同步和 H4 的第一条运行身份结果都仍未执行；本文及两个成功 branch CI 不关闭完整 Goal。
