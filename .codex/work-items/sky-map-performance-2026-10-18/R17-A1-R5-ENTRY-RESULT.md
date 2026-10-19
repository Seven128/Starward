# A1 r5 手机入场录像与事件独立复核

2026-10-19；`development_feedback_only`。结论为 **FAILED_NATIVE_ENTRY_POSITION_COHERENCE**。本次未再出现 r4 的下午、绕午夜错窗，但真实 04:30 刻线仍由轴左侧移到轴右侧；只有独立终态 PNG 已归位。不能以终态对齐判定入场修复完成。

应用 `9b50adb657a881b351b7a7bef62b94752e0a25c9f20440c38f439193aedbb674`，buildSource `40840ed278f7ccbda98723dd565cc512f98eba147b867afca2cb926c5a64eacf`，337 文件、4,989,501B，buildGeneration 27 / 新反馈 generation 1。官方成功和绑定操作由 root 提供；本审查独立看见已存截图及原片中的独有 `R17 正常Sky关联 A1 r5`。标签和事件只能关联开发候选，不能证明手机完整包逐字读回。

## 原始像素

原片 `recording-1792388028664.mp4` 有 35 个编码帧，容器时长 4.046911s，最后帧 PTS 4.030611s。请求 15 秒不等于已取得连续 15 秒视频。逐一直接解码全部原帧，保留原 PTS；没有 trim 或时间轴重置。原帧 2（PTS 3.042111s）是 wide-time 按钮按下态，帧 3 诊断面板消失，帧 4（3.238033s）首次可辨时间面板；日期保持 19 日，时间为 04:30。

| 证据 | 真实 04:30 刻线中心 x |
| --- | ---: |
| 帧 10，PTS 3.337689s | 502.5 |
| 帧 15，3.429044s | 503 |
| 帧 21，3.814889s | 520 |
| 帧 22，3.830644s | 559 |
| 帧 28，3.931333s | 572 |
| 最后帧 34，4.030611s | 577 |
| 独立终态 `screen-2206b3ca-…png` | 540 |

蓝色固定轴中心约 x540，终态实际 bbox 为 x539–541、y2051–2097。以上按原 1080×2376 栅格，结合 02:00 标签、五个 30 分钟步距、所选刻线样式及弧形轨道定位；不是取最近的普通条纹或蓝轴。终态所选白线顶部被蓝轴遮住，不能用“最长白条”盲选。数值是编码像素近似值，不引入新容差或物理 FPS 指标。

原片结尾仍右偏，没有取得稳定尾段。终态 PNG 可证明其后已归位，不能确定中间回位时刻。没有校准 video PTS 与手机 `Date.now` 的锚点；文件名和 PNG `capturedAt` 不能充当开录时间，不能把 PTS 与下面的毫秒数强行相减。

## 42 事件的有限因果结论

独立运行 `r17-ruler-entry-protocol.mjs` 验证通过；42 事件全部保留，dropped / exportOmitted / overflow / rejectedWindowEvents 均为 0。该扩展从实际 wide-time 动作立即开始；基础 Scene 指标仍延迟 1 秒，自动导出 elapsed 14,009ms。这是静止入场观察，Scene/Play 计数为 0 不代表性能为 0。

| 手机侧相对时间 | 实际事件 |
| --- | --- |
| 63ms | rowsVersion 1、48 行、activeIndex = committedIndex = 33；selectionReady=1、layoutReady=0；初始 scrollLeft 574.464、animated=0。 |
| 201 / 237ms | onScroll 与独立公开 offset 读回均约 574.5778；后者仍属于当前 owner / rows / revision。 |
| 418 → 435ms | 两次 surface motionFinish 回调；随后 layoutReady=1，prop animated=1。 |
| 679 → 683ms | 唯一一次几何返回仍 current：axis left191.5/width1，前两 tick width17、中心距17，offset574.5778。投影 step17、zero≈0.5；唯一一次 setScrollLeft 与 nativeMove 目标均为561.49997。 |
| 687 → 813ms | prop 仍 animated=1；806ms 节点回调 current，调用同一目标 `scrollTo(... animated:false)`，807ms 返回；813ms onScroll 报561.4222。 |

本次 rowsVersion、选中索引与时间范围始终未变；没有手势接管、row 替换、旧代节点回调或多次 nativeMove。这些解释没有本次证据支持。初始名义步距 17.408 与实测 17 不同、初值约574.46与实测目标约561.50不同，均已直接观察。

纠偏同时存在声明式动画 prop 和原生非动画指令，像素中的越轴与两种指令竞争相容；单次观察仍未隔离它们的因果。唯一测量在实际 surface 回调之后、layoutReady=true 时发起，未见旧的 opening 阶段测量。`nextTick`、同批 query、onScroll、scrollTo 返回均不是屏幕呈现完成；不能以813ms的 offset读回推翻录像里的位移，或计算“原生耗时”。

下一步已不需要照原样重采相同 42 事件。修复应收敛入场与首次实测纠偏的定位所有权，解决首个可见名义投影偏差，并避免同一次自动纠偏同时启动动画与非动画 writer；保留后续手势及回弹语义。对这项有辨别力的改动，再复核第一可见正确刻线、是否越轴及稳定结果即可。当前证据不授权猜偏移、添计时等待或重写天空调度。

## 归档与未验

外部归档：[a1-r5-entry-motion-trace-archive-20261019](E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/a1-r5-entry-motion-trace-archive-20261019)。原始录像、5 组 PNG/sidecar、metrics 和关联文档共19份、4,449,935B，复制前后及副本 SHA 全部一致，原件保留。manifest SHA `a103e445a80c61357f3e126adf843b040e9d0bc4042ade69a5eb25d8307304e4`。另冻12份 materialized 源码、对应 JS/WXML/WXSS/map，共3,590,205B；6份 JS/TS sourceContent 与本次 map 逐字一致，map/JS 与原 binding 读回一致；其 manifest SHA `fb73b5cbdb2748438a6346e2eb1d915a60461480f72ba80233ed0b007a370f8a`。

外部 `review.private.json`、`ruler-entry-decoded.private.json`、`pixel-measurements.private.json` 和派生图 manifest 保存详细方法与原始索引。没有操作设备、ADB、IDE、feedback/session、服务、源码、构建或 commit，未改 PLAN/HANDOFF/preparation，原件和旧批次保留。

本次仍未验：跨日/取消在 r5 的新过程、手动拖动/重抓/resize/隐藏与替换组合、首帧实际物理呈现、Android/iOS 普遍性、完整设计一致性、A 手动输入到首个有效结果、B 正常 Play allocation/暂停排空/退出、Terrain 文件与原生完成，及完整 Goal 其它义务。r4 的有效跨日/取消证据保留其原范围，本次不把它提升为 r5 或最终候选验收。
