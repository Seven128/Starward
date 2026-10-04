# 静态出版磁盘保留 dry-run：本地开发证据

既有 `tools/deployment/sky-static-release.mjs` 新增 `inspectSkyStaticRetention`，复用同一 store 选择、操作租约、完整 inventory/source seal/union membership 验证，盘点普通文件逻辑长度、当前 generation/source/pointer、旧代、`.building-*` 与 `.inventory-*.tmp`、未知项及显式运行/发布/回滚/备份引用。拒绝 symlink/junction、越界/缺失引用、损坏当前 inventory 和扫描期间的目录/文件 stat/pointer 变化，退出释放租约。只产生报告，除该次临时租约外不写库、提取 image、切换挂载或删除资源。

保留规则已记入部署 README 与 Context：当前获准旧 URL 和来源不可按年龄/LRU 逐出；prepared pointer 不是当前真实挂载或成功 receipt。显式引用只说明需要保留，不证明引用全集完整。未引用旧代、失败暂存与未知文件全部 `RETAIN_PENDING_REFERENCE_REVIEW`；没有 TTL、deletable bytes、自动清理或删除许可。未来退休须核真实 mount、release/rollback/backup、客户端兼容与恢复后再决策；备份已有独立规则不能外推到 Sky URL。

受影响真实文件回归覆盖两次制备/旧 URL、仍挂载旧 generation 的声明、冲突失败留 source、重复路由失败留 `.building`、未完成 pointer stage、未知文件、恶意路径/junction/损坏库存，以及既有 HTTP/租约/精确 image cleanup/union admission。所有检查通过，缺失/异常保持拒绝，文件与旧 URL 均读回保留。

[已有本地库实际盘点 R2](../../../../output/sky-static-retention-1003-r2/result.json) SHA256 `a3c7c158d6a8bd8b6856376107c303ea334760ed8fb525d0510fd62dc6ce0629`，执行 script/owner、三个既有受控 release 库及一个旧真实成品包、六项保护文件绑定前后完全相同。正常/失败/HTTP 验证 fixture 库分别 25,313 / 12,123 / 10,484 B，属于 tiny controlled release inputs，不能缩放为生产容量。旧真实成品包为 136 项、22,954,411 B payload；包含 metadata/artifact 的容器普通文件逻辑长度 23,040,410 B/139 文件。不是当前完整默认 exporter/所有版本/全库。未复制或重新处理这些源，未重新发布。

R1 初始说明误称此历史包有 201 项，实际读回已显示 136；R1 原文件保留且不采用其说明。R2 修正为历史包身份，数据计量不变，不升级旧输入。当前/旧 source 与重复 union 要分别计文件长度，不能只用一份新成品包估磁盘；物理分配、hardlink/文件系统节省、外部 OCI、日志/数据库/备份/暂存及 180GB 主机余量均 UNKNOWN。

本地主机代码和回读不认证实际生产静态 GET/HEAD/304、真实 mount/receipt/backup 全集、外网出口、账单或 4核16GB/12Mbps/200DAU 混合容量。没有 cloud 操作、清理、采购、手机或发布。本增量独立审查仍缺，D 仅完成有界盘点与保留规则源码，端云成本/容量仍开放。
