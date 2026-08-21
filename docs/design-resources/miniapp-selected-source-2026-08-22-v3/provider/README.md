# 今晚去观星 Mini Program V2.0 · 账户中心、共享通知与连续 SourceLift 候选

这是同一 DRA requirements-change → design-resource iteration 的 U33 rolling current snapshot。资源继续是 `style-bearing`、`handoff-candidate`、`unselected-candidate`、`sample-only`、`non-production`；没有候选选择、Design Authority adoption、生产实现、原生微信验收或产品接受声明。

Canonical entry 是 `index.html`。它保持自包含、离线可运行，没有 CDN、远程脚本、外链图片、远程字体或运行时 UI 库。手机外 reviewer shell 继续披露 `UNSELECTED / SAMPLE_DATA / 非生产`；手机内只保留用户需要的地点、时间、来源、鲜度、不确定性、权限、失败与恢复信息。

## 权威与未修改边界

- Design system binding：`user:soft-instruments`
- Exact target：`target.system.wechat-miniapp-soft-instruments-2026-08-05`
- 当前 controlling delta：U33 `USER-MY-ACCOUNT-CENTER-001`；conversation `61006884-d0d8-48d2-bc4c-f0136e8ade3b` 的 U32 `USER-NOTIFICATION-COMPONENT-FAMILY-001` 与 `open-design-commission.md#26` 继续作为 U24–U32 已锁定基线
- Durable owners：`product-surface-contract.md` 的 Mini Program Map / Detail ownership，以及 `screen-contracts/wechat-miniapp.md` 的控制与状态契约
- 未修改：`C:/Dev/Starward` 生产代码、`DESIGN.md`、S1/S2、旧 selected v1 资源
- `brand-spec.md` 逐字节不变；SHA-256 仍为 `C1552347FD06724A45B12ACB51032A8619A94F9B3B6AA36361A824A184E6DFA1`

Soft Instruments 仍是唯一视觉系统：冷静浅色/深色/观测红画布，系统中文字体，单列紧凑仪表布局，地图、地点和数据优先；Day/Night 的选中星标只使用当前 `primary / accent-warm / accent-cyan / accent-violet`，Observation 通过同名闭合语义角色自动收敛为黑与暖红。

## 共享 Notification 组件家族

`NotificationComponent` 是唯一通知渲染与状态推进契约；Map、Spot Night、Plan 与 Settings 恢复反馈不拼接页面局部通知片段。`data-notification-tone=info|warning|error|success` 与 `data-notification-placement=inline|floating` 是正交轴，所有实例复用同一 anatomy、Tier-A 状态图形、语义角色与 160ms opacity 语法。

- inline 参与 owner 正常流；Map 的 Provider failure / stale / permission 以 `error > warning > info > success` 确定排序，一次只显示一条完整通知。`notification-residual-count` 准确披露剩余数量与 tone 汇总；当前 action 只清除自己的 state，随后显示下一条，不丢失低优先级恢复状态。
- Spot Night offline 与 Plan stale / Provider failure 使用同一 renderer；缓存夜空、静态地点、计划内容与 favorite relation 始终留在各自 owner 中。Settings 进入/退出观测红的恢复反馈使用同一 floating renderer。所有 quiet trailing action 与 floating dismiss 都保留 44px target、明确名称和非颜色严重度表达。
- floating 是 `.phone` 内的 safe-area overlay，只呈现轻量反馈，一次一条并保留 residual queue；它不参与 page、Map、SourceLift、Bottom Navigation、phone scroll 或 owner geometry。z-order 低于 active modal / SourceLift，modal active 时由 background inert contract 排除交互，也不主动获取焦点。
- `[data-od-id=notification-feedback]` 声明 tone 与 placement；共享 locator 包括 `notification-inline`、`notification-floating`、`notification-icon`、`notification-title`、`notification-body`、`notification-action`、`notification-dismiss` 与 `notification-residual-count`。Map 原 state locators、`spot-night-offline-state`、`my-plan-notification-state`、`my-plan-provider-state` 与 `my-plan-stale-state` 保持可检查。

## 首屏 Map 与连续 SourceLift

默认手机顺序仍是紧凑标题与更新时间 → Search summary → 剩余高度地图 → Map / My 安全区导航。地图保留一个 `#mapSurface[data-physical-identity]`、六个正式点、直接 drag / pinch / tap、一个紧凑 `观测条件` bar 和同图 callout；Finder 结果先回同一地图 callout，只有 callout 的有效 release、Enter / Space 或辅助功能激活才进入 Spot Detail。

