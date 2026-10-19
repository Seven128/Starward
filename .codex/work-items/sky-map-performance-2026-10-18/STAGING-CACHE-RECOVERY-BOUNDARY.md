# H4：主机 BuildKit 缓存与下一清理责任

2026-10-20，只读研究。依据[真实聚合](HOST-STORAGE-REMOTE-20261020.json)、[观察 owner](HOST-STORAGE-OBSERVATION.md)及[原边界](HOST-STORAGE-OBSERVATION-BOUNDARY.md)。本文件不新增实施框架，不建立缓存归属、可删集合或清理授权；没有执行 SSH、Docker、CI、服务、IDE、手机或浏览器操作。

实测 release 文件系统 available 为 10,417,971,200 B；距离旧 10 GiB guard 的当次差额为 319,447,040 B。这不是后续 pull/迁移/备份所需的全部重叠空间。Docker daemon 报 BuildCache 123 项、active 6、7.51 GB、rounded reclaimable 7.173 GB；四个 volume 均 active。不能由此认定缓存位于 release 文件系统、归本项目或可删，也不把 rounded 数量反算为精确回收量。INBOX、RELEASE、CANDIDATE 分别为 265,871,360 / 294,477,824 / 1,216,512 分配字节，均与 release 同设备；三根可能重叠，不加总为唯一占用。

## 现有 owner 与判断

仓库 `backend-staging.yml` 在 GitHub runner 执行 `docker build` / push，主机 `run-remote-promotion.sh` 安装已校验的 control，再交给原 promotion/Compose owner 拉取固定 digest；没有主机构建步骤。未找到项目专属的 host BuildKit builder、缓存 ID 清单、项目标签、构建回执到 cache record 的映射，或现成的 BuildKit 缓存退休入口。已存在的 backup maintenance / Sky static retention 具有不同对象与保留语义，不能代为 prune Docker cache。GitHub runner 构建缓存也不能解释成主机 daemon 的缓存。

因此现在**不能精确退休“本任务 unused BuildKit cache”**。这首先缺正向归属证据，不是缺全镜像 OCI 导出。若以后已有证据确认一组可退休缓存，清理该组缓存与保全所有 image/container/volume/current/stopped/rollback/backup 是不同责任，不应把“先导出全部 OCI”强加为缓存退休前置。TCR tag 配额与此仍分开。

