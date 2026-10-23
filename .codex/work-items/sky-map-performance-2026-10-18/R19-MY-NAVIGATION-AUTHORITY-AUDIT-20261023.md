# R19 My 导航授权与责任独立审查 — 2026-10-23

本次是父代理委托的有界只读审查，仅新增本记录。目标为当前 WEAPP 产品；未改生产、PLAN、HANDOFF、Context，未执行构建、设备、服务或网络操作。读回 checkout 为 `codex/remote-main-20260908` / `5b27a062c670cb2336e8e5c00c7e7a4071db0fac`；广泛未提交成果保留。本记录判断现有授权，**不判断 B 已实现、已获运行资格或真机已通过**。

## 结论

**B 在下述保真边界内属于已授权的实施选择，无需等待新的 A/B 用户批准。** 用户已采用去底栏、默认 Map、My 左入左出及新页右入，并明确继续；PLAN R19 明确把实际机制留给实施。B 用现有唯一 primary-navigation/return owner 承载 My 的有界全屏 presentation，保同一物理 Map、独立 My 滚动、原生子页与来源阅读页、直接入口、有效隐藏、Back 和通知身份时，没有改变已确认的用户结果。

这不授权直接铺开未经验证的组合。仍应按 PLAN 先完成一条 Map→My→Map 和 Map→Search→Map 的实际 WEAPP 路径，消除原生 Map 合成、方向、Back、状态和有效隐藏的不确定性，再扩展消费者。软件检查、公开原语或候选源码均不能替代该证据。

旧 `R19-NAVIGATION-RESEARCH-20261022.md:12,66` 将“必须用户批准 B”列成前置条件，**该授权判断应由本审查纠正**。旧报告的官方 API 边界、当前消费者清单和有界实验风险仍可复用；本次未重新做官方 API 调查。A 已知把 My 改成右入右出，则仍偏离采用方向；若选择该替代结果，需要另行取得用户同意。

## 上位要求实际说了什么

| 当前来源 | 有效条款 | 对 B 的含义 |
| --- | --- | --- |
| `PLAN.md:48–49` | 使用现有 `navigation/primary-navigation`、页面生命周期和转场责任；禁止 parallel router；保一物理 Map、实际 opener/状态；“The actual native mechanism is an implementation choice; any material inability to reproduce adopted direction/state must be reported, not silently replaced.” | 明确委托机制选择。是否满足采用方向和状态是判断点；增加必要的有效可见性适配并不自动成为产品方案变更。 |
| `PLAN.md:106,137` | My 可隐藏保留 Map；Sky 受控卸载。按实际 hide/unload 责任退休需求、计时、订阅与晚发布；超出委托的架构实质变化才另行授权，且不得把每个局部选择变为许可问题。 | Map 的 JS 原生 `onHide` 与产品有效隐藏不是同一个事实。B 必须实现后者，不能伪称已触发前者；该区别已在本轮隐藏/卸载责任内。 |
| `REQUIREMENTS.md:3,11–18` | 当前 UI 修订已采用且获明确继续，去底栏/My 左入左出、迁移旧路由/返回/安全区并保 Map 状态和 My 内容。 | 当前不是只研究或等待资源采用阶段。 |
| `project_context/areas/main/screen-contracts/wechat-miniapp.md:25,44–45,59–64` | 2026-10-22 局部增量已授权进入原计划；Map/My 为两主目的地且无底栏，采用左向 My；现有 owner 迁移旧 TabBar 与真实消费者。主包仍注册 Map、My、auth；深链先激活其所属主目的地及允许的子路由。 | 保留 `pages/my/index` 的直接入口 wrapper 与同一 My 内容，实现 Map-host 的 My，并不删除这条注册路由。文中没有规定普通 Map→My 必须创建一个新的 native Page。 |
| `project_context/areas/main/screen-contracts/wechat-miniapp/map-and-finder.md:5–7,93–103` | 最新 My 左入左出；原 My 账户/计划职责、保存/取消、前台刷新和时间推进保持。 | 只能调整承载和有效前台，不可改内容、数据或恢复语义。 |
| `DESIGN.md:617,738,793,1072` | 去底栏/左上返回、原 My 渐变玻璃卡及内容保持；My 左入左出，Search 等新页右入，原有转场可被新输入接管。 | 规定可感知结果及范围，不指定 WebView 页面调用 API。 |
| `.codex/skills/uiux_design/SKILL.md` 的 Authority、Find The Shared Owner、Verify With Evidence | 区分 WEAPP 与 native App；按当前上位 owner，复用 Taro/Starward 与实际 Back/生命周期；必要动效差异可作最小共享适配，关键平台假设先做小目标运行路径。 | 没有新增“同页全屏 presentation 必须用户批准”的规则；工作量与测试风险也不构成额外审批条款。 |

