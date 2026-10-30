# Starward 微信小程序全原生迁移方案

2026-10-31 初版。本轮用户授权独立分析 Pro/Gemini 建议并写好新对话的实施方案，**本对话不实施**。完整要求见 [REQUIREMENTS](REQUIREMENTS.md)。本文件已承接全部采纳决定与必要风险；[RESEARCH](RESEARCH.md) 仅供具体问题追溯，不是实施前必读材料。本文件是唯一迁移方案；当前状态和下一动作归 [HANDOFF](HANDOFF.md)。新对话使用 durable-goal，收到明确开始实施指令后沿本方案执行；不重新生成并列方案。此后改方案须有用户明确授权，局部代码组织与调试选择无需逐项审批。

## 1. 结果、范围及已经决定的路线

最终小程序为微信原生 Page/Component＋WXML/WXSS＋TypeScript，不包含 Taro/React 页面运行时及迁移桥接。保同等产品功能、当前采用设计、科学/时间/数据/权限语义与既有公共优化。收益按实际产物和同条件真实运行描述，不预设帧率/内存百分比或服务器账单下降。

- 仅迁移 `apps/wechat-miniapp` 和真实受影响的共享接口、工程入口及 Context。后端栈保持；React Native/Expo App、App 专属 API 和其它 workspace 保留。不能全仓删 React 或将 App 路由类型错误纳入迁移。
- 原 `sky-map-performance-2026-10-18` 的 P1–P6/D0–D3 和采纳优化继续原位封存；新全国云量/光害、服务计算池、数据库/CDN/拓扑等不在本迁移实施。迁移后交回完整义务，另行重写旧方案后再实施。
- 不重画 UI、不换星空引擎、不顺带启用 Skyline/glass-easel、不关闭 preserveDrawingBuffer、不改变图像/星表/时间精度。现有 renderer 及原生 Map 仍是产品能力基础。
- 迁移期不新增、恢复或改名重建任何测试代码/夹具/mock/测试页面/断言驱动。使用现有类型/编译/资源与真实发布保护和官方工具实际观察。必要业务输入/权限/完整性校验是产品代码，继续保留。
- 沿当前 `main` 开发，迁移起点为本次包含测试退役、规则、封存与初版PLAN的准备提交；基线定位见HANDOFF。保后续未提交成果与私有原件，不回退到历史研究快照f09da5e。清理按 Windows 回收站及范围核验规则。没有顺带外部发布、数据上传或发消息授权。

## 2. 目标架构和技术选择

| 责任 | 已选做法 | 边界与不变量 |
| --- | --- | --- |
| UI 宿主 | 原生 Page/Component、WXML/WXSS，保当前常规渲染体系 | 页面处理路由/生命周期/组合；公共组件处理自身受控呈现与事件，不获得业务真相。 |
| 客户端状态 | `zustand/vanilla@5.0.14` | 从当前 app-store/system-motion 的真正无 React 核心创建实例，保 actions/存储/账号规则；临时 React Hook 绑定同一实例。 |
| 查询 | `@tanstack/query-core@5.90.20` | 保 QueryClient、QueryObserver、keys、失效/取消/缓存；不解析到根 5.101.4，不造第二请求或响应缓存。 |
| 公共原生绑定 | 少量有类型的 store selector、query observer、presentation/视图投影适配 | 负责订阅/更新/退订与小 ViewData；不自建响应式框架、EventBus、万能 BasePage 或万能恢复状态机。 |
| 平台能力 | 在已有网络/文件/存储/导航/节点/传感器 owner 下接 `wx.*` 和全局 `getCurrentPages()` | 同步 API 保同步，异步 Promise 与 Task/cancel 按真实 API 适配；不将所有 API 堆到一个全能 weapp.ts。 |
| Map/Sky 控制器 | 抽取框架绑定中的实例协调，复用已有领域及资源 owner | 按共同责任组织，不按 `<300行` 或把每个 Hook 机械改成字段。组件发意图，原 owner 决定资格和提交。 |
| 公共 UI | 原生基础组件＋原生化 Starward 公共组件 | 已比较 TDesign、Vant Weapp、WeUI：本轮不整套安装。现有控件已有特定受控/主题/手势/Back/图标语义；库不能替代这些责任。详见下一节。 |
| 工程 | npm workspace、TypeScript＋Webpack 5 原生多入口、Sass/PostCSS | 使用微信可执行的模块/资源输出；保版本锁、分包/图标/环境/发布保护，不换包管理器。 |

