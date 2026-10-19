# A1 r7 手机入场录像与事件独立复核

2026-10-19；审查者 `review_r7_entry_native_result`；`development_feedback_only`。结论为 **FAILED_NATIVE_ENTRY_POSITION_COHERENCE**。r7 在揭示结束后确实重新测量，并在声明隐藏的状态再次发送 `animated:false` 的真实原生定位、读回正确 offset；刻度声明可见后仍收到 offset 0。原片首次可见的刻度已经是 12:00 / 14:00 / 16:00，文字仍为 19 日 04:30:00，尾段与独立终图均保持该错误。r6 的后来动画归位没有在本次出现。

应用 SHA `c9874bb3c40e0167be3f840577ac02cb9ec3a86ba8539830a74b3b946b1f3ae1`，buildSource `528b3d8a99ca4c87958e10b01ac7af7040b031e5270e601e61bcf2b3949cf755`，337 文件 / 4,995,907 B，buildGeneration 27、反馈 generation 1。已冻结 `RSqzvS / VZiklD / Y554SA` 的绑定、一次官方业务成功回执和原片；独立实看 prebinding 与 bound 标签图，均为 **R17 正常Sky关联 A1 r7**。只关联该开发候选；runtime AppID 与手机完整包字节没有读回。

## 原始像素

原片 `recording-1792395938901.mp4` 为 H.264、1080×2376、**25 个编码帧**，时间基 `1/90000`，容器时长 **13.321000s**，最后一帧 PTS **9.960156s**。复用本机 ffmpeg 9.0.2，使用 `-copyts -fps_mode passthrough -enc_time_base 1:90000 -frame_pts 1` 直接解码全部帧，没有 trim、补帧或重置 PTS。25 份 PNG 与 25 个原始 PTS 一一对应；两个非视频 data stream 的零时长提示不被解释为视频丢帧。请求 15 秒不是连续取得 15 秒画面的证据，平均编码帧率也不是物理 FPS。

下列 frame 为**零基编号**，不沿用 r6 报告的一基编号：

| 编码样本 / PTS | 实际结果 |
| --- | --- |
| 0–2 / 0–4.928756s | r7 诊断控件仍可见，尚未进入可读时间面板。 |
| 3–6 / 5.083411–5.618011s | 天空保留，未见可读面板。 |
| 7 / 5.711211s | 已有极淡字段影子；不能把“首个清楚可辨”当作物理首次出现。 |
| **8 / 5.726444s** | 面板、19 日和 04:30:00 六字段已可辨；没有可见轴线或刻度。 |
| 8–20 / 5.726444–5.943856s | 无刻度恢复状态持续出现在这些编码样本中；`时间尺定位中，重试` 与 `04:30:00` 在同一行明显叠字。后者的具体文案同时由本次物化源码核对，不将难读文字任意转写为其它状态。 |
| **21 / 6.485833s** | 首个具有清晰轴线/刻度的编码样本。数字仍为 04:30，但轴下是 **12:00**，右方是 14:00、16:00。没有可见的正确 04:30 选中刻度。 |
| 22–24 / 6.573167、6.599311、9.960156s | 同一错误尺窗保持；没有编码样本显示恢复到 04:30。 |
| 独立终图 `screen-8335fb95-…png` | 19 日 04:30:00 与 12:00 / 14:00 / 16:00 的错误组合仍在。sidecar 时间为 07:45:38.901Z。 |

原栅格中，frame 21–24 的蓝轴候选 bbox 均为 **x539–540 / y2052–2097**；轴下第一白刻线 bbox 为 **x540–542 / y2127–2153**，直接可读标签是 12:00。其右方白刻线中心序列为 589、636.5、684、732…，四个尾段样本相同。定位阈值只用于寻找既有像素，不新增验收容差。正确 04:30 刻度并没有在这些原始帧中出现，不能给它编造一个实测屏幕坐标。

frame 23→24 之间有 **3.360844s** 的稀疏间隔；末帧之后还有容器保持时间。这里证明的是这四个编码样本及独立终态均错误，不认证其间每次物理呈现，更不声称连续稳定 15 秒。六字段日期与时间在可辨面板中未变。

**视频 PTS 与手机 `Date.now` 没有校准锚点。** 文件名、终图 `capturedAt`、主机命令耗时均不是录制起点，以下手机毫秒不能与视频 PTS 相减。

## 98 事件的边界

