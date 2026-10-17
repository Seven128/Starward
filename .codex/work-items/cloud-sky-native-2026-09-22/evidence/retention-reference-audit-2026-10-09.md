# 保留引用责任复核

沿 PLAN F，只读核对现 `tools/deployment/sky-static-retention.mjs`、`sky-static-release.mjs` 的 inventory/retention、receipt/current/runtime 及 backup 引用责任，与 `sky-static-backup.mjs` 的原源metadata/公共URL并集合同、既有实际消费者测试。没有调用主机、部署、数据库备份或清理，也没有重复已闭合的静态出口/Windows allocation或fixture备份测试。

现 owner 已在同一lease下核对 prepared pointer、已准入全部源及旧URL；实际运行挂载与prepared/current指针分开。可选实际runtime、稳定发布/preview回执与current、选定本地backup目录均接同一dry-run。DB-only v1、外环境、未绑定记录、缺store引用分别保留含义；失败不变为空引用。每项资源即使无已知引用也保留 `RETAIN_PENDING_REFERENCE_REVIEW`，没有年龄/LRU清理或自动删除。当前backup v2保存源index/fragment/artifact及精确成员，由加密DB备份owner绑定认证，不能把公开快照hash当密钥认证或运行current。

这次源码复核没有发现需要改方案或另建引用表的依据。真实完整引用仍缺：生产/回滚/受支持旧客户端、off-host与全机其他服务资源。现 default-current-static-1 是本机普通资源出口，不是有真实OCI准入、运行mount/发布current和备份引用的managed store；不能为了运行retention而伪造这些身份。旧受控filesystem/Docker-response开发测试亦不补此缺口。

默认出口1738记录、81,588,995B payload及Windows reported allocation86,533,728B沿原证据保持，不复测、不推出180GB Linux全机余量。`referenceCompleteness=UNVERIFIED`、`deletableBytes=null`、容量/当前独审/设备缺口及全部33项不提高。此次没有改生产保留或备份实现，也没有修改PLAN/Context。