`SourceLiftFocusLayer` locator 为 `[data-od-id=source-lift-focus-layer]`，状态仍是 `IDLE / LIFTING / FOCUSED / RESTORING / CANCELLED`，variant 仍是 `panelOnly / mapCoupled`。Section 26 的恢复所有权约束是：

- 打开 top layer 前，唯一 history owner 同时记录精确 outer `scrollX / scrollY`、`.phone-scroll.scrollTop` 与原 `history.scrollRestoration`；在 `pushState` 前切到 `manual`，直到 layer history traversal、live-node 原子归还与随后两个 rendering frame 全部稳定后才恢复原值。实现不调用 `scrollTo`，不以归零覆盖用户位置。
- 从 focused 到 restoring/cancelled 结束，live node 始终归 overlay/composition owner；原流只保留一个 `[data-od-id=source-lift-origin-placeholder]`。
- reverse 直接从当前 live geometry 动到 placeholder geometry，不在动画开始时把 live node 插回原流。
- 动画到达 origin 后，仅在一个 `requestAnimationFrame` 内完成 `placeholder.replaceWith(liveNode)`、清除临时尺寸与 animation、隐藏 overlay；正常采样帧不会改变 `.map-origin` 或 phone scroll geometry。
- `mapCoupled` 的 lifting/restoring/cancelled dock 使用透明、无边界、无阴影且可溢出的过渡表面，同一不透明地图可穿过 dock 返回 origin，不暴露白色/空白 focus dock。
- 所有 layer-entry 与 opener-return focus 都使用 `preventScroll`；scrim、header toggle、quiet close、Escape、system Back、快速反转、immediate cleanup 与 reduced motion 最终都收敛为一个 live node、零 placeholder/ghost、原始几何与 opener focus。

`panelOnly` 提升同一 Search summary；`mapCoupled` 提升同一物理地图。两者不 clone、不 remount，不创建第二份 viewport、selectedAt、selectedSpot、filter 或 mode store。

## Finder、Filter 与统一选择语言

Finder 仍是紧凑平面层级，提升后的 `[data-od-id=spot-finder-title-toggle]` 逐字为 `查找观星点`，公开 `aria-expanded`，并由稳定几何 chevron 承担开关反馈。focused composition 中，header 是唯一可见 Search cue；`[data-od-id=spot-finder-search-icon]` 保留为可定位但 `focused-hidden` 的装饰节点，field 移除左侧 padding reservation，程序化 field label 不变。idle compact Search source 仍显示常规 Search glyph。

Query 与 Filter overlay 继续互斥并覆盖结果而不推动结果/phone scroll geometry。Filter editor 与 title row 之间新增 8px（设计系统 `space-2` 对应的 px 载体）可见间隔。dirty-only actions 仍是透明圆形 44px target，但不再使用字体 `× / ✓`：

- `[data-od-id=spot-finder-filter-revert]`：20×20 viewBox 的 Tier-A cross path，名称为“撤销本次筛选修改”
- `[data-od-id=spot-finder-filter-commit]`：20×20 viewBox 的 Tier-A check path，名称为“应用筛选修改”

18 个终端筛选保持精确 10 + 8、相同顺序、相同 44px 以上 target、相同 opening snapshot / draft / atomic commit semantics。所有 18 个 `[data-od-id=spot-finder-filter-choice]` 与四个 `[data-od-id=map-analysis-layer-choice]` 共用 `[data-od-id=selected-card-star]`：24×24 rounded star 位于卡片右上角并由卡片边界裁掉约一半；选中仍同时有 selected border、`aria-pressed` 或 `aria-checked`、可访问名称，渐变不是唯一线索。

`杭州 + 光害 → 余杭高地草场 → same map callout`、Wanted/Other、城市 headings、历史/模糊查询、未提交 draft 丢弃、已提交状态与 result scroll 重开保持等行为继续有效。

## Spot Detail 与 Spot Night

Spot Detail identity header 保留地点名、44px 收藏、quiet `去这里 →`、唯一 `查看此处夜空`，移除了 `地点资料可用` 与 `今晚条件会变化`，也没有同义替代。今晚条件仍在 Overview 中解释；来源、更新时间、限制与设施证据仍分别位于其可解释的证据区。

`[data-od-id=spot-detail-tabs]` 保持 概览 / 攻略 / 场地 与原 state。`[data-od-id=spot-detail-tab-indicator]` 在稳定三等分几何中约 160ms 平移；`[data-od-id=spot-detail-panel]` 始终复用同一个 `role=tabpanel` 节点，新内容 commit 时先建立 `opacity:0`，再以可取消的 160ms element animation 单调淡入到 1。每次 retarget 先取消该节点的前一动画，epoch 只允许最终目标完成收尾，因此没有重叠、ghost、第二个交互/可访问 panel 或延迟回调污染；candidate 减少动态与系统 `prefers-reduced-motion` 均立即收敛。

