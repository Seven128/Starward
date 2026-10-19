# H4：主机空间的下一条最小观察边界

2026-10-19。独立只读核对后的建议，尚未实现或在主机执行。本文件只拥有这次边界建议；不提供清理、部署、镜像删除或主机容量验收结果，不另立计划。

本次 [host preflight](CURRENT-HOST-PREFLIGHT-20261019.json) 已实际失败于 `host_preflight_disk_below_10_gib`。现有脚本先取得 release 根所在文件系统的可用 KiB，再与 10,485,760 KiB 比较；失败即退出，因此没有实际可用量、缺口量或占用归属。当前首先成立的责任是部署主机的空间准备与保留资源管理；尚不能归因为某个产品模块、Docker 镜像、备份或旧 control 目录。主机空间不足与 TCR tag 配额是两个独立缺口。

已确认的 current 262d/824b、停止 API 1ccd/de4b 直接复用 [固定引用实读](RELEASE-REFERENCE-PARTIAL-REMOTE-20261019.json)。成功 current 是历史发布文件链，停止对象也是恢复证据，二者都保留；历史 receipt batch 仍超预算未知，不提高界或重扫历史以给本观察凑齐字段。Context 当前选择一套 staging 应用栈，实际 40-GB staging 与预期 180-GB production 分开；单应用选择不能证明 Docker 中所有对象都归本项目、无引用或可删除。

现有入口的适用边界如下。

| 入口 | 可复用部分 | 为什么不能直接完成本问题 |
| --- | --- | --- |
| `infrastructure/deployment/host-preflight.sh` | 原 release 文件系统位置和 10 GiB guard | 低于界时没有数字；没有目录或 OCI 归属。不得改成低界通过。 |
| `tools/deployment/run-host-diagnostics.mjs` / `backend-diagnostics.yml` | main-only staging、固定 mode、四条受保护路径、原 SSH/known-hosts/临时凭据清理与输出界 | 当前没有 storage mode；不能把任意远程命令塞入旧 mode。 |
| `release-reference-diagnostics.mjs` | 已有 Linux 路径/普通文件/目录归属与无链接边界，固定输出投影的做法 | 它解决文件身份链，不统计空间。不要再次运行其历史 batch 或把 receipt 内容读回当空间分析。若实现抽共用边界，应仅按真正共同语义小范围复用，不能复制第二套 SSH/secret 系统。 |
| `operator-preview --operation inspect-backups` | 备份责任内的后续策略核对 | 仍创建操作 lock/receipt、验证 Compose，并读取 PostgreSQL lane、清单及加密备份字节；不是本次最小无写聚合。`backup-maintenance-cli.mjs` 实际调 `maintain-backups`，会维护，不能冒充 inspection。 |
| `sky-static-retention.mjs` / `inspectSkyStaticRetention` | Sky 已选 store 的后续保留引用与兼容性责任 | 获取 lease、遍历并验证内容/来源/收据/备份；报告明确 `physicalAllocatedBytes=null`、`deletableBytes=null`。范围大于本问题，也不统计全主机。 |

建议在原 diagnostic owner 增加固定 `host-storage` mode，先做一次足以决定责任方向的聚合。只补 df 比本建议更小，但只回答缺多少，仍不能选择责任；只看三根漏掉 OCI，只看 Docker 则漏掉部署传输/control/candidate。这三组是本轮足够的分类，不扩展为全机盘点。仍只接受现有四条连接路径；不增加 selector、shell 片段、目录、镜像或项目输入。前三条用于 inbox/release/candidate 根；第四条保留原调用形状，本观察不需要读取 base 文件内容，也不追读 lane、receipt、manifest、DB 或应用日志。不要因 `<10 GiB` 先调用整套 preflight 而拦掉自己的空间结果；必要路径/权限与工具前置检查独立保持，最终发布仍必须重新通过完整原 preflight。

| 固定观察 | 成熟工具与最小输出 | 能解决的问题及限制 |
| --- | --- | --- |
| release 根所在文件系统 | `LC_ALL=C df -B1 --output=size,used,avail -- <validated-release-root>`，只投影三列非负安全整数；原根 inode/设备关联只在进程内处理 | 给出总量、已用、普通部署用户可用字节，以及 `shortfallToMinimumBytes=max(0,10737418240-availableBytes)`。这是当次 guard 缺口，不是下次 pull/备份/迁移全部临时重叠空间的预算。无 source、target 或设备名输出。 |
| 三个受保护根 | 每根一次固定 `du -P -x -B1 -s -- <held-directory>`；最终只输出 `INBOX` / `RELEASE` / `CANDIDATE` 的 allocated 字节和 `sameFilesystemAsRelease` 布尔/未知 | 用分配空间估计定位部署传输/control/candidate 是否值得深入；不读取文件内容，不显示子文件名。`-B1` 不能换成 `-b`，后者是 apparent size。每根独立观察，不把三数相加当唯一物理占用；根重叠、跨根硬链接或底层共享块仍可能重计。`-x` 有意不追入另一文件系统，不是全根内容总量。 |
| Docker daemon 分类 | 一次 `docker system df --format '{{json .}}'`，不用 `-v`；只接受 `Images`、`Containers`、`Local Volumes`、`Build Cache` 的固定类型与 total/active/size/reclaimable 字段，最终枚举化 | 区分 OCI/cache 与部署目录的量级。保留经严格语法验证的原生单位值及其“Docker reported/rounded”含义；不要把四舍五入字符串反算为精确可删字节，也不要把 active=0 或 reclaimable 当项目引用、恢复或删除证明。没有某一类结果时为未知，不能补 0。 |