两类缓存亦须区分：普通构建结果/源码缓存，与 Dockerfile `RUN --mount=type=cache` 的可变 cache mount。当前 `miniapp-api.Dockerfile` 两次使用 `/root/.npm`，未声明专属 `id` 或 `sharing`；官方默认 ID 取 target、sharing 为 shared，不能凭 npm 路径、相似 RUN 文本或时间接近就判本项目独占。这个 sharing 控制并发写者，与 usage 记录的 Shared（通常与镜像共享存储）含义不同；两者也都不是 registry mirror。[Dockerfile cache mount 语义](https://docs.docker.com/reference/dockerfile/#run---mounttypecache)支持此区别。

## 必要的最小信息与实际可用性

| 要回答的边界 | 最小只读信息 | 当前能建立什么 |
| --- | --- | --- |
| 是不是同一 daemon 的缓存 | 原 Docker CLI 选择下的 server version / API version、daemon identity 仅作内存内相等检查；后续命令保持同一环境/endpoint | 原聚合来自该 CLI。Buildx 当前选中实例可能指另一个 endpoint，不能默认与之相同。Buildx version、driver、node endpoint 当前未知。 |
| 缓存是否物理影响 release 文件系统 | 实际 backend/driver、实际 cache metadata 与 snapshot/content backing root 所在设备，与已持有 release 根比较 | Engine info 可报告 DockerRootDir、driver 等元数据，但不报告所有 backing device。只 stat DockerRootDir 不充分；29.x fresh install 的 containerd store 可另在 containerd root，data-root 也不迁移它。实际 root 确认后只做目录元数据/设备比较，不 du 或遍历 OCI/volume。路径/权限不明即 unknown。 |
| 此刻共享/在用情况 | 完整 cache ID、Type、InUse、Shared、Size、CreatedAt、LastUsedAt、UsageCount；Buildx 才额外提供 Mutable | 这些是 daemon/builder 元数据，NON_ATOMIC。InUse=false / Reclaimable=true 是当前使用状态，Shared=false 不是项目归属，也不能证明将来没有构建消费者。Shared=true 的记录可能只可回收 metadata，不代表相应 layer 可释放。 |
| 是否归本项目、可退休 | 一个已知的专属 builder/独占 cache namespace，或真实构建回执对完整 cache ID 的正向绑定，以及相关消费者/保留义务 | 官方 CacheRecord 没有 Compose project、Git repository、revision owner 字段。通用 Description、parents 图、usage count 和最后使用时间不能补出这条证明。当前没有这样的项目证据。 |
| 能否按精确 ID 选择 | 已安装客户端/BuildKit 的实际版本与 driver，完整 ID 的同一只读过滤结果、无其它匹配 | 官方 Buildx 提供 id/private/inuse/type 等过滤，但实际主机版本资格未验；普通 id 值在已核源码中转成 regex，不能用 prefix 当精确 ID。 |

[Docker daemon data directory](https://docs.docker.com/engine/daemon/#daemon-data-directory)说明 Docker/containerd root 的区别；[官方 cache record 类型](https://github.com/moby/moby/blob/47fe719b335e29a338083216ce9cc15716830442/api/types/build/cache.go)列出元数据而没有项目归属；[Buildx du](https://docs.docker.com/reference/cli/docker/buildx/du/)解释共享、可变及使用中记录。这里不把上游最新源码当已安装运行证据。

## 一条可复用的窄读取形状

如 root 判断需要看实际 cache 分类，优先仍走既有 Docker CLI，不默认运行 `buildx du`，更不 create/use/boot 一个 builder。`docker system df --verbose --format` 的自定义顶层模板可只遍历 `.BuildCache`，显式输出下列字段：

```text
docker system df --verbose --format '{{range .BuildCache}}{"id":{{json .ID}},"type":{{json .CacheType}},"inUse":{{json .InUse}},"shared":{{json .Shared}},"size":{{json .Size}},"createdAt":{{json .CreatedAt}},"lastUsedAt":{{json .LastUsedAt}},"usageCount":{{json .UsageCount}}}{{println}}{{end}}'
```

命令只作为现有执行器内 shell-free、stdout/stderr 被捕获的固定 child 调用；不能原样放 CI shell 让原 ID 外泄。模板必须是仓库固定常量；不要 `json .`，不要 Description、image/container/volume 行、原 stderr 或路径。InUse/Shared/UsageCount 是 CLI 字符串，须按严格语法再转类型。CLI 内部仍请求完整 verbose disk usage，不能声称 daemon 只计算 cache。与引入新的 API transport 相比，该固定 CLI 形状复用当前执行器、endpoint 和认证边界；不接触配置/DB/文件载荷，也不创建 builder。v29.5.3 的官方 [disk usage formatter](https://github.com/docker/cli/blob/v29.5.3/cli/command/formatter/disk_usage.go)及 [cache formatter](https://github.com/docker/cli/blob/v29.5.3/cli/command/formatter/buildcache.go)支持这个投影；ID 对 InUse 记录可能带 `*`，解析须按 InUse 校验后只移除这个显示标记，不能把它送进 selector。

沿原 SSH 60 秒/64 KiB 总界，单 child 15 秒、stdout 64 KiB/stderr 4 KiB、最多 256 条严格记录已足够本轮 123 项；超界/工具或模板不支持保持 unknown，不截断成完整结果、不加大界重试。Size 保留 CLI rounded 语义，未知时间不补 0。最终只输出固定 Type × InUse × Shared 的 count/rounded 值列表和状态；若为以后精确选择保留 ID，原 ID 只在进程内，外出仅哈希及有限匹配状态。禁止把原始 daemon 报告写 CI artifact 或 Context。读取更多同类元数据不会自动解决归属，故不先据此开发清理器。

若已有成熟 Engine API client，可用相同已确认 daemon 的固定 `GET /system/df?type=build-cache&verbose=1`，再投影 `BuildCacheUsage.Items`；官方 [API version history](https://docs.docker.com/reference/api/engine/version-history/)说明 type 过滤及 1.52 新字段/verbose 的兼容变化。不要假定 29.x 仍返回旧 `BuildCache` 数组，也不要为了本次观察另建通用 API/SSH 框架。

Buildx 只在实际版本及现有实例确已绑定这个 daemon 后才考虑：固定实例 `inspect` 不加 `--bootstrap`，且不枚举/联络无关远端 builder；随后同实例 du 用固定字段投影，不 print 完整 JSON。官方 [inspect](https://docs.docker.com/reference/cli/docker/buildx/inspect/)明确 `--bootstrap` 对 docker-container 会启动容器。其 du 的 timeout 只是加载 builder status 界，外部整体 child timeout 仍必要。旧版本不支持固定字段即 unknown，不升级/安装/重启来凑结果。

## 精确过滤与停止条件

官方 [prune selectors](https://docs.docker.com/reference/cli/docker/buildx/prune/#provide-filter-values---filter)提供 id、private、inuse、type 等维度。已核 [Buildx 转换源码](https://github.com/docker/buildx/blob/f4cc8638c0d09a2b856cb6eecdb2b12da2cae780/commands/prune.go)和 [Moby 转换源码](https://github.com/moby/moby/blob/3b858893a7b94d5a55d20b9d36b239f50dab17db/daemon/internal/builder-next/builder.go)把普通 id 值转换为 `id~=`；若以后获准执行，必须校验完整 ID、对字面值转义并加 `^…$`，同一 builder 的只读 du 先证明只命中预期集合。多个普通 id filter 不保证 OR，不能凭数量拼接。普通 Engine builder API 对 mutable/immutable 的支持也不能从 Buildx 文档照搬。这里没有给出 prune 命令或执行权限。

本轮指定以 Engine 29.5.3 核官方能力；其[官方版本条目](https://docs.docker.com/engine/release-notes/29/#2953)可查，但 Moby 精确 v29.5.3 tag/API 源本次未取得，因此上述 master-derived 精确过滤机制只是需防范的已核机制，不能冒充主机该二进制的行为测试；Buildx version/driver 继续未知。聚合 JSON 本身也未输出 server version。

缓存路径剩余的一个最小实际问题是：**是否存在一条已有构建证据能正向绑定到本项目的 host cache record / 专属 builder？** 当前仓库 owner 没有；相似 description 或单应用栈不能替代。若找不到现成正向绑定，则保留 cache 不动，不建立全局无引用证明、不重扫 32 次发布，也不提高 receipt 预算。

另一个可重开责任是现有 transfer/control owner 的 INBOX 传输副本：workflow 规定 `staging-<revision>.control.tar.gz` 及 `staging-<revision>-<run>-<attempt>.request.json`，非任意文件。下一步可先对**一个已有准确 revision/run 的完成传输**核普通文件身份、分配量、control 安装 marker 与同 SHA 的已保全归档，确认没有在途消费者；只保留命名不匹配项为 unknown。原 request 可能带私有运营元数据，不原样入 Git。归档远端字节与相应 hash 的私有读回/恢复成立后，才能走精确、可恢复、已授权的退休；current/cron 使用的 control、candidate、receipts、停止镜像和 backups 不在这个退休对象内。INBOX 整根的分配量都小于当次 guard 差额，所以一份 archive 退休不可能独自完成主机容量准备，不能承诺解决；结果只决定下一条同 owner 的必要对象，不扩大为全盘清理。RELEASE/control 若随后确需处理，先核真实 current/cron/回滚消费者，不能按 revision 新旧删除。

本次仅新增本任务记录，未改产品/部署源码、计划或持久 Context，未执行 Git 写操作；没有外部 mutation，没有清理完成或服务恢复结论。

## Root 收口：构建历史与当前选择

另一次独立只读核对进一步检查了成熟 build history 能力。固定 [BuildKit v0.34.0 API](https://github.com/moby/buildkit/blob/v0.34.0/api/services/control/control.proto) 的 history record 没有本地 cache ID 集合，结果字段是 OCI descriptor；产物或 revision 身份不能补出同 worker 的 build Ref → 完整 UsageRecord.ID 映射。固定 [Buildx v0.38.0 history 节点加载](https://github.com/docker/buildx/blob/v0.38.0/commands/history/utils.go#L339)还会调用 Boot；不能把 history ls/inspect 当作保证无启动的窄读取。root 已实读这两处官方固定源码；主机 Buildx 版本、driver 和该行为仍未观察，不能用上游版本冒充主机资格。没有调用 history 命令。

因此本轮不新建 cache probe/cleaner、不读取更多不能改变归属判断的同类字段。只有已有专属 namespace/builder 或真实完整映射及消费者保留证据出现，才重开缓存退休责任；reclaimable、description、history 匹配都不能替代。

root 同时核实现有 workflow 的 control tar 使用排序、固定 mtime/owner/group 的非秘密源码打包，remote promotion 在安装后保留 archive marker；但这些代码事实不等于某个现存 tar 已有同字节保全或恢复读回。INBOX 全根占用小于本次容量差额，且本轮没有已获资格的具体历史传输对象，因此不将其当成可立即完成容量修复的路径，不创建逐文件清理循环。未来重开沿同一 transfer/control 责任批量准入与例外处理，不删 request/current/cron/control/receipt/candidate 或任何 image/volume。

当前两条恢复缺口继续分别保留：主机原容量 guard 未通过；TCR100标签与精确OCI私有传输/恢复未完成。没有新主机观察、删除、CI dispatch、部署或手机动作。