从冻结的实际 dispatcher 及全部本地依赖独立 strict 验证通过：`starward-r17-phone-probe-v3` / `wide-time`，扩展为 `starward-r17-ruler-entry-v2`。pretty 文件为 33,694 B，**实际 compact JSON 为 15,846 B**，符合 32 KiB body 上限；不能按 pretty 字节误判。ring 98/98 全保留，dropped / overflow / exportOmitted / rejectedWindowEvents 均为 0。

ring 从实际 wide-time 动作立即开始。基础 Scene 指标仍延迟 1 秒，elapsed 14,011ms，ring stop 为 15,011ms；`reason=manual` 是旧字段，不被解释为人工在该时刻按停止。没有 Play、pause 或 terminalExport；静止入场的 Scene 计数不用于证明性能。时钟为 `Date.now`、毫秒、wall-elapsed、非单调保证，名义分辨率 1ms、有效分辨率未知；115 次读取无 invalid/backward。

下表均相对手机 ring 起点 `1792395925111`；layout、position 与 native revision 是不同 owner 的计数，不能混作一个版本：

| 手机相对时间 / 事件序号 | 保留的真实事实 |
| --- | --- |
| 87ms / 22 | preparing=1、layoutReady=1、ticksVisible=0；48 行、rowsVersion=1、activeIndex=committedIndex=33。 |
| 343–345ms / 25–32 | 首批公开 geometry current：axis left191.5 / width1，tick0 left184 / width17、tick1 left201 / width17，offset0；step17、zero0.5；目标 index33 / left561.5、verify=1。 |
| 470ms / 34 | 首次真实 `nativeScrollToRequested`，left561.5、animated=0。 |
| 620–622ms / 40–43 | actual offset=561.4222412109375，当前 pending/rows/nativeRows 有效；第一次 alignmentAdmitted。 |
| 659ms / 46 | preparing=1 下 ticksVisible=1；这只是声明，整个表面尚可透明。 |
| 663–682ms / 47–56 | 几何门换代，取消/退休旧定位与投影；opening 的 props 为 layoutReady=0、alignmentRequired=1、ticksVisible=0。旧准入未被拿来直接显示。 |
| 720ms / 57 | onScrollBeforeGuard 报 offset0、dragging=0。 |
| 796→1009/1010→1032ms / 58–72 | open 启动、两次原 surface motionFinish；最终 ready=1、layoutReady=1、ticksVisible=0，重新发起 measure。transitionEnd 只许可读布局，不当作 native 呈现完成。 |
| **1257ms / 74–75** | **fresh** current geometry 再次读到 offset0；step17、zero0.5，非复用准备态投影。 |
| 1259ms / 78–81 | 同一 index33 / left561.5，verify=1、nativeRowsCurrent=0；唯一 native owner 进入第二次定位。 |
| **1401ms / 83–84** | current native node / scrollTo 存在，第二次真实 `scrollTo` **animated=0**；当时 props 声明 ticksVisible=0。没有偷换成可见动画纠正。 |
| 1420→**1527ms** / 87–93 | scroll 先报561.422241；后续 current native offset / pending read 均为561.422241，rows 与 pending 都有效，第二次 alignmentAdmitted。 |
| **1554ms / 94** | preparing=0、layoutReady=1、alignedRowsCurrent=1、alignmentRequired=0、ticksVisible=1。 |
| 1596ms / 95–96 | 另一次 current native read 仍为561.422241；pending 已清空。此时 `rowsCurrent=0/nativeRowsCurrent=0` 是 `pending?.rows` 的比较结果，**不证明行或原生节点更换**。 |
| **1597ms / 97** | onScrollBeforeGuard 再报 **offset0**，disabled=0、dragging=0。 |
| 15011ms / 98 | stop；97 与 98 之间没有记录到新的 query、定位、准入、手势或生命周期事件。 |

全 ring 的 props 只有 owner1、rowsVersion1、48 行、index33 和同一供给范围；没有手势接管、resize、hide 或行替换记录。post-reveal fresh 测量、非动画定位、actual offset 与再次准入已经执行，不能继续把 r7 失败归咎于“这些根本没跑”。另一方面，1597ms 后没有第二条公开 offset read，不能把 r6 的“另一次 geometry 再次确认0”移植到 r7；本次的后续事实是 native scroll 事件0与独立错误像素。

物化源码中 `observePosition` 在准入后清除 pending 并设置 alignedRows；axis 与 ScrollView 都用 `visibility` 随 ticksVisible 切换，同时无刻度恢复 Button 条件卸载。`onScroll` 在非手势时只允许当前 pending 且接近目标的事件触发读回；准入清掉 pending 后，本次 offset0 不会再次请求 read 或撤回刻度资格。这解释**已有软件反馈边界为什么未处理本次后来事件**，不证明改变哪一个渲染属性造成它。

