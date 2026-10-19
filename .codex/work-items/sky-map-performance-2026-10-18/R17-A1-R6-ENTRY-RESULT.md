# A1 r6 手机入场录像与事件独立复核

2026-10-19；`development_feedback_only`。结论为 **FAILED_NATIVE_ENTRY_POSITION_COHERENCE**。首次可见面板仍显示 19 日 04:30，但原生尺视口停在 12:00，随后经过下午和午夜才到真实 04:30 刻线。终态对齐不能证明入场修复完成。

应用 `62ac5b330d8a735eadc43efc174e2e6f9b633ff7c543f38575e1fd38447e82b1`，buildSource `95d1e91d1c68ee154de1251bd41c32852938e0bfcab13feda7e144741ce0c7c9`，337 文件、4,995,513B，buildGeneration 27 / 新反馈 generation 1。root 提供一次官方业务成功及 `Fd7HTZ / TBA9R6 / wSzRgg` 的实际标签绑定；本审查独立看见已存截图和原片中的 `R17 正常Sky关联 A1 r6`。这些只关联开发候选，runtimeAppID 和手机完整包字节未读回。

## 原始像素

原片 `recording-1792392518525.mp4` 有 **40 个编码帧**，容器时长 8.252611s，最后帧 PTS 6.654333s。复用本机 ffmpeg 9.0.2，以原 `1/90000` 时间基逐帧直接解码；没有 trim 或重置时间轴。首轮 PNG 输出时间量化曾报警，显式原时间基重解码无报警，两轮 40 份 PNG 全部逐字一致。请求 15 秒不等于取得连续 15 秒视频，帧数和容器平均帧率均不当物理 FPS。

帧 1（PTS 3.158022s）是 wide-time 按钮按下态；帧 2–4 未见可辨面板；帧 5（3.948589s）低透明度面板开始可辨；帧 6（3.963289s）清楚显示 19 日、04:30:00，而轴下轨道为 **12:00，右侧 14:00 / 16:00**。正确的 04:30 刻线此时在视口右方之外。这里是同一供给行集合的原生位置错误，不是事件所证的供给窗口替换。

| 原始帧 / PTS | 实际 04:30 刻线中心 x | 相对固定轴 x540 |
| --- | ---: | ---: |
| 25 / 4.714856s | 993 | +453 |
| 29 / 4.780500s | 689 | +149 |
| 33 / 4.858022s | 559.5 | +19.5 |
| 34 / 4.873667s | 549 | +9 |
| 35 / 4.891078s | 540 | 0 |
| 39 / 6.654333s | 540 | 0 |
| 独立终态 `screen-2558a6a5-…png` | 540 | 0 |

以上按原 1080×2376 栅格，依据 02:00 标签为 index28、五个半小时间距到 index33=04:30、选中长线和曲率交叉识别。蓝轴终态 bbox 为 x539–541、y2051–2097。靠轴时选中白线顶部被蓝轴遮住，不能盲选最长白条。没有新增像素容差。

正确 04:30 刻线出现后，从右侧连续趋近中心；本次编码样本未见它再越到轴左侧，但首次可见视口已经失败。帧 35–39 的五个编码样本均在 x540，PTS 间存在 1.598289s 的稀疏间隔及末帧保持，不能据此宣称连续稳定 15 秒。没有独立可见的空尺状态；透明准备期没有面板不等于可见空尺。六字段日期和时间文字在面板可辨后未变。

**video PTS 与手机 `Date.now` 没有校准锚点。** 文件名及终态 PNG 的 `capturedAt` 不是开录时间；下表的手机毫秒不能与上述 PTS 相减或当作物理呈现时刻。

## 74 事件的有限因果结论

从冻结的协议及其完整本地依赖独立验证通过：`starward-r17-ruler-entry-v2`，74 事件全部保留，dropped / overflow / exportOmitted / rejectedWindowEvents 均为 0。ring 从真实 wide-time 动作立即开始；基础 Scene 指标仍延迟 1 秒，elapsed 14,008ms，ring stop 在 15,014ms。旧基础字段 `reason=manual` 不被解释为人工在该时刻按了停止。静止入场的 Scene/Play 计数不用于证明性能。

手机时钟为 `Date.now`、毫秒、wall-elapsed、非单调保证，名义分辨率 1ms、有效分辨率未知；本次 85 次读取无 invalid / backward。下列时间均相对 ring 的手机起点 `1792392502983`：

