# r9：60秒正常 Play、暂停尾段与实际 surface 退休已观察

一次绑定 r9 的正常 Play 到达产品自身的 same-run Pause；实际取消回到04:30:00，产品 door 随后返回非空 Map。同一 session／surface 的 ready→retire-complete 已读回，关闭了原来“退休函数是否实际执行”的缺口。它没有证明 context 丢失、GPU/全部 native 释放或完整 B 通过。机器结果见 [R17-A1-R9-PLAY-EXIT-RESULT.json](R17-A1-R9-PLAY-EXIT-RESULT.json)。

候选为 app `413b8e0f97c46b99040e9cc5e78e0b81b6e2839575cb82c19f8b6e4170fb9eaf`、source `ac12fdd389fac80b1858c3376e43952020d38024279cf1d296a7fd9fd2872211`，337 files /5,002,086 B，buildGeneration27、review r9、feedback generation1。原 manifest、8份相关冻结源码、6份严格协议均逐字匹配；反馈和当前 phone session 绑定相同 app。范围为 development_feedback_only；runtime AppID 与手机整包字节未验。

本次只做文件分析、关键原图审阅和外部派生解码，不操作设备、IDE、ADB、服务、build、preview、Git，不改生产、PLAN、HANDOFF 或 preparation。原 gen26 UNKNOWN、8791/N05/R6、配对/VPN 均未触碰。

## 已连接、目标关联与执行层

实际手机有官方已连接浮层，4张原图显示非空 Sky/Map；公开目标返回 android 和当前页面，精确 source-bound 自有键的 ready/after 同 session、同 surface。真实 Play／Pause／Cancel／Map 变化和同源软件计数互相支持，足以证明当前手机关联调试链路在执行并有用，不能只凭 connected 标签得出这些结论。

但 android systemInfo、源码映射和自有键都不能独立证明 appservice logic VM 或 DevTools 采样器物理运行在手机。ready/after 全程勾选“使用工具端Storage”，持久化经过该调试代理 lane。复用 r7 Memory 只能称“官方连接的 appservice/debug target 中可归因的存活分配统计”，不能直接改称 Android 手机上 V8 堆。Android Appbrand PSS 是独立无线 ADB 对真实前台进程的观察，两层不可相减或当作同一 CPU/堆时间窗。LAN/WAN 传输本身不补齐执行位置、时钟和性能代表性。

## 实际画面与计量范围

全部4张原 PNG 与 sidecar 已核 SHA/字节并实际查看。另用现成 FFmpeg9.0.2、保留原 PTS，从3段原片选择13帧实际查看：Play5帧（04:30:00→04:30:03→04:30:07→04:30:11），Cancel4帧（04:31:00预览→04:30:00），exit4帧（非空Sky和露出的door→非空Map）。独立终图10:46:39.194Z为04:30:12/Pause，10:50:02.646Z为04:31:00/Play/预览，10:51:06.197Z已取消，10:52:59.595Z已到Map。未逐帧审完全部视频，更没有60秒连续录屏或物理FPS结论。原片实际容器长度分别14.995244、4.223367、5.959578秒，不能用请求15秒补造未编码画面。

metrics44,617 B、compact29,555 B，真实 r17-normal-input dispatcher（包含 aCorrelation）严格 validate metrics、validate terminal、match terminal 均通过，6份协议与r9 manifest匹配；不是去掉字段后放宽校验。metrics recordingStart1016ms、seal15021ms，实际 active window14005ms；时钟为Date.now wall-elapsed、非单调、有效分辨率未知，17,204次读无记录到 invalid/backward。这里的463次paint/callback/accepted/Scene finish、BSC8404、SAO666、16tiles、45°、实际非空星空证明工作负载，但不覆盖整个60秒；表面copy观察从实际Play附近开始，共492次。native glyph=0也不能证明文字热路径收益。