### 2.1 状态与资源作用域

- **App 级轻量实例**：app store、motion store、一个 QueryClient、现有公共文件/编码缓存 owner、nativeMapSessions、轻量导航返回身份。App 初始化接管 QueryClient mount、取消 polyfill、错误上报、native chrome 和历史文件清理；按当前 hydrate 业务语义集中接线，不能在每页重建或重置账户。
- **Map 实例**：primary presentation controller、实际 Map session、region/selection/focus、三层安装协调器及当前 reader。My 逻辑前台不等于 Page.hide；Map 原生节点存续不授权它继续读取/手势/发命令。
- **Sky 实例**：Context session、observation-time、camera/selection/orientation、time/geometry 供给、单绘制 writer、Canvas 和 native image 生命周期。Sources 暂离和真正退出沿原 owner 分开。
- **组件实例**：输入草稿、动画/滚动定位、挂载与测量、局部订阅。共享的是规则而非所有实例状态。小 ViewData 只含模板需要的 JSON 值，完整报告/星表/typed array/Canvas/GPU/observer/请求/资源句柄留在 owner。
- 跨包共享必须是**同一实例**而不只同一份源码。过渡页面从 App runtime 的窄接口获得 store/query/resource 实例；主包不得为此提前加载 Sky 重型子图。

### 2.2 同步资格与异步视图

账户、Context、generation、取消/隐藏即时更新并撤销旧操作资格；随后才可合并 UI patch。A→B→A 不能恢复旧 A 的 reader/请求资格。提交后的回调再次核宿主身份和代际；旧组件 detach 不能清掉后继实例。

ViewData 字段明确区分缺失、显式空值和不更新，不做全局 undefined→null。patch 应保顺序及父/子路径语义；不用浅比较吞掉受控输入的强制纠正。WXML properties 只传可序列化值与最小标识，函数/资源不穿视图层；事件经明确 detail/dataset 契约到 controller，再核当前身份。setData 完成只证明视图传输阶段，不是 Map 安装成功或 Sky accepted。

### 2.3 Query 原生接入的具体责任

`useResourceQuery` 改成原生订阅 owner，保以下全部行为：live enabled、动态 staleTime、同步 readCurrent、旧有效数据/refreshError 分离、throwOnRefetchError、structuralSharing=false 的能力身份、取消与正常失败区别、原 cache/GC/retry 配置。换 key/隐藏/销毁时退休旧 reader；还存在其它消费者的共享请求由 Query 决定是否取消。

原 Provider 的 mount/unmount 交给 App 生命周期 owner；联网与前后台由微信事件接入 Query 的 online/focus port，保原 `refetchOnWindowFocus:false` 等政策。**锁定 core 的无 window 判定会禁用内部定时刷新**，Map 天气预警确实需要定时刷新：在原生查询绑定/该业务刷新 owner 中提供有界原生计时接入，沿用现有周期与当前可见资格，通过同一 QueryObserver/refetch 更新，退订/隐藏及时停；同一责任不能再叠加 core 内置轮询。不要伪造全局 window/DOM 或修改 node_modules。若还有真实依赖 stale 通知的消费者，在同 owner 处理而不把新计时器散到各页。

第一条原生路径必须确认这些接入所需的平台/包行为；运行结果若推翻本做法，记录具体冲突、停止依赖扩展并提出方案修订，不暗中改掉预警刷新需求。

## 3. 公共组件与成熟库取舍

