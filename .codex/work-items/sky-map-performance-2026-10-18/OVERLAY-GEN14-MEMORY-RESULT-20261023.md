# Gen14 Map 必要操作与关栅格后的有限资源观察

2026-10-23，普通 `development_feedback`，不是最终验收或诊断注入包。结果接续[观察入口](OVERLAY-MEMORY-OBSERVATION-NEXT-20261023.md)及[实际手机批次](OVERLAY-GEN14-PAN-RETIRE-PHONE-20261023.md)，不改变 PLAN。

## 实际条件与证据绑定

同一 USB 手机、同一 gen14/session；bundle `0f76b93f5b8164baab27e34e2e34d61a0c390849601adfb586a2e2ad570cc1ee`，345 件/5,021,505 B，普通自动预览且 vConsole 可见。当前服务是新启动的本机任务 API 与 17 项 terrain publication；这一数据/服务改变不与旧动态输入作性能收益对照。手机字节及 runtime AppID 未直接读回；原 watcher anchor 的 `productCandidateVerified=false` / `productRunId=null` 保持，另以私有 `product-binding.private.json` 关联本次已知候选和服务条件。

只运行既有只读 watcher：第一次 13 点/15 秒配置，实际首尾 bracket 为 2–195,722 ms；第二次为已经关闭 terrain/LIGHT 后的 5 点/10 秒静置，实际 2–45,678 ms。没有重放手势、强制 GC、清缓存、重启小程序、进入 Sky 或新增压力。两轮共 18 个有效点，每点前台 owner 与 `/proc/PID/stat` startTicks 前后均验证；Root 读回全部私有 target 后确认两文件同一 PID/name/activity/startTicks。公开证据不写这些身份值。

私有 owner：`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/gen14-overlay-memory-20261023`。两份 ndjson、各自 start/end anchor 与 process sidecar 保持原字节；`readback.private.json` 记录逐行/时序/身份和 SHA 校验结果。13 点文件 SHA `49b6caff10d13bbecbfb7952e8e253e1ee6585f98ef22d6bc04fe5228d6506c7`；5 点文件 SHA `02695861cc436e2a17779d53a3342a503d69c5d5011f6bf7923f974914eb6f98`。两轮均正常 observer_returned，行数与 completedRowsSha256 全等。

## 阶段覆盖及实际画面

原 13 点窗口结束比“关闭两层并实际查看、交还输入权”的保守 host wall 边界早 89.637 秒，**没有关层后 idle 样本**。不按配置时长、录像文件名或末次内存下降倒填 off 阶段。两个必要 record-swipe 与 ADB 观察可能重叠，相关点只能解释为普通操作/采集混合窗口；host wall/performance 端点不能约束中间时钟漂移，也不是设备输入或像素时刻。

第二个 idle watcher 在上述已观察 off 边界之后 276.247 秒开始，两个窗口之间未采样，不连成连续曲线。其间没有本方手机输入；所有点均为相同前台实例。Root 实际查看正常 LayerSheet off 与返回 Map 截图：terrain unchecked、LIGHT unselected、CLOUD selected；所选历史时间没有可用云预报、没有可见云多边形。只称 terrain/LIGHT raster-pair off，不能称全部图层关闭。

Root 用原有本地解码 helper 实看两段 MP4 的开始、3.0、3.6 秒与末帧。首段实际 5.472611 秒：地标发生持续位移，旧地形/夜光在已观察帧随地图保持覆盖，地点中面板在后段收起。第二段实际 5.569944 秒：已查看帧与终点没有可辨认地标位移，**回访没有成立**。未追加手势；具体输入命中/目标接受原因另归边界核查。采样 seek time 不是帧回调 mediaTime，不能由这些帧宣称物理延迟、FPS、持续未松手或每帧无留白。解码浏览器/本地视频 server 均在 helper finally 中关闭。

## 有限资源结果

数值均为整个前台 Appbrand 进程、KiB。PSS/RSS/SwapPss 和分类不相加，不把 Unknown/Private Other 等同某个 JS isolate。

| 窗口与点 | total PSS | total RSS | Swap PSS | Native Heap PSS | Graphics summary |
| --- | ---: | ---: | ---: | ---: | ---: |
| 操作前首点 | 4,399,517 | 2,257,524 | 2,511,606 | 306,522 | 167,412 |
| 原 13 点末点（双层 off 尚未确认的混合窗） | 4,298,730 | 2,156,968 | 2,511,590 | 294,022 | 167,412 |
| 另一次 off 后 idle 首点 | 4,362,287 | 2,220,532 | 2,511,590 | 292,634 | 171,620 |
| idle 约 12 秒 | 4,296,587 | 2,154,832 | 2,511,590 | 291,658 | 171,620 |
| idle 约 23 秒 | 4,296,099 | 2,154,344 | 2,511,590 | 291,658 | 171,620 |
| idle 约 35 秒 | 4,295,979 | 2,154,224 | 2,511,590 | 291,642 | 171,620 |
| idle 约 46 秒 | 4,296,571 | 2,154,816 | 2,511,590 | 291,642 | 171,620 |

原窗口结束前约10.985秒已经开始关地形，末点不可标成“任何关层之前”；后续 LIGHT off 与返回 Map 的已观察边界尚未来到，仍没有合格的双层 off 后 idle 点。操作前已有高基线，不能归于本批 pan。off 后有限窗口 PSS/RSS 首点后下降约 64.2 MiB，后四点范围仅 608 KiB；Swap PSS 不变，Native/Graphics 没有逐点上升。该窗口**没有新增持续上升信号**，不值得为了等更好回落而延长本轮或再加相邻压力样本。

这仍是高位残留且有未采样间隔；不能区分合法缓存、分配器保留、其他页面历史驻留与泄漏。无法证明 ground-overlay/file pin/native/GPU 全部释放，也没有修复既有 Sky 高负载内存根因。没有把总窗口差除以两次手势时长，不把第二个未移动操作当一次有效回访，不与其他会话数值拼增长曲线。

## 当前决定与未完范围

本轮停止内存观察，保留高基线和有限解释。继续叠层连续交互的实际缺口：先核第二次操作为何未产生位移，复用已回答的 native-region/onUpdated、r20 源读/父图与回收证据；不重跑资格或盲改缓存、Map key、层数。完整持续拖缩/加载中接管/离页、非空真实云源、最终细节与资源回收仍未验收。UI 的原生 Picker 数据依赖、完整按压释放和最终同条件采用稿对照继续保留，R27 未激活，未把此次 Map 静置变成 Sky 压力窗口。

全部原件在私有 owner；没有提交、推送、外传、删除冻结文件或修改账号/N05/R6。两个 watcher 已终态，phone agent 已结束并关闭，当前手机 input/capture 归 Root，无录屏/输入/内存采样在途。
