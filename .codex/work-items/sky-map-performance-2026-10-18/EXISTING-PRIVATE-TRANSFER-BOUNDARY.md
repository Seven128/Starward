# 现有本机私有传输入口的有界核对

2026-10-19；只读补核 [OCI 路线审查](OCI-RECOVERY-PATH-REVIEW.md) 中一个可能改变传输路线的缺口。未建立连接、安装工具或创建传输桥。

结论：**在此次限定的既有 owner 和明确消费入口内，尚未找到可直接复用的本机固定 SSH 身份、私钥文件引用或可归属的 agent 绑定。** 因此不能把“已有 Actions SSH 诊断可用”变成本机可下载 OCI 的能力；也不能由此次未找到推断本机或所有既有 operator 路径均不存在。该分支保持 `UNKNOWN / NOT_READY_FOR_LOCAL_READBACK`，不要求用户立即补 key、登录或操作手机。

## 实际核过的材料

- 完整读取当前 [部署根 owner](../../../project_context/deployment.md)、[pipeline/host owner](../../../project_context/deployment/pipeline-and-host.md)、[operator-preview owner](../../../project_context/deployment/operator-preview.md)、[连接 parser](../../../tools/deployment/deployment-connection.mjs)、[连接镜像同步器](../../../tools/deployment/sync-diagnostic-connection.mjs) 及前述 OCI 路线审查。
- 对 [current state](../../../project_context/deployment/current-state.md)、[secret/recovery owner](../../../project_context/deployment/data-and-operations.md)、[部署 README](../../../infrastructure/deployment/README.md)、[固定诊断 runner](../../../tools/deployment/run-host-diagnostics.mjs)、[diagnostic workflow](../../../.github/workflows/backend-diagnostics.yml)、[staging workflow](../../../.github/workflows/backend-staging.yml) 读取 SSH、enrolment、key/agent、本机及恢复相关段落和直接上下文；对当前任务既有 [H4 readiness](H4-REAL-WEATHER-READINESS.md)、[交付动作核对](DELIVERY-NEXT-ACTIONS-20261019.md) 与 [identity 实现说明](RUNTIME-IDENTITY-DIAGNOSTIC.md) 复核相关引用。
- 这些是实际读取的仓库文件内容；未读取 SSH 私钥、known-hosts 内容、旧已输出的交接 key、Docker credential/config/helper 内容、账户 credential 或 provider/DB/lane 配置。没有为本次核对扩展到历史任务或用户文件搜索。

## 已建立的窄事实

1. current-state 记录专用部署 key 曾 enrol，并曾完成 key-based SSH；它同时明确 key、host key、endpoint 等属于外部 operational data，没有提供可直接读取的本机文件/agent 引用。历史 enrolment 不能证明当前本机仍持有或能使用该身份。
2. 目前可复用的生产消费边界仍是 GitHub staging Environment。workflow 在 runner 内消费 `STARWARD_SSH_PRIVATE_KEY`、`STARWARD_SSH_KNOWN_HOSTS` 和受保护连接 packet；诊断 runner 以它们生成本次临时文件，使用固定 identity 与 pinned trust 后清理。临时文件名是执行时产物，不是本机原身份位置。GitHub secret 名称、有效 gh 会话和现有同步器均不能读回该私钥；本次没有调用 secret 导出或变通传输。
3. H4 已有的用户 SSH config 不存在结果继续复用，未重新遍历 `.ssh`。现有文档中的 workstation tunnel 命令使用占位 target，未声明本机具名连接或对应 identity。未把默认 SSH 自动尝试、全部 agent key 或任意本地凭据当作授权绑定。
4. 本次仅查当前进程七个已知变量名称的存在性：`SSH_CONNECTION`、`SSH_PRIVATE_KEY`、`SSH_KNOWN_HOSTS`、`STARWARD_SSH_PRIVATE_KEY`、`STARWARD_SSH_KNOWN_HOSTS`、`SSH_AUTH_SOCK`、`SSH_AGENT_PID` 均不存在；没有读取或输出值。单独查询 Windows OpenSSH `ssh-agent` 服务得到 `Stopped`。这只描述此次进程和该服务，既不是全部 agent/credential inventory，也不能证明其他受授权 route 不存在。没有运行 `ssh-add` 或列举 agent identities。
5. 未获得具体本机 key 路径，故没有检查任何猜测 key 文件，也没有读取 key contents。即使后续只证实一个 key 文件存在，仍须由既有 owner 证明该文件与批准 target、identity、pinned host trust 的绑定，并由实际有界连接结果证明可用；存在性本身不等于授权或连接成功。

## 对下一动作的影响

- 当前没有足够证据给 root 一个可直接执行的本机 private readback 入口，不能据此省略已知 Actions→原私有接收方的接口缺口。也不能把接口缺口写成所有私有传输路线均已穷尽。
- 若后续现有 owner 明确给出批准本机入口或具体文件/agent 绑定，root 可沿同一既有授权在本机直接消费，不必先新增 OAuth/interface；敏感 identity/target/path 留在原私有 owner，不抄入任务文档或日志。本次不要求创建新凭据或迁移 secret。
- [实际 host preflight](CURRENT-HOST-PREFLIGHT-20261019.json) 已失败于空间 guard，但具体 available bytes 尚未建立。无论本机 SSH 是否可用，都不能默认 host 可作为 OCI 中转。只有实际空间和该精确对象的传输/归档峰值适用时，才可评估该路径；不绕 guard、不 prune、不触发部署。
- OCI 独立导出/图校验及 fresh 恢复准备可以继续；本次没有下载、上传、SSH、Docker、service、browser、IDE、手机/ADB、Git/CI mutation，也未改变 gen26、8791/N05、R6、原配对、VPN 或账号。

本文件是任务级调查边界，不是 durable Context 决策、连接成功、OCI 保全/恢复证明或删 tag 授权。