Spot Night 仍是 formal spot child route，继承同一 `spot_id / selectedAt / timezone / freshness / mode`，并保留本地时间聚焦、观测条件、2D 天空方向、手动方向 fallback 和专业矩阵。Spot Night 已移除整张 mode-entry card，不再创建观测红入口。

## My 账户中心、Plan 与 Settings

My 根页现在是常规、冷静的移动账户中心，由 `[data-od-id=my-account-center]` 与 `[data-od-id=my-account-header]` 稳定标识。原副标题 `收藏、计划与显示偏好`、平级 `我的 / 收藏 / 计划 / 设置` tabs、对应大字 fallback、Favorite 计数/行/列表/卡片和 My/Favorites 子页均不存在。

- 标题区只显示“我的”；右上 `[data-od-id=my-settings-action]` 是一个 Tier-A gear，保持 44px borderless quiet target，并避开原生 capsule 区域。
- `[data-od-id=my-profile-summary]` 是精简未登录/profile 摘要；`[data-od-id=my-grouped-entry-list]` 只保留已授权的普通 Plan 与显示偏好入口，没有订单、优惠、会员、商业或调试模块。
- `[data-od-id=my-plan-entry]` 推入独立 `[data-od-id=my-plan]`；gear 与普通显示偏好行均推入同一个独立 `[data-od-id=my-settings]`。没有 `myTab`、伪页面切换或第二个 route store。
- `[data-od-id=my-plan-back-action]` 与 `[data-od-id=my-settings-back-action]` 均命名为“返回我的”。显式 Back、system history 与 `Alt+Left / BrowserBack / GoBack` 键盘 Back 先完成同一个 history traversal，再恢复精确 My 根 scrollTop 与逻辑 opener focus。
- Favorite relation 没有删除：Finder `[data-od-id=spot-finder-wanted-section]` 继续是“想去”浏览器，Detail `[data-od-id=spot-detail-favorite]` 继续是唯一收藏 toggle；stale / Provider failure 不会丢失 `state.favoriteIds`。

## 滚动 chrome 与 Observation Settings

所有 user-phone 长路线和 overlay 继续允许 touch、wheel 与 keyboard 垂直滚动，但 `.phone-scroll`、Finder owner、focus panel 与 matrix 在 Firefox 使用 `scrollbar-width:none`，在 Chromium/WebKit 使用零尺寸 `::-webkit-scrollbar`，不占内容宽度。页面横向滚动仍禁止。

唯一横向例外是 `[data-od-id=sky-professional-matrix]`：它可聚焦、可左右滚动、保留 sticky row labels，并隐藏原生横向 bar；右下方白色半透明 custom overlay indicator 不占矩阵高度或宽度，也不声称不存在 overflow。

`[data-od-id=observation-mode-entry]` 只在 standalone My → Settings 的 `[data-od-id=my-settings]` 内出现一次。进入观测红模式不会离开 Settings；全局 `state.mode` 切换到 Observation，Spot Night 和其他路线只消费这一个 mode store。active control 逐字为 `退出观测红模式`，退出恢复进入前的精确 Day/Night mode，同时保留 route、scroll、spot、selectedAt 与 pending context。Observation mode 现在可持久化，冷启动直接建立黑/暖红画布，并单独保存 prior Day/Night mode。

## 仍活动的旅程

- Day / Night / Observation red 与 large text / reduced motion
- Map direct gestures、Finder alternative、Query/Filter/partitions/cities/no-results/reopen/dismissals
- Conditions overlay、time preview/cancel/commit、LIGHT 静态诚实与 selectedAt 单一真相
- Callout pointer/keyboard commit 与 drag-away/pointercancel cancellation
- Formal `Map marker / Finder Wanted → Spot Detail → Spot Night`
- My account center → standalone Plan / Settings、Settings observation enter/exit、三种 Back 恢复
- permission denied、stale summary、dynamic Provider failure、offline 恢复；静态地点与 favorite identity 不因动态失败消失

## Manifest closure

U33 从 96 行增加且只增加一个 covered disposition：

- `USER-MY-ACCOUNT-CENTER-001`

机械账本为：97 unique、78 active、73 covered、1 covered-active-remainder、3 partial、1 excluded、19 inactive-superseded、0 decision-required。所有 U1–U32 disposition 原样保留；U33 只覆盖 My 账户中心、独立 Plan/Settings 路由、My/Favorites 移除与既有 favorite / Notification 所有权迁移，没有同义第二个 requirement ID。

