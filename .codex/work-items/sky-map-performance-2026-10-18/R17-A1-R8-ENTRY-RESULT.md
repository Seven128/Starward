# A1 r8 首次时间尺入场独立复核

2026-10-19；审查者 `review_r8_native_entry`；`development_feedback_only`。结论为 **PASS_CAPTURED_NATIVE_ENTRY_ALIGNMENT_AND_NONOVERLAP**：本次原片首个捕获到的可见刻度样本与04:30一致，两张独立终图仍一致；可辨恢复文案与当前时间分行，没有 r7 的叠字。90/90 软件事件确认 endpoint 后重新测量、声明隐藏的非动画原生定位、实际 offset 读回和再次准入均执行，没有记录到 r7 的准入后 offset0 事件。**这通过本次捕获样本的入场边界，不认证物理首次帧、连续15秒或其它交互。** r7 的失败不被改写。

## 候选与证据关联

应用 SHA `a4b55d3d876a65f731d0e044eb043e0961c05718a2d2a81c1f40aa502be8eb3e`，buildSource `3362e2d0595b7871835b0232eb43f2ac233c5a5aa012f609c5eb40e04df4bcb0`，337文件 / 4,996,606B，buildGeneration27、review8、反馈generation1。冻结的 feedback、bound session、官方结果与本次 metrics 关联一致；官方为明确业务成功，taskId为null。独立实看 prebinding、bound 和原片标签，均为 **R17 正常Sky关联 A1 r8**。它们关联此开发候选；runtime AppID及手机完整包字节仍未读回。

复用 [r8完整构建独审](R17-NORMAL-R8-BUILD-REVIEW.md) 与 [稳定原生表面独审](SKY-RULER-STABLE-NATIVE-SURFACE-REVIEW.md)，不重新审方案、构建或运行全套测试。本次另外核当前 Sky JS/map 精确哈希及6份相关 sourcesContent 与物化源码逐字一致。map SHA `47210b6176c2139df41ee50fdfa23f82df2e0685b71ba9805f009ff913a42e53`，JS SHA `8b960a93f53e969dd38773fa84d0daafd36b24113b590594aa5ba025d203b126`。WeChat 再打包坐标不能直接当作这些 Taro map 坐标。

## 原始像素

仅分析首次入场原片 `recording-1792402289090.mp4`，189,468B，SHA `7a87563abdbe2bece1d946ea40a8d690802e09e53a032c65328ceb88e932a1c5`。H.264、1080×2376、**18个编码帧**，timebase `1/90000`，容器时长 **5.439811s**，最后帧 PTS **4.924222s**。复用本机 FFmpeg9.0.2，以 `-copyts -fps_mode passthrough -enc_time_base 1:90000 -frame_pts 1` 解码全部18帧；没有 trim、补帧或 PTS 重置。已实际查看全部样本的完整联系表、关键原帧及明确标注的 crop。两个非视频 data stream 的零时长提示不被解释为视频丢帧。

以下 frame 均为零基编号：

| 编码样本 / PTS | 实际结果 |
| --- | --- |
| 0–1 / 0–3.423700s | r8诊断控件可见；1中 wide-time 呈按下态。 |
| 2–3 / 3.573178–3.748000s | 控件已消失，天空非空，尚无可读时间面板。 |
| 4 / 4.192278s | 已见淡的日期、04:30与恢复文字影子；不把下一个清楚样本当物理首次出现。 |
| **5–16 / 4.206767–4.408633s** | 2026-10-19、04:30:00可辨，尚无可见轴线/刻度。当前标签04:30:00在上，`时间尺定位中，重试`在下；没有同一行叠字。 |
| **17 / 4.924222s** | 首个捕获到可见轴线/刻度的编码样本，也是原片末帧。日期/六字段/当前标签仍为19日04:30:00；中央刻线与蓝轴重合，尺窗可读00:00、02:00、08:00，与index33和实际offset所指04:30一致。恢复文案已消失。未见 noon 错窗或可见纠正滑动样本。 |
| 两张独立终图 | `screen-90071c4f-…png`（09:31:29.090Z）及 `screen-929e425c-…png`（09:31:42.927Z）相同SHA `ac74109a96206999df7144b4d27f2a0622d4b240c0ad8f425bc09799d7a89f2c`，675,212B；实看均为相同正确尺窗及04:30:00，恢复文案消失。6份已冻结PNG的sidecar与实际字节均精确相符。 |

