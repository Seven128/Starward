# R20 staging 缓存恢复只读准备（2026-10-25）

结论：**仓库目前没有可直接执行的 Docker 缓存精确退休入口，也没有已资格化的有限可删除集合。下一次有意义的工作是补记录级只读归属／使用状态，而不是重跑容量汇总或部署。** 现有 SSH／固定诊断 owner 可复用；不需要另建运维平台，也不能把它改成任意远端命令入口。

本次为 Root 委托的 staging 静态准备，使用现行 `starward-miniapp-release` 的 staging 检查分支和 deployment Context／runbook；未做候选／外部操作，按委托未调用 Git。已核当前 PLAN 的依赖／交付边界、最新 HANDOFF、继承 H7/H8。用户后置层叠／Sky Play 性能继续有效，本报告不改变唯一下一步或其他未完成义务。

## 已有事实与范围

- 最新 HANDOFF 记录交付 `b4d2654540e203ffa247e31b1cc21db70aeab4e9`，Product `40124369639`、Context `40124369682` 成功，staging `40125579064` 在发布前以 `host_preflight_disk_below_10_gib` 失败，镜像发布／部署跳过。这里复用 Root 已取回的结果，没有自行查询网络。
- [原容量观察](R20-STAGING-STORAGE-OBSERVATION-20261024.md)的 **9.69 GiB、Images 14.85GB、BuildCache 7.51GB** 属于旧 `61953dd1` 的一次非原子观测；不是当前精确余量。最新失败仅确认本次未过现有门槛，不能把旧分类总量更新为当前库存。
- `infrastructure/deployment/host-preflight.sh:59–63` 固定要求 release filesystem 可用量至少 10 GiB。差额不是下一候选的真实峰值需求；没有依据降低门槛。
- **当前 CI 的 `docker build` 在 GitHub hosted runner 上执行**（`.github/workflows/backend-staging.yml:142–157`）；主机前置检查发生在它之前。不能据此把远端历史 BuildCache 都认作本项目 CI 生成物。该文件没有远端 builder 缓存归属或清理规则。

## 实际现有入口

| 入口 | 能回答的问题 | 保留的限制 |
| --- | --- | --- |
| `backend-diagnostics.yml` → `run-host-diagnostics.mjs` | 复用 staging protected connection、原 SSH key／known-hosts；固定 host／identity／runtime／providers／imagery／release-reference／host-storage 模式 | 不接任意命令、路径或新 mode；本次不刷新连接／Secret，不派发 workflow |
| `host-storage-diagnostics.mjs` | 受保护三目录的 `df`／`du` 和非 verbose `docker system df` 分类 | 无缓存 ID、父／共享关系、项目来源、使用时间或当前构建集合；sanitizer 强制 `HOST_STORAGE_AGGREGATES_ONLY / NON_ATOMIC / UNVERIFIED / cleanupAuthorization=NONE`，成功也不是删除授权 |
| `release-reference-diagnostics.mjs` | 原 base → successful current pointer → receipt → candidate 的 revision／digest／字节绑定；另关联唯一 stopped API 与有限 failed deploy receipts | 不是完整运行／回滚／OCI／cache 库存；预算／缺失／变化保 unknown。只看固定 API 身份不能代表全部 worker／edge／其他容器 |
| `sky-static-retention.mjs` → `inspectSkyStaticRetention` | 已选静态 store 的实际 mount、receipt、backup 和 source／generation 保留关系；复用原 lease 与前后复核 | 只 `DRY_RUN`；无引用仍为 `RETAIN_PENDING_REFERENCE_REVIEW`，`deletableBytes=null`；外部镜像、Docker cache、日志和剩余主机容量不属于它 |
| `deployment:preview --operation inspect-backups / maintain-backups` | 原 personal-trial 策略、同 environment／project／DB、完整 manifest／文件／digest 校验的过期加密 DB 备份 | 不是 cache owner。inspect 不创建／删除备份，但 operation wrapper 仍有 lock／receipt；maintain 可能删除合格过期备份并补新备份。不能把它当本次无远端文件写入的容量探针或任意文件清理器 |

检索 `tools/deployment`、`infrastructure/deployment`、`.github/workflows` 的非测试 `.mjs/.sh/.yml`，没有找到 Docker `prune/rmi`、builder／buildx 精确缓存库存／退休调用。不能据此推断远端不存在人工工具，只能确认本仓库没有相应已资格化 owner。

## 能改变下一动作的最小观察

1. **先补一轮固定、只读、记录级 Docker cache 观察。** 沿现有 protected connection／runner／输出净化边界，确认实际 Docker／builder 驱动与存储 filesystem、当前构建状态，以及有限记录的稳定 ID、类型、in-use／shared、父或共享关系、可得的 byte 数／last-use 和可验证项目来源。主机实际工具版本支持哪些字段／过滤能力仍待观测；没有在本次猜 flag 或执行外部命令。任意 description／路径／labels 不应原样输出，凭据和业务 payload 均无必要。
2. **选择一个可证明的有限集合。** 只把实际来源与可再生成性成立、当前未被构建使用并符合成熟工具回收语义的记录纳入候选；unknown 不能由年龄、旧 release SHA 或 rounded reclaimable 补成可删除。共享层大小不能相加成实际可释放字节。若没有这类记录，直接保留“尚无合格集合”，不改成 daemon-wide prune。
3. **缓存与镜像分别判断。** 独立证明可弃的 build cache 不必先导出全部 OCI，也不必用完整数据库／Sky 备份恢复作为统一门槛；这正是现有 pipeline Context 的区分。若改为删镜像，才需要相应运行／停止容器、当前／回滚／候选／支持版本及恢复引用的独立完整核对，现有 `release-reference` 不能单独供给它。
4. **当前还没有 apply／条件恢复实现。** 后续若具备具体集合，复用原 owner 增加最小受限操作或已授权的可归属 operator 路径；操作前重新核同一 daemon／builder、有限记录身份与使用状态，拒绝变化／未知。必须确认实际成熟工具能按该集合限制效果；不支持时不能换成宽 prune 或手删 Docker 内部目录。保留部分完成／未知回执，通过记录读回和实际 filesystem／原 preflight 核对效果；缓存丢弃后的恢复是受原 source／构建 owner 控制的重建，不是假称能还原删除前字节。

`cleanupAuthorization=NONE` 是原观察和其接口的事实，不是新增一个“每次只读观察均需人类批准”的规则。Root 应沿现有会话授权推进必要准备；只有具体远端 mutation／目标未获授权、或确实需要现有工具无法完成的外部动作时才澄清。当前缺的首要证据是有限集合的实际归属／使用状态和可执行边界，而非用户再泛泛授权一次。本次没有把本机／手机授权外推为远端所有 Docker 数据处置。

## 本次验证与资源

仅当前本地文件／规则／实际调用链静态核对，没有运行测试、网络／SSH／GH／Docker、provider、Git、构建、手机／IDE、服务或防火墙操作；没有读 Secret 值／私钥，没有修改产品／CI／PLAN／HANDOFF／Context。唯一写入为本报告，没有新进程、远端锁、凭据或其他需清理资源。未建立主机健康、缓存可删、容量恢复或 staging 部署通过。