上表是命令形状，路径实际来自受保护连接、内部已验证的目录句柄，不能当作可拼接执行的用户命令。使用 shell-free 子调用与固定参数、固定 `LC_ALL=C`；保持当前 60 秒 SSH/64 KiB 最终输出上限。可用每个 `df` 3 秒、每根 `du` 8 秒、Docker 聚合 15 秒和 50 秒远端总 deadline，且逐项受剩余时间约束；这是本次诊断资源界，不是产品容量标准。`du -s` 只缩小输出而仍会遍历元数据，故必须有实际子进程 timeout；不另造全盘 walker、hash 或把超时当空目录。子调用 stdout/stderr 各自有小的硬界，例如 df/du 4 KiB、Docker 16 KiB；只在内存解析原结果，绝不回显原 stderr、命令、私有路径、IDs、镜像仓库/名称或环境配置。精确预算可在实现前依现有执行器收敛，但不能为一次失败无界重试。

路径检查须防止根被换成符号链接及父级穿越，复用已有 ownership/mode/held-directory 思路。以已打开的目录为命令锚点；若经 `/proc/self/fd/N/.` 给子进程，须显式传递那个目录 fd 并测试真实发出的子进程形状，不能假设 Node 的 fd 自动继承。`du -P` 不跟随后代链接，`-x` 不跨设备；根位置、设备/inode/归属/模式在前后核对，检测到不一致则该根未知。稳定的根也不能证明全部后代没有并发修改，所有结果始终 `NON_ATOMIC`。不要为了聚合创建远端 lock、临时文件、lease 或读取任何私有载荷。

固定输出建议只有 `evidenceScope=HOST_STORAGE_AGGREGATES_ONLY`、`snapshot=NON_ATOMIC`、`referenceCompleteness=UNVERIFIED`、各组状态/固定错误码及上述数字。路径不安全、无权限、工具不可用、不支持格式、超时、超输出界、非法数字或变化分别归为有限码；未观测数值保持 `null`。df 成功不依赖目录/Docker 成功，任何组失败都保留其他独立合法组；最终失败不能被误写成无资源。观察成功也只是聚合读取成功，不能沿用 `host ready`、服务健康或清理成功语义。实现应独立严格投影，不接受远端任意键/错误文本。

Docker 聚合属于 daemon 范围，不是 Compose project 范围。官方说明 Engine 29 的新安装可能使用 containerd image store；其目录可与 Docker data directory 分开，并可能同时保存压缩和展开层。已知版本或单个 `DockerRootDir` 不足以证明真实存储后端/文件系统，也不能把 Docker 分类和、三个 du 数和、df used 的差额命名成“其它应用”或可回收量。本轮不增加任意 DockerRootDir 路径读或直接遍历 `/var/lib/docker`、containerd、volume、数据库和宿主日志；需要时将差额保留未知，由下一条具体责任观察处理。[Docker 聚合](https://docs.docker.com/reference/cli/docker/system/df/)及[containerd 存储说明](https://docs.docker.com/engine/storage/containerd/)支持这条工具选择与限制。

第一次结果只选择一个下一责任：若三根显著占用，沿原 transfer/control/candidate owner 做固定命名类别核对与精确保全；若 Docker image/cache 显著，沿 OCI 原始 digest、所有已知当前/停止/回滚引用与原样恢复能力做小范围核对；若 volume 较大，交回 DB/Redis/Caddy 的原生命周期/备份 owner，绝不按 unused 标记删除；若这些不足以解释文件系统已用，则保留宿主其它范围未知，另选必要的最小主机观察，不扩大为全盘扫描。不能先假定哪个占主导，也不能把聚合当作全引用证明。

具体退休仍须完成本对象归属、实际消费者/恢复义务、原字节或原 OCI 身份的私有保全和可用恢复路径，再走精确、可恢复、已授权的清理 owner。`df` 与目录累计本来不提供同一信息，已删除但仍打开的文件或文件系统保留空间等也可能造成差异；不要凑总数或调低 guard。[GNU df](https://www.gnu.org/software/coreutils/manual/html_node/df-invocation.html)、[GNU du](https://www.gnu.org/s/coreutils/manual/html_node/du-invocation.html)及[GNU 差异说明](https://www.gnu.org/software/coreutils/faq/coreutils-faq.html)提供对应语义。无论数字如何，本观察均不授权 prune、删 volume/backup、删除 current/停止镜像、切换存储后端、部署、复制 OCI 到低空间主机或购买。

本次只读取本地 Context、现有 owner 和本轮证据，并核对上述官方工具说明；没有 Git 写、SSH、实际 Docker/服务/IDE/手机/浏览器操作或远端 mutation。下一步实现、独立审查、实际观察及之后的清理判断仍分别未验。
