# 外部建议原文：Web GPT Pro

来源：用户提供的 ChatGPT 对话 `6ae4dba0-1248-83e9-8350-5614c0d36037`（微信小程序原生迁移建议）；2026-10-31 通过 read_thread 完整取得唯一 assistant 答复，共 19547 字符，无分页/末尾截断。以下是待核验的外部意见，不是工程指令或已采纳方案。其对源码、工期和效果的判断须以本任务研究记录为准。

---

# Starward 微信小程序全原生迁移建议

**推荐路线：保留现有业务、科学计算和资源管理核心，把 React/Taro 的页面绑定改为原生 Page/Component；先建立唯一的共享运行时和可独立构建的原生工程，再优先迁移 Map/Sky 的高风险生命周期链，随后批量迁移其他页面，最后彻底移除小程序的 Taro/React 页面运行时。**

这次迁移不需要重新发明查询缓存、状态管理、地图文件管理或星空引擎。你们已经抽出的不少模块，恰好可以成为原生实现的基础。真正需要投入的是：**把散布在 React render、effect、ref、Context 中的协调关系，转成有明确生命周期的控制器与原生组件绑定。**

建议允许一段短期混合，但限制为**尚未迁移页面的临时宿主**。每个业务责任仍只有一份实现，每条已迁路由只有一个当前版本；最终验收必须包含混合桥接删除及原生独立构建。

## 一、源码基线与主要风险

### 本轮结论的依据

我读取的是指定提交：

`f09da5e2762c6f80f387ded5a5de853b160e9924`

提交时间为 **2026 年 10 月 30 日 21:13，北京时间**。没有改用其他提交。实际阅读范围包括 Map/Sky 关键函数体及其资源、时间、查询、导航消费者，App 初始化、状态与账户绑定、共享组件、构建配置，以及对应 Context、计划和交接记录。

本轮没有修改代码、执行项目测试、构建小程序、操作手机或部署。你说明的本地 **1,302 个测试及专用支持文件退役、新规则与任务登记**，作为本轮有效输入；公开快照中的旧入口不被视为可以恢复的执行基线。两份附件是 8 月早期方案，其中旧导航和技术选型不覆盖当前决定。

有三项源码事实，直接影响推荐路线：

- **当前是 21 个注册路由**：主包 3 个、`spot` 5 个、`sky` 2 个、`content` 11 个。目录中还存在未注册的历史页面，不能据目录存在扩大迁移范围。[页面与分包配置](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/app.config.ts)
- **Sky 相机拖动已有直接绘制路径**：`onSkyTouchMove` 直接更新相机引用并调用 `browsingDrawRef`；时间播放则仍由定时器推进后调用 `setTimeIntent`，经过 React 的后续协调。因此，相机与时间的迁移收益不能用同一种假设估算。[Sky 页面](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx)
- **D1、D2、F04 已有最新收口记录**。同提交旧 PLAN 中仍残留个别 F04 待验文字，后续 HANDOFF 已明确成功恢复与收口；本轮以最新终态及你的提示为准，不恢复旧故障注入或重复采集。[最新交接](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/.codex/work-items/sky-map-performance-2026-10-18/HANDOFF.md)

### 最需要提前控制的五个风险

| 风险 | 在本项目中的具体表现 | 推荐处理 |
|---|---|---|
| 生命周期被简化 | My 是 Map 宿主中的逻辑前台；Sky 进入会卸载 Map；Sources 又有暂存语义 | 保留逻辑前台、原生页面可见性、资源存续三种边界 |
| 过渡期出现两份 owner | 两个 bundle 即使引用同一份源码，也可能各创建一个 store、QueryClient、文件缓存 | 共享实际实例；在首条原生真实路径就确认实例归属 |
| 时间意图与实际画面脱节 | 目标时间、模型就绪、绘制完成、accepted 帧是不同状态 | 原时间 owner 与唯一 writer 继续决定准入和提交 |
| 原生模板导致设计漂移 | `Px`/`px` 转换、组件样式隔离、节点测量、图标分包路径变化 | 迁移技术映射，保留采用设计与素材字节 |
| 把框架特例与平台修复一起删除 | Taro 模板补丁可以退休，Android 传感器单位、native 回执和迟到清理仍有意义 | 每项按成因和真实消费者处理 |

**收益判断：**此次最有依据的收益方向是减少页面运行时、React 状态协调及部分视图更新成本。Map 原生绘制、星空 GPU 工作、图像解码、网络字节和后端计算不会因为替换页面框架自动减少。具体启动、交互、内存收益幅度目前未知；服务器账单也不能预先承诺下降。

---

## 二、推荐的原生架构

### 1. 保留现有库的无框架核心

我建议选定下面这套组合，不再把状态库、查询库和 UI 库同时重选一遍。

