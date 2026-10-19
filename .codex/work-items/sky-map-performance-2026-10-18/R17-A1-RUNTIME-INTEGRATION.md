# A1 当前运行接入与证据边界

2026-10-19，用户携手机离开，本对话Goal实际paused；新对话优先不需要手机的工作。r10跨日真实结果见[R10独审](R17-A1-R10-CROSSDAY-RESULT.md)，普通播放只保[部分证据](R17-A1-R10-ORDINARY-PARTIAL.md)。沿原 PLAN 复用已验证路线。本文件记录运行/工具边界及历史条件；实际候选身份由[R17-NORMAL-A1-PREPARATION](R17-NORMAL-A1-PREPARATION.md)拥有，唯一当前动作由[HANDOFF](HANDOFF.md)拥有。旧会话成功、超时、PID或窗口标题不提供现在的输入授权。

## 当前 r10 已交付，跨日通过；手机离开期间只做离线工作

r10基于已push的生产HEAD `69401c097572799234e6b97478a4a1ddfe06c810`，包含已通过133/133、Miniapp TS5.9.3 noEmit0及独审的跨日pending连续性修复；Product39246751994与Context39246759692均实际success，链接及提交范围见[当前交付验证](CURRENT-DELIVERY-VERIFICATION.md)。app `077d3aeb3ffd874efabf9b2907cb7ef90b446305a9f029a64bf07400581c3094`、source `e7e558d27d1b0c1c0b748bfd7c8bf56e0b33aa8270e5bdcd15edb57b1ada480e`，337files/5,003,601B，main1,993,952B、静态余量103,200B。

[任务接入](R17-NORMAL-R10-BUILDER-INTEGRATION.md)、[接入/地形文件身份独审](R17-NORMAL-R10-INTEGRATION-REVIEW.md)与[完整构建独审](R17-NORMAL-R10-BUILD-REVIEW.md)均PASS/无P1/P2；真实requestedTimePresentation计量锚已适配，生产selection与依赖不变。完整1,583物化输入/1,573生产/25模板、两份app和31外置map/7,305,672B均已字节绑定。r10 30/30、地形owner17/17与5条实际hook软件端到端结果只证明接线，不证明手机效果；本次普通预览没有新CPU/Allocation归因需求，未重做旧资格或坐标解码。

独立feedback `C:/Users/777/AppData/Local/Temp/starward-device-feedback-ncOpxo`，prepared `generation-000001-1GLGwG/project`；仅一次官方preview exec67914明确业务success、无taskId，原gen26记录逐字节未变。root在实际非空Sky打开计量，看到独有“A1 r10”后绑定。**保存的r10会话（当前手机不可用，不允许输入）是 `C:/Users/777/AppData/Local/Temp/starward-device-feedback-ncOpxo/starward-device-test-Klvb4h`**；r9 z6lbss、r10 prebinding4haboM及所有旧session退休输入。runtime AppID与手机整包字节仍未读回，范围是development_feedback_only。

本次以普通预览送达，当前未建立remote调试；r9 debug163252880已经实际关闭并枚举absent。唯一旧source窗226625804（r9-gen27）待root核对r10最新完整源码同步后退役；未知辅助窗不杀，操作仍需当前真实观察。root独占设备、IDE、feedback、build/preview与服务现场。

r8发现的跨日等待回退夜景P2已有[源码修复](SKY-TIME-PENDING-CONTINUITY-FIX.md)及[独审](SKY-TIME-PENDING-CONTINUITY-REVIEW.md)，并由[r10真实过渡独审](R17-A1-R10-CROSSDAY-RESULT.md)确认更新中保持白昼、取消终态回原时刻，保留取消字段短暂先后变化。普通预览播放仅有[部分证据](R17-A1-R10-ORDINARY-PARTIAL.md)，完整A/B仍未完成；用户携手机离开，先离线审原件并推进独立交付。既有目标供给key、惯性/重抓/必要恢复、Apply/iOS及全部剩余义务继续保留。