当前不是“安装了整套 Taro UI 库，现在全部换掉”：需退出 Taro/React 视图绑定，保原生能力和已有 Starward 语义。组件按下表一次迁责任、迁完全部实际消费者；保 Screen Contract 和 DESIGN/Stitch 采用资源，不能用库默认样式替代。

| 公共责任/现有入口 | 原生迁移做法和消费者范围 | 已有成熟能力的使用/取舍 |
| --- | --- | --- |
| SharedButton/SoftButton、LoadingIndicator、SelectionTabs、ToggleField | 一套受控 Button/selection/toggle 组件；Settings、My、Sky 菜单、投稿/反馈、文档 tabs 等共用。保 disabled/loading、全行激活、既有 press/主题；不放业务保存逻辑。 | 原生 button/view/input/scroll-view 提供基础。自有 wrapper 已承担精确规则，套 Vant/TDesign 还须二次重做，当前无净收益证据。 |
| CustomNav/PrimaryBookmark/NativeBackBoundary、presentation/Back | 原生事件绑定同一 primary-navigation 和 Back 命令；覆盖 Map/My、Search、子页、媒体/弹层、直达/分享/通知入口及恢复。 | 微信原生导航 API；不引第二路由系统。系统/显式 Back 的业务优先级不归 UI 库。 |
| Notification、StatusPanel、错误/加载/来源提示 | 保既有 notification state、去重、位置与 recovery callback；主页面及嵌套逻辑表面共用，不写每页 toast。 | 可以借平台视图渲染，但不换成无法承接权限/重试/观测主题的默认系统 toast。 |
| Map panel/layer/filter sheet、媒体 viewer | 保三档、唯一滚动、handle-only 热区、互斥 bottom presentation、可中断 retarget 和返回恢复。复用现有 motion/geometry/gesture；换原生节点和模板。 | TDesign/Vant Popup 能提供基础遮罩和弹出，但公开 API 不等于三档/热区/Map 层叠等价；本轮保现有 coordinator，拒绝仅为“用库”重写。 |
| 时间尺、六字段输入、日期与播放控件 | Map time-ruler、Sky time-controls/OrientationTimeRuler 共享已有定位/settlement 规则；精确时间和草稿/应用继续由原 time owner 负责。保受控拒绝纠正、迟到 blur、步进/反向/停播。 | 原生增强 scroll-view/input；普通 Slider/Picker 不能替代 real-slice curved scrub 或精确天文语义。 |
| AstronomicalEventModal/Banner | browse 与 select-one 等真实变体由同一公共语义实现，Plan editor 与 event host 等消费者统一迁移；日历/事件选择不复制数据 owner。 | 原生组件组合；generic dialog 不能拥有事件选择/时间应用事务。 |
| SemanticIcon/packaged-icon、采用图像 | 一个语义入口、一套模式/包身份映射，保 main/spot/sky/content 资产归属及既有原生 packaged-icon。 | 不引库图标家族或远程 CDN 图标。 |
| 登录/表单/稿件/媒体/分享 | 原有账户操作/草稿/命令/上传幂等 owner 保留；公共输入/图片 viewer/分享绘制复用，页面差异由声明与窄 adapter 承接。 | 使用 wx 授权、媒体与文件原生能力；不让库 form store 成为第二草稿真相。 |

本轮不将“不装 suite”扩成永久禁令。若出现本表未能满足的真正通用能力，先在 owner 下比较**单一**原生库的具体组件，读锁定版本依赖/license/TS/主题/API/包体和 Map/Canvas 层叠等相关限制；只验证能改变选择的缺口。若要改变已选方案方向，按用户明确修改授权规则处理。不能引两套 suite，也不能只凭 star 数或品牌做选择。

样式迁移必须明确：旧源中逻辑 px、大写 Px 和转换后的 WXSS 的实际关系；原生固定逻辑尺寸输出 px，responsive 值按原语义处理，不全转 rpx、不保留重复缩放。组件隔离、externalClasses/slots、theme 根与跨弹层主题有明确契约；必要共享 theme 属性只投影所需值，不复制整个 store。对应 UI 模块动手前实际查看当前采用资源及可编辑源，不拿旧截图/代码当前样子自动当设计真相。