| 能力 | 推荐选择 | 比较与理由 |
|---|---|---|
| 共享客户端状态 | **`zustand/vanilla`** | 官方提供不依赖 React 的 `createStore/getState/setState/subscribe`；适合保留现有 actions、账户隔离和落盘规则 |
| 服务端查询状态 | **`@tanstack/query-core`** | 用 `QueryObserver` 替换 Hook 绑定，保留查询身份、共享请求、取消、重试、失效和 GC 机制 |
| 原生状态绑定 | **项目内一层窄适配** | 只处理选择性订阅、视图投影与退订，不建立新路由框架、EventBus 或第二套缓存 |
| 通用 UI | **微信原生基础组件＋迁移现有 Starward 公共组件** | 保持现有视觉、时间尺、面板、返回和图标责任；本轮不强制增加 UI 库 |
| 构建 | **TypeScript＋Webpack 5＋Sass/PostCSS 的原生目标配置** | 保留可用的编译能力，替换 Taro 页面生成及运行时；无需为了原生化弃用 npm |
| 渲染体系 | **沿当前常规 WXML 渲染体系迁移** | 当前配置未显式采用 Skyline/glass-easel；本轮不把渲染后端切换混进来 |

Zustand 官方明确支持 vanilla 使用；TanStack 官方将 QueryObserver 定义为可直接用于框架之外的观察原语。微信生态也有现成的 MobX 绑定库，但切过去需要额外改变现有 store 的表达和绑定机制，目前没有发现值得同时承担这项变化的必要性。[Zustand 官方说明](https://github.com/pmndrs/zustand#using-zustand-without-react) · [QueryObserver 官方说明](https://tanstack.com/query/latest/docs/reference/QueryObserver) · [微信 MobX 绑定库](https://github.com/wechat-miniprogram/mobx-miniprogram-bindings)

WeUI、Vant Weapp 都提供原生组件能力，但你们的核心困难集中在定制 Map/Sky、时间尺和生命周期，现成通用组件库无法直接接管这些责任。本轮继续迁移现有公共组件更合适；以后出现明确缺失能力，再对那个组件做有限选型。[WeUI](https://github.com/wechat-miniprogram/weui-miniprogram) · [Vant Weapp](https://github.com/youzan/vant-weapp)

**一个具体版本风险：**小程序当前 `@tanstack/react-query@5.90.21` 实际依赖 `query-core@5.90.20`，仓库根另有 `5.101.4`。建议显式锁定小程序现用 core 版本，不在迁移时顺手解析到根版本。短期混合期间尤其要防止两份 Query 核心及缓存实例。[锁文件](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/package-lock.json)

### 2. 目录按责任组织，保留有价值的现有路径

下面是目标职责，不要求为了目录整齐搬动所有文件。

| 位置或责任 | 应持有什么 | 不应持有什么 |
|---|---|---|
| 原生页面入口：现有 `pages/spot/sky/content` 路由 | 路由参数、Page 生命周期、页面组件组合 | 文件缓存实现、天文规则、复制的账户恢复逻辑 |
| `components` | WXML/WXSS、局部布局、输入草稿、有限动画与事件 | 全局 Context 真相、业务请求重试策略 |
| Map/Sky 业务控制器 | 当前实例的意图、订阅、取消、生命周期协调 | 第二份全局账户或 ObservationContext |
| `state` | 原 app store、系统 motion store、持久化规则 | Query 全量结果、星表、GPU 对象 |
| `services` 与查询规格 | 原 API 客户端、查询身份、响应缓存、请求生命周期 | 页面闭包和页面树 |
| 窄平台适配层 | `wx.request`、文件、存储、导航、节点和传感器接入 | 重新实现领域规则 |
| 现有 Map/Sky 资源模块 | reader、native pin、图像 lease、Canvas/纹理退休 | 每页重新创建的公共资源池 |
| `packages` | 合同、坐标、天文数学和已验证算法 | 页面状态、微信节点或 React 运行时 |

作用域必须明确：

- **App 级**：账户与共享状态、一个 QueryClient、原公共文件 owner、`nativeMapSessions`、轻量返回状态。
- **Map 实例级**：一个当前 Map session、实际范围读取器、选点/相机意图、三层安装协调器。
- **Sky 实例级**：Context session、原 observation-time owner、相机/选择/追踪 owner、唯一绘制调度器。
- **组件级**：时间输入草稿、面板呈现、滚动位置绑定和自身计时器。

这套结构的关键不是类或目录数量，而是：**组件发命令，控制器协调，既有 owner 决定业务事实。**

### 3. `setData` 只承担界面投影

原生 `data` 中只放 WXML 实际需要的字符串、标量、有限列表和样式状态。下面这些继续保留在控制器或私有实例字段：

- 完整 SkyReport、星表和展开后的恒星对象；
- TypedArray、Canvas、WebGL context、纹理与 native image；
- QueryObserver、AbortController、文件 reader、计时器；
- 带方法的资源 owner 和完整 accepted frame。

微信官方类型定义明确：`setData` 向视图层异步发送可 JSON 化的数据；组件另有纯数据字段及明确的生命周期接口。这些能力支持窄绑定，但不会自动替项目处理资源所有权。[微信官方 Component 类型与说明](https://github.com/wechat-miniprogram/api-typings/blob/master/types/wx/lib.wx.component.d.ts)

视图更新可以合并；**账户、Context、输入代际的失效必须及时发生**。不能因为一次批量投影只看到最终 A，就吞掉中间 A→B→A 对旧请求资格的撤销。

---

## 三、React/Taro 依赖迁移表

这里按真实依赖分类。`.ts` 中仍有很多 React 运行时绑定，例如 `use-sky-time-geometry.ts`、`sky-time-target-query.ts`、`use-sky-artwork.ts`，不能直接搬完就算原生化。

| 当前责任 | 分类 | 原生替换方式与保留要求 |
|---|---|---|
| `app-transitions.ts` 等纯业务转换 | 直接复用 | 原 store 继续调用，保筛选草稿、应用/取消、模式切换规则 |
| `app-store.ts` | 框架与平台适配 | `create` 换成 vanilla `createStore`，存储接 `wx`；保账号隔离、精确位置不落盘、Context 更新和清理规则 |
| `system-motion-state.ts` | 框架绑定适配 | 改 vanilla；系统 motion 与账户偏好保持不同职责 |
| `query-client.ts` | 核心复用 | 改从 query-core 导入，保现有默认策略，由 App 接管 Provider 原来的初始化职责 |
| `use-resource-query.ts` | 绑定重写 | QueryObserver 负责订阅/更新/销毁；保 live `enabled()`、`readCurrent()`、动态 staleTime、刷新失败仍保有效数据、`structuralSharing:false` |
| 账户查询、登录、偏好同步 Hooks | 控制器抽取 | 用实例身份代替 `useId/ref/effect`；保显式登录、可见页面资格、revision、未知结果及迟到隔离 |
| React Context：`page-presentation.tsx` | 绑定重写 | 提供明确的 presentation port，保 `identity/isCurrent/back`，不要每页自行推断前台 |
| Taro 事件和节点查询 | 平台适配 | 接真实 `detail/dataset/currentTarget/touches`；显式传组件 scope；不假设旧包装形状和全页 selector 仍成立 |
| Taro 导航 Promise | 平台适配 | 保窄 Promise/Task 适配；区分 API 接受、目标页面真正显示、业务结果接受 |
| `useEffect/useDidShow/useDidHide` | 生命周期重接 | 分别落实到初始化、节点 ready、逻辑前台、Page show/hide、unload/detached；不机械一一替换 |
| JSX/共享组件/页面外壳 | 真正重写 | WXML/WXSS、properties、事件与局部呈现；业务规则继续调用原 owner |
| 时间尺、面板运动 | 算法保留，宿主适配 | 保现有 spring/snap/scroll writer；改变节点接入，不把整页状态随拖动一起 `setData` |
| 语义图标、资源路径 | 映射保留，组件重写 | 保唯一语义入口、拥有它的页面包身份和已采用素材；已有原生 `packaged-icon` 可以继续复用 |
| App 初始化 | 原生 App 重接 | 保错误上报、取消过滤、Sky 历史文件清理、公共图像缓存初始化、native chrome、QueryClient 初始化 |

上述绑定中，`useResourceQuery` 已经把长期查询回调放在模块级工厂，且提供同步读取当前查询状态的 `readCurrent()`；`app-store` 也包含实质性的隐私和账户落盘规则。这些都不能被简化为“订阅后把数据塞进页面”。[查询绑定](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/hooks/use-resource-query.ts) · [共享状态](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/state/app-store.ts) · [App 初始化](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/app.tsx)

### 两项导航关系必须原样承接

**Map/My：保留一个物理 Map，独立管理 My 的逻辑前台。**

当前普通 Map 入口中的 My 是独立全屏表面，另有 `pages/my/index` 直达包装；二者共用 My 正文。My 显示时，Map 不一定收到真正的 Page hide，但其前台查询、手势和操作权限仍需暂停。迁移后继续复用 `primary-navigation-controller`，将 React presentation 绑定改为原生组件绑定。[导航实现](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/navigation/primary-page-navigation.ts) · [对应行为合同](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md)

**Map→Sky：保留“资源清理后 redirect”的顺序。**

`openSkyPage` 当前会暂停三层栅格、等待实际清理确认、保存轻量面板返回状态，然后 `redirectTo`。失败时恢复最新意图。原生迁移只替换平台调用，不能方便起见改成 `navigateTo` 长期保活 Map，否则会改变已采用的资源驻留策略。[Map 入口函数](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/pages/map/index.tsx#L2617)

---

## 四、公共性能与可靠性机制保留表

### 1. Map

| 已有责任及真实消费者 | 迁移处理 | 最小新增观察依据 |
|---|---|---|
| `raster-image-resources`：三层及地点地形图共用 | 核心直接复用；只替换文件平台端口 | 新绑定是否正确取得/释放 reader，是否影响仍活跃的另一个消费者 |
| `mapRasterFiles`：统一文件、字节和并发限制 | 保 **8 文件、16 MiB 编码字节、2 并发**及同一命名空间；不创建分层私有缓存 | 普通真实图层替换和关闭即可观察接线，不重新压满旧预算 |
| `map-ground-overlay`：三层 native 安装 | 保串行 writer、双槽、generation、迟到清理和实际 remove 后释放 pin | 新 MapContext scope、节点身份、最终显示与来源是否一致 |
| `nativeMapSessions`：故障前任及后继资源债务 | 保 App 级 owner 和最多一个未知 native 前任限制 | 核对 WXML 稳定节点与事件隔离；无真实故障不恢复 F04 注入 |
| 地形 coverage/preview/request | 规则直接复用，Hooks 改订阅控制器 | 一次跨真实窗口更新、加载中接管及最终细节 |
| 云量 publication/time/retention 校验 | 原校验直接复用，时间与安装绑定适配 | 单独看一次精确时刻变更；不能由地形成功推导 |
| 实际 region、选点 focus、面板测量 | 控制器适配原生事件/selector | 一次新手势接管或选点，以及正确范围/缩放收敛 |

文件系统中的删除失败、reader、native pin、alias 和部分下载文件都有独立处理；安装协调器也不会把失败或超时当成“资源已经不存在”。这些是业务可靠性机制，不属于应退役的测试代码。[文件接入与预算](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/services/map-raster-files.ts) · [文件资源核心](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/services/raster-image-resources.ts) · [安装协调器](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/pages/map/map-ground-overlay.ts)

F04 还涉及一个容易遗漏的模板要求：**故障前任 Map 节点需要保留到其栅格真正退休，只有当前 Map 接收有效手势和事件。**不能在恢复时立即销毁旧节点，再期望旧 native 操作照常完成。[Map session](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/pages/map/native-map-session.ts)

### 2. Sky

| 已有责任及真实消费者 | 迁移处理 | 最小新增观察依据 |
|---|---|---|
| `sky-observation-time`：六字段、时间尺、播放共用 | 直接复用状态机；组件只发命令 | 精确目标、反向退休、Play/Pause、最终收敛 |
| `use-sky-time-geometry`：时间模型供给 | **复杂绑定改写**；保在途任务、待 accepted 样本、epoch 与准入规则 | 跨供给窗口的连续输入，不逐字段重跑性能 |
| `sky-time-target-query`：Sky 与 Sources 共用 | 改 QueryObserver 绑定；保 60 秒复用、隐藏 reader 退订和共享请求 | Sources 暂离不能误杀仍有消费者的请求 |
| BSC/SAO 变换及 Scene | 核心直接复用；保精确时刻、完整目录、vector 退休 | 用真实非空 Sky 走新绑定；不重证未变算法 |
| Canvas lifecycle、renderer、surface | 核心复用；改节点与生命周期接入 | 单一 writer、实际 accepted、隐藏与返回 |
| `useSkyNativeImages` 及多个图像消费者 | 共享绑定改写；loader/request 保留 | 固定资源和有替代图的渐进资源各取一种机制 |
| 公共 encoded cache、native 图片、纹理 | 仅必要平台适配；保持各自账目与预算 | 新实例退出后订阅和资源是否按原责任退休 |
| 相机、名称、拾取、来源 | 复用现有相机与帧身份 owner | 同一实际画面中旋转、选中与来源一致 |

这里最重要的提交点仍是：

**时间及 Canvas 资格成立 → `surface.present(...)` 成功 → 发布 accepted 帧 → 更新当前相机、拾取与来源身份。**

资源下载完成、Scene 计算完成或 `setData` 回调，都不能替代这个提交点。

同时，`sky-canvas-surface.ts` 的实际呈现是 `gl.flush()` 后 `Canvas2D.drawImage()`；没有这条链中的 CPU `readPixels` 或每帧重新编码图片。它已经有有界文字测量缓存。迁移应保留 `preserveDrawingBuffer:true`、现有 surface 和退休顺序，不把关闭缓冲、添加文字缓存或改为直接 WebGL 列成本轮附带优化。[Canvas 呈现实现](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/features/sky/sky-canvas-surface.ts) · [精确时刻查询](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/features/sky/sky-time-target-query.ts)

**时间播放的推荐改法很具体：**控制器直接推进原 observation-time owner、更新必要供给并提交原 writer；初期可以保留现有定时来源和墙钟 1x 语义，只替换 React 协调链。此次不重新启用播放准备合并、准入前移或延期纹理上传实验。

### 3. 特例如何保留或退休

| 特例 | 建议 |
|---|---|
| Taro prebundle 的 ConcatSource 绕行 | 对应机制消失后退休 |
| Taro ScrollView 模板补丁 | 改成原生 WXML 的明确属性；保时间尺实际几何与定位语义 |
| Taro 受控输入的 memo/nativeRevision 外壳 | 新绑定核对后退休；输入拒绝纠正、迟到 blur 隔离仍保留 |
| Taro Promise 与 callback 双通道兼容 | 按 `wx` 实际返回收窄；原取消、部分文件处理不删除 |
| Android 传感器角度单位与呈现过滤 | 属于平台输入差异，继续保留，不能因去 Taro 删除 |
| 模块级工厂、防压缩内联边界 | 先保留；新压缩产物核对后才判断语法绕行能否退休 |
| 原生滚动条、节点 scope、布局读回 | 真实原生控件确认后决定，不能只看 API 名称判断 |
| 已退役的诊断注入、fixture、测试页面和脚本 | 不恢复、不移植、不以新名字替代 |

---

## 五、有依赖顺序的迁移阶段

### 推荐执行顺序

| 阶段 | 具体工作 | 进入下一阶段的条件 |
|---|---|---|
| **0. 固定边界** | 建立独立迁移 PLAN；记录本地未提交清理、新规则、当前源码身份；引用封存 P1–P6 和已收口证据 | 当前事实、目标架构、历史未完项各有明确归属 |
| **1. 公共运行时与原生工程** | 抽出 vanilla store、query-core、平台端口、App 初始化；建立原生构建与资源路径；临时 React 绑定仍消费相同实例 | 不依赖 React/Taro 的核心可被原生入口实际使用，主/分包和单例组织成立 |
| **2. 一条最小真实路径** | 优先替换现有 `spot/data-source` 等真实路由，以真实 Context/BFF 数据走进入、显示和返回；同步确认独立原生候选可构建 | 查询、主题、原生模板、包路径、返回与销毁实际成立；不创建专用示例页 |
| **3. 高风险纵向迁移** | 迁移公共 presentation/Back/时间尺，再完成 Map、逻辑 My、Sky、Sources 的核心链 | Map→My→Map 与 Map→Sky→Sources→Sky→Map 的不同生命周期均有依据 |
| **4. 按页面族批量迁移** | 来源/阅读/列表；账户与偏好；计划/投稿/反馈；事件 browse/select-one 等，复用已迁公共组件 | 21 个注册入口逐项落实；共享责任不再逐页复制 |
| **5. 收敛特例并完成切换** | 原生 App 成为唯一入口；移除小程序 Taro/React runtime、临时桥接、旧 JSX 页面与构建绑定 | 原生产物独立构建，当前调用图不再需要旧运行时 |
| **6. 迁移收口与交接** | 完成受影响页面基本可用/设计覆盖，记录必要真实观察、未验项和新基线 | 迁移完成后，才按新实现重写旧 P1–P6 |

阶段 2 的作用是尽早发现工程和绑定问题；**Map/Sky 高风险链必须在大批量页面搬迁之前完成**。否则可能搬完大多数模板，才发现共享实例、逻辑前台或 Canvas 寿命模型不成立。

### 短期混合的限制与退出条件

Taro 官方支持在项目中使用原生页面和组件，因此可以利用它承接尚未迁移的部分。[Taro 官方混合开发说明](https://github.com/NervJS/taro-docs/blob/master/docs/hybrid.mdx)

但本项目要额外满足：

1. 原生与旧页面拿到的是**相同 store、QueryClient、文件 owner 和 native session 实例**。
2. 已迁路由切换为唯一当前实现，不保留两个都继续迭代的页面版本。
3. 临时桥接只做获取实例、命令和订阅，不承载新的业务规则。
4. 最后一个调用方切换后，桥接与旧绑定一起删除。
5. 独立原生构建在早期成立，最终阶段只做全量收敛。
6. 若混合打包无法保证单例，提前切换原生 App 壳；不能靠复制缓存或状态继续推进。

**回滚建议以 Git 检查点和既有完整产物为单位。**保留一个迁移前可用包和每个责任阶段的完整检查点；不在最终产品内长期保留运行时开关和双页面。存储 key、API 合同和资产身份尽量保持，减少回退时的数据解释差异。

---

## 六、工程链与 Context 同步矩阵

### 原生构建要解决的实际问题

保留 Webpack 并不意味着删除 Taro 插件后就能直接运行。原生构建必须明确输出：

- 微信可直接加载的 Page/Component JS、WXML、WXSS、JSON；
- 静态可达的共享模块及正确的主包/分包引用；
- 唯一公共运行时，同时让 Sky 重资源继续按需归包；
- 原有图标 manifest、专属派生和异步 `packaged-icon` 路径；
- 与 DevTools 配置一致的输出目录和 TypeScript 转译职责。

不能把默认浏览器的 `document/script` 异步 chunk loader 带进微信，也不能为了共享单例，把整个 Sky 子图提前拉到 App 主包。

样式方面，当前设计明确使用逻辑 px，生成器输出部分大写 `Px`，构建又有 pxtransform。因此原生映射要参考旧编译后实际 WXSS 语义：**固定逻辑尺寸输出 `px`，其余尺寸逐类确认；不能全局复制或全转 `rpx`。**组件样式隔离、主题变量、外部类和弹层主题根也需要明确承接。[构建配置](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/config/index.ts) · [设计权威](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/DESIGN.md)

### 同步矩阵

| Owner | 何时改 | 改什么 | 保留什么 |
|---|---|---|---|
| `global.md` | 启动、最终切换 | 启动写“已决定、待实现”；最终再写“当前已原生” | 小程序范围、App 历史、数据与许可边界 |
| `product-profile.md` | 启动 | 平台交付与迁移约束 | 功能、用户路径、三模式语义 |
| `architecture.md` | 启动定目标，落实后更新事实 | 原生分层、vanilla/query-core、过渡退出条件 | 后端与其他 workspace 架构 |
| `architecture/runtime-and-domain.md` | 每个 owner 改接时 | Hook→控制器的真实职责、生命周期和消费者 | 唯一 writer、accepted、缓存预算、既有裁决 |
| Screen Contract 与子节点 | 对应组件/路由落实时 | 技术映射、真实入口、presentation 接线 | 产品行为、采用设计、时间/返回/权限语义 |
| `DESIGN.md` 与 token 生成器 | 样式管线切换时同步 | 原生 px/WXSS、组件映射，退休 Taro 专属说明 | 精确视觉值、资源和触控尺度 |
| `development-workflow` | 新命令实际可用时 | build/watch/DevTools 路径、原生调试流程 | 真实数据库、天气、资源准备及环境隔离 |
| `verification` | 启动即明确规则 | 无测试代码；证据继承条件、真实观察入口和未验记录 | 证据不能越界、不凭构建成功宣称运行通过 |
| `implementation-index` | 每批模块落地时 | 更新真实代码入口，目标与当前分开 | 不把任务日志复制进 Context |
| `AGENTS`、相关 skills | 启动查冲突，落实时改映射 | 原生生命周期、绑定和工程入口；清除现行旧测试指令 | 独立 App 专属内容与有效质量原则 |
| scripts、lock、tsconfig | 阶段 1 起 | 原生构建、core 版本、类型与依赖解析 | 本地已完成测试退役；真实生产保护 |
| CI | 新构建生效时 | 类型、编译、既有 Context/资源/发布保护调用 | 不恢复测试步骤，不加入 App 验收 |
| DevTools/发布工具 | 首个原生候选起 | 构建输出、项目身份、真实基础库版本记录 | AppID、权限、origin、包预算、不可覆盖产物与发布保护 |

这里有一个重要分类：旧工具名含 `check` 或 `inspect`，并不意味着全部可以保留。例如旧 `inspect-production` 同时含真实包预算逻辑和源码字串式检查；要以本地清理后的实际职责为准。**真实发布预算和输入完整性保护可以继续，测试性质部分不能改名移植。**

---

## 七、禁写测试代码下的精简质量保证

本节全部是未来实施阶段的人工责任核对、现有工具使用和真实产品观察，**不包含新增或恢复任何测试代码、fixture/mock、专用页面、smoke/回归脚本、临时断言程序。**

### 1. 静态与工程证据

每个责任阶段使用已有能力确认：

- TypeScript 类型检查及实际编译；
- 依赖方向和真实消费者阅读；
- 唯一 owner、订阅创建/销毁、取消/迟到结果的代码核对；
- 现有 Context、资源生成和真实发布保护；
- DevTools 对 WXML、组件配置、分包和实际候选的反馈。

TypeScript 不能自动证明 WXML 的所有事件接线、实际控件行为和样式正确，这部分仍由真实页面观察补足。原生绑定不需要为此另建检查框架。

### 2. 七类机制覆盖目标

**七类不等于七轮采集。**一次连续产品操作可以覆盖多类；已有充分证据的同机制变体不再排列组合。

| 机制 | 最小有判别力的真实观察 | 不重复什么 |
|---|---|---|
| **① 共享状态、查询与账户** | 真数据页面进入/返回；一个实际可用的账户编辑或偏好保存路径；观察当前身份、缓存及旧结果资格 | 不给每个查询页面重复登录与缓存实验 |
| **② Map 原生范围与安装** | 真实区域开启现有图层，跨一次窗口，在读取未结束时用新手势或选点接管，最终范围与显示收敛 | 不重跑 17 窗和手势时长排列 |
| **③ 云量精确时间身份** | 在当前真实可用供给上改一次时刻，看旧像素/来源退出和新状态；供给不可用时保持真实不可用 | 不借全国供给未完成制造模拟成功，也不重复静态层压力实验 |
| **④ Sky 时间—供给—accepted** | 真实非空 Sky 中步进、一次跨窗口长按并反向、Play→Pause、取消与应用 | 六字段基本操作需覆盖，性能不逐字段重测 |
| **⑤ Sky 相机与资源呈现** | 同一实际画面拖缩、点名称/天体、查看来源；固定图和渐进替代图各覆盖一种机制 | 不逐星数、逐图片、逐 LOD 排列 |
| **⑥ 不同生命周期** | 合并观察 Map→My→Map、Map→Sky→Sources→Sky→Map；必要时一次后台返回 | 不把逻辑隐藏、Sources 暂存和真正卸载当同一种机制 |
| **⑦ 原生输入、返回与业务提交** | 新时间尺节点定位、拒绝输入后的纠正、一个共享弹层 Back，以及受改动表单的保存/取消/返回 | 公共组件通过后，不在每页重复完整交互实验 |

可把主要观察组织成一条较长的普通旅程，再补云量和表单中尚未覆盖的不同机制。Profiler 只用于这条路径中需要判断的新开销或疑点；不默认补录全部 Heap，也不追求进程字节精确回到某个旧数值。

### 3. 所有页面仍要做基本可用与设计覆盖

另外保留一份简明的 **21 个注册路由完成记录**：

- 实际入口可达；
- 主要内容与主要动作可用；
- 返回和共享状态正确；
- 采用设计、资源、主题及安全区没有迁移新增偏差；
- 真实数据缺失、不可用或失败时没有伪造成功。

这份记录可以随着正常业务旅程完成，**不意味着 21 套性能实验**。共享三模式、公共控件和资源机制可以集中观察；页面独有布局仍需在该页看过。

### 4. F04 与未知项的记录方式

建议明确区分三种结果：

1. **历史核心机制证据复用**：旧 F04 已有真实成功结果。
2. **新原生绑定已核对**：WXML 保留前任节点、事件隔离、coordinator 登记与退休接线。
3. **新宿主真实故障结局未观察**：没有自然出现故障，就保持未验。

这不触发重新制造 F04 故障，也不恢复旧注入脚本。

Android 历史结果不外推为 iOS 结果。新原生候选的 Canvas、触控、传感器和返回等平台敏感路径，需要按实际可用设备取得有限证据；没有取得就明确标注，不能用模拟器结果填成手机通过。

### 5. 哪些证据可以继承

| 证据 | 继承条件 |
|---|---|
| 科学公式、坐标和时间规则 | 实现、输入含义及调用条件未变 |
| 数据覆盖、素材、来源、许可和 hash | 使用的是原数据/资产身份，未改变展示资格 |
| 公共资源状态机的历史修复 | 原机制保留，新适配没有改变其前提 |
| D1/D2/F04 收口及“不采用”裁决 | 继续保留原适用范围，不因换框架重开 |
| 旧运行包的帧率、启动和内存表现 | **不能自动继承到新原生包** |
| 旧页面的像素、原生节点和生命周期结局 | **不能自动证明新模板及绑定正确** |
| native/GPU 物理字节和历史 OOM 根因 | 仍未知；不改写为已解决，也不自动成为本轮重查任务 |

---

## 八、迁移成本与长期维护判断

### 工作量如何估算

这不是“把 21 个页面改语法”的小改，也不是重写整套天文和地图系统。成本主要集中在：

1. 原生构建、分包和共享实例；
2. Map 逻辑前台、native 节点与返回接线；
3. Sky 时间、供给、accepted 与资源寿命的协调；
4. 高风险共享组件的原生模板和事件；
5. 其余页面族的迁移及采用设计核对。

如果必须现在预留排期，我建议采用下面的**初步工程容量估计**，明确它是规划判断，尚未经过首条迁移路径校准：

| 工作包 | 初步容量 |
|---|---:|
| 公共运行时、平台端口、原生构建与首条真实路径 | 4–7 个有效工程人日 |
| 公共组件、主题、资源路径与样式映射 | 4–7 人日 |
| Map/My 与地图资源生命周期接线 | 6–10 人日 |
| Sky 时间、供给、Canvas 与资源绑定 | 8–14 人日 |
| 其余注册路由按业务族迁移 | 5–9 人日 |
| Context、工程收口及去重后的真实观察 | 3–5 人日 |
| **合计** | **约 30–52 人日** |

这些数字的假设是：

- 一名熟悉当前 owner 的工程师使用编码代理协助；
- 采用设计、后端合同和科学规则保持；
- 数据与真实运行环境可用；
- 公共组件、状态和导航只算一次；
- 不包括旧 P1–P6、新全国供给、部署/CDN、后端优化；
- 不包含恢复或开发测试代码。

**最不确定的是 Sky 协调逻辑和原生模板/节点边界，不是算法复用部分。**完成首条原生真实路径及 Map/Sky 纵向链后，按实际接线工作重新校准一次即可，不需要持续做选型 A/B。代理并行能加快模板与独立模块工作，但 Map/Sky 集成仍受共享 owner 和生命周期依赖限制，不能直接把人日除以代理数量。

### 长期维护会怎样变化

原生化后，平台事件、节点、布局和 Canvas/Map 接入会更直接，Taro 模板、桥接和 React 页面协调这类问题会减少。

与此同时，团队需要显式维护：

- 页面及组件生命周期；
- Query/store 的订阅销毁；
- WXML 与 TypeScript 之间的事件和数据约定；
- 组件样式隔离与主题传递；
- 视图投影与业务事实的区别。

因此，**原生语法确实可能增加局部样板代码，但不必增加业务复杂度。**保留 query-core、vanilla store、现成控制器和统一 presentation/Back 责任，能把这部分成本集中在少数公共绑定中。若逐页手写请求、恢复、账户判断和取消，长期维护成本反而会上升。

---

## 九、迁移完成标准，以及怎样交回旧计划

### 本次迁移可以完成，需要满足这些条件

| 维度 | 完成判断 |
|---|---|
| 运行时 | 最终小程序不依赖 Taro/React 页面运行时；临时桥接和旧页面调用路径退出 |
| 功能与设计 | 本轮迁移的既有功能、采用设计和正常返回路径不缩水；21 个注册入口基本可用覆盖完成 |
| 科学与业务合同 | 时间精度、目录、数据覆盖、来源、权限、取消和显式应用语义保持 |
| 状态与生命周期 | 每项责任仍有唯一 owner；新绑定的订阅、隐藏、卸载、迟到结果与资源退休有明确依据 |
| 工程与包体 | 原生独立构建、分包引用、资源路径、单例和既有包预算成立；没有把 Sky 提前塞进主包 |
| 启动与交互 | 最终普通原生候选取得必要的真实观察，没有迁移造成的阻断或明显退步；收益只按实际证据描述 |
| 数据兼容 | 原账户状态、存储 key、缓存身份、API/资产 URL 继续兼容；必要变化有明确读取与回退方式 |
| 证据 | 可继承、需新观察、仍未验三类清楚；不因禁写测试虚构通过 |
| 文档与工程 | 当前 Context、脚本、CI、DevTools 和发布工具一致，不再把计划中的原生描述成旧 Taro 已实现事实 |

原先已登记但尚未完成的独立产品义务，不通过这次迁移自动变成完成，也不全部并入迁移范围。迁移造成的新偏差需要在本轮修正；原计划缺口继续保留真实状态。

### 旧 P1–P6 的交接方式

迁移 PLAN 从启动时就引用封存计划，并保留以下义务。迁移完成后再按新的控制器、路由和资源 owner 重写实施步骤。

| 原计划 | 必须保留的未完义务类别 |
|---|---|
| P1 | 尚未完成的产品 UI、交互和采用设计目标 |
| P2 | 云量/光害全国供给、低 LOD 完整覆盖、连续更新与发布；其余地图独立缺口 |
| P3 | 尚未完成的 Sky 科学、对象、照片、来源和独立交互义务；不重开已收口 D2 |
| P4 | 后台、身份/版本配对、真实媒体与长期队列恢复等剩余闭环 |
| P5 | 原业务、账户、资料与真实交接的未完成项 |
| P6 | 正式分发、CDN/冷回源、发布回滚、容量和最终交付条件 |

每项至少保留：**原目标、已完成证据、剩余缺口、原停止/重开条件、新实现入口**。原记录不重写成“已全部完成”，旧测试执行基线不恢复，原本未完成的全国供给也不拿来卡住一个本来不改变供给的前端迁移。

**我建议据此编制迁移 PLAN：先把公共运行时和原生工程落稳，尽早完成 Map/Sky 的生命周期转换，再批量迁移页面。整个过程中保留现有科学与资源核心，把新增工作集中在确实发生变化的绑定、模板和工程边界上。**
