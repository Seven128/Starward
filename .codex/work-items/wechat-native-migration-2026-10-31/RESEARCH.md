# 迁移方案依据与采纳记录

2026-10-31，工作树基线 `main@f09da5e2762c6f80f387ded5a5de853b160e9924`，含本地未提交测试退役、规则与 Context 更改。本文是前期研究记录；如何实施由 [PLAN](PLAN.md) 唯一负责，进度归 HANDOFF。本轮未修改生产代码、构建小程序、启动服务、连接设备或发布。

## 资料完整性与访问边界

- [Web GPT Pro 原文](sources/WEB-GPT-PRO-20261031.md)：从用户指定 ChatGPT 对话完整取得 19,547 字符的可见答复；无后续分页或末尾截断。外部自称“读过源码”不替代本地核查。
- [Gemini 可见原文](sources/GEMINI-20261031.md)：AI Studio / Drive 文件 `1PTKB9ufu9ASi7OA7zpZmXMRoIV5xQvcK` 原件 328,649 字节；可见答复 10,698 字符，原件 `finishReason=MAX_TOKENS`，在 §2.2 目录表中结束。用户后来提供的附件 `C:/Users/777/.codex/attachments/aeee79a9-79cd-4a44-bdac-b6470c75421c/已粘贴的文本.txt` 与可见答复逐字符相同，UTF-8 SHA-256 为 `2f1c772ce6f9fa69c21548f6c72bf32b90cd472b77c2abb15275e7d04fdc3075`。因此已读完全部提供内容，但不能声称取得其尚未生成的后半方案；由本轮独立分析补齐。
- 私有原件及前期内容快照：`E:/Dev/Starward-data/verification/native-migration-planning-20261031/`。恢复不依赖临时下载 URL；可见答复已在本任务 sources 中保存。
- 源码阅读是按影响边界进行：完整读取关键小文件及大文件的相关函数体，沿消费者查调用；未声称全文审计整库。未把外部行号、AST 名称或截断输出当函数体证据。

## 本地核实的决定性事实

以下源码路径均相对仓库根；实施时按当前版本复核对应责任，而不是依赖行号。

