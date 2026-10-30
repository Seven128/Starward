# 当前普通WEAPP的实际观察

归唯一PLAN P1/P2，仅记录本机微信开发工具结果；不是手机、完整采用稿或最终验收。当前源码/候选及接续状态归HANDOFF。

以下观察发生在精确项目 `E:\Dev\Starward\apps\wechat-miniapp` / s1、完整普通WEAPP `c0909a24f7261595a7b14e5a1599600cdde17a6fa97948f151cb34726bb228bd`，官方工具430×930帧，loopback API接恢复任务库。之后的新合同build一度清生成目录并被guard拒绝（app.json不存在，已如实保失败记录）；Root完成guard窄修/fresh独审后完整重建，当前已恢复337文件/5,120,462B、SHA`8458cfe2968442d6ae4f9bcbb4060a28d2c02bb3a2cc27278c3f588be91908ff`，官方refresh和新`canonical-cloud-contract-final.png`实际Map帧已目视读回。旧帧仍只代表各自的观察范围，不冒845全套重跑。显示的数据标明隔离测试，未当正式地点内容。未操作手机、账号/权限或提醒。

- 实际点Map左侧My书签后My可见，再点My右侧Map书签回原Map；两者由同一路由保留，page route仍是Map不代表未导航。My当前未来24h为空，正常有内容/账户验收仍欠。
- 事件banner在不同实际帧显示不同目录项；没有把它当手势、跳转整页和Back均通过。
- 实际打开层叠后，官方WXML和截图均为光污染/云量首行、地形第二行。沿可见按钮操作并逐步读回三项label与active class：全关→仅光污染→光污染+地形→三层全开→云量+地形→仅地形→全关。每项保持其它两层选择，active class与文字一致；最终恢复全关并关闭层叠。此为控制状态证据，不证明图片安装、三层合成、实际来源、资源退休或物理释放。
- 首次使用自定义Button上的data-control选择器未命中，waitForSelector超时且未执行tap；实际outerWxml只有原class/data-sid，换用已读到的`.map-tool--layer`才成功。不重试未知动作或修改产品来配合harness。
- 当前视野卡区实际原生ScrollView高度440px/content460px。按原小屏适配做scrollTo后，末卡完整副文案可见，标题/分页留在其原区域；随后scrollTo(0,0)恢复。没有缩字号/删内容来硬塞四卡。横向分页、连续手势和卡片离/入场仍待目标端。
- 当前截图能辨到“当前视野”字样，计数像素仍缺完整可确认读回；之前WXML/样式存在但多帧未辨清。两行stacking-context CSS试验无效且已撤回，未把源码存在、另一个renderer或工具success冒对照通过。

图片均在 `E:/Dev/Starward-data/development/terrain-d1-20261028/api-runtime/`：`canonical-my.png`、`canonical-map-return.png`、`canonical-clock-final.png`、`canonical-after-terrain-batch.png`、`canonical-layer-sheet-all-off.png`、`canonical-viewport-scrolled.png`。Root已实际查看本轮最后三张，屏幕状态与上述范围相符。

初始编译/缓存故障及恢复：开窗完整编译时曾有webpack factory缺失/黑屏；仅官方清CompileCache及ProjectFileListCache再refresh恢复，Storage/Auth/Session保留，不能归为产品初始化修复。随后cloud-display完整build被原初始化审计拒绝，类型/SDK通过并未代build；该接线现经独立窄修/Root作用域修复/fresh独审与完整重建闭环，见[CLOUD-RASTER](CLOUD-RASTER-BOUNDARY-20261028.md)。845刷新无需再清cache，实际Map帧恢复；尚无新手机候选/验收。

UI/手势/来源与所有未验义务仍沿[采用UI](UI-INTEGRATION-20261027.md)和唯一PLAN。上述本机观察不关闭候选19回归、正常持续Play/Pause/退出、内存/OOM、微信权限/分享、全国图层或正式分发。

## 事件列表阅读返回窄修（2026-10-28）

本节由 `/root/event_list_reading_return` 维护源码与隔离检查；实际开发工具输入/读数由 Root 提供，作者未操作 IDE、手机或共享 API。适用范围是共享 `AstronomicalEventModal` 的同一 list/detail 内部切换，Map 整页与 Plan modal 共同使用；不是重开发 banner、事件页或采用资源。

上游依据为 `shared-state-and-recovery.md#shared-astronomical-event-modal`：列表必须保留月份、筛选、滚动位置和原卡片位置，列表/详情只作内部视图变换。已读当前 10-27 采用包 `ADOPTED-README.md`、`complete/adopted-20261027/events.html` 及其共享 `comfortable-scale-2026-09-22/preview/event-modal.mjs`，并实际查看既有 `candidate-events.jpg` 和本轮原截图；原型不重建 list，新详情身份显式从 `scrollTop=0` 开始。未生成或重新采用资源。

Root 在完整普通包 `b54871b8e32744ef78372cb047274f7011464283c6c5030d99399a24e8efa850`、canonical s1，通过官方 `automation_evaluate` 内的 `wx.createSelectorQuery().select('.event-modal__list').scrollOffset/boundingClientRect` 读到真实 native offset，而非 `scrollTop` 输入属性：

| 当前实际视图 | list scrollTop | list 高度 |
| --- | ---: | ---: |
| 进入详情前，月份列表可见 | 952.7999877929688 | 674.2875366210938 |
| 按实际可见 row 的 bounding rect 点击后，标题为“天文事件详情” | 0 | 674.2875366210938 |
| 点标题栏返回列表后 | 0 | 674.2875366210938 |

