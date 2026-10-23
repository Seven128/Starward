# R19 导航机制调查 — 2026-10-22

范围：只读核对当前源码、PLAN R19、Screen Contract、DESIGN、architecture/maintenance boundaries、交互与小程序开发/官方工具技能，以及现行微信/Taro 原始文档。只新增本报告；未改生产文件、PLAN/HANDOFF，未操作构建、IDE、设备、Git 或服务。以下是方案研究，不是已采用实现或运行验收。

2026-10-23授权纠正：经[对原PLAN与当前WEAPP合同的独立复核](R19-MY-NAVIGATION-AUTHORITY-AUDIT-20261023.md)，B在保同一Map、独立My滚动、原生子页/来源、直接入口、有效前台与唯一Back责任时，属于原PLAN明确委托的实现选择；原“必须先获A/B批准”的判断撤回，不再等待用户另批。以下API研究与2026-10-22源码快照保留；当前实现/资格只见HANDOFF和本次整合证据，不能把旧代码状态当现状。

## 结论与两个可选择方案

当前 Taro 4.2.1 和页面配置仍为 WebView 路径：没有 `renderer: "skyline"`，Map/My 为自定义 TabBar 页。普通原生页面栈足以支持 Map 保留、Search 右入及逆向返回，以及 Sky 真卸载 Map 后重建；**My 左入左出不能直接由当前公开 WebView 原生页面路由 API 实现**。这不等于所有公开原语组合均不可行：同页全屏表面存在可验证的候选，但会改变当前路由契约。

| 方案 | 具体机制 | 得到的结果与代价 | 当前资格 |
| --- | --- | --- | --- |
| A：保留真实原生页面 | 删除 TabBar 注册；Map→My/Search 用 `navigateTo`，返回同一 Map 用 `navigateBack`；Sky 继续受控 `redirectTo`，返回经现有生命周期 owner 重建 Map。 | Map 原生 `onHide/onShow` 自动成立，现有页面生命周期适配最小；Search 可沿官方默认方向。My 也会按默认右侧进入、向右退出，**不符合已采用左入左出**。 | 路由/资源机制有官方依据，但不能作为 R19 完成交付；采用不同 My 方向必须用户同意。 |
| B：Map 页内承载唯一 My 内容 | 保留原生 Map 页及其地图节点；在现有 `primary-navigation` 下增加一个受控 My 全屏 presentation，真实内容以普通 View/CSS `translateX(-100%→0)` 左入，反向左出。复用现有唯一 native Back owner。`pages/my/index` 的直达包装仍复用同一 My 内容实现；子页面继续正常原生 push/back。 | 可以用公开 WebView 动画原语表达左入左出，并保留同一个 Map；但不会自动产生原生 Map `onHide`，需把 Map/My 的有效可见性、子弹层 Back 和通知身份接入原责任。改动明显多于一个容器，不能称为已验证最小修复。 | **原PLAN授权范围内的实现选择**；不与独立My滚动及WEAPP拓扑合同冲突。仍须有限目标路径核验原生合成、Back、状态与隐藏，软件通过不能代替目标证据。 |

不选择 Skyline 迁移，不创建第二套路由表/导航栈，不使用 private IPC，不把内容 CSS 动画冒称为原生跨 WebView 转场。A/B 都保持现有账户、计划、查询与 Observation Context owner。

## 现行官方能力，及不能混淆的参数