## 4. 公共逻辑、已有优化及特例迁移表

表中源码均在 `apps/wechat-miniapp/src` 下。迁移记录沿此责任表维护实际新入口和消费者，不按页面建立一份重复优化清单。

| 当前 owner / 消费者 | 处理类别及必须保留的内容 | 迁移后的最小证据 |
| --- | --- | --- |
| packages 合同/坐标/astronomy-core；app-transitions、notification、纯几何/布局 | **复用**未变业务/科学算法和输入输出含义；别名/打包必要适配。数据版本、来源、精度、缺失与零不变。 | 真实调用与类型/构建；未变科学证据按原条件继承，不重测每颗星/地点。 |
| app-store、system-motion、use-theme；账户登录/查询/操作/偏好 hooks | **改绑定**，保账号分区/精确位置不落盘、hydrate 恢复、revision/未知结果、显式登录、取消和旧身份隔离。 | 一个真实账户/偏好或可恢复草稿路径，读回结果及返回后状态；独立变更机制补对应观察。 |
| use-resource-query、query-client、api-client/request-lifecycle | **核心复用＋原生适配**；保共享请求、更新身份、读当前/迟到资格、有效缓存、GC、refreshError、abort。 | 真实数据页显示/返回/再入，当前请求身份、缓存复用；预警刷新、网络恢复按修改边界观察。 |
| primary-navigation/controller、page-presentation、sky-map-lifecycle | **控制器保留＋宿主适配**；逻辑前台、native show、导航受理、Back 和 Map→Sky清理→redirect 顺序。 | Map→My→Map；Map→Sky→Sources→Sky→Map 合并旅程，状态和前台资格正确。 |
| raster-image-resources、map-raster-files；三层与地点地形 | **资源核心保留**，文件/reader/native pin/别名/partial file/删除失败责任和 8文件/16MiB/2并发沿源码；不建每层缓存。 | 普通真实替换/关闭与共享消费者退出，已有合法消费者未被误杀；无需重压全部历史预算。 |
| map-ground-overlay、native-map-session 及三层 consumers | **安装规则保留＋MapContext/节点适配**；串行 writer、双槽、generation、迟到 remove、前任节点稳定 identity 共挂载/事件隔离、单个未知前任。 | 一个真实窗口更新、加载中接管、最终范围/图层显示；F04旧证据保留，新模板接线核实，不重演故障注入。 |
| terrain/cloud/night-light hook、coverage/publication/time owners | **Hook重接，领域准入复用**；固定/粗父图/最终细节、云量精确时刻/发布身份与年度光害差异不强行合并。 | 地形窗口变化＋云量时刻身份分别有依据；缺正式供给保实际不可用，不伪造成功、不顺带跑全国供给。 |
| sky-observation-time、use-sky-time-geometry | **状态机复用＋复杂协调改写**；六字段/preview/play/apply/cancel、wall-clock 1x、在途任务/epoch、目标和accepted模型资格。 | 同一非空Sky中步进、跨供给窗口连续输入/反向、Play→Pause、应用/取消；性能不逐字段重做。 |
| sky-time-target-query；Sky和Sources | **公共查询绑定改写**；60秒复用、隐藏 reader 退订、共享signal、A→B→A、缓存回调作用域。 | Sources暂离/返回，共享请求不误杀、退出不残留页面reader；源码和压缩产物核有关闭包。 |
| Canvas lifecycle/surface/GPU renderer、Scene/BSC/SAO/camera | **核心保留＋节点/事件/宿主适配**；唯一writer、精确输入、present→accepted→names/picking/source一致、双Canvas呈现与selection层、完整目录和资源退休。 | 真实有内容画面拖缩/选取/来源与时间一致，hide/return/exit；必要有限目标性能观察，不能以setData成功证明accepted。 |
| useSkyNativeImages/useSkyFixedImage/target optical及各家族 | **共用绑定一次迁移**，保loader/request/cache核心；Canvas/revision/publication所有权、wanted/paused/retry/dispose、降级与有效独立结果。 | 固定图像与有coarse替代的渐进图像各一个机制；不逐天体/LOD重复。 |
| encoded cache/native images/GPU纹理及其他持久文件 | **保原账目和预算**，区分在途、驻留、替换峰值与未确认释放；不以JS计数冒物理字节。 | 显示/替换/正常退出中实际owner退休及无迁移新增持续增长；未知物理GPU不自动造新采集任务。 |