原栅格 frame17 蓝轴候选 bbox 为 **x539–541 / y2052–2097**，中央白刻线候选 bbox 为 **x539–541 / y2095–2128**，中心均x540；终图也可见中央刻线与轴重合。阈值只定位已存在的像素，不是新增验收容差。当前04:30文字在轴上方，不能误称为刻线自身另有04:30标签；周边尺窗、实际offset与当前索引共同关联其选择位置。

frame16→17之间有 **0.515589s** 未采到中间编码样本；原片只有一个带刻度的编码样本。两张终图相隔13.837s，是两个独立端点，不能证明间隔内每次物理呈现。请求15秒并不证明连续取得15秒画面；视频编码帧率、时间戳间距均不是物理应用FPS。此结果不声称完整的 scale/fade 曲线符合采用资源，也不排除未编码间隙中不可见于现有证据的短暂状态。

**手机Date.now、视频PTS和主机时间没有校准锚点。** 文件名、终图capturedAt、主机命令耗时不是录制起点；下面手机毫秒不与PTS相减。

## 90事件的边界

新导出的 `baseline-r17-1-5rv6ei7bpt.json` SHA `76e57f0b84a572918d4302eaf215f591f8d8c8e3142a43e869e8979f5be0aec9`。按冻结的实际 `r17-normal-input-protocol.mjs` dispatcher 及完整本地依赖 strict 验证通过：`starward-r17-phone-probe-v3` / `wide-time`，扩展 `starward-r17-ruler-entry-v2`。9份协议/注入文件与r7字节相同。pretty32,306B，实际compact **15,452B**，符合32KiB body上限。ring90/90完整，dropped、overflow、exportOmitted、rejectedWindowEvents均为0。

ring在实际wide-time动作立即开始；基础Scene指标延迟1000ms，recordingStartRelativeMs1002，elapsed14,009ms，seal/stop15,012ms。`reason=manual`是旧字段，不等于在该时刻人工停止。无实际Play、pause或terminalExport；静止入场Scene计数不用于A/B性能结论。时钟Date.now、ms、wall-elapsed、非单调保证；名义分辨率1ms、有效分辨率未知。101次读取无invalid/backward，所有事件同epoch0/window1。

下表相对手机ring起点 `1792402274066`；layout、position、native revision属于不同owner计数：

| 手机相对时间 / 序号 | 保留的真实事实 |
| --- | --- |
| 64ms / 22 | preparing1、layoutReady1、ticksVisible0；48行、rowsVersion1、activeIndex=committedIndex33。 |
| 292–297ms / 25–32 | 初始current geometry offset0；step17、zero0.5；目标index33 / left561.5、verify1、measured1，唯一native owner开始定位。 |
| 439ms / 33–35 | node/scrollTo存在；首次真实scrollTo left561.5、**animated0**。 |
| 583–584ms / 40–45 | current native实际offset561.4222412109375；pending/rows/nativeRows有效；第一次alignmentAdmitted。另一次read同值，pending随后已清空。 |
| 616ms / 46 | preparing1下ticksVisible1；仅是声明，整个表面仍可透明。 |
| 620–632ms / 47–56 | 揭示几何门换代，退休旧定位/投影；opening props为layoutReady0、alignmentRequired1、ticksVisible0。 |
| 762→974→993ms / 57–71 | open启动；两条原surface motionFinish；ready1、layoutReady1、ticksVisible0，并重新发起measure。不是物理呈现回执。 |
| **1239–1240ms / 73–74** | **fresh endpoint geometry已保持offset561.422241**；first tick left−377.422241/width17、second−360.422241/width17，axis left191.5/width1；step17、zero0.5。不是重用准备态projection，也不是r7的endpoint offset0。 |
| 1243–1260ms / 77–81 | 同一index33 / left561.5、verify1、measured1进入第二次定位；当前props仍ticksVisible0。 |
| **1365ms / 82–84** | current native node/scrollTo存在；第二次真实scrollTo left561.5、**animated0**。 |
| **1487ms / 86–88** | current actual offset561.422241、pendingRevision11/index33、rows/nativeRows均有效；第二次alignmentAdmitted。 |
| **1503ms / 89** | preparing0、layoutReady1、alignedRowsCurrent1、alignmentRequired0、ticksVisible1。 |
| **15012ms / 90** | stop；89后无新query、定位、准入、offset0、手势或生命周期记录。 |