terminal 确认一次实际Play、一次pauseAttempt/Success。60秒timer稍晚到达，原relative≤60000ms合同使terminal时间为null，严格匹配仍通过；null不是0。另一个同run scalar回执给出Pause返回wall差60,015ms、result=true；仅有wall-stamp含义，不能当精确单调CPU耗时。start、15s metrics、Pause、retire均为reset epoch1：Play→Pause1,967次正常ready copy，metrics之后至Pause1,475次；Pause→retire再21次包含Cancel/菜单/导航和资源工作，不是纯idle copy。这些是软件调用返回，不能转为物理FPS。

## surface 退休

ready和after为同一source/session/surface1；构造、ready、retire attempt、complete均1次，rejected0，writeAttempt4/priorFailures0。ready node/display均1080×2241、selection1×1且layer存在、contextLost=false。after事件retire-complete/outcome returned，selection与四个尺寸写入步骤returned，实际node/display/selection均1×1且selection layer=false。原代码请求0，native读回1，不能写成实际归零。

contextExtension/contextLoss均unavailable，after contextPresent=true、contextLost=false。它记录当前边界实际未丢失context；不支持扩展并不自动成为泄漏。node/context present是函数内部观察到的局部变量，不能据此证明退休后被外部强引用。回执只覆盖最后surface，不是retaining graph。

已沿8份匹配冻结源码核对：生命周期先fence/cancel/清context，Page release清surface/display/node/GL refs及每帧owner，先renderer.dispose，再finally surface.dispose；renderer原有contributions/textures/buffer/program退休；surface原有selection/尺寸处理。未找到已证错误寿命。仍缺renderer子步骤的实际返回：surface finally完成不能单独证明renderer.dispose各步成功，也不能把代码中的delete当物理回收。

## 两个进程窗口

| 窗口 | 行数 / host span | PSS首 / 峰 / 尾 KiB | 尾−首 |
| --- | ---: | ---: | ---: |
| ready→Play→Pause→闲置 |13 /119.657s|1,469,322 /1,785,954 /1,779,162|+309,840|
| Cancel后的Sky→导航→Map加载/闲置 |8 /71.717s|1,534,197 /1,534,197 /1,469,281|−64,916|

各文件每行均一个绑定前台owner、foregroundOwnerVerified=true、无替换，host.performance.now bracket顺序有效。第一窗末4行覆盖31.365s，PSS范围1,779,162–1,779,343，仅181KiB；按root无后续输入的操作顺序及terminal已写入的host元数据，是暂停尾段，仍显著高于初值。第二窗不是71.717秒纯退出后drain，前两行已下降98,927KiB；不能把全部回落归因退出。跨文件slot0不独立证明同PID，数值接近第一窗基线也不能当匹配优化收益。

第一窗Unknown尾−首+307,820KiB、Native Heap+27,792、graphics summary+1,184；第二窗分别−45,200、+17,616、−692。Unknown不是JS/native/GPU allocator，分类与summary可能重叠，不能相加。host/phone/video时钟未校准；不以15秒计数除119秒内存变化，不扣除r7约16MiB采样后给剩余命名。

## 当前决策

这轮证明正常完整路径超过原14–20秒区间后可达自身Pause、取消与退出，且当前surface边界确有退休效果；PSS先增长、暂停尾段趋稳，后续窗口下降，尚无足以直接修的泄漏owner。继续复用r7精确map的分配归因、CPU及text/direct-action阴性，不重复采资格、不恢复gen24、不开相邻disable变体。

下一步先一次说清官方调试执行目标的物理语义，再在本来必要的下一完整候选用普通预览复用现有Android进程观察，核对无remote调试扰动的持续使用。仅当出现具体cleanup失败回执/错误，或普通路径仍有会改变修复选择的保留问题，再补窄的renderer退休/retained-generation事实；重型heap/原生trace不是默认追加关卡。普通预览长期稳定、物理native/GPU归还、retaining roots及完整B/Goal验收均保持未验。

输入与派生图索引：`E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/a1-r9-play-exit-review-20261019/review-input-bindings.private.json`，SHA `62ade2cb8daaf455ed88909b9c478d1c3d9131390fac526191ec4cd436313a2b`。所有原件本次before/after SHA一致；私有body、路由query、账号/设备标识与原始像素不入Git。该索引不声称已冻结复制临时phone目录，root退休候选前仍需按原owner保存必要原件。