特例处理：Taro prebundle/模板补丁在新构建不再依赖后退出；ScrollView/受控输入补丁所保护的产品语义继续实现。Taro Promise/callback 兼容可按真实 wx 收窄，但取消/partial-file/迟到清理不能丢。Android sensor 单位与过滤属平台修复继续保。模块级工厂及防压缩内联边界先保，只有新压缩产物证据支持才退役语法绕行。D1/D2/F04 已收口和播放准备合并/延期纹理上传不采用裁决沿原 owner，不随迁移重开。

## 5. 模块顺序与交付条件

按下列顺序推进，先形成有效真实路径再扩大。M2共享UI与M3/M4按依赖递进，不要求全库公共组件先一次完成；普通页面族可以在共同底座稳定后独立推进。这里没有强制子代理/并行授权，遵循实际会话和项目规则。

### M0：接手现状和可恢复基线

新对话先读 INDEX、REQUIREMENTS、PLAN、HANDOFF、AGENTS/global 和对应 owner，核分支/HEAD/dirty/实际Goal。准备提交中的 1,302 文件删除及配置/业务测试入口退役是既有成果，不恢复。用户已将本次提交指定为可恢复迁移起点，复用它及既有数据/产物身份，不重新生成检查点；若后来又有未提交改动，核其归属并保护。无需重建历史候选、清缓存或跑旧测试。保护用户账户/storage、EOG WIP、历史成功/失败原件。

产出：当前迁移状态和最早缺的运行输入已确认；复用现有数据恢复命令，不用 MEMORY_TEST。没有设备时先做工程和其它不依赖设备的模块，把真机义务留未验。回滚使用原完整源码/产物及兼容存储；不要在最终产品内永久保留双路由/开关。

### M1：轻量公共运行时、原生构建和第一条真实路由

1. 原 store 转 vanilla，Query转锁定core，抽出必要原生绑定与平台端口；保原业务 owner 和调用接口语义。临时旧 React consumer只能绑定同一实际实例。
2. 原生目标输出 App/Page/Component JS、WXML、WXSS、JSON及静态模块；采用无DOM脚本加载依赖的微信模块方式，明确入口/共享模块装载顺序与主/分包可达关系。完整配置要保 assets/license、常量、alias、合同子入口、不可覆盖发布目录、项目/AppID/origin。不要复制Taro cache/prebundle/模板补丁作为新架构。
3. 同时保普通 build/watch、隔离完整候选/不可变 release 三种真实职责；退役 fixture build/合成验收 reset 等纯测试入口。app.tsx 的 acceptance 注入与 config 的 fixture 分支须逐消费者分类；保真诊断和正常业务校验。
4. 使用已注册的 **spot/data-source** 真实页面完成第一次原生接入，真 Context/BFF、主题/语义图标、返回和销毁一起成立。独立原生候选早期即可构建；不建 demo/test page，不依赖模拟数据冒闭环。

交付条件：原生页面真实读取并呈现正确资料，主/分包路径正确，状态/Query/资源实例唯一；现有网络与刷新/隐藏责任可接通，构建产物不依赖DOM chunk loader，不提前把Sky子图装到主包。初始混合若不能保证单例或跨包规则，**按本方案提前让原生App壳持有共享实例**，旧尚未迁移页只是临时宿主；禁止用复制store/query作为解决办法。仍不能满足则停止相关扩展并提出具体修订建议。

### M2：公共视图、主题、导航与输入责任