## r9 已退休输入的有效播放、surface与执行层证据

r9 app `413b8e0f97c46b99040e9cc5e78e0b81b6e2839575cb82c19f8b6e4170fb9eaf`、source `ac12fdd389fac80b1858c3376e43952020d38024279cf1d296a7fd9fd2872211`，337files/5,002,086B，完整构建/双app/源码/maps及有限任务差异独审通过；其生产HEAD3818b440已push且两CI通过，**不包含后续69401的跨日pending连续性修复**。当时feedback26UyKk/gen1/s2S6bX仅一次官方preview，exec32765 exit0、明确业务success、无taskId；实际独有r9 label后绑定z6lbss。此输入与更早r8 x20PZ8、r9 prebinding EA4PwA均已退休。

[r9实际独审](R17-A1-R9-PLAY-EXIT-RESULT.md)已确认正常Play到60.015s自身Pause、至少31s暂停尾段、Cancel回04:30及door返回非空Map。source-bound同session/surface1 ready→retire-complete成立，实际node/display/selection为1×1、selection层移除；context扩展unavailable、contextLost=false，不能称GPU全部归还。15s metrics只覆盖14.005s active/463次paint，不冒充60秒全窗。两次进程watch已完成，PSS未给出JS/native/GPU泄漏owner，普通预览持续B仍欠。

r9退役前运行档案425件/34,363,242B冻结于外部`normal-existing-resume-20261019/r9-before-r10-20261019/runtime-manifest.private.json`，SHA `a40f027c2405b3bfa9534d7ef8cc24412a55c50b0304d0429e81223754d67e9e`，44件不可变审查原件均保留。首轮复制与guarded capture并行时session.json可变元数据变化，历史审阅版本未恢复为同一字节；中间与最新会话版本分别保存，不能称45/45历史原字节复现。六件owner另有owner-manifest，原r9 app/maps未改。r8退役前82件/30,633,097B的manifest9d3cca40…及原app/maps亦保留。

[执行层核对](PERFORMANCE-STATUS.md)结合本机Nightly2.02.2610092自动`remoteAppservice:true`/`cdpEnabled:true`、同appservice公开Android/Map及document/navigator均undefined、手机独有label和真实动作，支持当时r9的2.0手机逻辑目标。LAN→WAN只切传输，不等于1.0 fallback；WAN命令/面板等待不能算手机CPU，当时勾选工具端Storage的回执保调试代理条件。该核对不倒填r7未采字段或停止时刻，也不冒称普通预览r10已建立remote。

r8原生与连续输入继续由[入场](R17-A1-R8-ENTRY-RESULT.md)和[交互](R17-A1-R8-TIME-INTERACTION-RESULT.md)限域拥有：90/90、捕获可见刻度正确、不叠字；实际拖动/跨日终态/取消成立，9latest首次accepted24–70ms、末30ms。这些历史结果不扩大为完整A/B。

## r7 有效 allocation、精确映射和真实退出

r7 directSky的一次公开remote调用仍返回official automator timeout，但实际debug106432750打开，因此没有重发。手机LAN自动失败转WAN，root仅确认产品提示，原VPN/配对未动。GUI Console的公开安全platform/route表达式真实返回android/sky/detail/index；实际r7label/非空Sky再核。Memory从203MB到idle87.9/92.1MB并持续更新，`(empty)`只是VM标签，不代表空target。

Allocation sampling Start请求host08:31:41.039Z，实际正常Play与20.018s autoPause/paused drain发生；Stop请求08:34:16.716Z、08:34:57.596Z仍Stopping、08:38:16.088Z首次看到完成、08:41:14.426Z保存。实际target停止时刻未知，不能把等待当GC暂停或有效采样时长。原profile192220B/SHAd3d790a3…，982nodes/625samples有效、无sample时间；采集/导出边界已通过，不再重复资格或CPU。

