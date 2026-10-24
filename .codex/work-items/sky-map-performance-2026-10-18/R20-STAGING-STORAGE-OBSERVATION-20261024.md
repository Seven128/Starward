# R20 staging 容量失败的只读观察

## Requested operation / candidate / authorization

沿既有 release Skill、deployment pipeline owner 与固定 `host-storage` 模式定位已确认的 `host_preflight_disk_below_10_gib`。仅只读 staging 汇总，不部署、迁移、清理、重启、刷新凭据或更改阈值。观察提交 **61953dd160b6dc77eaff44c3b4b12e2dd4dbcb51**；既有 `Backend bounded diagnostics` **40086578390 success**。成功只表示该汇总观察完成，不是主机发布准入或服务健康。

以现有 `deployment-connection.mjs` 的七个字段在内存核对已配置来源合法、mirror元数据更新时间不早于这些变量；复用已有受保护 staging packet。没有读取私钥、输出连接值、重写Secret或同步任何新目标。时间检查不证明Secret内容与变量逐字相同；它与前次同绑定预检一起限定本次既有目标，不能替代未来连接变化的owner流程。首次临时检查猜测一个字段名而只数到6项没有当作完整；改用原owner导出的真实7字段才完成检查。

## Executed owner / verified

命令为既有 `gh workflow run backend-diagnostics.yml --ref main -f mode=host-storage`。远端程序沿受保护目录描述符运行固定 `df`、三次 `du -P -x -B1 -s`、非verbose `docker system df`；不读配置/数据库/备份payload，不创建远端文件/锁，不接受任意命令或路径。job与SSH程序均结束。

| 观测 | 本次结果 |
| --- | ---: |
| release filesystem total | 42,156,257,280 B |
| used | 29,910,458,368 B |
| available | **10,403,938,304 B（约9.69 GiB）** |
| INBOX allocated | 265,871,360 B |
| RELEASE allocated | 294,477,824 B |
| CANDIDATE allocated | 1,216,512 B |

三目录都与release处在同一filesystem。既有10 GiB门槛为10,737,418,240 B，本次差333,479,936 B；这是固定门槛的差额，不是候选镜像实际部署所需峰值或建议只补这么多空间。

| Docker daemon-wide分类 | total / active | size | reclaimable（原始rounded字符串） |
| --- | ---: | ---: | ---: |
| Images | 96 / 4 | 14.85GB | 13.41GB (90%) |
| Containers | 5 / 2 | 69.63kB | 45.06kB (64%) |
| LocalVolumes | 4 / 4 | 161.6MB | 0B (0%) |
| BuildCache | 123 / 6 | 7.51GB | 7.173GB |

filesystem、目录分配和Docker数字覆盖不同，不能相加；目录可能重叠。输出明确 **HOST_STORAGE_AGGREGATES_ONLY / NON_ATOMIC / referenceCompleteness=UNVERIFIED / cleanupAuthorization=NONE**。Docker分类没有具体记录、项目归属或完整引用集，rounded reclaimable不是可删除集或保证能释放的精确字节。

## Failure / recovery / unverified

磁盘仍未达到本次固定门槛；没有降低guard、清卷、广泛prune、清历史镜像或重发部署。现有固定owner只提供汇总/静态资料retention观察，没有可直接据这份报告执行的host Docker-cache精确退休操作。下一恢复责任是在原host/Docker owner确认具体可弃cache/引用和可用操作，再做有界退休及原preflight；不能把本机任务草稿的清理授权外推为远端daemon所有记录的归属。保数据库/Redis volumes、rollback images、备份和私有原件；缓存和镜像/数据的恢复要求也不能混为一谈。

本观察没有证明API运行/数据/供应商/手机正常，也没有批准生产/多版本/registry retention。当前head具体CI与staging后续结果仍由HANDOFF和CURRENT-VALIDATION实读，旧预检失败或本次汇总不替代新run终态。

## Receipts / cleanup

原Actions log和结构化汇总仅留private root-usb owner：`staging-host-storage-40086578390.private.log`、`staging-host-storage-40086578390.report.private.json`。runner临时SSH输入由既有finally/runner销毁拥有；本地没有产生长期凭据或远端活动进程，没有上传原始数据/私人资料。没有业务/服务/网络状态变化。