全ring只有一次onScrollBeforeGuard（445ms，offset561.422241，dragging0），没有r7的准入后offset0；只有两次非动画真实定位。所有props均为owner1、rowsVersion1、48行、index33及同一供给范围；没有手势、resize、hide或行换代记录。1239ms首两刻线geometry按既有线性投影可得index33中心约192.077759、轴中心192，差约0.077759CSS px；这是**已有projection的推导**，不是另一次直接查询selected tick rect或新增阈值。

## 结论与保留范围

本次足以将r8该次入场的**首个已捕获可见刻度、独立终态和恢复文案分行**记为通过，继续既定实际交互验证；不需要再重做相同方案、CPU或相同入场ring来重复证明这些样本。fixed ScrollView/兄弟槽修复与正确结果相容，软件offset也穿过了endpoint和准入；但没有读取native instance身份或computed style，**不将其内部根因升级为微信必因visibility或父cn重挂载**。

本报告不认证guard准入后实际命中退休、拖动/惯性/重抓、刻度点击、跨日/取消、失败重试、必要hide/resize、Android/iOS普遍性或最终普通包。后来的swipe原片 `recording-1792402382467.mp4` 及其终图明确排除，另有owner。采用HTML SHA仍为 `4c6cfc021e5f3c02db4036eab437fe64d25f57c8adbd49864a755ce598345c79`，复用现有独审的采用范围；原采用PNG仍缺失，没有生成替代或认证完整视觉一致性。A、B、Terrain及完整Goal其余义务不变。

## 冻结

原件保留，外部归档为 [a1-r8-entry-20261019](E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/a1-r8-entry-20261019)。冻结时逐份核对原件读取、复制及原件再次读取的SHA，写报告前又逐份读回全部副本：

| 组 | 文件 / 字节 | manifest SHA256 |
| --- | --- | --- |
| 原片、6组PNG/sidecar、session/feedback、metrics、官方/构建/原独审关联 | 30 / 4,801,135B | `d51668f915d8f7a91fa02af4db06961557375d325b882b80f9e86a7c935f04e1` |
| 物化源码、JS/WXML/WXSS/map | 12 / 3,630,801B | `150424bedfd048f499294ae3dc3c0ab5cfcedc6b7f2824a48645d3fc871f34e0` |
| 完整dispatcher依赖与注入 | 9 / 86,796B | `613a1046e0379e0994bf6f792e90fc3fcfd8853b9c450dc00c77ee9a2fe2f81a` |
| 同一采用HTML与r7原始结果参考 | 3 / 203,597B | `77db7a4241d89b1d784402a86d4c2990e5828e5dad8b27b0a050b65b9c97540e` |
| 原PTS全帧、明确crop/联系表、解码/测量/关联结果 | 47 / 9,902,947B | `8f18ca56128baf14e04a1101e51733c69c2ba67a5abe8d499e9fab37b3053725` |
| 有限文件复核工具 | 6 / 21,620B | `808f62b48b990316f45994cecd5886ff90f6923b23f5afd6a0c316104710d7e4` |

本次仅文件读取、离线解码与两份结果写入；未操作手机、ADB、IDE、服务、feedback/session、生产源码、构建/预览、Git或coordinator文档。未扫描私人存储；新metrics只在既有有限collector目录定位。没有安装依赖；复用现有外置FFmpeg与bundled Python/Pillow。