| 责任 | 本轮核实与对迁移的影响 |
| --- | --- |
| 依赖和路由 | `apps/wechat-miniapp/package.json`、根 npm workspaces/`package-lock.json`、`src/app.config.ts`：Taro 4.2.1、React 18.3.1、Zustand 5.0.14；3 个主包路由、spot 5、sky 2、content 11，共 21。没有采用一整套 Taroify/Vant/TDesign UI suite；当前主体是 Taro 基础组件＋Starward 公共组件。未注册历史页面不自动恢复。 |
| Query 版本 | 小程序嵌套 `react-query@5.90.21` 实际依赖 `query-core@5.90.20`；根还有 `5.101.4`。原生目标显式保小程序 core 版本，避免顺手升级及双实例。 |
| Query 业务合同 | `hooks/use-resource-query.ts`、`services/query-client.ts`：动态 `enabled`/staleTime、同步 `readCurrent()`、有效旧数据与刷新错误分离、可禁 structuralSharing、取消不重试、显式 GC/retry 配置。不能简化成 fetch 后 setData。 |
| **本轮新增：core 环境判断** | 安装的 `query-core/src/utils.ts` 中 `isServer = typeof window === 'undefined' || 'Deno' in globalThis`；`queryObserver.ts` 的 stale/refetch 定时器在 isServer 时退出。Map `index.tsx` 的 spotSky 查询明确传 `WEATHER_ALERT_REFRESH_MS`。原生环境必须有明确刷新/前台/联网接入；只替换导入不能保证等价。原 Provider 负责 client.mount/unmount，App 也必须接管。未在原生候选实测此边界，归最早集成义务。 |
| 状态和隐私 | `state/app-store.ts`：存储 key、账号分区、unclaimed 数据、私有 Context 校验/恢复、取消编辑和持久化政策是业务逻辑；React create 和 Taro storage 才是需适配边界。hydrate 当前由 `use-theme.ts` 调用，不应按外部示意无条件重复初始化。 |
| 逻辑前台 | `navigation/primary-page-navigation.ts`、`page-presentation.tsx`、`primary-navigation-controller.ts`：Map/My 有逻辑 presentation，原生导航受理与实际 show 分开；Back 单次处理。只接 onHide/onUnload 会漏掉 My 覆盖期间的 Map 退订/操作资格。 |
| Map→Sky | Map `openSkyPage`：先暂停/等待三层栅格实际清理、保存轻量返回状态，再 `redirectTo`；失败恢复。不能改成常驻 Map 的 navigateTo。 |
| Map 公共资源 | `services/map-raster-files.ts`、`raster-image-resources.ts`、`pages/map/map-ground-overlay.ts` 和 `native-map-session.ts`：公共文件 owner，8 文件/16 MiB 编码字节/2 并发，reader/native pin/迟到结果及退休责任。F04 现有 HANDOFF 已记录实际成功，前任节点身份/共挂载与事件隔离须继承；pin 归零不等于实测物理内存全部释放。 |
| Sky 时间与呈现 | `spot-sky-page.tsx` 的 time tick、touch move、presented/hide/show 函数：相机已直达绘制 writer；时间播放仍用 setTimeIntent。先核时间/Canvas/generation，再 surface.present，随后 publish；Sources pause 与普通退出不同。原生 UI 提交不是 accepted 帧。 |
| Sky 资源消费者 | `use-sky-artwork.ts` 的 useSkyNativeImages 被固定天体、银河、W3、深空、地景、HiPS、target optical 等共同使用；loader 由 Canvas/revision/publication 定义寿命，pause、wanted update、retry、dispose 不同。迁移公共绑定并一次接完真实消费者，不按天体复制。 |
| 精确时刻请求 | `sky-time-target-query.ts` 及 Sky/Sources 调用：60 秒响应复用、隐藏 reader 退订、共享 signal、A→B→A 不能复活旧代际、缓存回调不能保留旧页。这些优化仍适用；`Object.freeze(function)` 针对压缩捕获的理由不能因原生化直接删除。 |
| Canvas | `sky-canvas-surface.ts`：preserveDrawingBuffer=true；gl.flush 后 Canvas2D.drawImage，有文字测量缓存。不存在本呈现链每帧 readPixels/图片重编码的证据；不顺带换引擎、关闭缓冲或再造文字缓存。 |
| 公共 UI | SoftButton/SharedButton、ToggleField、SelectionTabs、NativeBackBoundary、AstronomicalEventModal、SpotImageViewer、SemanticIcon 及真实调用：已有受控状态、全行激活、事件 browse/select-one、Back/媒体恢复和图标分包语义。通用库不能接管这些业务事实。`spot/native/packaged-icon` 已有原生实现。 |
| 样式与工程 | `config/index.ts`、DESIGN §4.5：现有 designWidth/deviceRatio、pxtransform、大写 Px、资产分包复制、源码包别名/合同 re-export、常量注入及不可覆盖发布目录。保语义与产物需求，不机械复制 Taro 插件或在原生样式中再缩放一次。 |
| 退役残留 | 文件级退役已完成，但 `app.tsx` 还含 acceptance reset 注入，`config/index.ts` 还含 fixture build 分支，app-store 等还存在相关入口。需在迁移相应 owner 时核消费者，删除纯测试入口；真实错误/资源观测保留。此发现不等于本轮已做生产清理，也不按 acceptance 命名批删业务。 |

## 成熟能力比较和选择

已查官方资料，检索日 2026-10-31。平台可用性和库 API 文档不是本项目设计/真机适配已经通过。

