# 唯一停止 API 的身份观察

2026-10-19，基于`95b73d612c8ab7d937a0d44b363de507f4a642a2`继续既有H4恢复责任。原identity run39261198368只证明固定`starward-staging/api`总1、exited1/running0；停止对象的revision/digest尚未知。现有probe实际已读取所有匹配对象的这两项元数据，但只保留唯一running对象的投影，停止对象的信息被丢弃。

本次在原`apiIdentityProbe`与`sanitizeIdentityReport`中补一个additive `singleMatchingContainer`：整个匹配集合只有一个对象时保留其状态、Running标志、user/project/service匹配布尔值和合法revision/image-reference digest；集合为空或多个时为null。不输出ID、名字、仓库、环境或原始字符串。`selectedContainer`和`diagnosticSucceeded`的运行准入保持，停止对象不能让runtime/provider变为可用。旧报告没有新字段时保持缺失，不从历史补写。

没有增加Docker命令、SSH输入、workflow模式、远端路径、文件读取、锁、发布或服务操作。原identity继续不读配置/DB/current receipt，不执行容器或旧control代码。Context只更新这项持久能力的实际边界。独立只读owner核对确认：current链需要另外的固定文件观察与路径/内容绑定；现成preview check会写lock/receipt并触服务，不能代作本次只读观察。

本地回归先在未改实现上失败：唯一exited样本的`singleMatchingContainer`为undefined，不能给出已读取的合法身份。修复后两份既有diagnostic测试共22/22通过，覆盖同一停止样本、空/多对象、运行/paused/restarting准入、矛盾投影、非法/私有字段、旧报告兼容、固定SSH与清理；生成程序语法检查在该套件内通过。未运行远端probe、手机、ADB、IDE或任何服务。本文件记录软件结果，远端实际身份必须在受审代码进入允许的main后取得。

本报告只补当前停止API引用这一未知。即使它与某个registry候选不同，也不证明worker/migrate/其他容器或主机、current pointer、历史配置、回滚、备份无引用，不提供精确OCI恢复或删tag授权。远端registry额度失败仍保留，不绕CD/发布guard；本次代码进入main会依现有Product CI和自动发布语义执行，既有额度不变时自动镜像push仍可能失败，不能把新CI或新identity当服务恢复。

独立审查及实际执行结果由后续同责任证据与HANDOFF记录；完整性能A/B、三叠层等待和所有手机依赖不受此窄观察关闭。