1. [微信自定义路由](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/skyline/custom-route.html)（页面标注更新 2026-06-16）明确：多 WebView 页面使用固定右向左入场；自定义路由要求连续 Skyline 页面。`routeType`、`wx.router.addRouteBuilder`、`maintainState` 和自定义主/次动画属于这条机制，类型可写不代表 WebView 可用。该页同时解释 WebView 背景容器为不透明色值，不能假设一个透明新页面可露出前页来伪造跨页左入。
2. [微信 navigateTo](https://developers.weixin.qq.com/miniprogram/dev/api/route/wx.navigateTo.html)和 [Taro 官方文档源](https://github.com/NervJS/taro-docs/blob/master/docs/apis/route/navigateTo.md)列出 `routeType/routeConfig/routeOptions`；没有 `animationType`。本机 `apps/wechat-miniapp/node_modules/@tarojs/taro/types/api/route/index.d.ts:44` 与此一致，`navigateBack` 也没有动画方向参数。[微信页面配置](https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/page.html)及本机 Taro 类型中未找到 `pageTransition`。不能用类型强转或其他平台同名配置推定微信支持。
3. [预设路由](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/skyline/preset-route.html)列出 bottom-sheet/upwards/zoom 等 `wx://` 路由，仍从 Skyline 自定义路由机制派生；它们不是 WebView 左入开关。
4. [page-container](https://developers.weixin.qq.com/miniprogram/dev/component/page-container.html)支持 WebView，最低基础库 2.16.0。**`position` 仅 `top/bottom/right/center`，没有 `left`**；本机 `node_modules/@tarojs/components/types/PageContainer.d.ts:25` 及其 Position 声明一致。它是页面内的容器，会优先消费右滑、Android 物理 Back、`navigateBack`，不是一个新 Page。官方还限制当前页最多一个容器，并记录鸿蒙暂时不能拦截返回；没有上级的栈底不能靠 `navigateBack` 代替本地 close 命令。
5. [微信动画](https://developers.weixin.qq.com/miniprogram/dev/framework/view/animation.html)支持 CSS transition/animation，并提供 WebView 专用关键帧 `this.animate`；[WXS 响应事件](https://developers.weixin.qq.com/miniprogram/dev/framework/view/interactive-animation.html)可在视图层改组件样式，但不能修改最顶层页面样式。这些是 B 的公开内容动画基础，不会覆盖系统跨 WebView 路由动画。普通按键导航先用 CSS，不为此引入逐帧 setData 或自建手势引擎。
6. [微信页面路由](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/route.html)（页面标注更新 2026-08-10）确认：`navigateTo` 隐藏当前页并创建新页，`navigateBack` 销毁上层后显示旧页，`redirectTo` 销毁并替换栈顶，`reLaunch` 销毁全部页面但不重启 AppService。路由 success 表示已接受、不可取消，实际 show/unload 可以稍后发生；并发调用会排队。原有 pending/ticket/late-result 防护必须保留。

微信文档的 web 工具读取失败后，通过 PowerShell HTTPS 成功读取上述官方原文；Taro 站点 TLS 读取失败后读取其官方 GitHub 文档源，并交叉核对本机已安装类型。无第三方教程作为支持依据。

## 当前代码的最小责任地图

下列路径均相对 `apps/wechat-miniapp/src/`。

| 责任 | 当前入口与迁移含义 |
| --- | --- |
| 路由注册 | `app.config.ts:5,44` 默认 Map，Map/My 当前仍在 custom tabBar。删除注册后，所有 switchTab 均失去合法目标。Map/My/Search/Sky page config 没有 Skyline。 |
| primary owner | `navigation/primary-navigation.ts` 同时持有目的地、图标和旧底栏几何；`primary-navigation-controller.ts:10` 以当前 Page identity、visible/revision/pending 防重复，真实 show 才提交选择，但导航 port 仍只有 switchTab。应在此方向扩展统一目的地/返回责任，不能每个 caller 各写一次栈搜索。 |
| 页面可见与通用返回 | `hooks/use-primary-navigation.ts` 只同步每个原生 tab 的 bar/cover；`hooks/use-page-navigation.ts` 与 `use-account-navigation.ts` 持有当前页/身份/请求资格；`components/custom-nav.tsx:36` 先返回，再 switchTab fallback。保留各 caller 的身份和失败语义，把路由决策收束到 primary owner。 |
| Map | `pages/map/index.tsx:202` 仅在 Sky-return 标志下消费一次 `sky-return-state`；`:270` mount/unmount 报生命周期；`:536` show/hide 清理位置/焦点/编辑/拖拽等；`:435` 起多类查询、叠层安装及面板消费 `pageVisible`。不能把隐藏简化为 opacity。 |
| My | `features/my/my-library-page.tsx:32` 旧底栏几何；`:39–55` 原生 show/hide 驱动一秒时钟和 stale refresh；子 `my-avatar.tsx:54`、`my-nickname.tsx:32`、`my-plan-card.tsx:57` 也依赖原生生命周期。`pages/my/index.tsx` 已是薄 wrapper，适合保留唯一内容实现。 |
| Search | `pages/map/search-page.tsx:384` Back 失败后切 Map；`:407` 先提交 query/selected/request version/viewport，再返回现有 Map。必须保同点再次选择和真实 opener，不能回到新建 Map。 |
| Sky | Map `index.tsx:2279–2318` 黑场后先等待真实 raster cleanup，再保存小快照、beginEntry、redirectTo；`features/sky/spot-sky-page.tsx:2828–2866` 统一黑场返回与超时；`navigation/sky-map-lifecycle.ts` 只持无敏感资源的 journey；`pages/map/sky-return-state.ts` 以 account/reset/selection version 限定一次恢复。 |
| Back/遮盖 | `components/native-back-boundary.tsx` 的 Map 模式已持一个 PageContainer，内容承载登录和事件；普通模式辅助容器只在 active 时挂载。`pages/map/index.tsx:2540` 将 Map 原弹层统一交给它。`primary-navigation-cover.ts` 的 bar cover 是不同责任，不能误删 native Back。 |
| 通知 | `components/notification.tsx:44` 动态调用 `Taro[method]`；`state/notification.ts:7` 仍允许 switchTab；`state/notification-page-route.ts` 按真实原生 page route 绑定宿主。只搜 `Taro.switchTab` 会漏掉这一消费者。 |

Sky 受控返回建议：保留 `beginReturn`、快照资格和黑场；Map 已卸载时通过同一 primary owner 建立唯一 Map 根（正常一层 Sky 可 `redirectTo`；需要清除异常/直达栈时采用有明确语义的 `reLaunch`）。不可 `navigateBack` 到已卸载 Map，也不能每次普通返回都 `reLaunch` 导致 Map 状态丢失。具体选择须与当前栈读回一致，不能无条件 retry 第二个导航动作。

## switchTab 与旧底栏的完整迁移入口

本次搜索普通源码、排除 `*.test.*`；以下覆盖全部含 switchTab 的文件，并补上动态 dispatcher。行号是本次只读快照。

| 类别 | 入口 |
| --- | --- |
| primary/通用 | `custom-tab-bar/index.ts:64`；`navigation/primary-navigation-controller.ts:13,35`；`components/custom-nav.tsx:45` |
| 启动/搜索/Sky | `pages/auth/index.tsx:154`；`pages/map/search-page.tsx:395`；`features/sky/spot-sky-page.tsx:2848,2854` |
| 地点/来源/分享 | `features/spot/spot-detail-page.tsx:220`；`spot/data-source/index.tsx:70,96`；`content/share/index.tsx:201`；`content/article/detail/index.tsx:129` |
| 贡献/反馈 | `content/contribution/contribution-records.tsx:70`；`content/contribution/contribution-editor.tsx:183,249`；`content/spot-feedback/index.tsx:500,535`（500 同行有 Map 与 My 两个恢复） |
| 计划/My/settings | `content/achievement/index.tsx:50`；`content/plan/list/index.tsx:83`；`content/plan/detail/plan-editor-page.tsx:1098,1136,1456,1472,1646,1647`；`content/settings/index.tsx:391` |
| 事件/通知 | `content/event/modal-host-page.tsx:24`；`state/notification.ts:7` 与 `components/notification.tsx:44–45` |

此外，`CustomNav.backFallbackTab` 真实调用者包括 account-entry、achievement、share、plan/list/detail、settings、spot-feedback、contribution；源码中退休的 profile/import 也有调用，但未在当前 app 路由注册，不把它们重新引回产品。`content/settings/index.tsx:246,286` 的账户删除 `reLaunch(auth)` 属于身份清理责任，保留并校验 auth→Map 的新恢复路径。

旧几何/cover 需要随迁移收尾：`use-primary-navigation`、`primaryNavigationLayout`、Map 的页面/面板/编辑器高度与 `map-layer-sheet.tsx:31` fallback、`features/my/my-library-page.scss:1` 的 padding-bottom；移除旧 bar 保留真实 safe-bottom。bar cover 使用者为事件 modal、照片 viewer、微信登录、My avatar/nickname；退休的是 `retainPrimaryNavigationCover`，不是这些组件的生命周期/native chrome/Back。`custom-tab-bar` 文件和旧专用测试需在所有消费者迁完后一并退役。

## B 方案的真实工作量与有限试验

**不能把 `<PageContainer position="left">` 当作试验起点：该值没有官方支持。** 建议的候选是 CSS 全屏表面和既有 Back 边界分离：My 视觉层由普通 View/RootPortal 保持到离场结束，Map 的唯一 PageContainer 只把 Back 转发给当前任务。这样 native beforeleave 不应直接销毁正在左出的 My；是否无闪烁和可持续拦截必须在目标运行时观察。

沿原PLAN授权先验证一条 Map→My→Map，再按结果整合；不再设置A/B批准前置：

1. `primary-navigation` 持有一个有界 `closed/opening/open/closing` My presentation 和实际 opener，复用现有 controller 的重复动作/失效 fencing；**不自建全站 history**。My 内设置/计划等仍 `navigateTo`；返回显示原 My 表面及其 scroll，最终 My close 恢复 Map。
2. 保留 My 单一内容实现。Native route wrapper 和 Map-host wrapper 只供给有效可见性、返回及 Back ports；My 时钟、stale refresh、头像/昵称输入、计划 press、login 需要消费同一可见性。保持 mounted 与 visible 为不同事实。不要直接手工调用旧 Page 生命周期，也不通过 unmount 重建 Map。
3. Map 采用 `nativePageVisible && !myPresentationOwnsForeground` 的有效工作资格，复用现有 pageVisible consumers 及 hide 清理责任，暂停视野读取/叠层请求/旧发布权/计时器；不改 camera/key、panel/scroll/Context。My 完全离场才恢复 Map hit area和当前需求。覆盖画面不等于原生 Page 隐藏，这是 B 与 A 的机制差别。
4. 必须复用唯一 native Back owner：My nickname/avatar/login 现各自挂 `NativeBackBoundary`，需提供受控 Back 接口并让统一 owner 先关当前编辑/照片/登录，再关 My。不得再挂第二个 PageContainer，也不能让 Back 一次同时关闭编辑器和 My。Map 原 panel/事件状态需保留原优先级。
5. 通知和异步动作资格要认出当前 My presentation：原生 route 仍为 Map，不能出现两个 FloatingNotificationHost 同时呈现/计时、Map 通知覆盖 My、My 完成误落 Map，或隐藏 My 的旧回调继续导航。使用原通知队列、账户/查询 owner，扩展 presentation 归属即可。
6. 专用 My 直达页面复用相同内容，其无 Map opener 的返回必须经 primary owner 建立 Map 根；不得制造 `[My,Map,My,…]`。从 Map-host My 打开原生子页面再 Back，需要保留该 opener，而不因为 native route 是 Map 就回到 Map 视觉表面。

一次试验只回答：左入/左出是否真实连续且盖住原生 Map；Back 是否按编辑/表面层次只消费一次；同一 mapId/Page identity、camera、panel/scroll 是否保持；有效隐藏期间需求是否停、返回是否重核；My→设置→Back 是否恢复同一个 My 状态。记录正常速度短视频及栈/生命周期/查询资格读回。原生地图组合、RootPortal、键盘先 Back 和动画中反向分别是不同风险，按这几个真实机制选有限样本，不扩展到全主题矩阵。

若视觉被 PageContainer 退出截断、同页单容器无法整合现有子任务、或者地图仍接触摸/后台工作，不扩大迁移；记录已观察边界后返回方案选择。公开机制支持只使试验有依据，不是通过证明。

## A 方案的有限试验与共同验收

在原计划允许的一个当前候选内，由主代理按开发/官方工具技能复用现有 session：

- Map→My→Map 与 Map→Search→Map：读回真实 stack、Page 对象/Map native id、hide/show/unmount 事件；检查 camera、当前点、panel extent、document/gallery scroll 和 Context。A 下 My 右入应明确录为采用方向不符，不标通过。
- Search 选一个实际正式点后返回，结果必须是同一 Map 中的新点及 medium panel；再验证已有点重选仍恢复。返回不能仅由 API success 或路由字符串证明。
- Map→Sky→Map：复用当前 cleanup/journey/snapshot/blackout evidence owner，必须实际看到旧 Map unload、新 Map mount，且按身份资格恢复小快照；与 My 的 retained Map 严格区分。
- 栈缺根/直达和一次真实导航失败用 shared primary owner 的既有恢复覆盖。已被原生接受的路由不因超时再次派发，等待实际 show/unload 或下一次明确动作，避免平台排队造成重复 Map。

目前没有执行上述运行试验。公开 API、源码与本报告不能证明目标动画、原生资源释放或内存验收。建议主代理把 **A 的方向取舍** 与 **B 的同页承载/可见性取舍** 作为两个具体选项，而不是承诺一个不存在的 WebView 左向原生路由参数。