| 手机侧相对时间 | 实际字段与动作 |
| --- | --- |
| 55 / 77ms | rowsVersion=1、48 行、activeIndex=committedIndex=33；先 layoutReady=0，后 preparing=1、layoutReady=1；ticksVisible=0。 |
| 334 → 336ms | 同批公开几何 current；axis left191.5/width1，tick width17、中心距17，实际 offset0；投影 step17、zero0.5；目标 index33 / left561.5，verify=1。 |
| 461ms | 第一次原生 `scrollTo` 目标561.5，animated=0；随后公开 offset 读回。 |
| 599 / **600ms** | current offset=561.422241；pending、owner、rows 都有效，发出 `alignmentAdmitted`。 |
| **627ms** | preparing=1、layoutReady=1、alignedRowsCurrent=1、alignmentRequired=0、ticksVisible=1。这是声明可见性，面板仍可整体透明，不冒实际可见。 |
| **642ms** | preparing=0、layoutReady=0；alignedRowsCurrent=1、alignmentRequired=0、ticksVisible 仍为1。motion 随后记录 opening。 |
| **662ms** | `onScrollBeforeGuard` 报实际 offset0；dragging=0。 |
| 990 / 991 → 1005ms | 两次 surface motionFinish；随后 ready=1、layoutReady=1，ticksVisible 仍1。 |
| **1269ms** | 第二次独立同批公开测量 current，offset 仍0，step17、zero0.5；不是只靠一条 scroll 事件推定位置丢失。 |
| 1270 → **1410ms** | 同一 index33 / left561.5，verify=0、nativeRowsCurrent=1；第二次原生 `scrollTo` 为 animated=1。 |
| 1780ms | onScroll 报561.422241；ring 之后无其它位置命令。 |

完整 retained ring 的 rowCount、rowsVersion、active/committedIndex 和供给时刻范围未变，没有手势接管记录；两次真实原生定位请求目标相同。首次准入后 offset 再变为0、二次测量确认0、可见状态未撤回，以及之后动画纠正，均有各自直接字段，不能以 600ms 的一次准入推翻后续像素。

物化源码对应也已核对：`spot-sky-page.tsx` 的 `observePosition` 在匹配读回时清除 pending / alignmentRequired 并设置 alignedRows；`ticksVisible` 又允许 layoutReady=false 但 positionedIndex 等于 previewValue 时保持显示。第二次 `positionIndex` 因现有 rows/准入状态得到 verify=false，走原生动画。`sky-overlay-motion.tsx/.scss` 拥有 preparing→opening→open 的表面透明/缩放阶段；`r17-ruler-scroll-position.ts` 是本次 Sky 的 task 观测副本，真实调用原生 `ScrollViewContext.scrollTo`。

这些事实与“准备到显示的边界丢失原生位置、旧准入未失效”相容；没有原生节点 identity / remount 证据，**不能把具体平台 reset、remount 或某个 setter 宣布为已证根因**。query、nextTick、offset 回执和 scrollTo 返回也都不是物理呈现完成。应在原 owner 收敛这条边界：让实际已安装的选中位置穿过揭示过程，失去资格时不先显示 offset0 再动画归位。无需原样重采 74 事件、猜偏移、加通用等待计时器或重开 CPU 调研。

## 归档与范围

外部归档：[a1-r6-entry-motion-trace-archive-20261019](E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/a1-r6-entry-motion-trace-archive-20261019)。原始录像、6 组 PNG/sidecar、metrics、候选绑定和协议共 **23 文件 / 5,177,478B**，manifest SHA `ad497b1a59cdca0e40b46ec909bb0b8bcc73a4b250cf99f8a3a4c069ecd92fd3`。其中额外的 `screen-a98d687b-…png` 是冻结时已有的 06:52:00.820Z 后续截图，仅保全，不当作本次入场或终态证据。冻结前后及副本 SHA 一致；原件、旧批次均保留。

另冻结 **12 份物化源码 / JS / WXML / WXSS / map，3,625,187B**；6 份 JS/TS 与本次 map 的 sourcesContent 逐字一致，map/JS 与原 binding `c478b21f…` 读回一致。其 manifest SHA `9c2147e32ea6ca94c80d7e9eaaf2d6132790afa252ec312f8a988425bdb42f59`。完整严格协议依赖补冻 4 份、38,847B，依赖 manifest SHA `83ec1cb71827f13d2d60360a425d5b3bc18e2613f600aa17ef89be7df479b106`。像素测量 SHA `640646cea79ad4ec8b1191a8317798d10cae2d6dad688e73aeaa2cf796791196`；97 份派生解码/联系表/轴线图共34,802,892B，manifest SHA `11bc93a0b9bf95c445f2eb2aa885b08e998fbe90050ec2f64521bbee84e0d96b`。报告写入前重新核对全部冻结副本。

适用约束为当前 Sky 时间预览/取消 owner、共享固定中心尺与实际时刻一致性、当前采用菜单的中心缩放入场，以及 performance-investigation 对时钟/呈现/完整证据的区分。本审查只判这次入场；不认证整页设计一致性。只读查看文件及解码，未操作手机、ADB、IDE、feedback/session、服务、源码、脚本、构建或 commit，未改 PLAN/HANDOFF/preparation。

仍未验：r6 新的跨日/取消过程，拖动/重抓/resize/隐藏及供给窗口替换组合，A 真实手动输入到首个有效结果，B 正常 Play allocation/暂停排空/退出，Terrain 文件与原生完成，runtimeAppID/手机完整包、Android/iOS 普遍性、最终候选及完整 Goal。r4/r5 有效证据保留原范围，不被本次升级或抹除。