此过程中没有改缓存、布局或重新编译；同高的真实偏移丢失，不能只以节点持续存在声称阅读位置保留。`canonical-event-detail-read-intent.png` 与 `canonical-event-list-return-read-intent.png` 分别显示英仙座详情和返回后的 1 月顶部；这些仍是开发工具帧，不冒手机结果。

窄修只在原共享组件保存一个最后可见 `onScroll` 标量。普通 scroll 不触发 React state 或原生回放；进入详情同步停止记录并撤回旧返回命令，隐藏层的 0/非法偏移不能覆盖阅读位置。标题栏、原生 Back 和“选择此事件”统一回列表，以 `scrollTop` 发一次显式恢复；它与初始月份 anchor 互斥，未知初始 offset 不伪造 0。用户确实滚到顶部时 0 是合法位置；重复返回同一 offset 仍有撤回→恢复的属性边沿，不用 epsilon、重新挂载、定时器或额外查询。新详情身份从顶部开始，同事件日期/资料重渲染不新增归顶命令。关闭/重开清理旧阅读会话，隐藏时退休位置记录；既有业务选择、确认/取消、资料和布局未改。

两条新增回归在修前明确失败：列表没有实际 offset 记录入口、选择此事件后缺少返回 offset。扩展测试最初有 `nativeNavigationInsets` 缺 mock、已有 fixture 月份无序的期望，以及 SharedButton 实际 class 前缀三个 harness 问题；均先按现有真实边界修正，再取得上述产品反例，没有将这些初始错误算作产品失败。修后已有 `event-modal-motion`、`astronomical-event-modal`、`native-back-boundary` 共 **26/26** 通过；新增机制覆盖 Map/Plan、重复同 offset、合法 0/非法偏移、隐藏回调、重开、Back 与暂存选择，原两项 reduced-motion/计时退休仍通过。小程序 `tsc --noEmit -p tsconfig.json --pretty false` **exit 0**。

作者仅编辑 `apps/wechat-miniapp/src/components/astronomical-event-modal.tsx`、既有 `event-modal-motion.test.ts` 及本证据节；未改 SCSS、路由、PLAN/HANDOFF/INDEX、配置、构建或服务。源码 SHA-256：组件 `8d4abd669420486c2bc0d18bb14e70d8a7ca7c55f10f765adb9b2562e017f7dc`，测试 `36e07e30c5ec68e486c1b100958f9da4c530ec9ee97ac3a6a92c12f41e14cabc`。这些行为检查不模拟原生渲染器；fresh 独审、Root 完整普通 build 后的实际同条件 offset/画面对照以及手机/原生返回仍待，不能据软件通过关闭 P1 或完整 Goal。


## Fresh独立审查：事件阅读返回的会话隔离（2026-10-28）

由独立 agent `/root/review_event_list_reading_return` 在作者释放源码后执行。已读 AGENTS、UI skill、共享事件 Screen Contract、当前采用入口说明与原型；实际查看既有 `candidate-events.jpg`、Root 的详情与返回列表帧。所核为事件共享 owner 的位置记录与切换责任，未重新选择设计资源，未操作 IDE、API、数据库或手机。

独立运行既有 `event-modal-motion`、`astronomical-event-modal`、`native-back-boundary` **26/26 通过**。源码中卡片统一调用 `openDetail`，标题栏/原生 Back 与“选择此事件”回同一 `returnToList`；合法 0、未知初始 offset、初始月份与恢复命令互斥、新详情归顶、原暂存/确认业务的责任层检查成立。双 ScrollView 节点及原布局保留，没有新增 timer、查询、epsilon、重挂或每帧 React state。

**首次审查结果：FAILED_PENDING_SESSION_FIX，已由下方 Root 窄修与 fresh 复核解决。** `listCanRecord` 只有共享布尔值；关闭后再打开把它恢复为 true。已退休列表的旧 `onScroll` 闭包仍保有旧的 `open=true/pageVisible=true/detailId=null`，因此能在新会话中覆盖新的 `listPosition`。现有测试只在禁用期间回放旧回调，没有覆盖重新启用后旧闭包到达。

审查者未编辑生产/测试源码，直接在内存复用现有 `event-modal-motion.test.ts` 的 harness，取得以下确定性反例，Node **exit 1**：

1. 旧会话可见列表记录 `620.125`，保留它的 `onScroll` 回调；关闭并走完原 180ms 退出。
2. 重开同一 modal owner，新列表实际回调记录 `840.25`。
3. 退休的旧列表回调迟到送入 `scrollTop=0`；再从新列表进入详情并返回。
4. 恢复命令实际为 **0**，要求为 **840.25**。

这是明确的 JS 会话隔离反例，不宣称该事件顺序已在手机发生；Root 原生 offset 丢失证据和本反例属于不同层。建议只在原 owner 绑定当前打开会话身份，使退休闭包不能因新会话重新启用；不能增加轮询/延时、伪造 0 或改变布局。修复后需 fresh 窄核该反例；完整普通 build、实际相同条件 native offset/画面及手机返回仍按原未验义务保留。

本审只补当前证据节；未改源码、PLAN/HANDOFF/INDEX、Git 状态、配置、构建、服务或设备。所审组件 SHA-256 为 `8d4abd669420486c2bc0d18bb14e70d8a7ca7c55f10f765adb9b2562e017f7dc`，测试为 `36e07e30c5ec68e486c1b100958f9da4c530ec9ee97ac3a6a92c12f41e14cabc`。


### Root 会话窄修后的 fresh 复核

Root 在同一组件增添一个 `listRecordEpoch` ref，原 open effect 的 cleanup、hide/show 与 list/detail 交接退休旧记录身份，`onScroll` 只在它捕获的 epoch 仍为当前时写入标量。实际 open=false/hide/unmount 才结束位置记录；单次返回意图不先禁用仍可见页面，避免原导航失败时失去后续记录。未新增 effect、timer、查询、对象缓存、每帧 React state 或布局变动；原 0/未知偏移、月份与恢复命令互斥、详情归顶和选择/确认含义继续保持。