依第3节迁必要SharedButton/图标/主题/状态反馈/导航Back、表单和弹层；让首条真实消费者工作后接其余真实消费者。将采用设计的尺寸/素材/状态映射到原生；查styleIsolation、slot、externalClasses、测量scope与动态节点ready，不全局强开shared样式掩盖缺口。source/presentation/Back模块继续统一逻辑前台。

交付条件：公共组件已有真实原生消费者，正常/禁止/加载/取消/返回等相关共享状态成立，受控输入纠正不被差量优化吞掉，未复制业务状态或图标系统；后续页面只传内容/变体。

### M3：Map与My纵向链

将Map逻辑投影从React移到原生宿主和实例controller；三层读取/安装/退休沿旧owner。固定Map节点ID和真实scope，保故障前任节点直到实际退休，只当前节点接收手势。接完整My逻辑前台/独立直达包装，隐藏资格不得依赖真实Page.hide才失效。Search/选点、三档spot panel/layer互斥、媒体、时间/图层/通知与返回状态按原合同接线。

交付条件：一个真实Map窗口/图层替换与用户中途接管、Map↔My、Search返回，以及清理→redirect进Sky的边界正确。三层存在不同数据合同；供给未就绪保持明确未验，不调用封存加工任务。F04旧失败不重演，新绑定/节点保护要有当前源码和普通运行依据。

### M4：Sky与Sources纵向链

先迁Context/observation-time/几何供给和Query reader，再接Canvas/图像与相机/输入。把时间命令直接交既有time owner及writer，替代React协调链；先保原定时来源/墙钟语义，不附加重做时间引擎。公共image binding一次覆盖当前所有family，独立光学/天体/SAO/metadata recovery语义各归原owner。

节点ready与visible/generation共同授权获取Canvas；普通hide、Sources pause、App background、unload/detached分别处理。保持surface.present成功后才能发布accepted、名称/拾取/来源都用同帧身份。Sources重试有自己的选择edition/可见资格，不用Canvas重置替代metadata重试。

交付条件：Map→Sky→Sources→Sky→Map真实链；非空完整目标数据下时间/Play/Pause、拖缩/拾取、固定/渐进图像、返回与普通退出成立；没有第二writer或额外全量星表setData。D2负面实验不重开。

### M5：按业务族迁完现行路由

M1–M4底座及高风险链成立后，依次收敛来源/阅读列表、账户/偏好、计划/事件、投稿/反馈/分享等族。迁移整个真实consumer闭环，保查询/命令、错误/取消/返回、账户隔离和存储兼容；页面内实现缺口与旧封存产品缺口分别登记。

| 包 | 必须处理的当前注册入口 |
| --- | --- |
| main（3） | pages/map/index；pages/my/index；pages/auth/index |
| spot（5） | search/index；guides/index；field/index；plan/index；data-source/index |
| sky（2） | detail/index；sources/index |
| content（11） | article/detail/index；plan/detail/index；plan/list/index；plan/edit/index；achievement/index；share/index；event/list/index；event/detail/index；contribution/index；spot-feedback/index；settings/index |

入口身份以当前app.config/产品合同核对，不复活未注册的spot/detail、spot/sky、sky/professional、sky/targets、profile/import等旧路由。历史页面可能含仍使用的正文/存储责任，按调用图处理而非目录整删。受影响表单的保存/取消、revision冲突和未知提交结果不能凭一个generic表单通过而略过。

交付条件：21个注册入口的实际可达、主要内容/动作、Back/状态与采用设计有覆盖记录；共用机制只验证一次，不建立21套性能实验。对保留但不注册的源码，明确实际消费者或历史身份，不让TSX旧运行路径残留在最终产物。

### M6：完成切换、工程/Context收口与旧义务交回

全量App/页面/组件由原生工程生成；删除小程序不再使用的Taro/React绑定、JSX入口、临时桥接和配置。依真实workspace消费者移除依赖，保其它App/API所需依赖。原产物和历史证据用既有Git/受保护证据位置恢复，不长期维护两套当前实现。