## architecture 的适用范围，及旧报告的误读

`project_context/architecture.md:41` 原文为：

> Selecting a primary tab changes the active route and rendered screen. Each tab owns its primary scroll or immersive canvas plus its nested navigation state; switching tabs never scrolls a shared page, jumps to a section anchor, or conditionally swaps pseudo-pages inside one root `ScrollView`.

这条保留独立主滚动、子导航和共享业务 Context 的责任，明确禁止在**同一根 ScrollView 内**靠滚动/锚点/条件伪页冒充主 Tab。它不是“任一主目的地在任一产品中必须对应新增一个 WEAPP native Page”的通用条款。尤其：

- architecture 自身 `:20` 指明 WEAPP Screen Contract 独立拥有其 topology，不能借用 native App/Admin 语义；`:56` 也要求区分独立小程序与 native App carrier。
- `project_context/architecture/runtime-and-domain.md:65` 明确五 Tab 与唯一 Expo Router 树是 **Mobile/native App** 的实现边界；不适用于给 WEAPP 强加 Expo/五 Tab 或必须 native Page 的选择。
- 当前 WEAPP Screen 已明确把旧 TabBar 模型替换为无底栏的 Map/My 方向导航；不能再把“选择 primary tab”的旧实现前提作为保持已删除产品模型的审批门槛。
- B 必须是同一个 primary destination 的独立全屏滚动和前台责任，不能在 Map 的 ScrollView 内切换内容或做第二套站点路由/历史。`pages/my/index` wrapper 与 Map-host wrapper 共用一个 My 内容实现，并不因此成为两套产品；同时制造第二 My 实例/Map 实例或竞争路由真相仍被禁止。

因此，旧报告所称“当前独立页面/禁止伪页面 Context 冲突”未提供一条仍有效、要求 Map→My 必须 native push 的具体用户或 WEAPP 条款。保独立 My 阅读/交互表面与它必须新增 native Page 是不同命题。B 的必要生命周期迁移不能仅因不再自动得到 Map `onHide` 就被判作越权。

## 实际代码证明这些是待迁移责任

当前生产仍为旧 TabBar 实现，本审查没有把它记作 B：