本审查者在 Root 释放后独立重读该差异，并实际复跑同一保存反例：**840.25 → 840.25，exit 0**；不是移除迟到回调或改动期望取得通过。原三组独立再跑 **26/26 通过**，新增原组断言同时覆盖 hide→show 后退休回调、关闭重开后新位置与旧 0。无新阻断，**最终结论为责任层 PASS，目标原生回归仍未验**。

反例脚本在 `E:/Dev/Starward-data/development/terrain-d1-20261028/api-runtime/review-event-session-counter.mjs`，精确入口为仓库根执行 `node tools/run-node.cjs --import tsx <该脚本绝对路径>`；它只读当前组件、复用原测试 harness，输出原 case、期望/实际及源码 SHA。修后独立读回摘要另存同目录 `review-event-session-counter-after.json`。所核当前组件 SHA-256 为 `04f799207f03f310ba4c8869d220a55e06edf40e4d4e605c10df196510f8c267`，测试为 `651181217d4a1be8481888c0fc1773603799536c5058555365373f2b3530b154`。

本轮修前、修后软件证据均保留。上述 PASS 只解除该 JS 阅读状态/会话隔离阻断，不证明 Taro/WEAPP 属性命令已正确恢复 native offset；Root 的最新完整普通 build、源码与开发工具同步、相同条件的实际 offset/画面对照，以及手机/系统 Back 和原 P1/Goal 其它义务仍按原范围保留。审查者始终未改生产/测试源码，未操作 IDE、API、数据库、构建、Git、配置或设备。


## Root 最新普通包与实际阅读返回读回（2026-10-28）

本节更新当前状态；前述 c090、845、b548 帧及作者/首次独审 SHA 均保留其原阶段范围。Root 在会话修复后的源码上完成小程序 noEmit、完整普通 build（63.578s、exit0、10项既有 warning），并用原 fingerprint/budget owner核出 337 文件 / 5,121,623B / SHA `2872967413fb69509888475d10dbe114a1abba18cde79c56e3b7dd97e5ce6a2e`；main2,068,338、content1,068,591、spot613,133、sky1,371,561，预算通过。receipt为 `ordinary-weapp-build.json`，前 b548/845/c090 receipt 均保留。第一次手写预算调用参数位置错误，未写新 receipt；按原函数签名纠正后核验通过，没有重新编译或改包体。

最新完整产物同步后，Root 仅关闭/重开精确 canonical s1/fullMode。初始帧白页，之后实际 settled 帧已见 Map，而一次尚未就绪的 automator tap超时；该动作没有被当作成功。沿原启动恢复入口一次官方 refresh后，实际 Map帧及 currentPage均恢复，未清Storage/Auth/Session或另建项目。另一次 header computedStyle查询遇对象clone失败、收缩返回值的尝试超时，没有解决计数像素问题，未据此改CSS或重放输入。

Root随后在该最新普通包内从真实banner进入 `content/event/list/index?month=2026-12`。用原生 ScrollView.scrollTo选择不同于月份anchor的位置，再由官方wx SelectorQuery.scrollOffset/boundingClientRect读真实结果。输入540.25在此运行时实际为540，比较以读回值为准：

| 阶段 | 列表实际scrollTop | 高度 |
| --- | ---: | ---: |
| 列表可见、进入详情前 | 540 | 674.2875366210938 |
| 点击实际可见四月天琴座事件、详情可见时 | 0 | 674.2875366210938 |
| 标题栏返回列表后 | 540 | 674.2875366210938 |
| 同一位置再次进入详情并返回 | 540 | 674.2875366210938 |

Root实际查看 `event-reading-before-final.png`、`event-reading-detail-final.png`、`event-reading-after-final.png`：四月卡片原阅读位置和正确详情均对应，首次恢复及重复同值恢复成立，没有把月份anchor回放或scrollTop输入属性冒实际恢复。原生读回receipt为 `E:/Dev/Starward-data/development/terrain-d1-20261028/api-runtime/event-reading-native-readback.json`，三帧在同目录。随后标题栏退出事件页，Root已目视event-reading-map-return-final.png，实际Map与原四张卡片/bannner再次可见；不据此冒精确相机状态或手机返回。

结论仅为当前微信开发工具普通包的阅读返回窄修通过；不是手机native渲染/系统Back、全部Plan选择取消、多指/横滑/转场、完整P1或Goal验收。原图库/真实数据、源/质量、持续Play/内存/OOM、正式分发及所有未验责任继续保留。


### 当前普通包的Sky与Map原生边界

Root由实际地图卡片选择已发布的隔离测试点，云观星按钮native disabled=false，再沿现有Context进入Sky。当前MCP官方入口已可用，沿同一canonical项目复用，未重新初始化或索取token。实际Sky帧 `current-sky-entry.png` / `current-sky-menu.png` 已绘日间天空/星座文字；菜单元素52×52、opacity1，SDK点击后aria由“展开菜单”变“收起菜单”，但截图均不见相应控件；Canvas编译WXML未保所查data-sky诊断属性。针对TypeError/ReferenceError的console过滤无命中不等于无错误。该结果是截图/合成层与结构状态不一致，未确认原因，未据此改Sky布局或宣布可见操作/accepted时刻/完整负载/性能通过；没有继续Play/Pause或新Profiler录制。

随后用原Sky返回入口退出，currentPage实际回Map，新mapId为spot-map-2；`current-map-after-sky.png`已显示街道细节与保留的中档面板。原 `.native-map` scale属性和同实例getScale回执均14，getRegion成功；390.4×844全地图约3.44×7.44km，面板顶部472.65、medium实际高371.35。这个近似量不是原GCJ→WGS84精确range owner的通过证据。当前pin在画面中仍偏下；API缩放、瓦片细节、精确range与可见居中分别保留。