运行受影响类型/构建、现有资源和发布保护；核主/分包、资源/license、单例与包预算，不用空脚本假通过。完成第6节Context与规则同步、第7节必要运行观察与差异修复。只生成/验证本地候选不代表已上传/部署。随后交回旧P1–P6/D0–D3的原目标、已证结果、未完项、停止/重开条件及新owner入口；保持封存，另获授权重写旧计划。

## 6. Context和工程同步矩阵

本轮仅准备此表；实现事实在相应模块实际落地后更新。耐久规则进入现有owner，进度/测量留HANDOFF/证据，不建第二套Context。

| 位置 | 实施时更新内容 | 保持边界 |
| --- | --- | --- |
| global/product-profile/architecture | 先读目标选择；M1记录实际轻量runtime/依赖，M6才将当前实现写为全原生 | 小程序范围、后端/独立App、产品/费用/许可；不提前宣称迁移完成 |
| architecture/runtime-and-domain、maintenance-boundaries、areas/main | 各模块落地时更新Hook→controller、consumer及生命周期/资源入口 | 原科学/业务合同、预算、D1/D2/F04结论和不采用裁决 |
| Screen Contract及相关子节点 | 技术映射、路由实现、presentation/输入/Back接线；清除已失效测试runner指令 | 功能、21路由身份、采用设计/主题、账号/时间/来源意义 |
| DESIGN与token生成/资源映射 | 原生px/WXSS及component映射；不再指示Taro专属实现 | 精确token、Stitch采用scope、素材/图标唯一权威；不重新生成设计 |
| development-workflow及节点 | 实际可用的build/watch、源码→完整产物→IDE/手机、窗口/路径/候选身份 | 真数据恢复、隔离、保账号/storage、不得H5替身 |
| verification及节点 | 现有静态工具＋真实观察、继承条件/未验；退休测试引用明确历史 | 证据不能越界；不写新测试、不恢复fixture |
| implementation-index | 逐模块替换为当前真实代码入口 | 不复制执行日志，不把计划路径冒已实现 |
| AGENTS与开发/UI/性能/设备/发布skills | 对应原生能力/命令落地后更新Taro特定映射和旧测试执行要求 | 通用质量、性能维护/调查方法、官方工具和当前用户范围 |
| package/lock/tsconfig、config、tools、CI | core版本、原生构建、资产分包、产物/发布完整性与真实观测入口 | npm工作区与其他消费者；不恢复测试CI，不顺带App修复 |
| deployment与本地发布/预览工具 | 新产物目录、身份、AppID/origin、不可变包/回退引用 | 不擅改后台镜像/数据库/远端配置；无发布授权不上传 |

每个模块收口前读回更新owner及真实入口，发现旧引用先判断现行规则或历史证据，不能全局把“Taro”改为“原生”。文档使用现有 `npm run context:validate`、`git diff --check` 及改动链接/anchor核查；不新建验证脚本。

## 7. 最少但充分的验证安排

以下是实施时必要证据，不是新增测试代码清单，也不是本轮已执行结果。采用已有工具、官方DevTools和实际手机；一次旅程可覆盖多项。只在代码/输入改变、失败或具体未决机制会改变交付判断时补验，不因安心重复跑。

### 静态/工程检查

每个责任阶段批量修改后运行受影响workspace typecheck及必要完整编译，M6运行最终原生完整编译。使用现有SDK/设计token/资源/图标/包体/origin/不可覆盖发布保护中仍适用项；把仅绑定Taro产物的真实保护迁至新输出，已退役的源码字串测试不恢复。核业务依赖/接口、21个注册入口和资源路径。预先已有无关App类型错误单独保留，不全仓重复跑到它阻断小程序工作。

### 四组可以合并的真实旅程

