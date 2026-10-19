# 当前变更的共享验证与提交范围

2026-10-19。沿同一 PLAN 复用已完成研究、软件检查与独审。当前执行状态只由 [HANDOFF](HANDOFF.md)拥有；本文件按实际源码批次区分检查、提交、远端CI和目标结果，不把历史“当前/未交付”复述成新指令。

## 2026-10-19 无需手机的实际交付

已将6行性能方法补充单独提交为`ab190539`，99份task脚本/MD/JSON/patch提交为`ba4ea423cd7b55bfb184fa57557434d740081711`；推当前分支后，从`32ec61a4`普通快进远端main，两ref读回一致，没有切分支、reset/clean或新worktree。生产字节仍是69401；[本次独立审查](DELIVERY-OFFLINE-INDEPENDENT-REVIEW-20261019.md)核18项已审绑定匹配、无新增P1/P2。两处P3已修，最终37份staged JSON可解析、99份task文本限定隐私/路径扫描无命中、diff检查与context结构检查通过。只修一份报告的EOF空行，未为未变产品重复测试。

[r10普通播放离线独审](R17-A1-R10-ORDINARY-OFFLINE-REVIEW.md)已完成；第二片终图仍为04:30:12播放中、没有第二terminal和精确watch绝对锚点，完整B未关闭。H3三件原始输入已补保并独立读回，恢复布局和H6对象边界见[离线准备](H3-H6-OFFLINE-READINESS-20261019.md)。源代码、归档完整性、运行反馈与产品验收继续分开。

精确main的CI/CD和远端诊断结果保存在[本次交付JSON](DELIVERY-RUN-20261019.json)，当前现场由HANDOFF拥有；原分支CI不能替代这次发布。旧r9实际feedback窗口现已官方关闭并核原句柄消失；旧r3导入移除仍是原生确认pending，不冒称全部清理。原账号/草稿/配对/VPN未动。

## 2026-10-19 后续方法与观察工具批次

原性能skill补充仅在决策需要合并观测时区分被测行为实际发生区间与记录覆盖，并保目标/操作关联和时钟不确定性；没有把播放窗口或新runId推广为统一门槛。[task-only watch锚点](R17-MEMORY-WATCH-ANCHOR.md)增加固定私有owner的首尾host读区间、工具源和成功行流绑定，原sample/ADB/PSS/次数/间隔/停止条件未改。[独立审查](R17-MEMORY-WATCH-ANCHOR-REVIEW.md)无阻断发现，5项fake host测试及语法检查通过，实际文件hash匹配审查输入；skill quick_validate通过。未运行watcher或新设备观察，实际写盘/权限/产品关联仍未验，旧r10缺口不回填。后续文档/Git检查只覆盖本批次，不重复未变产品测试。

ba4的完整CI及发布/identity已经实读；registry额度、主机MFA与尚未核实的current/rollback/backup引用是服务恢复的当前依赖，详见[H4](H4-REAL-WEATHER-READINESS.md)及[单tag审计](REGISTRY-QUOTA-CANDIDATE-AUDIT-20261019.md)。本批次保留全部手机性能和真实接收义务；方法/工具/CI都不替代最终可见覆盖或顺畅播放结果。

提交前本批次15份文本的index/工作区内容一致、1份JSON可解析、294个本地文件链接存在，限定凭据形状扫描无命中；Goal正文与提交前完全相同，无tmp/私有原件加入。staged diff与context结构检查通过。测试与独审复用精确未变字节，不把文件链接/结构检查当成内容真实性或产品验收。

