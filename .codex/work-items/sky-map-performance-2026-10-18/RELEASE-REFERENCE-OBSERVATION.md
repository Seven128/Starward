# 固定发布引用观察

2026-10-19。沿现有服务恢复责任补齐原main-only SSH诊断；未改变PLAN、发布/备份owner或手机候选。实现由独立作者完成，root接入原runner/workflow并核实际消费者；[原边界核对](RELEASE-REFERENCE-OBSERVATION-BOUNDARY.md)保留选择理由，不再作为“尚未实现”的下一步。

## 结果与责任边界

`release-reference`由`tools/deployment/release-reference-diagnostics.mjs`负责。原四条受保护连接路径没有增加自由输入；读取base的固定staging/project，再从其receiptDirectory核current指针、成功deploy receipt和candidate descriptor的revision/digest/环境/project/批准仓库一致性。sourceRoot只核现有release-root/control/revision位置，不执行旧代码。共享环境解析器仅将原私有helper收进纯函数，支持原样嵌入生成模块，未改变格式语义。

同一固定API identity在观察前后复核；整个匹配集唯一且停止时，批量核同receipt目录内UUID命名的失败deploy回执是否匹配该revision/digest。成功current与停止对象分别报告，不假定它们相同，不以较新prepared候选补空。原identity仍不读文件，selected/running准入保持。

Linux通过持有目录fd、固定`/proc/self/fd`逐分量no-follow读取；核普通单链接文件、归属和权限，并末端复核文件原字节/metadata、原路径和receipt集合。文件256KiB、目录512项、receipt128件、总实际读取8MiB（含复核）是诊断预算，超限保unknown。已有SSH 60秒/64KiB及Docker子调用10秒/32KiB界保持。所有文件句柄随owner释放。

输出只允许固定状态/错误分类、合法revision/digest、匹配布尔值和内容hash，不输出配置/receipt原文、路径、repository、operator、连接或token。未知/变化/局部失败不折成零，保独立有效结果；不追读lane secrets、backup manifest、DB或容器内部，不调用部署、供应、清理或服务恢复。

观察始终`NON_ATOMIC`且`referenceCompleteness=UNVERIFIED`。完成固定链观察只建立该次历史文件身份与停止对象的有限关联；不建立运行健康、备份可恢复、全局无引用、精确OCI可恢复或删除tag资格。

## 首版实现检查

- root本地新模块、原runner和runtime三文件 **43/43** 通过；包括固定输入/SSH、私有字段丢弃、unknown与失效分类、生成自含模块fake builtins实际执行三变体。没有执行真实Docker/SSH。
- root实际parser消费者及preview/candidate/env五文件 **52/52** 通过；原成功/失败发布、锁、恢复和静态current语义保留。
- Windows原生检查只证明非Linuxfail-closed；真正Linux fd/内核权限检查由后续Product CI的原deployment tests运行，不用Windows fake成功替代。
- 受影响Context已归原[pipeline-and-host owner](../../../project_context/deployment/pipeline-and-host.md)，不将本次run记录写入Context。
- [独立审查](RELEASE-REFERENCE-INDEPENDENT-REVIEW.md)未发现P1/P2，独立43/43并对精确生成模块另加4项对抗检查通过；127条匹配报告38,597B，保64KiB输出界。审查输入hash与当前源一致。必要Linux CI和远端实际观察尚待建立；本地通过不关闭H4或完整Goal。
- 提交前15份staged文本与工作区一致（仅规范换行），1份JSON可解析、285个本地文件链接存在、7份独审输入hash一致，限定凭据形状扫描无命中；Goal正文未变，staged diff及Context结构通过。这些结构检查不认证产品结果。

首版实现源原始SHA-256：`3cb5e29a18a1f386592f6f8b9f914a255b48bd43cb4fb215fc2a08062923184b`；新模块测试`ab85ae6bc29b60767925ed928abbc89b56f6b903a67f0f9f93fb2f7927b78522`；共享parser`5c3456aa135f881b1fb8f669444fed40b705884a300662cdefa1470ab5d0f1af`。未改变Map/Sky/手机字节，不为本批诊断改动重建或重复手机资格。

## 首轮远端及有界部分结果修复

