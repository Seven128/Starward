# 真实 Prepared 标准导出与 Caddy 出口（本地开发）

本增量推进 PLAN D 的独立项，复用原三张 Prepared PNG 和现有标准 exporter、实际 API controller/Prepared owner、Caddy 配置及出口 owner。显式开发登记不改变普通 registry；M51 矩形仍 FAILED，没有源重加工、云部署/公开发布、原 BFF/watch 重启或手机操作。

## 当前标准资源与兼容寿命

[脚本](../scripts/experience-prepared-static-egress-2026-10-03.mts)显式加入出版 `8eb8336aa5a75d104807327acab5990f38e0e22000713ab639a4c95cd443a802`，manifest SHA `23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1`。实际标准输出共904路由/46,566,544B payload，其中 Prepared 三PNG合1,315,239B；所有 staged 文件 hash/字节读回并在试验后再核。输出publicationHash `2fcd028957ff8f1b7d9a9f7d62eed6c1fbe79d8ba1f749a254630eff51db1304`。[image-artifact](../../../../output/prepared-static-egress-1003-r1/standard-export/publication/image-artifact.json) SHA `be9a276a1f00c5c86bcdadf27d6fcf87e74ae041fa95561eee101eb862d5b0ab`。revision 使用当前 HEAD，但当前源码 dirty 且另有绑定；不能称干净 HEAD/OCI 交付。

[缓存库存分析](../scripts/analyze-prepared-static-inventory-2026-10-03.mjs)没有 HTTP/服务/下载，只复用当前 exporter index，核深空 owner 与当前 manifest 的允许旧版集合。[结果](../../../../output/prepared-static-inventory-1003-r1/result.json)4,003B，SHA `d89378c573fa425793ba88d81dd69e2784eeefda8061dc557cdf900b1e744f27`。初次写错 artifact 层级在输出建立前失败，修正实际位置后完成，未重跑 exporter/HTTP。当前765深空路由=5版本×51对象×3档；当前153路由4,563,738B，四个明确允许旧版分别153路由，共17,733,156B。这不是765个新对象，也不是每个客户端都传五版本。

| 家族 | 路由 | payload B |
| --- | ---: | ---: |
| 星座 | 90 | 2,086,002 |
| 深空当前及允许旧版 | 765 | 22,296,894 |
| 银河 | 1 | 703,555 |
| 地景（含下载原图） | 5 | 16,622,597 |
| 月面 | 3 | 2,339,985 |
| 行星静态文件 | 6 | 187,372 |
| SDSS | 18 | 336,244 |
| 广域W3 | 13 | 678,656 |
| 显式 Prepared | 3 | 1,315,239 |

总904路由只有294个不同 payload SHA，唯一内容长度28,511,281B，最大同payload路由数5。这个算术量不是物理块占用、可回收字节或删旧 URL 许可；仍需实际 mount/receipt/回滚/备份引用全集。去掉显式 Prepared 的901路由/45,251,305B只是本包减法，没有另做默认导出。旧136项/22,954,411B历史 artifact 保原代次，不能当作当前完整库；当前路由库存也不能当作参与单帧/单旅程的客户端资源。

## HTTP 和真实出口分类

复用本机已缓存 Caddy 2.11.4 Alpine digest `sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648`，`--pull never`，readonly 本地挂载和临时 container；只调整 loopback listener、internal TLS、临时真实 API upstream 和健康 fixture。证书由本地 CA 验证，没有全局信任安装。原业务服务不动；容器完成后停止并移除，证据/原文件保留。

实际 overview GET=181,742B，If-None-Match=304/0B，HEAD=0B且content-length181,742；静态标记存在、Prepared API文件调用均零。四个 HTTP cohort 各客户端 manifest仍走API、三级图片通过 static/API 两条路径逐一核真实SHA。仅两并行图片槽，实际按 exporter 顺序 detail/medium 后 overview；不是实际页面粗图先行旅程。脚本原注释“progressive”过宽，结果取得后仅改注释说明真实顺序，不改结果/执行副本或重跑无变化矩阵。

| 路径/客户端 | 图片请求 | 图片响应体 B | metadata B | Prepared API文件调用/返回 B |
| --- | ---: | ---: | ---: | ---: |
| static/10 | 30 | 13,152,390 | 58,320 | 0 / 0 |
| static/20 | 60 | 26,304,780 | 116,640 | 0 / 0 |
| API/10 | 30 | 13,152,390 | 58,320 | 30 / 13,152,390 |
| API/20 | 60 | 26,304,780 | 116,640 | 60 / 26,304,780 |

243条实际 Caddy access记录全部 `optical_published`；static200=92条/39,638,912B、static304=1条/0B、API200=150条/39,807,090B。API部分含图片 baseline及两种路径的metadata。客户端读取响应体合79,446,002B，与日志 `size`合计一致。日志已移除 request/resp_headers，未留URL/query或身份敏感字段。`size`是响应体，不是 HTTP/TLS/重传/平台计费出流量。

static避开90次 Prepared owner 文件调用及39,457,170B返回处理，这证明分流行为；不证明CPU/RSS下降或速度改善。loopback static阶段548.8/1025.5ms，API386.4/699.3ms；本机 Docker 路径/OS缓存/同进程 driver+API 不可用于生产时延收益。未限12Mbps、未实际 Scene/普通混合业务/目标配置。客户端没有文件缓存，但主机文件系统与OS缓存热。

条件模型中，10/20客户端都取一对象三PNG+manifest，总响应体13,210,710/26,421,420B；理想12Mbps共享出口仅响应体串行下限8.80714/17.61428秒。只是数学下限，排除协议/其它资源/业务且对象未采用，不能当首可用时间、实测12Mbps时延、月费或200DAU容量。

[原结果](../../../../output/prepared-static-egress-1003-r1/result.json)3,936B SHA `4b2f7f962ea17abb839e57de1049654cd9ff62043c8539e087e731b031397db0`；[请求账本](../../../../output/prepared-static-egress-1003-r1/request-accounting.json) SHA `9a2871a709a9f78f3fbb7bed6d6379b26f6cf4a47428fd48f9d519b1eccbd158`。首次从根目录启动因 tsconfig decorator失败，尚未建立输出；复用 worker cwd 后通过，没有新增安装或启动排查。PNG/生产代码/保护输入前后同字节；最后仅任务注释及记录更新。

## 保留的交付缺口

本轮补真实 standard export→API/static→条件响应→出口body字节，未认证默认Prepared/质量/来源Back、实际 cloud release/rollback、磁盘总引用/物理占用、干净交付、新增独审或整小程序200DAU容量。继续真实引用与全产品成本模型、10/20冷进入混合业务及实际客户端/服务峰值；生产预期4核16GB/12Mbps/2000GB月/180GB，测试4GB保持，不以本机实验升级其状态。
