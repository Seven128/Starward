# E2：当前 sealed serving 链的本机分配与引用边界

复用现[Windows文件属性/identity测量](../scripts/inspect-static-file-allocation-2026-10-03.py)责任，未执行其旧固定export扫描，也未重跑HTTP/export/保留矩阵。[本次脚本](../scripts/inspect-native-static-allocation-2026-10-05.py)仅核当前两sealed输入、combined输出、四原publication目录及新NGC253/Legacy原图和伴随FITS/请求回执；两轮属性、目录mtime/identity一致。没有全output递归盘点、服务变更、制作新store/receipt、清理或扩大缓存。

结果为[当前分配](../../../../output/native-static-allocation-1005-e2-r1/result.json)，全逐文件读回在同目录`file-readback.json`。完整静态index沿现[E2保存实际读回](e2-native-static-https-2026-10-05.md)核publication identity、原record集合/字节与双方旧URL完整包含；现publication小清单/hash和六项保护字节重核。文件属性扫描没有重新计算全部静态payload内容SHA，不能把长度/mtime稳定冒新的全部完整性认证。

| 当前选定范围 | 路径数 | 逻辑B | API报告分配B（按不同file identity） |
| --- | ---: | ---: | ---: |
| M82 v1/v2 sealed输入 | 1,735 | 87,515,062 | 91,010,656 |
| native＋旧M82 sealed输入 | 1,739 | 86,591,928 | 90,089,440 |
| 当前完整combined输出 | 1,741 | 87,745,927 | 91,252,320 |
| 四份原publication目录 | 32 | 5,890,894 | 5,959,680 |
| 新NGC253/Legacy原图、FITS/请求回执 | 6 | 9,436,760 | 9,449,472 |
| 选定链合计 | 5,253 | 277,180,571 | 287,761,568 |

combined的1,739 payload仍86,301,106B，其中12 Prepared图5,734,973B；1,741路径包含index/delivery metadata，不能把包metadata丢出实际占用。三份包有相同payload hash，但此次5,253路径确为5,253不同卷file identity、最大link count1；相同内容不证明共享分配或可回收。indices的distinct payload约68.11MB也不是采用了内容去重、客户端少传量或生产占用。

publication原目录属于离线加工结果，不是客户端额外请求；NGC253原全幅JPEG与Legacy伴随FITS不在当前serving清单，不能把原始加工盘摊作普通浏览下载。这里只覆盖明确新范围，不与旧月面/科学链扫描直接相加外推整个资源库或主机。

在这三个selected serving bundle根内没有prepared-inventory/current pointer；它们不是新受信OCI/当前release retained-store。沿现`inspectSkyStaticRetention`约束，须先有真实image/source seal、选定store和实际部署/receipt才能绑定mounted/current/rollback，不为完成清单造假引用或把source目录冒generation。以前E2 readonly挂载已停止，只是历史实际服务证据；当前真实发布、回滚切换、Sky backup及支持客户端全集仍UNVERIFIED。未知/旧URL都保留，可删除字节null；已有lease、retention/current/receipt owner不重建。

首次reader在扫描/写结果之前误将历史仅`path/sha256`保护清单与附加`bytes`字段的pin对象作整对象相等，任务断言退出；原源码保在`tmp/native-static-allocation-before-shape-fix-2026-10-05.py`。修为按原保护字段核，再完成本次新增范围，未改保护文件、历史结果或production owner。

FileStandardInfo AllocationSize不包含文件系统metadata、alternate streams、快照和exclusive介质等全成本，Windows本机不代Linux全机盘/180GB余量。OCI/DB/log/实际备份/真实暂存全集、端云物理峰、10/20混合冷进入、预期4核16GB/12Mbps/200DAU仍未验。普通Prepared registry为空、候选未采用；本量测不关闭画质/正常消费者/DevTools/设备/独审。没有下载/新加工、提交推送、采购、云部署、发布或外联。
