# 旧文件 owner 回退与 JSON 库存保留

Goal active、无预算、未完成；原工作区/分支/HEAD 保持。本轮只改云观星 `sky-public-image-cache.ts` 及其测试、任务证据和对应 owner Context。六保护项和其他业务逻辑保持，没有依赖更新、提交、推送、外部源下载、加工、共享 BFF/watch 重启、部署或发布。实际旧代码来自此前封存并绑定的源码，不称已发布微信二进制。

## 实际修前失败

[r1](../../../../output/sky-old-cache-rollback-1003-r1/result.json)在隔离真实 Node 文件系统执行封存 image-only owner 与本轮修前 v2 owner，供应已有 Camelopardalis PNG8194B 和真实 SAO `00-00-10-0.json`19433B。旧代码只认 PNG/JPEG、已有 stage/index-stage 命名；新 `.json` 对它不可见。实际旧 clear 报 complete、inspect.bytes=0，但磁盘仍有19433B JSON，当前再升级还能暖读它。这不是有效清理，也不能将其漏出整产品预算。

保存[修前两项回归失败](../../../../output/sky-old-cache-rollback-1003-r1/regression-before.log)及实际旧/修前源。没有修改旧归档代码使其配合，也没有删原数据。

## 同一个 encoded owner 内的修复

JSON 成品缓存使用明确 `stage-catalog_<environment>_<sha>_<session>-<sequence>` 命名。旧 owner 的既有 disposable namespace 能发现、计量失败残留和回收它；新 owner 仍由已原子提交的 v2 inventory 判定 committed entry，staging write 与成品 catalog 名称不同，未登记文件不晋升命中。文件仍位于原公共缓存目录，descriptor 明确 `format: json`、真实 byte length/hash，无虚假尺寸、PNG/JPEG 扩展或图像包装。

新启动在发放任何租约前，将合法旧 v2 `.json` entry 同目录 rename 到上述命名，再提交 inventory。rename 不改源字节、不复制另一套库，暖获取仍完整 bytes/hash 验证。文件名还校验实际 environment/hash/format，不能借 stage 名改绑定。迁移失败拒绝 readiness，既有明确获取能重试；清理在迁移中发生时，移动后的 entry 继续受 epoch/退休 owner 控制，不能复活旧数据或误删新代。

32MiB encoded cap、两 transfer 槽、key/source身份、完整写入回读、reservation/LRU/独立租约、取消迟到和粗源回退保持。没有新增文件 owner、双份 v1 镜像或预算扩大。

## 修后真实文件与消费者

[r3](../../../../output/sky-old-cache-rollback-1003-r3/result.json)实际旧 owner boot/clear 后不再有未计量 JSON。旧 clear 后再升级须从受控原文件供应重新取得 JSON 一次，旧 v2 pointer 不能把已清文件当暖命中。旧 v1 不理解 v2 图片 metadata，因而本次回退会丢弃再取8194B PNG；这是有证据的缓存冷恢复，不声称图片暖命中或完整旧二进制体验验收。

另用**实际修前 v2 工厂**产生旧 `.json` 库存，当前 owner 完成 rename，暖取 transfer0、SHA/19433B 保持。注入真实 fs adapter 的 unlink 失败时，旧 owner 保留19433B计量并报 partial；恢复后明确 clear 为 complete/0。最后当前 owner 清理只剩26B空 v2 inventory。

旧 owner 仍留下不识别的 v2 metadata pointer；它受原256KiB index限制，但不是清掉的 payload，也不能填成零。当前重进重新核列表存在性并移除 v1 pointer。指针开销、微信全文件200MB、原生文件分配及整产品其余存储仍须实际计量。

迁移 clear/原生 rename 失败重试/环境-hash-format错绑定等与既有 consumer 检查共28通过，随后新增 filename binding检查1通过；App TypeScript通过。新目录命名不改变原生读取要求：额外[当前实际 UTF8 reader](../../../../output/sky-catalog-native-reader-1003-r1/result.json)执行生产函数 body/hash helper与当前缓存 owner，实际 Node 文件完成读取、受控 native UTF8回调供应；正常 JSON 精确返回，另一次 abort/clear 在已完成读取但 callback未交付时保持lease1/19433B，迟到 callback后0，最终空inventory。URL/environment acquisition wrapper在这条小路径注入，不能称完整 runtime/API 原生验证。

[根保存读回](../../../../output/sky-old-cache-rollback-readback-1003-r1/result.json)核修前19433B漏计、实际旧/修前工厂、新源、real FS阶段/操作、暖迁移/失败计量/明确重试/最终磁盘；[reader读回](../../../../output/sky-old-cache-rollback-readback-1003-r1/native-reader.json)核当前函数、源、UTF8数据与1→1→0租约。均为自审，独立审查MISSING。

## 失败记录与剩余范围

r2 实际正常回退和暖迁移已经完成，故障目标却因 Windows 混合路径分隔符未匹配，任务错误地期待 partial、实际 complete 合理；[失败](../../../../output/sky-old-cache-rollback-1003-r2/failed.json)保留。r3仅修故障目标绝对路径规范化，未修改旧 owner。reader首轮引用不存在的 helper 文件，失败在运行前，保存[bootstrap失败](../../../../output/sky-catalog-native-reader-bootstrap-1003-r1/failed.json)；任务改向已存在 helper，项目依赖/配置不变。

这是归档代码工厂、隔离实际 Node文件与受控消费者的开发证据；旧/新微信二进制、WEAPP文件系统、物理200MB、完整原生清理与完整体验未验。r16 page/Scene的272源结果只绑定此前 r49代次，不能倒填为本轮新命名后的完整page/React-provider证明。下一项按 PLAN 补当前真实 React/useQuery-provider 的实际消费者，而不重放已闭合冷暖/solar/静态矩阵。

WXML FAILED_DEVTOOLS、Android/iOS/新月面、完整公开交互/校准/来源Back、图质/弱结构/配准/批量出版/商业权利、端云实际保留引用/CPU-RSS-DB-worker媒体/整产品200DAU流量费用/12Mbps混合容量/180GB及最终必要独审仍未完成。Prepared/science registry 空，M51矩形FAILED、M82输入缺口保持，不采用候选。