| 当前 owner / 已读代码 | 现有事实与 B 必须守住的责任 |
| --- | --- |
| `navigation/primary-navigation.ts`、`primary-page-navigation.ts`、`primary-navigation-controller.ts`；`app.config.ts`、`custom-tab-bar/index.ts` | 目的地和几何仍含旧 bar，统一 `openPrimaryPage` 目前仍调用 `switchTab`；controller 用真实 Page identity、visible/revision/pending 防重与迟到失败。B 应在这一责任方向扩展唯一目的地/返回决策，保留 fence；不能每个 caller 单写导航或另建全站 history。 |
| `hooks/use-primary-navigation.ts`、`primary-navigation-cover.ts` | 当前按每个 native tab 的 show/hide/layout 和 bar cover 协调。删除的是旧 bar 订阅/cover/占高；不是删除原生 chrome、模态 Back、照片或登录保护。 |
| `pages/map/index.tsx:316,435–443,536–547,618–1062,2566–2572` | Map 的 viewport、查询、栅格安装、反馈和面板消费 `pageVisible`；原生 hide 还取消焦点/位置/日期/拖动/编辑及晚操作资格。B 必须把有效前台接入同一资格与退休责任，原生子页 hide 与 My 覆盖叠加时不能错误重启；同一 Map 节点、camera/selection/panel/scroll/Context 不重建。只加不透明层/opacity 不满足隐藏结果。不要手工冒调 Taro Page 生命周期来伪造 native hide。 |
| `features/my/my-library-page.tsx`、`pages/my/index.tsx`、`my-avatar.tsx`、`my-nickname.tsx`、`my-plan-card.tsx`、`hooks/use-wechat-login.tsx` | My 已是唯一内容加薄 page wrapper，内部独立 `ScrollView`；一秒时钟、过期刷新、编辑/照片/计划 press/login 的显示与退休仍依 native生命周期。Map-host 必须供给真实有效可见性，并保持原账户/查询/取消 owner；子页返回恢复同一个 My presentation 和滚动，不能把仍 mounted 当仍 foreground。 |
| `hooks/use-page-navigation.ts`、`use-account-navigation.ts`、`components/custom-nav.tsx` | 当前 attempt 依据 native page/visible 及账户/reset；有效 My/Map 切换必须令隐藏前台的旧 attempt 失效，已接受的 native handoff不能被第二动作重发。CustomNav 保留先处理离开确认/Back 再有界 fallback 的语义，由唯一 destination owner判定实际 opener。 |
| `components/native-back-boundary.tsx`、Map 与 My avatar/nickname/login 消费者 | Map 已持唯一 PageContainer 模式；My 子任务原来在另一 native 页各有 auxiliary Back。B 同页时必须由统一 native Back owner仲裁，优先关闭当前编辑/照片/登录，再关闭 My；一次 Back 不得连关两层，不得同页同时添加第二 PageContainer。视觉退场和 native leave 生命周期是不同责任，需目标观察。 |
| `state/notification-page-route.ts`、`app-store.ts:506–510`、`components/notification.tsx` | 浮动通知当前绑定真实 native route，宿主跟随 native show/hide。B 原生 route 仍为 Map，因此需在原队列/身份责任扩展 presentation 归属和有效显示，保证只一前台 host 计时、隐藏页的旧结果不能跨前台导航或误呈现。不能新建竞争通知系统。 |
| `navigation/sky-map-lifecycle.ts` 及原 Sky-return owner | My 隐藏不等于 Sky 真卸载；保留 Sky cleanup/journey/snapshot 身份及唯一 Map 重建，不可借本轮改成 retained Map Sky。 |
| `services/source-navigation.ts`、PLAN:52、`shared-state-and-recovery.md:31–45` | 来源仍经原生 `navigateTo`、当前 opener/EventChannel/身份到真实阅读页；My 的承载选择**不扩展**为来源同页化、抽屉或全站伪页。 |

这些 owner 的存在也说明 B 不是“加一个 CSS 容器就完成”。但责任迁移复杂、需要测试或原生合成有风险，不等于用户尚未授权实施它。

## 可以继续与真正需重报的边界

可在现有授权内继续：完成唯一 primary owner 的有界 My presentation 与 native 直达适配；将已有有效前台、Back、通知、子页恢复责任接入原 owner；保留来源/native 子页；先用小路径验证，失败时保留具体第一边界及下一步。

出现下列实质偏离时才需报告具体冲突和方案变化，不能静默替换：采用方向实际无法实现而要改成右入/淡入；同一 Map 状态必须被重建或丢失；需要第二 router/无限栈/双 Map；需取消 My 直达、子页/Back/通知资格；将真实来源页改回同页；或要扩展到 Skyline/替换原生地图引擎、改变未修改视觉及业务范围。当前源码未证明这些偏离必然发生，不能预先把它们当已经成立的拒绝原因。

本次没有重选稿、没有批准新设计、没有进行 B 运行试验。gen8 仍需用户实际扫码/打开，自动 Goal continuation 不构成扫码确认或 A/B 答复；这个事实只约束设备操作，不能反向制造 B 的缺失授权。