本批次已提交为`4505a761246a11bce5fe5b746f793fd7d99c3735`，普通推当前分支并快进main，两远端ref精确一致。[Product39263935667](https://github.com/Seven128/Starward/actions/runs/39263935667)/[Context39263935705](https://github.com/Seven128/Starward/actions/runs/39263935705)均success；Product只跑scope及基础步骤，产品/OCI步骤skipped。[发布39263994942](https://github.com/Seven128/Starward/actions/runs/39263994942)只有qualify success、publish-and-deploy skipped，未恢复ba4的registry失败或远端API。后续状态文字不改该源码范围，不为记录自身SHA不断追加提交。

## 69401 生产修复、r10 及此前 Git 证据

生产修复提交`69401c097572799234e6b97478a4a1ddfe06c810`（`fix(sky): preserve accepted sky while time geometry loads`）已push并精确远端读回。[Product39246751994](https://github.com/Seven128/Starward/actions/runs/39246751994)与[Context39246759692](https://github.com/Seven128/Starward/actions/runs/39246759692)均实际success。此提交包含跨日pending连续性修复的2份生产文件、4份既有fixture及对应作者/独审记录；133/133、Miniapp TS5.9.3 noEmit0与独审无P1/P2保各自范围。r10完整构建、接入及整包独审已通过，一次官方preview明确success，实际非空Sky独有“A1 r10”label后绑定；新跨日等待/取消已取得[r10实际独审](R17-A1-R10-CROSSDAY-RESULT.md)；普通预览持续表现只有[部分证据](R17-A1-R10-ORDINARY-PARTIAL.md)，完整B仍未验证。用户携手机离开，后续优先离线分析与Git/服务交付；CI和label绑定不替代目标结果。

此前 `3818b44009d53d4b27cb16a95904c42ed3723af7` 已push，[Product39232255739](https://github.com/Seven128/Starward/actions/runs/39232255739)与[Context39232264173](https://github.com/Seven128/Starward/actions/runs/39232264173)均success。r8在提交前以相同生产字节构建，r9基于3818只改任务观察；r9有效播放/退休证据继续复用，但旧包不含69401的新修复。

更早 `c6bb28bc55b8b3e2ed2e32090f05512e233c4253` 已push并精确远端读回，[Product CI39222800554](https://github.com/Seven128/Starward/actions/runs/39222800554)与[Context CI39222915373](https://github.com/Seven128/Starward/actions/runs/39222915373)均success。上述CI为当时分支workflow_dispatch，非main推送/部署，各自只覆盖所绑定提交。后续ba4已完成main同步，当前现场见HANDOFF，不沿此历史段重复交付。

| 检查/证据 | 结果与适用范围 |
| --- | --- |
| 稳定原生表面源码 | [作者记录](SKY-RULER-STABLE-NATIVE-SURFACE.md)、[独审](SKY-RULER-STABLE-NATIVE-SURFACE-REVIEW.md)：ScrollView本体style与直接兄弟槽固定，准入下移track/axis和固定guard，恢复/Cancel保持槽位。保持唯一定位writer、精确供给、.76→1/180ms motion。无P1/P2；平台remount原因仍UNKNOWN。 |
| r8 受影响检查 | 原五文件42/42、miniapp TypeScript5.9.3 `--noEmit` exit0；结构回归在未修生产源码上真实失败、修后通过。独审独立42/42并核三文件SHA相同。未因纯提交重复检查，也未称已重跑全2668。 |
| r8 完整构建与独审 | [R17-NORMAL-R8-BUILD-REVIEW](R17-NORMAL-R8-BUILD-REVIEW.md)：1,583 materialized /1,573 production /25模板全部绑定；双份app均337文件/4,996,606B，app `a4b55d3d876a65f731d0e044eb043e0961c05718a2d2a81c1f40aa502be8eb3e`，source `3362e2d0595b7871835b0232eb43f2ac233c5a5aa012f609c5eb40e04df4bcb0`。main1,993,648B、raw余量103,504B。 |
| r8 maps 与有限任务差异 | 31maps/7,279,403B/367,653segments；22个map+JS双哈希配对复用、9重新解码；32关键sourcesContent、6纯插桩变换精确，双份80JS无map/sourceMappingURL。builder仅3行有限r8分支、白名单/互斥变化，8参数边界通过；15个正常Scene/copy/caption/accepted等owner与r7相同。 |
| r8 历史交付与反馈 | 一次官方preview明确success，实际r8 label后绑定cnbWtR/gen1/6LCwTB/x20PZ8；现已退休输入，82件必要证据在r9前冻结，manifest9d3cca40…。其development_feedback_only效力保留，非产品/发布验收。 |
| r8 原生与A结果 | [首次入场](R17-A1-R8-ENTRY-RESULT.md)限域通过：strict90/90零drop，首个捕获可见刻度正确、提示不叠字；不称物理首次帧/连续15s。[时间交互](R17-A1-R8-TIME-INTERACTION-RESULT.md)实证连续拖到10:00、前一天终态与取消回04:30，未来拒绝。49intents/37firstAccepted中9latest为24–70ms，末30ms，28superseded保留；37/38准备实际消费，不支持因昂贵未消费准备改调度。跨日等待退回旧夜景已判P2并由下行修复；供给key、惯性/重抓/必要恢复/Apply/iOS及完整A仍欠。 |
| r9 完整构建与独审 | [退休观察](R17-NORMAL-R9-RETIREMENT-OBSERVATION.md)、[源码独审](R17-NORMAL-R9-RETIREMENT-REVIEW.md)及[完整构建独审](R17-NORMAL-R9-BUILD-REVIEW.md)：25/25、历史21/21、argv8/8、delta typecheck0；1,583 materialized/1,573生产/25模板与双app全部匹配。app413b8e0f…/337files5,002,086B，sourceac12fdd3…，31maps7,299,540B/368,539segments，main余103,504B；22配对复用、9新解码。 |
| r9 历史交付及60秒实际结果 | 一次官方preview exec32765明确业务success，无taskId；实际r9 label后绑定26UyKk/gen1/s2S6bX/z6lbss，该输入现已退休。[实际独审](R17-A1-R9-PLAY-EXIT-RESULT.md)确认60.015s正常Play/Pause、至少31s暂停尾段、Cancel与非空Map；同surface退休实际1×1/selection层移除，context扩展unavailable，未证GPU全部释放。15s metrics非60s全窗，PSS未给出泄漏owner，完整B未关闭。 |
| r9 运行档案与执行层 | 425件/34,363,242B运行档案manifest a40f027c…保留44件不可变审查原件；首轮归档与capture并行导致session.json可变元数据变化，历史会话字节不能称45/45复现，已有中间与最新版本分别保存。[可信度核对](PERFORMANCE-STATUS.md)结合安装remoteAppservice/cdp、Android无DOM runtime和真实动作支持r9的2.0手机逻辑目标；LAN→WAN只切传输。工具端Storage和WAN等待保原观察条件，不把字段倒填r7或普通预览r10。r9 debug163252880已实际关闭/枚举absent。 |
| 跨日等待连续性新修复 | [源码与反例](SKY-TIME-PENDING-CONTINUITY-FIX.md)、[独审](SKY-TIME-PENDING-CONTINUITY-REVIEW.md)：当前有效accepted输入统一供draw/资源，Context/report/mode/native失效不复活、取消优先committed；2生产/4既有fixture、133/133、TS5.9.3 noEmit0、独审无P1/P2。已提交/push为69401并进入r10；task接入已适配真实requestedTimePresentation，原生产selection/依赖不变。[r10真实独审](R17-A1-R10-CROSSDAY-RESULT.md)已确认跨日等待白昼连续性与取消终态，保留取消异步字段过渡；完整A/Apply仍欠，不重开方案审查。 |
| r10 接入及完整构建 | [任务接入](R17-NORMAL-R10-BUILDER-INTEGRATION.md)、[接入独审](R17-NORMAL-R10-INTEGRATION-REVIEW.md)与[整包独审](R17-NORMAL-R10-BUILD-REVIEW.md)均PASS/无P1/P2；r10 30/30、地形owner17/17和5条实际hook端到端路径，完整1,583物化/1,573生产/25模板及双app绑定。app `077d3aeb3ffd874efabf9b2907cb7ef90b446305a9f029a64bf07400581c3094` /337文件/5,003,601B，source `e7e558d27d1b0c1c0b748bfd7c8bf56e0b33aa8270e5bdcd15edb57b1ada480e`；main1,993,952B、余103,200B，31maps/7,305,672B字节绑定，未重复无新决策价值的CPU/Allocation/坐标解码。 |
| r10 当前普通预览交付 | 一次官方preview exec67914明确success、无taskId，gen26原记录字节未变；root实际非空Sky看见独有“A1 r10”后绑定ncOpxo/gen1/1GLGwG/Klvb4h，见[当前准备/绑定](R17-NORMAL-A1-PREPARATION.md)。r9与r10 prebinding4haboM退休输入；runtime AppID/手机整包字节未读回，仍development_feedback_only。本次普通预览未建立remote，新行为、持续B及地形现场关联均未由送达完成。 |

## r7 已完成证据及真实失败

r7 app `c9874bb3…`/source `528b3d8a…` 的冻结字节不受r8改变。其完整build、maps与有限builder独审保留，[r7实际入场](R17-A1-R7-ENTRY-RESULT.md)仍为FAILED：98/98事件无drop，fresh endpoint、隐藏非动画561.422定位回执成立，ticksVisible后报0；首次可辨、尾段及终图均noon尺配04:30，恢复文案叠字。[公开被动batch](R17-A1-R7-PASSIVE-NATIVE-RESULT.md)随后实际读scrollLeft0、选中tick偏轴561.5px，但不确定最初回零或微信内部原因。r7 debug/source已在完整r8同步后正常结束关闭，所有r7输入session退休。

[r7正常Play](R17-A1-R7-PLAY-RESULT.md) compact29644B严格准入，14.004s窗366次实际paint/native callback/accepted；337准备、335消费、2尾部未消费，333 firstAccepted全superseded，无最新未替代样本；20.018s正常autoPause一次。8行85.158s同owner进程watch仅定性增长及部分回落，非JS/native/GPU归因。

[r7有效allocation与双级映射](R17-NORMAL-R7-ALLOCATION-RESULT.md)已完成：192220B原profile，982nodes/625samples引用有效；实际官方runtime脚本inline maps→冻结Taro maps闭合关键恒星变换/绘制与response-cache owner。它只估计返回时仍存活的采样分配，既非总churn也非引用保留图；sample没有时间，target实际stop未知。未发现可直接修的错误生命周期，不因排名继续gen24或微变体。旧文档“缺有效Sky allocation/映射”的空缺已经退役；完整B仍未通过。

[r7实际Cancel/Map退出](R17-A1-R7-EXIT-RESULT.md)已经发生，手机返回非空Map/同隔离地点；8行85.898s同owner watch跨退出前、导航及Map加载，PSS峰后下降239119KiB、末比首仍高36999KiB。r7当时没有退出后retired标志读回，两个较早watch实际未退出，均不由r9倒填。后续r9补足自身60秒/暂停尾段及surface退休边界；普通预览持续结果、全部资源释放与完整A/B仍欠。

## 历史共享检查：只保原批次效力

| 源码批次 | 已有检查 |
| --- | --- |
| 404d84df reveal/late-geometry修复 | 完整miniapp2668 total/2667pass/1原science环境skip/0fail，152.639s；正确miniapp TS5.9.3 noEmit0，独立3/3反例与恢复、相关46/46。后续r8不冒用这个全量结果作为同源全量。 |
| 526d00ec 首次原生准入 | 11份生产/测试hash由root逐份核对，独立77/77；完整2664 total/2663pass/1skip/0fail、151.0s。旧rows认证新安装与render→passive迟到分支已修。r6手机入场后来仍FAILED，源码检查没有覆盖掉失败。 |
| fb99d0dd 导航/包体及之前ruler批次 | 真实Taro导航12种路径/3必需位图、原素材保留；2654 total/2653pass/1skip/0fail、138.8s及TS5.9.3 exit0。较早2650/2649pass/1skip的149.8s批次也只保自身范围。 |
| workflow共享入口 | 首轮175项174pass/1fail，warm-entry旧fixture提前缺少skill-sync绑定而reject，未进入所需automation-failure语义；原失败日志保留。定向9/9、修后完整175/175、22.8s。它是夹具适配，不是产品修复或本次r8重新运行。 |
| UI source probes | 4项pattern检查通过，输出仍为 `product_conformance: unverified`，不认证外观。 |

science publication用例因未设 `CLOUD_SKY_SCIENCE_PUBLICATION_PATH` 持续skip，不计通过。root曾误选通用bin TypeScript6而遇baseUrl入口弃用错误，后以实际miniapp5.9.3完成；未改产品源码压制这个工具入口错误。历史换行提示不当业务失败。

warm-entry定向修改仅原共享sandbox：注入明确skill-sync成功/失败，实际status=ready后才发模拟SIGINT，所有失败匹配预期原因；API failure、redirected output、automation failure、signal及owned子进程/receipt清理断言保留，补sync-failure/reload-required不启动子进程与handler退休。修后 `tools/miniapp/development-automation.test.mjs` normalized-LF SHA为 `f6a4d101972d526fd5a1e3735ec59aefc4c51dad794673ce45a51dce655b35ba`。本执行者自检没有冒称另一份独审。历史日志 `tmp/current-delivery-*`、`tmp/current-ruler-and-package-miniapp.tap`、`tmp/r6-production-miniapp-full-tests.log` 保留原失败/修后各文件。

## 交付责任与剩余义务

官方preview/feedback共享修复的范围继续由 [A1/preview独审](A1-AND-PREVIEW-FIX-INDEPENDENT-REVIEW.md)和 [剩余仓库审阅](REMAINING-DELIVERY-AUDIT.md)拥有：两个ordinary caller保handle/原stdout再分类，load/preview/refresh/bind/stop沿同一UNKNOWN/pending保护；auth success不完成业务preview，显式原task结果记录不自行轮询或重发。Sky窗口/原生换算/共享motion、导航声明/构建和warm-entry测试各按原责任保留，历史“可提交清单”不再作为当前Git状态。

跨日修复六份生产/fixture及四份作者/独审记录已随69401提交，后续方法与99份task成果已随ab190539/ba4进入main。生产和设备工具/Context字节未变；当前后续范围是本文件上方的方法/watch辅助及事实文档批次。设备原片/profile与真实私有锚点继续留外部owner，不加入Git。各组沿自身已有审阅和精确字节核对交付，不抹掉原审阅边界；历史或当前软件绿灯都不提前证明未验产品结果。

Terrain旧metadata2248ms/file98ms/native34ms保 [r6资产owner](TERRAIN-R6-ASSET-PATH-BINDING.md)的UNKNOWN限界。[r8新动作](TERRAIN-R8-IDENTITY-ACTION-RESULT.md)已取得桥metadata/实际PNG的SHA与proof关联，file_ready后仍gap；手机A5→SHA尚未闭合，暖缓存不算优化收益。[残余等待决策](TERRAIN-RESIDUAL-NEXT-DECISION.md)已确认旧匿名key本就未序列化SHA，不恢复旧连接追该映射。r10随既有file_ready导出owner已返回的实际SHA/bytes，缺SHA仍null；软件独审/整包接入通过，下一必要连续动作及现场读取仍未完成。r6单次59ms latest accepted复用 [manual结果](R17-A1-R6-MANUAL-RESULT.md)，不等于完整A。gen22/23阴性、正常CPU复用，gen24暂停。

全部R1–R18/H1–H8/A01–A15/N01–N09继续按原owner逐项比较：跨日修复目标确认、时间完整交互、地景、正常A/B、连续地形/年度夜光/真实云与运行identity、H3照片/许可/恢复、原生/iOS、自然分享接收及文件交接、资源与Git/main收尾仍保留；8791/N05/R6/配对/VPN/gen26保护不变。没有以软件成功或本文件更新宣称完整Goal通过。