root经同一官方Sources精确选择两份实际运行脚本，按tab菜单Save as导出。Sky runtime的inline map先匹配冻结r7 authored index.js，再经原Taro maps；main runtime的6份authored内容亦精确匹配。653帧双级映射闭合主要恒星变换/绘制及response-cache owner，不用猜固定偏移、不以当前工作树代替采样源码。完整结果见[R17-NORMAL-R7-ALLOCATION-RESULT](R17-NORMAL-R7-ALLOCATION-RESULT.md)。已安装官方前端只传samplingInterval，按默认语义为返回时存活分配统计估计；不是total churn、retainer、完整JS/native/GPU。有效样本和创建owner已取得，未发现可直接修的错误寿命，gen24继续暂停。

[r7正常Play](R17-A1-R7-PLAY-RESULT.md)已有严格准入compact29644B及14.004s窗366次actual paint/native callback/accepted，337准备335消费；真实同次20.018s autoPause。8次同owner85.158s进程watch只作定性观察，不是JS/GPU或泄漏归因，也不与旧普通预览条件直接比较。

[r7实际退出](R17-A1-R7-EXIT-RESULT.md)确有Cancel回04:30、真实产品door后返回非空Map/同隔离地点。调试浮层曾遮door，root先实际展开并下移该浮层，再点露出的产品按钮；先前一次下缘点击无效、两次guard拒绝未发送，不能记为退出。8行85.898s watch跨退出前/导航/Map加载，PSS峰后回落239119KiB；r7没有退出后retired标志读回，两个较早watch没有退出，不按文件名补事实。r9随后补到自身surface边界，不改写r7；全部JS/native/GPU释放及普通预览持续结果仍欠。

[r7一次public selector batch](R17-A1-R7-PASSIVE-NATIVE-RESULT.md)在Play暂停后读到scrollLeft0、tick33中心偏轴561.5px，五节点found、当前可见opacity1；仅有datasetKeys没有sid值，不认证native实例。host发出到观察返回的包络不是native查询耗时，也不能回填旧1597ms事件。它证实后续位置确错，保[r7入场FAILED](R17-A1-R7-ENTRY-RESULT.md)，未证明微信visibility/remount唯一因果。

## 旧运行恢复记录：已退休的条件

下表只保当时发生的边界及有效证据，不是当前候选/恢复动作清单。其原私有回执仍在 `E:/Dev/Starward-data/development/r17-normal-profile/resume-20261019` 等既有owner；不复制完整launch query、SDK端口、私有Context或敏感payload到Git。

