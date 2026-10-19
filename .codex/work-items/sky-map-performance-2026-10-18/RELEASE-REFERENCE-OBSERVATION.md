# 固定发布引用观察

2026-10-19。沿现有服务恢复责任补齐原main-only SSH诊断；未改变PLAN、发布/备份owner或手机候选。实现由独立作者完成，root接入原runner/workflow并核实际消费者；[原边界核对](RELEASE-REFERENCE-OBSERVATION-BOUNDARY.md)保留选择理由，不再作为“尚未实现”的下一步。

## 结果与责任边界

`release-reference`由`tools/deployment/release-reference-diagnostics.mjs`负责。原四条受保护连接路径没有增加自由输入；读取base的固定staging/project，再从其receiptDirectory核current指针、成功deploy receipt和candidate descriptor的revision/digest/环境/project/批准仓库一致性。sourceRoot只核现有release-root/control/revision位置，不执行旧代码。共享环境解析器仅将原私有helper收进纯函数，支持原样嵌入生成模块，未改变格式语义。

同一固定API identity在观察前后复核；整个匹配集唯一且停止时，批量核同receipt目录内UUID命名的失败deploy回执是否匹配该revision/digest。成功current与停止对象分别报告，不假定它们相同，不以较新prepared候选补空。原identity仍不读文件，selected/running准入保持。

Linux通过持有目录fd、固定`/proc/self/fd`逐分量no-follow读取；核普通单链接文件、归属和权限，并末端复核文件原字节/metadata、原路径和receipt集合。文件256KiB、目录512项、receipt128件、总实际读取8MiB（含复核）是诊断预算，超限保unknown。已有SSH 60秒/64KiB及Docker子调用10秒/32KiB界保持。所有文件句柄随owner释放。

输出只允许固定状态/错误分类、合法revision/digest、匹配布尔值和内容hash，不输出配置/receipt原文、路径、repository、operator、连接或token。未知/变化/局部失败不折成零，保独立有效结果；不追读lane secrets、backup manifest、DB或容器内部，不调用部署、供应、清理或服务恢复。

观察始终`NON_ATOMIC`且`referenceCompleteness=UNVERIFIED`。完成固定链观察只建立该次历史文件身份与停止对象的有限关联；不建立运行健康、备份可恢复、全局无引用、精确OCI可恢复或删除tag资格。

## 当前验证

- root本地新模块、原runner和runtime三文件 **43/43** 通过；包括固定输入/SSH、私有字段丢弃、unknown与失效分类、生成自含模块fake builtins实际执行三变体。没有执行真实Docker/SSH。
- root实际parser消费者及preview/candidate/env五文件 **52/52** 通过；原成功/失败发布、锁、恢复和静态current语义保留。
- Windows原生检查只证明非Linuxfail-closed；真正Linux fd/内核权限检查由后续Product CI的原deployment tests运行，不用Windows fake成功替代。
- 受影响Context已归原[pipeline-and-host owner](../../../project_context/deployment/pipeline-and-host.md)，不将本次run记录写入Context。
- [独立审查](RELEASE-REFERENCE-INDEPENDENT-REVIEW.md)未发现P1/P2，独立43/43并对精确生成模块另加4项对抗检查通过；127条匹配报告38,597B，保64KiB输出界。审查输入hash与当前源一致。必要Linux CI和远端实际观察尚待建立；本地通过不关闭H4或完整Goal。
- 提交前15份staged文本与工作区一致（仅规范换行），1份JSON可解析、285个本地文件链接存在、7份独审输入hash一致，限定凭据形状扫描无命中；Goal正文未变，staged diff及Context结构通过。这些结构检查不认证产品结果。

实现源原始SHA-256：`3cb5e29a18a1f386592f6f8b9f914a255b48bd43cb4fb215fc2a08062923184b`；新模块测试`ab85ae6bc29b60767925ed928abbc89b56f6b903a67f0f9f93fb2f7927b78522`；共享parser`5c3456aa135f881b1fb8f669444fed40b705884a300662cdefa1470ab5d0f1af`。未改变Map/Sky/手机字节，不为本批诊断改动重建或重复手机资格。