Root只为公开精确已发布的同名隔离点做一次READ ONLY坐标查找，调用原共享WGS84→GCJ转换，精确坐标只保运行内存，不写截图说明/Context。尝试所需native toScreenLocation时，首个callback-only probe欠缺原owner对Promise的兼容，不能当产品失败；补齐原owner callback/Promise两种完成方式后，该会话仍未在官方工具期限内回读投影。另markers property只得到对象字符串，fields查询也未回读；不将这些harness/平台边界当坐标错或用加zoom/偏移修复。当前不能核原生点投影残差，也没有手机证据。

只读追踪当前owner说明选点14是seed；10s总期同时等待Context/overview终态、不fetching、有效native bounds和匹配version/layout的frame，再完成range/projection。Sky隐藏会取消旧focus，新mapId返回保留viewport而不重开旧请求。这些是依赖解释，未建立本次具体失败归因；旧gen5 Android的历史数值不替代当前。必要native边界已并入上方当前手机候选的最小准备，未重开相机/时间/缓冲重构或作新的数据迁移。

fresh只读源码/编译产物核对补充：当前显示节点实际为type=2d，WebGL为离屏owner；Canvas wrapper、observer-meta及菜单有各自z0/8/12声明，菜单披露谓词不能解释一直挂载的地点/时区也消失，未找到可支持猜改z-index或换renderer的矛盾。两张原Sky截图已由独审者实际查看；其结论仍是合成/截图边界未决，当前采用资源未重选或重画。

Root后续针对当前Map的有界读回：map-top-tools opacity1/display:flex，offset约326.4/140.91；Search按钮52×52，bookmark约0/108.91，部分位置被现有预警浮层覆盖。本轮data-control选择器未匹配，既有class可以匹配；未据no-such-element单独判产品缺失或编译原因。当前自动tap（地图空白、提示消息及云观星）虽返回success，截图/文本/currentPage仍未建立对应变化；CLI与MCP均不据分发回执冒操作效果，未继续排队更多输入或据此修改生产行为。`.notification--message`的pointer-events实际为auto、closing class未成立；原因未核，不能单独归为产品、合成或事件渠道故障。当前仍留Map中档面板，没有新Sky/Map居中通过证据。

本段新图归同一`api-runtime`：`map-focus-before-reselection.png`、`map-focus-selection-cleared.png`、`map-focus-notice-dismissed.png`均已目视，文件名只记原动作意图，不代表已清除/已关闭。MCP screenshot用forward-slash项目串返回project-window-not-found，原CLI用实际Windows路径成功；没有因此重启IDE、索取token或更换项目。最小下一有效观察仍是目标手机原生画面/控件合成与实际focus，不重复不可判定的桌面tap或投影探测。

### 普通6bebfcab的单卡布局与计数窄核对

Root实际查看当前普通包`eog-final-url-ordinary-first-frame-20261028.png`，与已采用`adopted-map.jpg`及其可编辑`revision.mjs`核对；采用HTML/ZIP摘要分别仍为b906eee5…/91e642dc…。当前视野只有一个实际已发布的隔离测试点，不能按设计样例的五地点推生产数量。此前计数像素未确认的记录保留原阶段，本帧右侧“1个”实际可见，官方元素text也读回“当前视野1 个”。

沿同一canonical官方运行时只读SelectorQuery，当前`pages/map/index`，getWindowInfo为390×844；列表left16/top316/width260.2625/height494，heading28、ScrollView top344/height440/scrollTop0/scrollHeight440，单卡104、分页top784/height26。截图430×930是输出像素尺寸，不能直接当CSS坐标。单卡下方留白来自已采用源本身的`#viewport-cards min-height:440px`，当前实现一致，不据此收缩列表或改布局。此窄核对没有发现支持源码改动的差异，未重编译、修改设计或重复旧失败的投影/点击探测。

该证据只确认本帧单卡尺寸布局及计数可见；四卡分页、更新动效、连续手势、Sky控件合成、手机及完整P1仍按原义务保留。一次错误的`.map-event-banner`查询返回null，只是选择器不匹配（源码实际`#map-event-banner.event-banner`），没有据此认定banner缺失或重试其行为。

## 6bebfcab普通包的列表布局窄核对

Root复用当前完整普通包与canonical官方会话，实看`eog-final-url-ordinary-first-frame-20261028.png`及当前采用`adopted-map.jpg`，并读原采用`revision.mjs`。本地采用HTML的SHA仍为b906eee5…、内嵌增量ZIP仍91e642dc…，与设计owner相符；没有恢复旧候选或重画资源。原型`#viewport-cards`明确min-height440，单卡余白不是已经成立的缺陷。

原生SelectorQuery实际读回：列表left16/top316/width260.2625/height494，heading高28，ScrollView top344/height440/scrollTop0/scrollHeight440，当前一张卡top344/height104，分页top784/height26。wx窗口390×844；原生小数布局与两端取整报告有微小差异，实际宽度仍对应约2/3。官方元素文本为“当前视野1 个”，实际帧也可见计数。这个当前单卡计数的像素不再沿用此前“尚未确认”；旧阶段的多卡/其它计数疑问不据此全关。当前卡是原任务库的隔离测试地点，非正式全国地点交付。

因此本次没有改CSS、源码或重新构建；所见空白及位置符合既定四卡容器。原有效四卡滚动与阅读返回证据复用，分页/连续接管、真实手机、三层像素、Sky合成与其它P1结果仍按原范围未验，没有重复既往不可判定的tap或投影探测。

### 同帧发现的地址图标缺包及实际修复