| 组 | 必须观察的不同机制 | 限定与完成依据 |
| --- | --- | --- |
| V1 公共运行时、状态与账户 | 从现有真实来源页进入/返回；共享Query和缓存；一个有效账号偏好/可恢复草稿修改；取消/返回/身份更新后不吃旧结果。Map预警刷新/联网恢复按新接入确认。 | 用既有真实数据，读回实际状态；不对每个查询页重复同一cache/登录实验。会改变授权/未知提交语义的消费者另验对应差异。 |
| V2 Map、My和三层 | 普通区域显示可用层，跨一个实际窗口，在加载中用新手势或选点接管；My逻辑覆盖/返回；进入Sky前完成三层退休。云量另变一次精确时刻核身份/状态；层序/显示不混同。 | 不重复17窗口/时长排列、不重造F04。正式云量供给缺失时记录供给依赖，仍核当前不可用语义；不能给未显示层写成功。 |
| V3 Sky和Sources | 真非空Sky：时间步进、跨窗口连续输入/反向、Play→Pause、应用/取消；同画面拖缩/选取/来源；固定与渐进图像各一机制；Sources暂离/返回、后台返回与普通退出。 | 六字段基本输入可并入界面覆盖，性能不逐字段。实际accepted、名称/拾取/来源一致；保科学目录/图像质量，不清缓存强GC制造收益。 |
| V4 原生公共UI、业务提交与全入口 | 21现行路由逐项基本可用/采用设计；公共输入纠正、弹层Back、主题/安全区/键盘、Plan事件select-one、媒体查看及受改动提交/保存/取消/返回。 | 普通旅程顺路覆盖多个入口。公共控件共享状态集中看，独有布局仍看该页。表单revision/幂等/未知结果或来源资格等不同机制不能靠“共用组件”免验；不新增发送联系人/不可逆业务授权。 |

采用资源需实际比较当前目标页面与对应Stitch资源，在同等视口/数据/状态下修偏差；未展示主题沿原合同，不扩为页面×模式×设备矩阵。首次公共控件的真实组合消费者先看，后续只补真正不同的机制/布局。

### 性能与设备

- 先用已有可比Taro基线和最终原生产物，记录包体/主分包、启动进入Map、Sky普通输入/播放和正常退出中实际相关指标。必须同功能/同素材/同设备/相近缓存条件；没有可比旧值就如实给新值/观察，不编造百分比。
- 把必要启动/交互/资源观察合并进V2/V3，已有工具足以解答就不再全套Heap/Profiler。需要判别的新卡顿/增长才按性能调查skill采最小证据；不重开已收口OOM根因或追求PSS回到某个旧数字。包体变小不等于服务器账单降低。
- Android与iOS的Canvas、触控/返回、传感器等平台差异不能互相证明；在产品实际支持/可用设备下保有限目标证据。设备不可用继续独立实现，交付时明确哪些平台/行为未验，不能以模拟器冒真机或为缺机无限加软件检查。
- 旧科学/数据/素材/资源状态机证据只在其实现/输入/前提未变时继承；旧运行包的像素/内存/生命周期结局不直接给新绑定盖章。未自然发生的新宿主故障终态可以保未观察，不重开注入测试；但发现实际回归必须修。

## 8. 完成条件、状态记录与变更纪律

迁移完成须同时满足：最终原生独立构建且Taro/React当前运行路径/临时桥接退出；21个现行入口同等能力与采用设计覆盖；业务/科学/权限/存储/资产兼容保持；公共优化按第4节落实新owner与真实消费者；必要静态/运行/目标证据充分，实际回归已修；Context/工程/规则一致；旧封存义务完整交回。仅源码改完、编译通过或文档齐全不能标完整Goal完成。

HANDOFF只保存当前阶段、模块结果、未提交更改、下一动作和真实依赖。实际观察记录输入/版本/环境/结局，区分PASS/FAIL/NOT_RUN/UNKNOWN/机制继承；不把观察次数写成产品完成率。剩余“要做的测试”交代对应风险、最少操作、需要设备/数据及判定结果，不能给用户一串无差别历史场景。

若方案前提被事实推翻，记录具体证据、受影响模块、建议和影响，再请求用户明确修订；可继续独立且仍符合方案的工作。局部算法、函数组织、合理工具选择和原方案内修复直接做，不能每个小步骤索要确认。新需求进入完整要求，但不暗改已有方案方向。达标后停，不自动恢复封存任务或部署。
