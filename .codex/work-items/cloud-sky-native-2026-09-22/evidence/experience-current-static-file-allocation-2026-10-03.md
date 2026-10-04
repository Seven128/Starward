# 当前完整静态包的本机文件分配读回

继续 D，复用[上轮真实904路由标准导出](experience-prepared-real-static-egress-2026-10-03.md)。本轮不重新导出、HTTP、image processing、复制包、store prepare/dry-run、云部署或删除；只读实际文件的长度、身份及分配量。原旧版/下载offer继续保留。

[脚本](../scripts/inspect-static-file-allocation-2026-10-03.py)用 Windows [GetFileInformationByHandleEx](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getfileinformationbyhandleex) 只读属性，取得 FileStandardInfo `AllocationSize` 和 FileIdInfo；句柄逐项关闭，拒绝reparse文件/目录，扫描前后identity/length/mtime/allocation相同。904payload实际全SHA与index再次相符，另明确三metadata：index.json、image-artifact.json、delivery.caddy。首次漏列 delivery.caddy 的断言失败在输出建立前，原脚本/原因保于[初始记录](../../../../output/background-allocation-initial-attempts-1003-r1/observed-failures.json)，没有漏掉后静默通过。

| 责任 | 路径 | 逻辑长度 B | API报告分配 B |
| --- | ---: | ---: | ---: |
| 904payload | 904 | 46,566,544 | 48,350,816 |
| 包metadata | 3 | 908,412 | 913,792 |
| 合计 | 907 | 47,474,956 | 49,264,608 |

907个不同卷/file identity，link count最大1，按独立identity分配合计亦49,264,608B。与上轮294个内容SHA不同：相同内容在此包确为不同文件身份，不能把28,511,281B唯一内容算术量冒称此包实际分配。这提供当前真实成本范围，但没有测硬链接/压缩/删除收益，也不据此引入存储重构。

[结果](../../../../output/static-file-allocation-1003-r1/result.json)3,483B，SHA `431fd93fc8f1e2a9dff2d2a983dc19fa655a646ad2f3b56e2f106dbaa6ed026f`；逐文件读回在同目录file-readback.json。index SHA `7bba733647d4170d60fda6205843c45955767b783cea820242dcc5ae28680488`；production/tag和dirty source界限仍归上轮标准导出绑定。

这是本机Windows一个现有包的 AllocationSize，不是exclusive物理介质用量；未计filesystem metadata、alternate streams、快照/共享存储内部，不能认证Linux生产180GB余量或云端IO/RSS/容量。也不是单旅程传输：包含明确允许旧版和地景原图下载，不向客户端全库加载。实际mount/receipt/rollback/backup引用全集、store/source/generation/failed stage全部分配、OCI/raw源/数据库/日志/备份以及整小程序成本/混合业务容量仍未验；无回收许可、无TTL或自动删旧版采用。
