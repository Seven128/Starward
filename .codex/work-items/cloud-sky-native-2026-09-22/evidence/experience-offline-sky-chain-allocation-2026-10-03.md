# 当前离线源与加工链的本机文件分配

本轮沿 PLAN D 可独立执行项，扩展此前“一个静态包”的范围到不同的离线源与加工工作路径。未重复 exporter、静态 HTTP、store 盘点、旧矩阵、影像加工或全源内容 SHA 重读；未下载、复制、切挂载、删除或发布。B 仍不能凭全图统计/颜色作背景扣除或去绿；完整图质不因本成本测量通过。

[测量脚本](../scripts/inspect-offline-sky-chain-allocation-2026-10-03.py)复用已有 Windows 文件属性/identity 函数，避免重新执行其旧标准包扫描。仅访问显式列出的当前月面缓存、当前六 field/18 frame 与18 fpM/CAS、科学母图工作目录、两共同显示候选、亮核试验、两科学出版、Prepared 母图/封存出版和月面服务源目录。没有递归追溯旧交接或扫描整个 output/主机。

两次属性扫描共4,004个不同路径/卷file identity，逐项长度、mtime、AllocationSize、link count，以及目录mtime/inode相同；当前来源小清单和六项保护文件前后 hash 保持。完整链观察4.685秒，无图像读入/解码/加工。通过真实原manifest字节预期核月面 TIFF 和18压缩frame长度，不把长度/mtime相同称为本轮重新核过原文件内容SHA、科学准入或权益。

## 实测与分类修正

原[测量结果](../../../../output/offline-sky-chain-allocation-1003-r1/result.json)，5,796B，SHA256 `f5ea5dcced23ccafb7e0274e1b9f4edb714d488a11f5a157ff164a608ab3c1c2`，全部逐文件结果在同目录 `file-readback.json`。原 `raw-moon-cache` 组实际包括本地 `venv`，不能把该组的全部长度外推原影像或生产依赖。

随后[分类脚本](../scripts/classify-offline-sky-allocation-2026-10-03.py)只消费保存的真实逐文件列表，不重复文件属性扫描；把月面 TIFF、两份range probe与已有离线处理环境分别记录。原记录不覆盖，[角色修正](../../../../output/offline-sky-chain-allocation-1003-r1/role-refinement.json)，3,176B，SHA256 `8fa9c6a7f5bba173b1a8a35e7f4a5cf49614e67f87f16fd027678ae04eab7502`，明确不采用原raw-only组义。

| 当前选定路径角色 | 路径数 | 逻辑长度 B | API报告分配 B（按不同file identity） |
| --- | ---: | ---: | ---: |
| 原输入、range probes与CAS/receipt | 41 | 4,324,517,831 | 4,324,598,352 |
| 已有月面离线处理环境 | 3,760 | 159,376,314 | 166,306,536 |
| 工作产物及月面服务源文件 | 203 | 905,730,498 | 906,314,000 |
| 选定路径合计 | 4,004 | 5,389,624,643 | 5,397,218,888 |

月面 TIFF 单文件为4,247,470,871逻辑B/4,247,474,176分配B，两个range probe17,825,792B。18压缩SDSS frame为57,308,910逻辑B/57,344,000分配B；18 fpM为1,881,658/1,921,024B；相机CSV/receipt30,600/33,360B。

科学母图工作目录91项709,476,297逻辑B/709,820,416分配B，包含数组、字段贡献及诊断，不是新的成品出版。共同显示candidate8项55,974,816/56,000,512B，跨扫描恢复candidate8项55,976,240/56,000,512B；两个版本确为不同file identity，不能因部分数组/结果相同就当已共享物理存储。没有计算这些文件可删除量、压缩收益或硬链接收益。

## 对交付与成本的含义

这约5.40GB的本机报告分配量是所选离线源、工具和工作产物范围，不是一个客户端请求、一个静态包、已部署的资源库或全主机用量。离线处理环境不因此成为生产服务依赖。源获取/离线加工与服务端成品/传输必须分别核算；对约709.82MB当前科学工作目录的保留也不能用约56MB一个显示candidate替代。既有904路由单包证据保持其范围，不把两次不同范围测量直接相加当成生产合计。

Windows FileStandardInfo AllocationSize 排除文件系统metadata、alternate streams、快照/共享存储内部，并非exclusive物理介质占用。未计其它历史候选、其余家族完整原源、OCI、数据库、日志、备份、失败stage与真实挂载/release/rollback引用全集；Linux180GB余量、预期配置容量、月出流量/费用与10/20混合冷进入仍 UNKNOWN/未验。原保留规则不变：没有TTL、清理许可或可回收字节。新增量独审 MISSING，自读回不替代最终验收；Goal保持active无预算。