## 能决定下一动作的结论

第一条尚未成立的目标边界已收窄为：**endpoint 后的正确原生 offset 和准入，仍未穿过实际刻度可见更新而保持到可辨画面**。r7 已消除 r6 的“准备态准入跨揭示复用”路径，却没有交付正确的第一可见尺窗与终态。不能用测试通过、终态后来才纠正或隐藏旧错误来结案。

下一项最小真实观察应复用当前同候选的有效普通真机调试通道，针对该次可见更新，读回**实际已安装 ScrollView / track 与相关祖先的身份/结构、可见样式、rect 和 scroll offset**，区分旧定位对象、布局变化和可见更新后的失位；声明 props 及 `scrollTo` 返回不能代替这些事实。若公开通道不能提供所需身份/样式，保留该能力缺口，再用有明确单一变量的实际原生 primitive 对照回答这条边界，而不是继续依据 hook fixture 派生相邻修复。无需重做 CPU 调研、重复原样 ring、增添固定等待或承诺平台内部 remount 根因。

本次没有 native node identity、实际 computed style 或 Taro→原生合成提交确认；**visibility、transform、节点变化及具体平台 reset 的内部原因均 UNKNOWN**。与 sibling 更新或 Taro 写入相关的源码调查另由其独立 owner 负责；本报告不先将猜测升级为已证事实。

## 冻结与适用范围

外部原件归档为 [a1-r7-entry-motion-trace-archive-20261019](E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/a1-r7-entry-motion-trace-archive-20261019)。首次冻结前后及副本 SHA 一致，报告写入前再次逐份读回全部归档副本：

| 组 | 文件 / 字节 | manifest SHA256 |
| --- | --- | --- |
| 原片、3 组 PNG/sidecar、session/feedback、metrics、构建/官方绑定 | 21 / 2,751,933 B | `043d00a70d47cc5b328930f2712bb04caa958259db1c089cbdc9d8f876dae0a0` |
| 物化源码、JS/WXML/WXSS/map | 12 / 3,628,104 B | `e62c49771c2225787efc3d20e410fd6bf479a0e61bf520e60da332769110e85e` |
| 完整 dispatcher 依赖与注入 | 9 / 86,796 B | `2be14473b0847b6c72d3a7eb7e9eb7b114881b0bd1d7428c0c028af40219e222` |
| 当前采用 HTML 与原独审参考 | 4 / 187,731 B | `e856c7bce3450f8a6b9acb5a6681c7cab4c357bf76c1922aabaf917678abb672` |
| 原 PTS 全帧、联系表、明确 crop、解码/测量/关联结果 | 39 / 10,843,186 B | `e4f6ae138e7dc43a5f2db56883eada9d66297634abab957430a63a23ac4d1599` |

当前 r7 map report SHA `127036c4b2f1be50df11e33735d13ddf0da4e324227489797d4df3b3a6bcf9cb` 已冻结。该 Sky JS/map 与报告哈希读回一致，6 份相关 TS/TSX 与 sourcesContent **逐字一致、不做换行归一化**。这里复用全候选既有独审，只再次核本次物化责任，不重新跑构建/全套测试。WeChat 再打包坐标不得直接当作这些 Taro map 坐标。

采用 HTML `5385664345158066168` SHA 为 `4c6cfc021e5f3c02db4036eab437fe64d25f57c8adbd49864a755ce598345c79`，已核相关六字段/重复步进/现实上限、显式应用/取消与最终中心 `.76→1` / 180ms 覆盖。原 `adopted-stitch-render.png` 仍缺失，未重生成或替代，**不认证完整设计一致性**。本次只读文件、解码原片和写独立结果，未操作设备、ADB、IDE、feedback/session、服务、源码、构建/预览或 Git；未改 PLAN/HANDOFF/preparation。原 8791、N05、R6 消息、gen26 UNKNOWN、旧候选及配对/VPN 均不由本审查触碰。

此样本不认证 r7 跨日/取消、拖动/惯性/重抓、必要 hide/resize、Android/iOS 普遍性或最终候选；不改变 A、B、Terrain 和完整 Goal 各证据 owner 的当前状态与剩余义务。默认 Python 缺 PIL 是本次离线工具准备问题，已复用 bundled Python/Pillow 完成；没有下载或安装依赖，也没有将它当作产品失败。
