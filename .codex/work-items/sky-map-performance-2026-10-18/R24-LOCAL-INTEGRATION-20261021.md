# r24 独立优化与本机整合

2026-10-21。用户再次要求先完成可独立执行的工作，人工介入后置。本轮推进后端首读优化、拒绝一个负收益 Sky 候选，并完成隔离服务真实读回。没有上传数据、Git 提交/推送、生产部署、重建账号、重新恢复数据库或更改 VPN/配对。完整 Goal 和两项首要结果仍未完成。

## 保留的修复与验证

- [夜光首读修复](R24-NIGHTLIGHT-METADATA-REPAIR-20261021.md)已通过 14 项相关检查、API 类型检查和[独审](R24-NIGHTLIGHT-METADATA-INDEPENDENT-REVIEW-20261021.md)。独立定向检查 3 项通过，完整真实 r6 图层/PNG 与基线相等。每 release 两路完整 proof 校验只改善首读调度，不改变发布权威、内容、二进制预算或整体资源验收边界。
- 核对原 8799 listener/PID/入口后，仅将本任务 API 从 PID24720 更新为 PID45932，沿原只读 PG、禁提醒、SAMPLE_DATA 配置启动。PG55441/PID25424、USB 桥8798/PID40948及原环境保持。启动进程不等于就绪：一次过早 health 请求连接拒绝，随后真实 ready 日志和 health200确认可用，没有再次重启。
- 修前和修后均经实际 `GET /v2/map/night-light` 及返回的 image URL 取得 200；**完整 layer 对象和完整 PNG 字节相同**。真实发布是既有 `eog-vnl-v22-2025-gba-fixed-20261017-r6`，图像 4,276 B，SHA-256 `b6f09db480cb146e50acdb7a16e4d9567fb2751727136cbb6d6aa0288047be7a`。这次使用已恢复 PG 中的实际发布权威，没有用投影 repository 替代数据库。经 8798 桥再次读回 metadata/image200，完整对象及字节与 API 相等。
- 单次 HTTP metadata elapsed 为修前 568.93 ms、修后 331.47 ms；包含启动后的 DB、HTTP 和文件缓存条件，不以这两个样本建立性能结论。首读调度收益仍只取独立进程 A/B/B/A 的约296–305→151–153 ms，详原修复记录；手机可见收益未知。
- API 更新后取得新的匿名 Context201、完整 Sky200/967,175B/49hourly，天气仍为 SAMPLE_DATA。新的六字段 route 使用实际 Sky `context.dataRevision`；首次本地组装错误地把它等同 ObservationContext fingerprint，断言阻止写配置后已纠正，没有重发 resolve。备份 prepared 的 common/private config，再只替换“r22 云观星内存”的 query；未改 feedback.json，也未绕过旧绑定失效。

## 候选与未采用方向

[完整 Scene 对照](R24-SKY-EXACT-VIEW-CANDIDATE-20261021.md)证明“首遇流式、第二次才建表”在真实全天空 BSC/SAO 负载上更慢，因此拒绝，前端生产文件未改。共同精确旋转、静态准备和当前保守筛选已存在；不重复实现。GPU renderer 当前 SHA-256 `3aed31102c4ffd1437e3648f21d158a2893245112d24a0b9bf770cfb844a92c1` 与 r20 归因时相同，原 submit 大量低于时钟分辨率的证据仍不足以采用 typed-array pooling，本轮未新增缓冲或跳过绘制。

已审文件回收修复继续复用完整 r23 前端候选，不为后端独立修改生成重复小程序。r23 inspect 再次通过：source `36fa8bd03e984ab7d042c459579c8a2fd726fc4e8f58b10f6129a61b1b478a2f`，bundle `a5da291529569ee0483765cb63f38e6afea890351e6816e09daad1b4a5182c1e`，337件/5,035,024B，main余量88,619B。仍未激活到手机；r22原包保留用于同包工具对照。

Context只在原夜光 owner补充完整证明读取、每release限额和失败排空语义。`context:validate`及改动文件 whitespace检查通过；该校验不验证普通Markdown链接或产品事实。

## 本机保全与恢复入口

所有本轮原件在 `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r24-independent-20261021/`：`integration-summary.json`、`overlay/night-light-http-before/after.json`及私有metadata/PNG、桥读回、API日志、新Context/完整Sky/route、改配置前原件，以及两个独立分支的输入/结果。没有把私有坐标、完整Context或凭据复制进Git。

新API生产 owner SHA-256为 `b1be19128557997607582128f22dfdd1371b0f77811f766d85105d7187920334`。旧PID与首次恢复回执均为历史；恢复时仍先核实际进程归属，不能直接按本文PID操作。当前状态只由[HANDOFF](HANDOFF.md)维护。

## 仍需目标现场的结果

Stable最后的 WGC截图超时、UIA点击缺少geometry、官方授权握手未完成条件没有得到改变；本轮未重复相同工具/Heap清单。r22同包基线/第二图、r22六字段净响应、普通Play持续与退出、三层快速缩放/移动后的最终正确覆盖与资源回落均未验收。文件或metadata修复不证明无泄漏；云层 SAMPLE_DATA 不能代替真实供应结果。

用户回来后最小操作仍只有恢复可操作的 Stable 项目列表窗口：若出现旧项目导入提示，取消；若出现 Codex 连接授权，允许，然后告知窗口已可用。编译、普通预览、单指操作、采集和本机导出已获授权，由代理继续，不再要求用户重做失败的导出清单。没有新数据上传或权限请求。
