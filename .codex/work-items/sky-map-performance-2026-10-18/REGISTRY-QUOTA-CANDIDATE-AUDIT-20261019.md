# Registry quota：单个旧 tag 只读核对

2026-10-19，源码基准 `ba4ea423cd7b55bfb184fa57557434d740081711`；本次仅读取 Git / GitHub API / 仓库发布 owner。未删除镜像、运行服务、部署、写 Git、操作浏览器或手机。日志通过 GitHub job-log API 在进程内存读取，仅保留 SHA、状态、时刻及固定失败代码，未保存原日志或连接/账户/仓库凭据。

结论：候选 `f4872ab6a10f7fd509f48e73640650dee69a741c` 的发布 run **推送成功但部署未执行**；这缩小其历史作用，**尚不能证明当前无引用或允许删除**。最近整体 success 且实际 publish/promote 成功的 staging workflow 使用另一个 revision / digest。当前停止容器、current pointer、回滚与备份引用仍由现场 owner 核实。

## 候选身份与该次实际执行

父任务从控制台提供的候选是 tag `f4872ab6a10f7fd509f48e73640650dee69a741c`、digest `sha256:80d0dccb494a08c4e8f7f348fb650339f56ca2df50ceea201edb98e11ee6c909`、显示 119 MB、2026-09-25 创建。本审查独立核实 Git revision、GitHub job/step 和推送 digest；没有独立读取控制台尺寸或当前 registry 清单。

`GET /repos/Seven128/Starward/actions/runs?head_sha=<candidate>&per_page=100` 返回 Product CI、Context structure 和一个 Backend staging release run。候选 Git 父版本为 `6f99bb87df728b597851f93f8e3fbe05fdfb07c4`，提交时间 2026-09-25 06:08:05 +08:00。