继续对照采用原图时，确认当前卡片地址前的place-pin未显示。官方节点src实际为`/assets/b-icons/place-pin--day--default.png`，而6bebfcab完整产物只在spot/content分包保存原23,304B位图；主包该文件不存在。该角色已经由共享`SpotIdentityContent`服务Map/Search等消费者，缺口在`SemanticIcon`主包解析与原异步native loader的角色准入，没有改卡片设计。

主包原2,080,176B，只剩16,976B余量，直接复制完整位图会超2MiB；本次沿已有`packaged-icon`文字伴随图标路径增加place-pin，更新原native允许项和JSX声明，复用spot原件。普通分包和其它主题路径保持，既有位图不缩小/转码，未放宽预算或增加新loader。原semantic-asset三项检查中新增该角色后，修前2项失败/1项通过；修后3/3、miniapp noEmit0。原built-candidate测试同步扩展原件/无主包副本断言，Root实际普通包检查另沿原fingerprint/budget/inspect及compiled Sky owner，不冒已跑正式release测试。

新普通包SHA **aed9c23ffe15154bdcae89f521d655813223172ddde3130f7d9666494ebc7d80**，337文件/5,133,495B，主包2,080,193B，content1,068,591B、spot613,150B、sky1,371,561B；包预算与21路由检查通过。编译53.086s/exit0、10项既有warning。两份分包PNG实际逐字节等于同一原件，SHA `1cd97715f6a8b854707dae3e206b2ca7b1a6989bab64ca977ec4e681dbbd3d11`，没有主包重复副本。6bebfcab完整337文件已保在私有`ordinary-before-place-pin-20261028/weapp`并重核相同fingerprint；旧plain/D2固定候选和所有旧发布保留。

初次官方refresh后，主包已经加载新native标签，原生组件kind为place-pin但src空。一次受控clock→原kind恢复探测实得clock原地址、place-pin仍空，证明该会话尚未执行当前允许项；没有把编译通过或此帧冒修复。随后仅调用官方`cleanCompileCache`并refresh，没有清Storage/Auth/Session。新会话实际原生组件kind=place-pin、src为spot原件，内部image边界left32/top414/18×18；Root实看`place-pin-after-compile-cache-20261028.png`，地址图标可见、卡片位置不变。

本轮数据根仍为`E:/Dev/Starward-data/development/terrain-d1-20261028`：修前/首次刷新/缓存更新后三帧、counter-before/tests/typecheck/build日志、完整fingerprint和`place-pin-ordinary-build-20261028.json`均保留。该实际修复只关闭桌面普通WEAPP的地址图标缺包；手机、原生连续合成/资源、三层及完整P1仍未验。

### 当前普通包的 My 入口有界观察

Root 复用 aed9c23f 普通产物和 canonical 官方会话，实看当前 Map 与既有采用的 `candidate-my.jpg`，并读当前 adopted `revision.mjs` 的镜像书签及设置避让规则。同步运行时返回 `pages/map/index`、390×844。首次 wx SelectorQuery 批量读回超时，未当作产品几何失败；之后官方独立元素读取可用。

实际点击左侧书签一次、再用其可见 CSS 中心坐标45/131作一次有界核对，均只有工具 success，未产生可确认的 My 展示。三张实际帧 `my-bookmark-map-before-20261028.png`、`my-bookmark-after-entry-20261028.png`、`my-bookmark-coordinate-entry-20261028.png` 已目视，均仍为 Map。My 容器 class 为 `map-my-presentation--closed`；右侧书签90×44、left=-90/top108.9125，设置left=-140/top119，说明它们仍在屏外，不能当 My 布局或避让通过。左侧按钮 disabled 读回为 false；console 中所查 TypeError/ReferenceError/primary_navigation/stopPropagation/读取异常未命中，也不能证明没有错误或断言产品已收到点击。

源码只读未发现足以支持猜改的矛盾；本轮不改导航、布局或事件准入，不继续重放点击，不据工具回执关闭 My 往返、转场和状态保留义务。这个结果仍需有效目标操作通路判定，和既有 Sky 合成/Map 投影未决分别保留。未刷新、编译、清缓存、改变 Storage、推手机或创建另一开发窗口；普通/phone/D2 候选均未重建。

## 2026-10-28 普通候选手机反馈