仍诚实 partial：`SPOT-001`、`SPOT-002`、`MY-004`。`DATA-005` 继续 excluded。`USER-NIGHT-TIME-FOCUS-001` 继续 covered-active-remainder。

## Provider current-byte QA 边界

- Canonical `index.html` SHA-256：`9F7E60C1233D76D9A00800D594AF273CC9ECC5F537840DDC4E72A407286E5E31`
- 97 项 requirements canonical JSON 账本 SHA-256：`16C1D3B27D4976DEA450C772047B6469455DB6AC7A96B75B8CF20789036F62E8`
- 两段 inline JavaScript、JSON、97 个唯一 requirement ID、Notification locator/source contract、无远程 runtime URL、无旧 banner selector / instance、无 removed chip / My tabs / My Favorite / My subtitle source、`brand-spec.md` byte identity 均由当前字节静态检查覆盖。
- 真实浏览器 current-byte U33 状态测试覆盖 My 根、Plan、Settings、Map、Finder、Conditions、Detail、Spot Night 与共享 Notification。Map permission / stale / Provider 并发首条为 error，residual 为 `另有 2 条通知：1 条注意，1 条提示`，连续 action 依次推进 warning 与 info。Spot Night offline 保留缓存夜空和 matrix；Plan error → warning 保留 MY-002/MY-003 计划内容。每个 owner 同时只有一条 inline full notification；floating queue 同时只有一条 full notification。
- `320×800 / 375×900 / 430×932` × normal / large text × Day / Night / Observation × normal / reduced motion 共 36 个 My 根组合全部为 0 horizontal overflow、0 phone-scroll range、0 duplicate ID、0 unnamed action、0 open layer；subtitle、peer tabs 与 My Favorite element 均为 0。gear 为 44px，Plan row 为 60px；Firefox `scrollbar-width:none` 与 WebKit `::-webkit-scrollbar{display:none}` 保持有效。
- Plan / Settings 均为独立 child route；显式 Back、真实 system history Back 与键盘 `Alt+Left` 均恢复 My 根 `scrollTop=0` 的精确快照与 `my-plan-entry` / `my-settings-action` 逻辑 opener focus。代码同样保存任意非零 root scroll snapshot；当前简洁根页在三档 QA 视口没有产生滚动范围。
- Observation entry 在 Settings 为 1，在 Spot Night 为 0；进入后 Settings 原地保留，退出恢复 prior Night。Finder Wanted 与 Detail Favorite locator 各保留 1 个 current owner；My Favorite locator 为 0。
- Notification normal animation-duration 为 `0.16s`，candidate reduced motion 为 `0.00001s`；info/success 使用 polite status，Provider error 使用 assertive alert。Day/Night/Observation 分别绑定现有语义角色；Observation computed notification surface/title/body/border/icon 全为闭合黑/暖红值且 animation-duration 保持 160ms。
- U24–U32 回归：Finder focused 的 field icon hidden，Wanted/Other 与 city headings 保留；dirty 两个 44px target 内为 20px Tier-A SVG，Filter 与 Analysis selected state 都只有一个相同 `selected-card-star`。system Back 后 Finder 与 Analysis 均收敛到 `IDLE / 1 map / 0 placeholder / 0 open layer` 并恢复 opener；Analysis 维持 1 map、1 selectedAt、1 checked layer、map opacity 1。Detail removed-chip match 为 0、1 panel / 1 selected GUIDES；Spot Night observation entry 为 0，offline 后 Night 与 matrix 各保持 1；Detail Favorite 44px 且 Back 后仍为 1。
- 浏览器控制台 warning/error 为 0；最终为 0 external runtime、0 vertical scrollbar chrome、0 horizontal overflow、0 duplicate ID、0 ghost/open overlay、0 unnamed action。
- Provider 自检未生成或附加 screenshot；独立 external QA 对当前最终字节仍未运行，仍须在精确 retrieved bytes 上复做 frame sampling 与视觉判断，本文不声明独立通过。

这些只证明当前 HTML 候选的 provider self-QA，不是原生微信、真实 Provider/路线/设施/安全/媒体许可/设备/现场、生产 conformance、产品接受或候选选择。

执行模型：当前 agent surface 表明为 GPT-5-based Codex；更细 effective model build 与 reasoning level 未向本次运行暴露，因此不臆测。

## 文件

- `index.html`：自包含高保真交互候选与 canonical entry
- `resource-manifest.json`：Section 26 authority、U24–U31、rolling supersession、locator、状态机与 provider-only QA 账本
- `README.md`：本文件
- `brand-spec.md`：逐字节未修改的 Soft Instruments binding