- [Backend staging release 36066133386](https://github.com/Seven128/Starward/actions/runs/36066133386)：`head_sha` 精确匹配，`run_attempt=1`，整体 `failure`；创建 2026-09-24 22:12:45 UTC，结束 22:16:17 UTC。
- `publish-and-deploy` job `107856239367`：`failure`。读取 `jobs?filter=all&per_page=100`，该 run 未返回另一轮部署 job。

| 实际 step | 状态 | UTC 时刻 / 证据 |
| --- | --- | --- |
| Build and publish the immutable release image | success | 22:15:15–22:16:10；Docker push 结果的 digest 精确匹配 `sha256:80d0dccb494a08c4e8f7f348fb650339f56ca2df50ceea201edb98e11ee6c909` |
| Prepare non-secret control package and request | success | 22:16:10–22:16:11；准备不是远端激活 |
| Preflight staging host without mutation | failure | 22:16:11–22:16:14；固定代码 `host_preflight_disk_below_10_gib` |
| Promote exact image to staging | skipped | 22:16:14；该次没有进入 promotion |

候选版本与当前版本的 workflow 都先按 revision tag build/push，再从 RepoDigest 解析 immutable image reference，然后执行 preflight 和 promotion。不能把镜像存在或控制包准备成功称为实际部署。也不能由这次 `skipped` 推断它后来没有被手动选择或没有留下外部引用。

## 成功历史与当前身份的区别

既有 [H4 运行身份审计](H4-REAL-WEATHER-READINESS.md#已有运行身份审计) 已拥有全部 32 个整体 success run 的 job 核对及最后实际发布结论，后续直接复用。收到该 owner 指引前，本次已重复读取该集合并得到一致结果；这不是新增发布资格，不需要继续扫描相同历史。

该集合内最近一个实际 publish/promote 成功的是 [run 34771917251](https://github.com/Seven128/Starward/actions/runs/34771917251)：

- revision：`262d7531916c0b1b995fe8937321c044c9fb9ca5`。
- job：`103762952929`；build/push、host preflight、promote 均 `success`。
- push：2026-09-13 17:34:55–17:36:46 UTC；preflight：17:36:47–17:36:51；promote：17:36:51–17:37:25。
- 由该 job 的 Docker push 结果读取 digest：`sha256:824bc03eaac9c2b2afe63e61767b3cc50c571e5ffdead65bc29de0b9605e5ba5`，与本候选不同。
- 其后整体 success 的 staging workflow 实际都跳过了 `publish-and-deploy`，例如 [run 37520173117](https://github.com/Seven128/Starward/actions/runs/37520173117)。这类绿灯不证明其 head revision 曾部署。

这个结论限于 GitHub 可见的整体 success staging workflow 集合；本审查未把所有 failure/cancelled run 或外部手动操作审计为完整发布史，也未将 9 月 13 日的历史成功身份称作当前运行身份。

父任务已取得的当前 identity run `39261198368` 只有固定 staging/api 总数 1、running 0、exited 1、`selectedContainer=null`；因此停止对象的 revision/digest 在这份证据中仍未知。本审查没有读取远端 current pointer、停止对象 image 或回滚/备份清单，历史成功 digest 不能填补它们。H4 已有的 2026-09-20 runtime 结果只将同一历史 revision 与当时运行关联，不延长为当前证明。

父任务于本审查收口时补充：通过现有 Chrome 控制台只读进入唯一 TCR 和原 Shanghai 主机，OrcaTerm 登录遇到真实 MFA；没有发送验证码、修改设置或执行命令。当前尚不能取得停止镜像与 receipt 引用，所以不删除 tag。这里记录父任务现场结果，不冒称本审查直接观察了浏览器或主机。

## 仓库现有 owner 与恢复能力

- [backend-staging.yml](../../../.github/workflows/backend-staging.yml) 的 build/push 使用 revision tag，交付按已解析的 immutable digest。workflow 没有 registry tag 回收或删除步骤。
- [operator-preview.mjs](../../../tools/deployment/operator-preview.mjs) 在成功 deploy 后写 receipt，再发布 `operator-preview-current.json`；其中绑定 revision、imageDigest、candidate descriptor 和 receipt。记录引用与实际容器状态都需核实，不能只读一个旧 workflow 代替。
- [失败与回滚 owner](../../../infrastructure/deployment/README.md#failure-and-rollback-boundary) 要求保留的先前 image 与当前 schema / 已接受写入兼容，创建新 descriptor 和 fresh verified backup，再经同一 release owner 回滚。这依赖 retained image，Git commit 存在并不等于原 OCI bytes 可恢复。
- [sky-static-retention.mjs](../../../tools/deployment/sky-static-retention.mjs) / `inspectSkyStaticRetention` 只对选定 Sky 静态目录做 dry-run，明确不删除；它不是 OCI registry tag 清理器。DB backup 保留规则也不适用于镜像。
- 在 `tools/deployment`、`infrastructure/deployment`、`.github/workflows` 中检索 registry/tag retention、cleanup、delete、prune；并在 `tools`、`infrastructure`、`.github`、`package.json` 扩展检索 OCI save/load/copy/delete 入口，未找到现成 registry tag 保留/删除或精确 OCI 备份恢复流程。命中 Sky 静态 owner 不构成镜像恢复能力。
- 对 tracked source 检索本候选完整 revision / digest 没有命中。这仅说明仓库 tracked 内容没有该文字引用，不能证明私有 descriptor、receipt、主机 image、其他 tag 或外部 rollback/backup 无引用。

## 未决条件及最小下一步

当前代码为 `CANDIDATE_PUSHED_PROMOTION_SKIPPED`、`HISTORICAL_SUCCESS_DIFFERENT_DIGEST`、`CURRENT_REFERENCE_SET_UNVERIFIED`、`EXACT_OCI_RECOVERY_UNVERIFIED`、`HOST_ACCESS_MFA_REQUIRED`；不输出“可删除”结论。

1. 待现有主机访问的 MFA 边界解决后，现场 owner 核停止对象 image/revision、当前 descriptor / receipt pointer，以及保留回滚和备份所引用的 digest；同时确认 registry 中是否存在指向候选 digest 的其他 tag。按 owner 投影输出非敏感身份，保留当前 UNKNOWN。当前不扩大扫描、不发送验证码、不删除 tag。
2. 若要把候选用于释放本次额度，应先由现有授权能力确定删除语义及该精确 OCI artifact 的可恢复性；现有 Git/source 与重新 build 不能证明恢复同一个 digest。本审查没有创建备份，也没有建立恢复承诺。
3. 仅当引用与恢复条件充分，再由父任务按既有授权作单个明确目标的处置；之后核额度实际释放，重试原精确 main revision 的现有发布 owner。历史 host 磁盘预检失败也需当前事实，不通过调低 guard 或旧值推断本轮可部署。

这不是定期清理政策，不选择付费升级，也不改变任何环境或现有发布 guard。必要权限/外部状态缺口留在现场 owner；手机和完整性能目标继续保持各自未验边界。

## 后续 root 核对：实际入口及精确 OCI 保全

后续[停止身份](STOPPED-API-IDENTITY-REMOTE-20261019.json)及[固定引用首轮](RELEASE-REFERENCE-REMOTE-20261019.json)已证明既有Actions受限SSH可用，Console MFA不再是这些只读观察的前置条件。首轮base与1ccd/de4b停止API observed，receipt目录枚举触限，current/历史批量仍unknown；没有补造引用集合或删tag。旧32条成功史不重扫。

固定链/批量耦合窄修后，[新实际投影](RELEASE-REFERENCE-PARTIAL-REMOTE-20261019.json)的39277333313/head8d55e50e已读回成功current为262d7531/824bc03e，与原历史成功身份一致；唯一停止API仍1ccd/de4b，失败回执batch保持超预算unknown。current声明backup manifest不等于备份已读/可恢复。此结果只更新这两处已观察引用；f487候选的完整已知消费者、回滚/备份/精确OCI保全与实际同内容tag集合仍未验，不据此删除。

只针对未决删除语义核腾讯官方[个人版DeleteImagePersonal](https://cloud.tencent.com/document/api/1141/41593)：输入是RepoName和Tag，文档没有给出同digest其他tag保留或GC时点的保证。[DescribeImageFilterPersonal](https://cloud.tencent.com/document/api/1141/41587)提供同内容tag列表，可用于后续明确实际影响集合；本次未调用删除或该实际账号API，不能从接口名直接把动作影响断言为一条tag。

精确OCI备份的成熟候选是[ORAS copy](https://oras.land/docs/commands/oras_cp/)：支持按digest选择源，在registry与OCI image layout间复制，默认image index会复制其全部子manifest。官方[当前v1.3.5发行](https://github.com/oras-project/oras/releases/tag/v1.3.5)已核Windows amd64二进制/校验和条目，未下载安装或加入项目依赖；不采用experimental backup/restore作为前置方案。后续仍需实际目标manifest/blob完整性、同digest恢复读回及目标访问资格，工具文档不提供本候选已备份/可恢复证明。

本机只核指定批准registry的既有Docker配置/credential helper，未列出其它账号、输出host/用户名/secret或修改登录：匹配auth entry不存在，固定已安装helper查该目标返回entry unavailable。因此本机直接保全路径当前未就绪，不声称所有现成授权通道不可用，也不要求用户现在登录。既有Actions凭据的固定备份路径可在明确必要输入/私有落点后继续评估；未输出凭据、扩共享、创建付费资源或把source rebuild当原digest恢复。

后续[主机空间实读](HOST-STORAGE-REMOTE-20261020.json)39285085395/head0已success：available约9.7025GiB仍低于原10GiB guard，daemon BuildCache约7.51GB进入下一归属核对责任；此cache不等于TCR标签、原OCI备份或全部引用，不据reclaimable删image/tag/volume。新source0完整CI/OCI通过，新自动release39286309198已一次取消并实读cancelled、pub job无步骤，未重复quota失败或改变CD/guard。