范围：plain 6bacbb53、F0RQ5W/generation1、session RvYsRP，ordinary preview / development_feedback。完整调用与网络身份归[PHONE-CANDIDATE-PREP](PHONE-CANDIDATE-PREP.md#2026-10-28-手机恢复与直接推送)，不冒true-debug或settled验收。下列原图/视频均在该session私有目录，Root实际查看图片；视频另标未审。

| 实际操作/结果 | 原始证据 | 判定范围 |
| --- | --- | --- |
| 当前Map有四卡、地址pin和左My书签；点My实际出现右侧Map书签、左设置及计划卡 | screen-12540604…、screen-8586c6b7… | 当前手机入口真实生效，取代桌面tap未产生效果的歧义；未据当前空计划列表判断原N05 |
| 点右Map书签返回原列表/广域地图 | screen-479b38a4…、recording-1793188908248.mp4 | 返回画面已审；录屏尚未审，不据静帧宣称左出动效通过 |
| 选当前实际发布隔离点，出现中档详情；数据缺失通知自然退出后，pin位于剩余可见地图约中部 | screen-eb7b7592…、screen-a3e70646… | 中档与点位视觉成立；未取得精确native projection/4km，不关闭该定量义务 |
| 进Sky，真实星体/星座线/图非空，地点/UTC+8可见；点右上原菜单控件后X和六项出现 | screen-7a746736…、screen-7bc853a6…、screen-2c10f248… | 首帧控件收起符合owner。此前把右上动作当通知关闭的意图应纠正为菜单展开；没有据桌面合成未决猜改z-index/renderer |
| 点时钟打开六字段和尺：20:06:08；减小时后字段/尺均19:06:08，星体/线/图实际位置随之变化 | screen-42798849…、screen-6e4d5427…、recording-1793189871296.mp4 | 目标时间预览与实际可见变化成立；视频未审，不量化输入延迟/连续性能 |
| 在时间面板外上方sky间隙点一次，面板仍开；点“取消预览”后字段/尺恢复20:06:08且星图恢复 | screen-1bdd3a96…、screen-e16af4ce… | 显式取消有真实效果；外点未关闭待查触摸路径，未归因、未修生产代码 |

上述时刻为当前隔离旅程产品时间，未改变原N05或发送提醒。官方预警缺失StatusPanel持续显示，与LOCAL_TEST缺供应边界一致，不能将其冒“无预警”；本段未核正式源状态。当前未Play、未应用公共Context、未做Sky返回，相关下一观察沿HANDOFF。Menu/时间控件实际可见已解除这条手机合成疑问，不代全采用稿视觉一致性、完整P1或D2性能。

后续同plain会话的有界判别：`screen-db089a96…`证实在裸天空x0.5/y0.125点击后时间面板正常关闭、恢复展开菜单；此前y0.34点落在预警来源行透明区域，不作为产品缺陷。`screen-4c791645…`证实普通Sky退出回同选点/中档。`screen-abf3216c…`及稍后`screen-e145648b…`见实际地形；`screen-9c8d91bf…`见地形+r6光害叠加、2025年度/原单位及分级图例；`screen-c82f3e88…`见三开时云量明确暂无有效时段且旧两图仍在，关云量`screen-47d1faee…`保两层。My往返`screen-f53d94d8…`/`screen-faa107c1…`仍保点/中档/两层；一次短横拖后`screen-94c567ba…`视野更新、面板收回，地图与两层仍有实际覆盖。未量化LOD/配准/速度或完成连续长拖/在途接管/释放，D1不全关。

同一失败在层叠回详情和My返回后重新弹出（`screen-c8b9adf1…`/`screen-faa107c1…`）已交原通知owner定位；实际My返回主要为近期天气/空气质量。后续源码修复必须新包验证，不把当前plain/D2记录冒修后证据。


## 2026-10-28 同故障重报修复与当前真机调试

当前手机绑定：新普通包81bfb972已在唯一目标手机实际连接当前真机调试，session=`notice-reentry/starward-device-feedback-Cldr5o/starward-device-test-ki5Lti`。官方remote(auto)只调用一次；最初automator timeout后保原会话，随后手机Map实际显示、已连接/服务器正常、received97→199且待发0，官方currentPage=pages/map/index，systemInfo=Android14/N2401/SDK3.17.5；getAccountInfoSync窄比对AppID与prepared一致、develop，不输出ID。最初错误LAN尝试已由工具回退广域网，VPN/TUN未动；两个连接timeout只保原诊断。新包实际两条返回路径未重复报同故障，14.97s/14.96s录像均解码抽帧核对，点/面板/两层仍保；正常真实天气错误及重试控件仍见当前phone WXML。My入场另一个录像仅5.22s且未含完整转场，不拿其通过动画。6s录制在输入前结束、一次旧capture超时均拒绝发送，属于采集边界。主用Performance/Memory尚未新录制；不要将工具可用或短回归当完整性能/产品完成。权威receipt为该private root的readback.json，任务证据见WEAPP-UI末节。

- 修复沿Map生命周期保留RecentWeather/AirQuality/WeatherAlerts三个failureEpisode；仅scope与reported布尔，无数据/图片引用。账户/Map reset换owner；已接受显式retry、真实恢复后新失败仍有原语义。30/30、typecheck0、diff check及fresh只读核对复用，不额外重复检查。
- 私有证据：notice-reentry/readback.json；My返回recording-1793194321406.mp4与my-return-2fps-contact.png；Layers返回recording-1793195423117.mp4与layer-return-2fps-contact.png；最终screen-cce2945d-6310-4f1b-98e2-1fc3a2d5f3c2.png。2fps抽帧用于原3秒通知的有无判别，不作精确动画/响应时延结论。
- 成品337文件/5,134,493B，hash81bfb972…；本轮official preview原失败及缓存修复、重试success原回执都保留。新包官方main2,170,625B依赖既有开发bigPackageSizeSupport，不能据本地预算通过冒正式分发资格。


## 2026-10-29 选点后迟到原生手势的窄修

手机debug在04:40本地时间结束后，官方SDK已回到devtools模拟器；此后的Map选点/getScale=8不属于手机证据，也未确定产品根因。恢复操作及截图边界归私有`phone-compass-scope-fix-20261029/official-delivery.json`、`map-gesture/disconnected-runtime-scope.json`；此前有效的手机Performance、Heap及图层观察仍保原范围。

fresh只读核查确认既有medium、约4km校正和原生投影居中已接通，不重开发。独立受控顺序发现：旧user begin→新选点（zoom14）→旧drag end（zoom8），页面会为旧end重新建立意图，从而写回旧中心/缩放并退休新点Context。programmatic update end与已退休getScale迟到都未复现该写回。完整调用链、8份源码SHA及6段准确函数、六种顺序输出保存在同一私有根`map-gesture/selection-viewport-readback.md`及countercheck文件；这不是平台已发生该顺序的证明。只读agent完成后已关闭。

Root在原Map意图owner保留begin所属的整数intent；接收user end时消费该关联，已被选点/隐藏/替换退休的旧意图直接返回，不再生成新意图。真正新begin立即取代旧关联；没有已知begin冲突的独立end仍按原完整相机/缺scale路径处理。没有新增相机store、定时节流、缩放阈值、布局或资源变化；无法区分的平台重叠事件不编造gesture ID。

回归先在旧生产函数实际失败（选点中心/14被旧中心/8覆盖），新手势对照已通过；首次从仓库根运行因tsx别名缺配置未进入测试，改回原miniapp工作目录后才取得有效反例。修后原Map intent/scale recovery/native event/focus/candidate五组49/49通过，小程序typecheck0。当前修复已编入完整GPU任务候选5140b813、341文件/5,239,262B，生产/副本类型0诊断及双副本/源码绑定读回通过；旧74d2、59742及全部有效记录保留。未推手机，不关闭真实4km、居中、连续手势和P1/P2/D1验收。

### 已存普通候选录像的后续读回

复用原6bacbb53两段录像，未重新采集。原My返回录像1793188908248实际5.39s，原减小时录像1793189871296实际5.35s；本轮在task-private安装独立读取器imageio-ffmpeg0.6.0（不改仓库依赖），解码成2fps联系表。My录像原生帧3.5–4.5s另行读回（prior-my-return-native-transition.png），显示My向左退出后露出Map/四卡，符合该方向要求；此证据只覆盖退出，入场仍未完整记录。小时录像清楚显示字段从20:06:08选为19:06:08，实际已绘时刻先显示19:09:58并标更新中，随后收敛到19:06:08预览且星图改变；支持真实中间结果与最终目标各自表达，不能据5.42fps的录屏编码或2fps抽帧声称产品FPS、精确输入时延、分钟连续性或跨字段历史对照已完成。私有证据为notice-reentry/prior-video-decoder-readback.json及prior-my-return/prior-hour-step-2fps-contact.png。


## 2026-10-29 当前普通包官方推送

当前编辑器s7仍欢迎页/页面路径空，先前信任提示已不再可见，用户完成情况未知；新一次只读官方Console过滤没有命中，安装目录debug.log最后更新在前一日，均不能定因或证明授权已处理。没有继续SDK/reconnect/refresh或UAC重试。官方previewer明确auto_preview无需先开项目，沿既有用户自动推送授权和已验证同账号路径，完成最新源码的普通预览，不把它冒主用真机调试。

Root复用原plain Taro build与device-feedback owner；新输出slot `map-gesture-20261029`，同一TW3E6Z run推进generation2，不编辑旧快照。源目录/配置/依赖摘要在构建前后相同，受保护ordinary aed9、旧手机74d2和GPU5140逐字节摘要相同。完整构建64.353s/exit0，当前包 **e17b963f8ac7427a3413bcaa6afc9e8da56bf4c866831a65c43e7c80dfa18161**、341文件/5,209,600B；本地主包1,992,973B，原compiled Sky角色、路由、物理安全和包体检查通过。沿上一节49项/typecheck的未改源码证据，不再重复该组软件测试。普通包没有GPU探针、fixture或request/acceptance诊断，仍用原热点8787 API，未修改共享/防火墙/服务/DB/提醒worker。

官方MCP登录未过期、skill0.3.14相等；新普通包调用auto_preview一次，函数cell615已成功终态。官方main **2,065,245B**，低于原2,097,152B上限 **31,907B**；total5,230,661B，bigPackageSizeSupport=false。官方调用后的原generation身份守卫通过，尚未打开新编辑器项目。该普通预览成功不等于上传体验版、正式发布、源数据资格、真机调试或产品验收。

手机交付仍待一个明确动作：打开本次已推送预览。无线ADB经原doctor确认可用；首次误向feedback doctor传transport只报argument_invalid且未执行设备动作，改用原device doctor后成功。原8787 capabilities实际HTTP200（先前误拼client子路径的HTTP异常不是服务故障）。实际截图前沿原AdbDevice核同一已授权手机，再经过前台guard，因不是AppBrand而拒绝，未产生截图或输入。随后只读OS activity/focus分类确认唯一微信LauncherUI；没有读取聊天、通知、intent extras或设备标识，不能把微信主界面当作新包已运行。用户已收到最小操作请求；不重发成功preview、不以bind确认旗标补造交付事实。

证据根为 `E:/Dev/Starward-data/development/phone-compass-scope-fix-20261029/current-map-gesture`：`candidate.json`、`build-result.json`、源码/受保护前后摘要、`official-preview-result.json`、`official-readback.json`、`delivery-summary.json`及`phone-delivery-classification.json`。具体prepared project是同一父根的`starward-device-feedback-TW3E6Z/generation-000002-VVkurQ/project`。build子进程与官方调用均已结束；`process.json`/`official-operation.json`是作用前阶段，终态以上述结果为准，不重放。旧generation1/aui3b3及原结果不删除，旧反馈状态保在`previous-feedback-state.json`，原顶层指针保在`previous-feedback-run.json`后才更新current。当前run的deviceSession=null，旧文件仅供历史证据，不给新代输入授权；GPUwAZ3Du/5140完全保留。

完整Goal和P1/P2/D1目标结果仍未完成。下一有效手机动作是在本代实际打开后取得fresh capture、核新代投递并绑定，再验证选点中档/4km/剩余视野居中及受影响手势。旧74d2有效Performance/Heap/Play/暖态拖动直接复用，不为这次普通重建整批重录。

交接写入后已读回核对，context:validate和git diff --check通过；main/HEAD1fd25800保持。06:27本地时间仅做一次原owner的未绑定只读复查：同一授权无线目标通过，Mini Program前台guard仍拒绝，无截图或输入，未绑定/重发预览。私有phone-visibility-recheck.json保该结果；等待已请求的手机打开动作，不再循环重查。


## 2026-10-29 普通预览实际送达与选点回归

用户反馈“没有收到预览”，原自动success因此不算实际投递。Root沿原prepared generation2先创建普通QR，官方成功、47,274B、SHA873fb1e9edf6bd3b0f6737531e6b0a4189a2c54e8b0f0faea914080b6b32610f，图像已实看；Codex打开返回queued，未据此声称桌面已显示。用户随后明确“你推送呗”，再次auto_preview一次成功。主包/总包与前次相同，当前generation/source未变。新一次guard核同一授权无线手机后取得非空Map和中档实图，原bind owner创建session aMahET并正常移除本代临时QR；未删除旧generation1/aui3b3。它是development_feedback，手机bundle字节和runtime AppID未独立读回，不冒完整验收。

真实手机操作与有限结论：

- Search入口及同点卡片有效；返回原地点中档。5.99秒录制原件1,086,642B，以原本地ffmpeg解码2fps联系表：前面样本仍Search，最后样本为Map正在settle/加载，后续独立截图为稳定中档。此记录不支持输入延迟、产品FPS或完整转场方向。
- 后续单次1.2秒pan使同一点marker明显向右上移，随后两分钟后的新图仍保持新视野，无自动拉回。MAP_VIEWPORT Context成功后由既有resolveMapPoint→leaveSelectedLocationForMapPoint关闭面板，视野卡和banner出现；不是把本行为当新增缺陷。点击该视野卡后，同点中档和居中恢复。
- fresh只读agent核当前marker源码/包内PNG字节相同：anchor=(0.5,1)，224²图的可见主体约到第199行；可见尖端约y590并非地理anchor，计入透明边距后anchor约(540,604)，与平直面板顶边约1207、剩余地图中心约(540,603.5)相符。Root读回实际geometry/marker/native projection owner；结论仅为本帧与居中一致，没有原生MapFocusFrame、getRegion或scale，不能证明精确零偏差、4km或旧gesture end实际顺序。代理完成后已关闭。
- 一次record-swipe返回tool_timeout，没有可用录像或可推断的输入结果；Root先读回画面，再新发普通swipe。另有两次recent_capture_required均未发送输入；之后不在capture与input间插入分析的原守卫路径成功。没有拉长守卫、改录制器或用工具失败冒产品失败。

当前私有证据根current-map-gesture：auto-repush-requested-intent/result、repush-phone-readback、current-phone-feedback、same-point-search-2fps-contact及原视频；具体5张图/各自metadata/hash均在current-phone-feedback内。截图含测试点位与私有运行态，不放进仓库。源码没有新改动，不重跑原49项与已有效Performance/Heap。

为读取必要原生范围，Root在关闭旧s7前再次核12组源码/配置与构建后摘要完全相同，当前generation守卫通过，保存ide-transfer-intent；官方close旧generation1的s7后，首次open generation2 fullMode得到s8（系统窗口209718102）。当前fresh窗口确有“信任并运行”安全提示，已请用户处理；未代点击、未发remote/refresh/额外构建，不能把窗口打开当运行连接。普通手机候选仍可用，GPU5140/8798均未投递/启动。原手机未打开的blocked条件已解除；Goal工具仍保旧blocked且无resume能力，实施依最新用户指令继续，不创建另一Goal或虚报active/complete。

后续完成前只读复查：s8信任提示已不可见，但仍欢迎页/页面路径空；对本代首次currentPage只读调用返回timeout waiting for automator response。未据提示消失推断信任完成，未发送remote/刷新/编译，也未重复旧s7恢复循环。官方project_list的两个已导入项目中不含这两代精确路径，旧s7无登记项需要删除，未动无关入口。最终状态保在私有ide-transfer-result.json；普通手机及新session仍保留。

## 2026-10-29 信任后真机原生范围与投影

用户要求重新弹出信任提示后，Root重核12组源码及当前generation，等旧窗实际退回项目列表后重开同一s8；用户亲自回执已点击“信任并运行”。随后官方currentPage成功，桌面430×930截图实际Map已看，generation守卫通过。官方remote对同一e17b仅调用一次，返回timeout waiting for automator response；独立调试窗却实际为Wi-Fi已连接、非零收发、零等待/未确认，独立guarded手机图也是同Map中档与绿条已连接。后续systemInfo明确返回Android14/N2401/SDK3.17.5，Map页pageId为负数，与先前桌面devtools/iPhone返回区分。窗上显示3.17.6(1663)另记其来源；没有用simulator截图冒手机结果，也没有重发remote/刷新/构建。

本次只读选择器与原生getRegion/getScale/toScreenLocation均来自上述Android runtime，采样于2026-10-29T01:18:26.104Z，Map id为本代spot-map-1。逻辑矩形384×797，当前medium panel top429/height368；原生scale14，地图角投影分别(0,0)/(384,797)，唯一selected marker anchor=(0.5,1)、40×45。其地理锚点投影(192,215)，剩余可见区域中心(192,214.5)，x差0、y差0.5逻辑像素，符合整像素投影精度下的本次居中。沿现有map-camera的统一GCJ→WGS/地面范围owner计算，宽3382.775m、高3779.514m，较长维度3779.514m低于原4000m上限，结果zoom仍14。本次不改变相机/源码/数据，不把静态像素尖端当地理锚点。

该development_feedback支持一个真实选点在当前Android布局下的约4km和中面板可见区域居中；保更细视角、其它实际入口/布局、迟到重叠原生事件顺序、D1完整覆盖/冷细节及整体验收保持未验。原始地区坐标只留私有native-map-trusted-readback.private.json，摘要与可重复计算分别为native-map-trusted-metrics.json和analyze-native-map-readback.mjs，均在current-map-gesture。trusted-remote-system-info.private.json和trusted-remote-result.json保存来源/真实工具结果；当前没有Profiler录制、watch或新GPU投递。
