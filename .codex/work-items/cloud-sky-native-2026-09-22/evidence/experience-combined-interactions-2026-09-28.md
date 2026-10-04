# B1/B4 当前候选组合交互开发观察

Goal工具再次回读active、无预算。沿唯一PLAN的浏览/识别→时间/跟踪→资料来源返回继续；没有重做选型、月面加工或手机投递。本记录为当前原生DevTools开发观察，不是手机验收。

## 条件与证据边界

- 官方CLI auto打开`apps/wechat-miniapp/dist/weapp-check-sky-journey-0928`，JOURNEY0928候选，9420官方SDK连接；API为本任务当前localhost:8787的LOCAL/MEMORY_TEST服务。没有云部署、数据库耐久性或手机整包证明。
- 公开示例观星点22.4826799N、114.5557147E，Asia/Shanghai。逻辑Canvas390.4×844；官方截图197×423。对象为中文“织女星”搜索得到的HR:7001/Vega；地景、星座开，W3关。
- 原始已确认语义仍有效：星座连线/插画/名称共享缩放渐显与开关，全天总览不绘，开关不绕过视场门槛。当前25°详细层与45°隐藏层是现有调参，不把数值阈值升级为用户要求。
- 官方SDK触摸事件证明当前消费者路径及状态变化；不证明手机手指质量、WXML/原生Canvas合成或真实姿态。模拟器星图区仍覆盖普通WXML控件；实际图已查看，不能把SDK可操作和ARIA读回当成控件视觉可用。

## 实际结果

| 用户结果 | 当前观察 | 证据与限制 |
| --- | --- | --- |
| 星座可切换且保留星场 | 21:00、25°、Vega定位下ON→OFF→ON，天琴/武仙线画从实际Canvas消失后恢复；星点保留，ARIA可见星座同步变化 | [ON](experience-constellation-on-2026-09-28.png)、[OFF](experience-constellation-off-2026-09-28.png)、[恢复](experience-constellation-restored-2026-09-28.png)均已查看；[像素记录](experience-constellation-toggle-pixels-2026-09-28.json)排除系统栏/胶囊/底部区域，197×356星图区ON/OFF变化21988px、ON/恢复0px。不是全天可见性或名称合成的手机验收 |
| 时间拖动先预览，收起可取消 | 21:00时间尺真实scroll/touch路径预览21:30，Canvas已呈现13:30Z/4004星；收起后回13:00Z/4040星、重开显示21:00已提交状态 | [预览实际画面](experience-time-preview-2026-09-28.png)已查看；不能单凭入口route selectedAt未变判定取消，因为该参数不是提交后的当前状态owner |
| 跨午夜更新真实当前Context | 点击23:30再00:00，Canvas15:30Z→16:00Z；页面地点时间ARIA显示09月29日00:00；Mini持久状态和真实BFF GET均为16:00Z/revision8 | [过滤读回](experience-combined-context-readback-2026-09-28.json)。夜间localDate仍09月28日符合既有中午到次日中午的观测夜合同，不能误当民用日期未更新。MEMORY_TEST读回不是服务重启耐久性证明 |
| 跟踪随预览变化，取消不迟到提交 | 00:00选择Vega跟踪；00:30预览时Canvas16:30Z/4125星、跟踪中且目标仍中心195.2/422；取消回16:00Z/4121星。之后发送迟到touchend，BFF再次GET仍revision8/16:00Z | [跟踪预览](experience-tracking-preview-2026-09-28.png)已查看；本地当前提交与恢复成立，真实姿态/后台组合仍未验 |
| 资料与来源返回保留当前观察 | 00:00打开同一Vega资料，方位305.0°/高度19.5°；进入独立来源页、官方navigateBack，资料身份/位置及25°/16Z/4121星/跟踪均保留 | [来源页](experience-midnight-vega-sources-2026-09-28.png)、[返回并关闭资料](experience-midnight-source-return-2026-09-28.png)均已查看。来源页是实际WXML输出；返回后Canvas可见，模态的手机视觉合成待验 |
| 跟踪中的缩放/拖动有连贯语义 | 25°→45°→25°保持Vega跟踪；45°无星座、25°恢复天琴座。单指向右50px拖动切手动，touchcancel恢复原跟踪与中心；再次相同拖动并touchend保持手动，标记x195.2→245.2；点标记后重新跟踪回中心 | [拖动完成画面](experience-tracking-pan-2026-09-28.png)已查看；[再跟踪](experience-tracking-restored-2026-09-28.png)保留原始截图。触摸取消走正式Canvas handler；没有修改React私有数据或mock姿态 |

当前runtime留在公开示例点，民用09月29日00:00（16Z），Vega跟踪、25°，星座/地景开、W3关，时间及资料关闭。实际BFF最后读回HTTP200、revision8。入口route仍为原21:00，只是入页参数；当前Context、已呈现帧和页面时间才是这轮结果依据。私有Context ID、账号/凭证和完整storage未输出或保存。

## 剩余工作与执行顺序

本轮没有发现需要改源码的新反例，不为了增加测试数重跑既有类型/构建或全量行为检查。此前地景恢复修订的检查和当前候选字节继续有效；本轮新增的是实际组合消费者证据。

继续PLAN中的地平附近空间感/大气可读性及图层/连续浏览实际差距；通用模拟环境不依赖现场测量。正常跟随首开空场、总览回最新姿态、完整旋转校准/断流、后台恢复、不同代表对象/新月面与M51仍有本代目标缺口。手机新月面未推送，旧D证据不升级；干净候选、Android/iOS组合、真实性能/官方包体/费用和独立审查继续开放。