首版提交`18c2cac106aa84dc7fe8d9e93e6249d2311b610b`已普通推当前分支/main并精确读回一致，原连接Secret镜像按owner刷新。[Context39274103071](https://github.com/Seven128/Starward/actions/runs/39274103071)success；[Product39274103102](https://github.com/Seven128/Starward/actions/runs/39274103102)完整success（含Ubuntu deployment owner/native文件检查与OCI构建）。没有操作手机或恢复服务。

本批自动[release39276326341](https://github.com/Seven128/Starward/actions/runs/39276326341)因仅诊断变化且quota未变，由root在owner重检、push/preflight/promote三步骤均pending时一次取消；实际已completed/cancelled，三个后续步骤skipped，CD/guard未改。没有重复已知quota失败或调用服务器promotion。

确认没有在途发布或重复诊断后，一次[release-reference39274956661](https://github.com/Seven128/Starward/actions/runs/39274956661)实际运行首版：head及observer hash吻合，[严格投影JSON](RELEASE-REFERENCE-REMOTE-20261019.json)保存base observed和唯一1ccd/de4b exited API；receipt目录枚举触及预算，current和失败回执batch均`budget_exceeded`，run failure。未声称当前指针不存在或无引用，没有把观察失败当运行健康；原日志只在进程内处理。

实际失败暴露了本地诊断的责任耦合：固定current链本不需要先枚举所有历史项。后续窄修复将固定链独立读取；同一8MiB预算内预留其最终文件字节重核（含EOF空间），批量不能耗尽全部预算使独立固定链失效。无关receipt集合变化只使batch unknown；固定依赖文件变化和最终目录identity/权限变化仍使对应结果unknown。没有提高256KiB/512/128/8MiB上限、新增路径/命令或产生fallback。

四条既有用例的新必要期望在首版实际失败，修后root三文件43/43。新独审发现中间未交付版本的最终目录安全检查顺序会漏掉末次枚举时的mode/inode变化（P2）；两项反例实际失败后，已将共有目录安全重核移到最终枚举之后，43/43重新通过。[窄独审](RELEASE-REFERENCE-PARTIAL-REVIEW.md)独立43/43及精确生成模块五项通过，P2已关闭、无剩余P1/P2，源hash一致。新版本Linux/远端仍待完成；不重跑未变首版或回填其报告。

当前修复源SHA-256：`fd9fd43061d8a5ff05b1c8de9d9bbad69882c6fbb70141018313ae8cc97d3a25`；测试`1124c77f5d46211f43c6333bf8e36e2f413c4a529abaa58c384ae047e26b1d7b`。旧独审只保首版输入效力，后续以本次窄审查为准。完整引用、失败原因、精确OCI恢复和服务结果仍未验；[quota后续核对](REGISTRY-QUOTA-CANDIDATE-AUDIT-20261019.md#后续-root-核对实际入口及精确-oci-保全)保已核官方API/成熟工具及本机credential-entry缺失，不将本机路径未就绪扩大为所有授权能力不可用。

本批提交前12份staged文本与工作区一致（仅规范换行）、2份JSON可解析、300个本地文件链接存在、3份新独审输入hash一致，首轮远端再过严格投影；限定凭据形状扫描无命中，Goal正文未改、Context结构及staged diff通过。未重复未变parser消费者或手机检查。

## 修复后实际固定链读回

修复已提交`8d55e50e04a043b60698fa4562246c92c0ec966b`并普通推当前分支/main；原连接镜像刷新。一次[新观察39277333313](https://github.com/Seven128/Starward/actions/runs/39277333313)明确绑定新head/observer SHA，[独立保存的严格投影](RELEASE-REFERENCE-PARTIAL-REMOTE-20261019.json)已实际读回：base/current/stopped/末端observation均observed；current为v1成功deploy，revision`262d7531916c0b1b995fe8937321c044c9fb9ca5`、digest`sha256:824bc03eaac9c2b2afe63e61767b3cc50c571e5ffdead65bc29de0b9605e5ba5`，pointer/receipt/candidate字节hash及批准仓库/环境/project/source位置匹配；声明有backup manifest，但未读取/验证备份。

该成功指针与先前已核的9月13日实际成功发布身份一致；唯一停止API仍为1ccd/de4b。此处已闭合固定链，不重扫32条历史或再跑未变观察。失败回执batch仍因枚举预算unknown、matchingCount=null，所以run仍failure，`releaseReferenceSucceeded=false`；未变完整诊断成功语义，未提高上限。当前文件身份不证明当前运行/停止原因、全部回滚/备份引用或精确OCI恢复，首版报告保留。

[Context39277233426](https://github.com/Seven128/Starward/actions/runs/39277233426)success；新[Product39277233795](https://github.com/Seven128/Starward/actions/runs/39277233795)的Linux deployment/native检查已success，完整CI仍在途。没有服务/registry/手机变更。

之后一次既有[host预检39277770300](https://github.com/Seven128/Starward/actions/runs/39277770300)完整failure，[严格固定码读回](CURRENT-HOST-PREFLIGHT-20261019.json)为`host_preflight_disk_below_10_gib`，与历史guard失败一致但属于本次新观察；不推断具体可用量或清理对象，没有调低guard。平台曾短暂waiting，实际main分支规则允许且没有人工reviewer/timer，后来正常运行；未改Environment或重复dispatch。当前恢复同时受registry额度及主机空间约束，下一步需最小只读归属/私有精确保全条件，不以广泛prune替代。