| 旧候选/条件 | 实际结果与限界 |
| --- | --- |
| r6普通真机调试 | 一次MCP timeout却实际形成debug159647142；GUI安全表达式后来返回android/pages/map/index、Memory46.6MB。公开CLI的`--args`在输入层deprecated拒绝，未执行；依其help改`--args-file`后，精确单own-task `getStorageSync`<5s返回7事件原receipt，未扫Storage。经实际Map入口进Sky后Memory冻结、官方currentPage明确connection lost，未开始空allocation。已结束关闭并由r7完整同步替代。 |
| r5调试/捕获 | 完整app9b50adb6…越过r4包体错误，一次remote timeout实际形成debug75500112；LAN失败转WAN后非空Sky及r5label成立。一次allocation Start06:00:49.145Z/Stop06:03:06.157Z期间仅prepare/time未Play，持续Stopping、无导出，既非有效空profile也非正常B。正常结束/关闭后，独立GUI WAN编译自动调试明确Timeout；保结果，恢复原LAN选项，未同条件重发。 |
| r4包体边界 | appf5a7c85e…已独立preview success/实际label绑定，桌面Map→Sky非空。一次公开remote官方timeout后GUI明确main package source size2059KB>2048KB，无正确VM附加/Memory样本。导航selected冗余编译副本29302B后由共享声明修复；本地raw余量不代表当时官方调试包通过。一次产品返回点击actionSent后ADB失联，最终页面未确认，无猜地址/重配/VPN更改。 |
| r2桌面 | app8db09ed4…一次有界CLI auto建立公开SDK，Map→Sky label、日期19→18→17→取消19成立，未Play/Apply。即刻scroll未settled，后续17px实际间距和tick-axis约−21.7px成为局部修复依据；不能升级为手机或r3结果。 |
| r3最初入口 | appa2839caa…完整构建/maps成立，open fullMode后空灰框/树，CLI auto没有终态/autoPort；只终止本地等待不证明服务端取消，无重发。官方status与既有observer40s均超时不重放，不能称平台不支持。wrapper339文件指纹0432b913…与nested app338文件/a2839caa…已分清，非应用漂移。1572源/1580候选核验后原r3窗已确认关闭，不清缓存/改账号。 |
| GUI入口登记 | GUI导入已有r3而未生成新源码/账号/云环境，项目列表登记与打开请求没证明实际运行。UIA与实际截图/焦点不一致时只信当前真实目标；工具拒绝的旧cached输入没有派发产品。旧失败不作为如今MCP/CLI永久失效结论。 |
| 用户授权重启与r3新preview | 用户明确要求重新开DevTools并另许一次r3preview。正常退出全部旧窗后现有Nightly2.02.2610092重开，MCP Bad Request，官方CLI/Skill0.3.11 readiness=true；open新窗s1实际形成Map/currentPage，再公开进入非空Sky。canonical自动恢复窗官方close，仅r3必要窗保留。独立Ol0LKl/gen1的一次preview exec59576明确success、无taskId；当时无线0、未bind。后续恢复及r4–r8替代由其各owner记录，不沿该旧无线阻塞或一次性授权限制当前工作。 |

r3曾一次CLOSE_PROJECT_WINDOW_FAILED、两次cached UIA关闭失败，随后真实Alt+F4/枚举才确认已退役；所有成功与失败保各自顺序，不把关闭请求当已关闭。窗口标题与截图不一致、Codex遮挡或未知辅助窗不提供产品输入依据，不自动化Codex。现有原生GUI路线为已读规则下的`@oai/sky`，未用私有CDP/raw socket/新SDK端口。

## 原 gen26 与仍未验证范围

gen26 H3 t6aywi/JYgy2m的旧completed只表示包装resolve，官方结果/taskId丢失；官方明确终态仍UNKNOWN，未重发或bind。当前r10是统一授权下的独立新run；新成功不修改旧UNKNOWN，exec67914前后旧记录字节相同。已修共享preview owner保留原官方stdout/handle并分类，auth成功不完成业务preview；同一pending/UNKNOWN不重放，其helper一次性占位也不重跑。

8791/N05 UNKNOWN/R6不重发/原配对VPN继续保护；实际API8799/桥8798/恢复r6/fixture天气及任务firewall由HANDOFF拥有。Terrain旧metadata2248ms/file98ms/native34ms和24cache保原证据；[r8新动作](TERRAIN-R8-IDENTITY-ACTION-RESULT.md)已将桥metadata/实际PNG/归一key与proof关联，file_ready后仍gap，暖结果非优化收益。旧手机A5→SHA仍UNKNOWN，[残余等待决策](TERRAIN-RESIDUAL-NEXT-DECISION.md)已确认旧key没有序列化SHA，不恢复旧连接追该映射。r10既有file_ready新增owner已返回的实际文件SHA/bytes，缺SHA保持null；仍待下一必要连续动作及当次精确自有键读取关联，不把软件接入当实际安装或优化收益。跨日新修复目标表现、完整A、普通预览持续B/全部资源、地景/三类叠层、H3真实照片、真实天气运行身份、原生/iOS、分享/文件与Git/main/精确清理全部保留。