| 候选 | 判断与选择 |
| --- | --- |
| Zustand vanilla | **采用现有 5.0.14 的 vanilla 核心**。官方提供不依赖 React 的 store API；保当前动作和持久化规则。临时 React Hook 只能绑定此同一 store，最终退出。来源：[官方 README](https://github.com/pmndrs/zustand#using-zustand-without-react)。 |
| TanStack query-core | **采用小程序现用 5.90.20**。保查询/取消/缓存内核，重写原生观察绑定；补前述环境/刷新接入，不另写缓存系统。来源：[QueryObserver](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryObserver) 及本地锁定版本源码。 |
| 微信 MobX 绑定 | 是成熟原生绑定选项，但本项目已拥有 Zustand 动作/账户隔离，换 MobX 增加状态语义迁移，没有已证实性能收益。本轮不换。来源：[微信官方库](https://github.com/wechat-miniprogram/mobx-miniprogram-bindings)。 |
| 原生基础组件＋Starward 公共组件 | **本轮 UI 基线**。基础输入/滚动/按钮使用平台能力，Starward 保统一受控状态、主题、Back、语义图标及领域交互。现有公共组件迁为原生 Component，复用纯模型/算法，不逐页复制。 |
| TDesign 原生版 | 合格候选，不因 Taroify 未采用而排除。原生使用 usingComponents，MIT；Popup 支持受控 visible、slots、外部样式/CSS 变量。但未提供本项目三档面板/热区/时间尺/图标的等价证明。当前无具体缺失能力需要整套 suite，故本轮不强制安装。来源：[项目](https://github.com/Tencent/tdesign-miniprogram)、[Popup 官方 API](https://raw.githubusercontent.com/Tencent/tdesign-miniprogram/develop/packages/components/popup/README.md)。 |
| Vant Weapp | 同为 MIT 原生组件候选；Popup 有 show、安全区和样式入口，官方仍要求处理特定滚动穿透。不能据库成熟便替代项目手势与 Back；本轮不引第二套 suite。来源：[项目](https://github.com/youzan/vant-weapp)、[Popup 官方 API](https://raw.githubusercontent.com/youzan/vant-weapp/dev/packages/popup/README.md)。 |
| WeUI | 微信生态原生组件可用，但通用微信视觉不是 Starward 已采用设计。没有直接消除当前主要定制责任的依据，本轮不整套切换。来源：[微信官方项目](https://github.com/wechat-miniprogram/weui-miniprogram)。 |
| 新响应式/框架库、miniprogram-computed | 当前已有状态/查询 owner，无需额外引入。Gemini 对全量 diff 的性能断言未获得对应版本和本项目实测支持，不把它作为普遍贬低该库的事实。 |
| 构建 | **沿 Webpack 5＋TypeScript＋Sass/PostCSS 做原生目标**，保 npm workspace 和现有资产/环境规则。不让 DevTools 内置转译替代 monorepo 完整构建，也不为了原生化再迁包管理器。工程目标要先通过真实路由，不能只删除 Taro 插件。 |

组件库结论是本项目当前责任下的选择，不是“原生必须手写”或“永久禁用 TDesign/Vant”。若后续确有未满足的通用能力，先在原组件 owner 下比较单库、具体组件、版本/license、依赖闭包/包体、受控状态、主题、安全区、IME、手势、原生 Map/Canvas 层叠；超出 PLAN 已定方向时先提出有依据的修改建议。不得因换库改产品设计或再引图标/表单状态权威。

## 采纳、修正和不采纳

| 外部建议 | 本轮结论 |
| --- | --- |
| 两者：原生薄视图＋控制器＋无框架核心 | 采纳责任方向；不按行数拆文件，不把数千行 Hooks 机械搬到一个万能 Controller。 |
| Pro：单实例、逻辑前台、先原生工程/真实路由，再 Map/Sky、最后批量页面 | 采纳。第一条用现有 `spot/data-source`，之后尽早贯通 Map/My/Sky/Sources；不建专用试验页面。 |
| Pro：共用状态与资源的短期混合，早期独立原生构建 | 采纳，但只允许已迁路由一个实现、共同核心一个实例；构建若不能保证单例，应按已定条件提前使用原生 App 壳。禁止复制 owner 解决集成。 |
| Gemini：集中处理 ViewData、释放订阅、晚到回调和节点 ready | 采纳问题意识，修正做法：domain 资格同步失效，视图更新才可合并；清理按 logical hide、native hide、Sources pause、unload/detached 分工，不能只有 onUnload 一个 DisposerBag。 |
| Gemini：自动把所有 undefined 变 null＋统一浅 diff | 不采纳。缺失/清空/无更新不能混同；由投影按字段合同给值。受控输入拒绝后即使逻辑值相同也可能需要重新写回，浅比较不能吞掉纠正；重叠路径及异步提交要保持版本/顺序。 |
| Gemini：Page<300 行、桥接约40行/runtime约150行 | 不采纳人为数字。这不是已核工作量或质量规则；以职责、真实调用链和资源寿命衡量。 |
| Gemini：直接复用现有 Zustand Hook 的 .getState/.subscribe 就能全原生 | 只可作过渡读取；最终仍须移走 React create 的运行时依赖，用真正 vanilla store。 |
| Gemini：100% 原 queryFn 不改、所有 wx API 集中单个 weapp.ts | 不机械采纳。api-client/资源传输实际使用 Taro；保业务规则而适配真实 Promise/Task、取消、文件/Storage 语义。平台端口按责任收口，不堆单个万能文件。 |
| Gemini：沿旧约束一律不引 Vant/TDesign；pnpm；禁测试延伸以后 | 不采纳这些事实/范围推断。当前是 npm；原生库本轮已比较；禁写测试规则保持用户的迁移期范围。 |
| Gemini：原生必然降低 JS Heap/序列化，按大组件行数推 CPU/GC 收益 | 只采纳移除框架开销的方向；实际净收益取决于新控制器、订阅与 ViewData，行数不是执行成本。旧 341文件/5,223,531B 是整个候选记录，不是“主包大小”。 |
| 两者：保 Canvas/资源核心，不默认 Skyline/新引擎/关闭缓冲 | 采纳。已有未采用实验及 D1/D2/F04 结论保留，迁移新增回归另处理。 |
| Pro：七类机制观察＋21注册入口基本覆盖 | 采纳方法并合并成 PLAN 的四组实际旅程；复杂机制子项不丢，普通变体不扩成全组合。自然未发生的故障不强造，缺数据/设备保明确未验。 |
| Pro：30–52 工程人日 | 仅外部初步容量假设，不作排期承诺/代理耗时预测。确认主要工作量在工程、共享绑定、Map/Sky 协调和模板；首条真实路由/高风险链后才有可靠估算。 |

## 本轮独立补充的实施边界

1. **网络/刷新环境必须显式移交。** QueryClient mount、网络事件、App 前后台和可见性分别负责；原生刷新采用共享查询绑定/现有业务刷新 owner 的有界 timer，复用既有周期和 QueryObserver/refetch，不造第二缓存或叠加内置轮询。不要仅为欺骗 isServer 在全局伪造 window；在最早原生路径确认真实解析与行为。
2. **ViewData 是有限视图，不是 store 镜像。** 星表/报告/typed arrays/Canvas/请求句柄留在 owner；页面 properties 不传函数或资源对象。公开事件带最小身份/动作参数，再由 controller 核当前资格。投影可合批，取消/授权/代际更新不延后。
3. **原生模板编译成功不能证明控件接线。** WXML/TS 的 handler、dataset、事件 detail、节点 scope、样式隔离和受控输入需要一个真实消费者；同一公共控件通过后按真实差异迁余下消费者。
4. **回滚不能丢当前未提交成果。** 基线应绑定当前工作树和必要数据/产物，f09da5e 不是包含最新退役规则的完整状态；不用重建历史候选或恢复测试来实现回滚。外部不可逆写入按真实业务授权处理。
5. **性能结论保边界。** 只比较同功能/同数据质量/同目标条件；UI 框架变更不会自动降低 BFF CPU/网络字节或服务器账单。包体变化可直接从产物得出；启动/交互/内存须有可比真实证据，物理 GPU/native 未知不改写成释放成功。

## 未决事项与停止条件

原生构建的实际分包/单例、query-core 原生刷新接入、样式隔离/单位、Map/Canvas 节点与生命周期，均须在获准实施后的早期真实路径解决，当前标 **NOT_RUN**。这不是已证明原生不适用，也不是现在展开生产整改的授权。采用资源的具体屏幕/变体在对应 UI 模块实施前按现有 Screen Contract 从 Stitch 读取并实际查看；本轮未重画/更改资源。前期只做可据源码确定的架构选择和验收方向，达到足够指导实施的深度后停下。
