# WeChat Mini Program Field Signal I21 — Long Task 启动输入

本文件是用户要求生成的 Long Task 启动 Source 与导航索引。它让一个全新的对话在不依赖原聊天记录的情况下恢复本轮完整开发目标；它不替代 `project_context/**` 的产品/技术语义、`DESIGN.md` 的精确视觉权威、I21 正式设计交付，或 Long Task 自己唯一的 `delivery-contract.yaml`。

## 交付目标与边界

- 在仓库 `E:\dev\Starward` 当前 `main` 工作区中，把已选定的微信小程序 Field Signal I21 产品、交互与视觉约束实现到真实 Taro/React 微信小程序生产代码中。
- 目标不是只修用户最后列出的若干截图问题，而是完成当前正式闭包：5 个 Product Surfaces、9 条 current routes、62 个 material Controls，以及 handoff 声明的全部适用条件、状态、关系和验证义务；不得采样或只做默认页面。
- 期望交付状态是当前 owner-only、non-commercial trial 边界下可运行、可验证的 WEAPP candidate；不把公开发布、生产部署、平台审核或商业运营 readiness 纳入本次目标。
- 本轮已经完成 DRA、Design Authority 更新、正式设计资源生成与 formal handoff；开发不得重新开启候选选择，也不得用实现结果反向授权设计。
- 当前没有活动 Long Task 绑定。旧任务 `wechat-miniapp-v2-1-1-drift-correction` 已关闭/隔离，不得恢复；本次必须创建新的 task id、一个 Contract 和一条完整生命周期。

## Source、权威和优先级

新对话必须先读取以下完整输入，而不是只阅读本文件中的摘要。

1. 仓库与工作流规则：
   - `AGENTS.md`
   - `.codex/skills/long-task-workflow/SKILL.md` 及其按当前活动要求加载的 references
   - `.codex/skills/uiux_design/SKILL.md`
2. 核心 Context：
   - `project_context/global.md`
   - `project_context/architecture.md`
   - `project_context/context.toml`
   - `project_context/areas/main.md`
3. 微信小程序产品与交互 owner：
   - `project_context/areas/main/product-surface-contract.md`
   - `project_context/areas/main/product-surfaces/wechat-miniapp.md`
   - `project_context/areas/main/screen-contracts.md`
   - `project_context/areas/main/screen-contracts/wechat-miniapp.md`
   - `project_context/areas/main/screen-contracts/wechat-miniapp/surfaces-and-controls.md`
   - `project_context/areas/main/screen-contracts/wechat-miniapp/map-and-finder.md`
   - `project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md`
   - `project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md`
4. 技术、开发与验收 owner：
   - `project_context/architecture/runtime-and-domain.md`
   - `project_context/architecture/assurance-and-lifecycle.md`
   - `project_context/areas/main/implementation-index.md`
   - `project_context/development-workflow.md`
   - `project_context/development-workflow/authority-and-scope.md`
   - `project_context/development-workflow/development-feedback.md`
   - `project_context/development-workflow/candidate-acceptance.md`
   - `project_context/development-workflow/paths-and-lifecycle.md`
   - `project_context/development-workflow/change-admission.md`
   - `project_context/areas/main/verification.md`
   - `project_context/areas/main/verification/development-loop.md`
   - `project_context/areas/main/verification/acceptance-runtime.md`
   - `project_context/areas/main/verification/wechat-device.md` 及其被当前任务触发的子节点
5. 唯一当前 Mini Program 视觉权威：
   - `DESIGN.md#wechat-mini-program--sky-canvas-field-signal`
   - active system target：`target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02`
6. 已选定 I21 implementation constraint：
   - target key：`target-miniapp-field-signal-i21-selected-constraint-2026-09-03`
   - formal handoff：`docs/design-resources/miniapp-field-signal-i21-selected-2026-09-03/selected-handoff/miniapp-field-signal-i21-current.md`
   - canonical entry：`docs/design-resources/miniapp-field-signal-i21-selected-2026-09-03/selected-source/index.html`
   - dependency closure：`selected-source/assets/styles.css`、`selected-source/assets/app.js`
   - Fact manifest：`selected-source/miniapp-fact-manifest.json`
   - Control→library/component/owner/adaptation：`selected-source/implementation-handoff-spec.json`
   - feasibility：`selected-source/miniapp-implementation-feasibility.json`
   - current-requirement reconciliation：`selected-source/proposal-reconciliation-index.md`
   - selection/QA：`selected-source/selection-and-qa.md`
   - authority assessment：`selected-source/authority-delta.json`
   - immutable resource integrity：`selected-source/miniapp-resource-integrity.json`

权威冲突时按以下顺序 fail closed：用户在本任务中的最新明确要求 → owning `project_context/**` 产品/技术语义 → `DESIGN.md` 精确视觉语义 → I21 selected constraint 的具体组合与资源事实 → 当前代码作为实现现状。旧候选、旧 source、早期截图和历史 DRA 输出只可作为审计 provenance，不得成为 fallback、兼容 UI 或第二真相源。

## 正式设计资源身份

- formal handoff SHA-256：`52a39d6e7bfbbca155a3c64acf7b67fa96b3bc57ae5fac5d3d42bee2d77a7fad`
- canonical `index.html` SHA-256：`b30d751f852b5b978c84759a99762cd61201d25faf3e0bda77c5097690a88c60`
- V1 Fact manifest SHA-256：`5ce8caf4ebae76de8481f4eaedf54f50678480eff5c44923e65d8940305a1bc7`
- implementation feasibility SHA-256：`2e2be229ce7535f8d9ea6eb4cdada590cda9b9796ddfcc3636814e0748f68f94`
- implementation handoff spec SHA-256：`f71c01fba8d2edb70d9f584f81e7b077e9c1032e89dcc4668c57fbfbf092f9eb`
- Authority Delta SHA-256：`df851d2e2ec16d9c67caed10c960dd4a051345cd04bcdb374c3c4e0ccc057b9c`，结论为 `consistent_with_current_authority`
- 闭包规模：5/5 Product Surfaces、9/9 current routes、62/62 material Controls、72 subjects × 8 dimensions、15,696 Fact Cells、72 facts、72 proofs、0 unresolved、0 design acceptance blockers。
- 该 target 的分类是 `constraint`，不是可由静态原型自动证明的 pixel-exact production target。资源 preflight 证明输入闭包与完整性，不证明生产 WEAPP 一致性。

Long Task 在 Contract Preflight 前必须重新运行：

```powershell
ty-context design-resource preflight docs/design-resources/miniapp-field-signal-i21-selected-2026-09-03/selected-handoff/miniapp-field-signal-i21-current.md
```

## 当前产品范围

### Surface 与 route

- `miniapp-map-discovery`：`pages/map/index`、`spot/search`
- `miniapp-sky-orientation`：`sky/detail`
- `miniapp-my-library`：`pages/my/index`、`plan/detail`、`settings`
- `miniapp-profile-content`：`profile/links`、`content/import`
- `miniapp-contribution-intake`：`content/contribution/index`

Map 与 My 是仅有的 primary destinations；其他 current routes 都是 drilldown。完整 62-Control 集合以 `implementation-handoff-spec.json` 与 owning Screen Contract 的集合相等为准，不能用本摘要替代。

### 全局密度、内容和反馈

- 先落实 `DESIGN.md` 中本轮已更新的 Mini Program 设计系统，再实现页面；所有页面共同达到“小巧、精致、信息密度高但密而不挤”。字体、层级、控件可见尺寸、间距、分割与留白必须遵守已选 token/geometry，不可在页面中各自猜值。
- 日间 page canvas 为纯白；不得恢复偏黄底色、深蓝大块、过大字号、过厚边框、过度圆角卡片墙或无意义留白。
- 手机端所有 scroll owner 隐藏 scrollbar chrome，但触摸、滚轮、键盘、程序化和屏幕阅读器滚动能力必须保留。
- 删除无动作价值的“操作说明”和实现/数据状态噪音，例如“方向跟随中”“部分数据”“同一地图·一个分析图层·本地时间”等。只有具体影响用户判断、动作或恢复的状态才显示；完整 provenance/freshness 仍通过既有 disclosure 可达。
- 所有正常切换、显示、退出与状态互斥都使用由操作/数据因果驱动、可中断、可反向的 motion；不得突然消失、抖动、闪烁、remount 或靠排队 timeout 拼动效。Reduced Motion/Transparency 使用相应替代。
- 无合法、有效、可用图片时不渲染图片 node、placeholder 或预留空位。普通未知/未提供值统一显示 `暂无数据`，但 loading、permission、stale、error、not-applicable 与 safety 状态仍保持不同的模型、反馈与恢复路径。
- 产品只展示客观事实；当前 spot panel 不使用“谨慎出发”“推荐窗口”等暂未采纳的结论性逻辑，也不把未知事实处理成肯定结论。
- 所有重要 action 使用至少 `88rpx` 语义 touch target；适配 320/375/390/430 CSS-pixel equivalents、safe area、100%/200% text、day/night/observation、touch/keyboard/screen reader。

### Map、Search 与结果

- Map 上 Search 是一个稳定 floating field。进入 `spot/search` 前后，field 的位置、尺寸、fill、border、radius、文字/placeholder、typography 和输入原点不变；仅 leading Search glyph 交叉变成具名 Back，下面的页面内容因果展开。
- Search 进入后 autofocus；outside tap 可以 blur、收 IME、关闭 suggestions，但不能困住焦点或离开 Search，之后仍可再次 focus。
- 不显示 trailing `x`。leading Back、WeChat/system Back 与平台 edge-back 返回原 Map，并反向播放同一过渡。
- suggestion rows、无标题 filter choices、`想去`/`其他观星点` partitions 与 result rows 使用紧凑节奏；filter 紧贴 Search，删掉无效“筛选条件”标题和 divider。展开/收起不抖动、不闪烁，稳定 partition 不改变无关几何。
- 有有效 media 的 result card 使用全宽卡片和固定约 52% 的 leading readable field；左侧仍透出低对比图片，不得变成不透明 slab。无图保持同一内容几何但不产生 media node。
- 整张 result card 是唯一选择 action；选择后返回原 Map、保持原 Map instance/state，并打开新 spot 的 medium panel。

### Spot information panel

- 首次点选 marker 或 Search result 时默认打开 `medium`。点非 marker 地图空间时从 live position 平滑退出，完成前保持 hit/semantic surface，不能瞬间消失。
- `visibility = hidden | visible` 与 `extent = small | medium | large` 分开建模。三个 visible extents 始终挂载同一份、同序、同 identity、同 mapping 的 objective document；extent 只裁剪 viewport，只有 large 开启这份 document 的唯一 vertical scroll。禁止 per-extent render tree、remount、重排或重复业务 mapping。
- Large 填满 primary navigation 上方的 nav-safe content viewport，表现为 page-like surface，不覆盖 Map/My 底部导航。左边缘 `32rpx` 右滑或 handle 下拉执行 `large → medium` Back 语义，并保留 selected spot、section 与 meaningful scroll；另有具名非手势等价路径。
- 只有 `map-spot-panel-handle` 的 `104×40rpx` 小长方形物理区域可以发起 vertical extent drag；panel body、content、media 与泛化 top edge 都不能。Pointer down/press 只反馈，未越过阈值松开必须 no-op；拖动从 live position 接管。
- 无 media 时保持紧凑 `40rpx` handle band；有 media 时 handle overlay 在图片上，独立 band 不占高度。禁止拖动时内容顶到最上方、出现大片空白或 handle 点击即变档。
- Valid licensed media 在 small/medium 不占区域，只在 medium→large 过程中先从 document 顶部连续拉出；图片达到完整区域后，接近屏幕顶端时 Map Search、location 与 layer trigger 才渐隐。反向先恢复 chrome，再收起 media。
- Floating `概览/天文` section rail 不占 content width，固定在 panel visual viewport 垂直中点；容器上下与两个按钮贴紧、gap=0、无右侧/深蓝阴影、无位移。Active 仅使用极浅 sky-soft。
- 底部 `想去/分享/云观星` action pill 使用当前短小 geometry，三项等宽、icon 比例一致；rounded favorite star 复用同一 `SemanticIcon` source。Action rail 与 panel 都不得遮挡 primary navigation。
- Spot document 的客观顺序、route/access/facility/safety、guide/source 与 astronomy sections，以 owning Screen Contract、`DESIGN.md` 和 62-Control handoff 为准；不可恢复独立 Spot Detail/Spot Night、tabs、第二地图、duplicate actions、推荐窗口或 noise rows。

### Layer selector 与 Curved Time Ruler

- Map 只有一个 `bottomPresentation = none | spot-panel | layer-sheet` coordinator，不能使用两个 parallel booleans。打开 layer 时 spot presentation/active 退出，但 selected spot 与 previous extent 留在模型；layer open 时点 marker/result 必须直接 retarget 为新 spot medium，不先恢复旧 panel，也不得出现两个 active 或跳动。
- Layer selector 是固定高度 bottom sheet，不从右侧展开；无 drag handle、`x`、“关闭图层”或独立左下 `观测条件` 卡。只保留 `光污染/总云量/观测机会` 三个 Source-supported、本地生成/自有 image-backed choice cards。Active 使用最浅 sky treatment 且不改变 geometry。
- Layer sheet 内的 factual summary 合并 current local time、selected analytical layer 与 objective value；普通 base map 不是可关闭 layer。
- Shared Curved Time Ruler 上移并贴近它影响的数据/sky projection；无 visible arrows、outer card、border、shadow 或操作说明。它必须在 Taro/WEAPP enhanced horizontal `ScrollView` 上真实横向拖动，fixed center preview 真实 slice，release snap/commit 一个 valid slice；项目层只拥有 curved projection/snap。
- Panel vertical drag、ruler horizontal drag 与 Map pan/pinch 在越过方向阈值后由一个 owner 独占，不得 mid-gesture 转移。

### Full-sky orientation

- `sky/detail` 只接受 formal `spot_id` context，使用 full-sky canvas、quiet Back、真实 target marks/labels、底部 Curved Time Ruler，以及仅在影响可用性时出现的 recovery/object disclosure。
- 删除顶部无意义 header/status card 与普通“方向跟随中”提示；sensor 成功状态不占视觉空间。Canvas 延伸到 safe areas，chrome overlay 不把天空压成 card。
- Orientation permission、sensor unavailable、recovery 和 accessibility 必须保持真实状态边界，不能用 prototype 或固定值伪装成功。

### Settings、My、Plan/Profile/Import

- Settings 的显示模式只有一个 `display-mode-switcher`，值域 `day | night | observation`，默认 day；不得使用 day/night tabs 再叠加底部 observation CTA，也不得用二值 Switch 冒充三态。
- 三站 track 支持点击任意站、相邻水平拖动、键盘与 screen-reader direct choice；Sun→Moon→Star 使用因果交叉动画。进入 Observation 前先原子绑定 closed black/warm-red tokens，不能闪出蓝/白。
- My 保留现有职责，重排为紧凑 account hub、Plan/Contribution utility group 与短 routine list；用克制的 role-colored `SemanticIcon` tiles 提升扫描性。不得添加商业 banner、会员/订单/钱包、彩虹卡片墙或假统计。
- Plan、Contribution、Profile Link、Import、Settings 保持既有 child route、真实状态与恢复；返回 My 时保留有意义 scroll/opener focus。`想去` 浏览仍归 Search，不能在 My 创建第二份 favorite truth。

### “观星点信息提交”/Contribution form

- `content/contribution/index` 是一份单一、紧凑、keyboard-safe 的 vertical scroll document；Spot panel 与 My 两个入口复用同一个 form/state owner，不创建第二页面逻辑、wizard 或平行 form store。
- 从 formal spot 进入时显示 quiet context row；从 My 进入时同一位置提供“选择观星点 / 新地点”。只有 new-place proposal 才挂载 location consent/location fields，existing-spot report 不请求当前定位。
- 信息顺序固定为 report kind + spot context → affected topics + observed time → concise evidence narrative → conditional location → bounded media + rights → one final submit；提交后由既有 status list 展示真实 pending terminal state。
- 简单字段使用 divider-backed compact cell rows，复杂/多行/topic/media 使用 top-label groups；只在真实 group 间保留 spacing。Helper/error/privacy/rights/location/upload recovery 仅在适用时出现，不预留空高；320px/200% text reflow 为 stack，无横向页面滚动。
- Media cell 同时承载 thumbnail/progress/retry/remove，达到上限后移除 add affordance，不显示占位。上传失败重试保留 form draft 与已成功 media identity。
- Inline validation 聚焦/滚动到第一个 invalid field；IME/keyboard 不能遮挡 focused field 或唯一 submit。Duplicate submit 被阻止，重试使用同一 idempotency identity；成功只表述“已提交，等待审核”等真实状态，并在 restart 后可读回 pending receipt，不能声称已发布/已核验。
- 生产 API、upload transport、moderation 与 publication completeness 继续由 `packages/miniapp-contracts/**` 和 `workers/miniapp-api/**` 的既有 owners 管理；UI 不得直接调用 provider、绕过 moderation/publication gate 或用 local state 伪造 durable success。

## 技术架构与实现方案

### 当前 owners 与依赖方向

- 生产 UI root：`apps/wechat-miniapp/**`，Taro `4.2.1` + React `18.3.1`；真正目标是 WEAPP，不存在 H5 生产代理。
- shared API/domain boundary：`packages/miniapp-contracts/**`。
- Mini Program BFF、contribution、media、moderation 与 persistence：`workers/miniapp-api/**`。
- Visual projection：`DESIGN.md#wechat-mini-program--sky-canvas-field-signal` → 一个 Mini Program adapter/token projection → Mini Program shared/page components。不得导入 native App token module。
- Product state/control ownership保持在现有 `app-store`、route/presentation coordinators、form draft、validation、upload/idempotency owners；通用 UI 库只提供 mechanics。

主要生产路径按 formal implementation handoff 绑定：

- navigation：`apps/wechat-miniapp/src/components/custom-nav.tsx`
- notification/recovery：`apps/wechat-miniapp/src/components/status-panel.tsx`
- Map/Search/panel/layer/ruler 与 panel 内 astronomy：`apps/wechat-miniapp/src/pages/map/index.tsx` 及其现有 adjacent modules/styles
- Full-sky：`apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx`
- My/Plan/Profile/Import：`apps/wechat-miniapp/src/features/my/my-library-page.tsx` 及 current route wrappers
- Settings：`apps/wechat-miniapp/src/content/settings/index.tsx` 及 adjacent modules/styles
- Contribution：`apps/wechat-miniapp/src/content/contribution/index.tsx`、`contribution-form-*`、`contribution-media-history.tsx`、`contribution-model.ts`、`use-contribution-*`
- tokens/icon assets：`apps/wechat-miniapp/src/styles/tokens.scss`、`components/semantic-asset.tsx` 与现有 asset pipeline

可以沿稳定责任边界提取/重构 shared components，但不能创建第二页面树、第二 state owner、第二 token source、第二 form store、第二 bottom-presentation owner或 legacy/current 双路径。若实现发现 durable product、state、API、dependency 或 verification 语义必须变化，先更新 owning Context/Design Authority，再走 Long Task protected revision；代码现状不能静默改写 Source。

### Build / Reuse / Buy 决策

- 首选通用组件 substrate 是固定并记录 license 的 `@taroify/core@1.0.6`，按组件 import/style import，并置于一个 Starward-owned adapter/ConfigProvider/CSS-variable projection 后。DRA 只完成 research qualification，尚未在 production package 中安装。
- 生产采用前必须证明 package/lockfile、license、Taro/React peer compatibility、WEAPP 运行、IME/safe-area、screen-reader/a11y、gesture/scroll-lock、tree shaking 和 bundle delta；记录 pre-library baseline 与 imported entry points。
- 显式映射：
  - shell：`Tabbar`
  - Search/suggestions/filters：`Search`、`Cell.Group`/`Cell`、`Checkbox.Group`
  - layer：`Popup(placement=bottom)`
  - compact rails：`Sidebar`、`Button.Group`/`Button`
  - Settings/My：`Radio.Group`、`Cell.Group`/`Cell`、ordinary `Switch`（仅二值语义）
  - Contribution：`Form`、`Form.Item`、`Form.Feedback`、`Field`、`Input`、`Textarea`、`Radio.Group`、`Checkbox.Group`、`DatetimePicker` + `Popup`、`Uploader`、`Progress`、`Button`
  - short async acknowledgement：仅在 `notification-feedback` 已定义语义时使用 `Toast`
- `SemanticIcon`/`semantic-asset.tsx` 是唯一 icon extension point；不得安装 `@taroify/icons`。Product-specific celestial glyphs、rounded favorite star 与 layer artwork 使用现有本地/生成资产 pipeline，不用 runtime remote imagery。
- Spot panel 只有在真实 WEAPP spike 证明 anchors、`contentDraggable=false`、精确 `104×40rpx` handle-only drag、three extents、nav-safe max height、interruptibility 与 nested-scroll arbitration 后才采用 Taroify `FloatingPanel`。失败时在同一 adapter 内退回 Taro enhanced `ScrollView` + existing coordinator；不能 fork library、放大 drag region 或改变语义。
- Curved Time Ruler 始终复用 Taro/WEAPP enhanced horizontal `ScrollView` mechanics；Picker、generic Slider、React-Native-only ruler package 不等价。
- 禁止第二套通用 UI suite、library brand defaults、runtime CDN assets、平行 library form store，以及让组件库接管业务/权限/恢复/acceptance state。TDesign 只能在某个孤立 primitive 经单独兼容性证明后成为 bounded fallback，不能作为并行 suite。

## 推荐的 Long Task Outcome 边界

Contract author 必须从完整 Source/Fact/Control closure 推导最终 Outcomes；以下仅给出纵向、可观察、可独立诊断的推荐边界，不能用来缩小 62-Control 范围。

1. Map 用户可以从 stationary Search 或 marker 选择 formal spot，并在同一 Map/state 上完成 medium→large panel、layer/time、favorite/share/cloud-stargazing 与平滑退出。
2. Full-sky 用户从 formal spot 进入 `sky/detail`，在真实 permission/sensor 状态下使用目标投影与共享 Curved Time Ruler，并可恢复/返回。
3. My 用户在 compact account hub 中进入 Plan、Contribution、Profile/Import 和 Settings，并用唯一三态 mode owner 保持状态/返回连续性。
4. Contribution 用户从 Spot 或 My 进入同一 form，完成条件字段、校验、媒体恢复、幂等提交并在重启后读回 pending 状态。
5. 一个当前 WEAPP candidate 在完整 visual/state/accessibility/motion/viewport/mode closure 下遵循单一设计 token/component/state owners，并通过全部声明的工程与验收检查。

Shared substrate、token adapter 和组件提取属于这些用户结果的实现支撑，不应只为文件数、技术层或并行 worker 单独制造 Outcome。

## 验收与证据边界

### 必须覆盖的用户旅程

- Cold start Map → Search autofocus → suggestion/filter/partition → outside blur/refocus → Back/edge-back → result selection → medium panel。
- Marker → medium panel → handle-only small/medium/large → media/no-media 两支 → internal scroll → section rail/action rail → large edge-back → non-marker animated hide。
- Spot panel ↔ layer mutual exclusion、layer active、layer→new marker direct retarget、Map/system Back recovery。
- Layer time ruler 和 sky ruler 的 real drag/preview/snap、nested gesture arbitration、keyboard/assistive increment。
- Day↔night↔observation 的 tap/drag/keyboard/screen-reader 路径与无 blue/white flash。
- Spot→Contribution 与 My→Contribution 两入口、existing spot/new place 条件、validation/IME、media fail/retry、duplicate submit、restart pending readback。
- My/Plan/Profile/Import/Settings current routes、back focus/scroll recovery 和共享状态不重复。
- 320/375/390/430、100%/200% text、day/night/observation、normal/reduced motion、normal/reduced transparency、media/no-media，以及适用的 loading/empty/partial/stale/offline/error/permission/success。

### 项目检查入口

Contract 必须把检查绑定到最小真实 causal paths，并在最终 candidate 上重跑。至少审查并按实际触发声明：

- `npm run check:miniapp:fast`
- `npm run build:weapp --workspace @starward/wechat-miniapp`
- `npm run test:miniapp:current`（包含真实 DevTools 边界，不能在不具备前置条件时伪报通过）
- `npm run design:system:verify`
- `npm run design:lint`
- `npm run test:miniapp:design-bindings`
- `make validate-context`
- `make validate-harness`
- `git diff --check`
- 由 owning acceptance/device Context 要求的 cold-start WEAPP、DevTools 与代表性设备检查。

Browser/H5、selected prototype、静态 HTML markers、screenshots、Context prose、测试自报成功或 handoff preflight 都只能做诊断/输入闭包证据，不能证明真实 WEAPP gesture、IME、safe-area、accessibility、sensor、device 或 production persistence。Long Task 当前 package observer 无法 machine-close 的 browser/native/device/layout/pixel/accessibility/motion 义务必须保留为精确、target-blocking External Confirmations，不能偷换成近端 proxy。

## Architecture Deliberation seed

- Owners/source of truth：产品、route、state、recovery 和 acceptance 在 owning Context；视觉值在 `DESIGN.md`；I21 selected package 约束 composition；生产实现分别位于 Mini Program app、contracts 与 BFF owners。
- Selected design：在唯一现有 production tree 中使用一个 Starward adapter 吸收 `@taroify/core` 通用 mechanics，保留现有 SemanticIcon、state/coordinator/form/API owners；不同 panel extent 只裁剪同一 document。
- Material alternatives：纯现有 Taro/Starward primitive 是兼容 spike 失败时的合法 bounded fallback；Taroify 是满足当前 reuse-first 与维护成本条件的首选。第二 UI suite、复制库品牌、fork FloatingPanel、并行 legacy/current UI 或让 library 持有业务 state 均不是合法方案。
- Dependency/lifecycle：UI library 只能向 Starward adapter 依赖；adapter 消费 Mini Program DESIGN profile；pages/features 消费 adapter 与现有 stores/ports。Panel、layer、search、ruler、mode 和 contribution 都有单一状态/gesture/commit/recovery owner。
- Future-change challenge：若未来采用 I22 或替换组件版本，必须发布新的 immutable design target/record，并仅替换 adapter 内的 mechanics；route、Control key、product state 与 acceptance contract 不应因库替换而变化。
- Debt disposition：当前 UI 与 I21 authority 的差距是本任务要消除的 debt。允许为稳定 owner 和模块可维护性做必要提取；不得新增 oversized owner、重复 truth、临时兼容 UI 或无 removal condition 的 waiver。
- Always-evaluated quality：correctness/invariants 由单文档身份、单 bottom enum、幂等 submit 与真实 state distinctions 保证；maintainability/changeability 由单 adapter、stable owners 和无平行路径保证。
- Triggered quality：gesture/resource lifecycle、state consistency、bundle/performance、privacy/location/media、安全/发布边界、Taro/WEAPP compatibility 与 operability/testability 都是 material；各自必须绑定具体 project check、runtime observation 或诚实 External Confirmation。
- Unknowns to resolve by bounded evidence：`@taroify/core@1.0.6` 在当前 lock/peer/license/WEAPP/bundle/IME/safe-area/a11y/gesture 条件下的真实适配；FloatingPanel 是否满足精确 handle/nested-scroll；当前设备/DevTools 能否观察全部目标条件。失败选择既有 bounded fallback，不改变产品语义。
- Context Delta 预期为 `none`，因为 durable product/architecture/design 已先更新；若实现发现必须改变 durable owner、API/schema/state/dependency/verification 语义，则改为 `required`，先更新 owner，再进行 protected Authority Revision。

## 禁止事项与授权边界

- 不恢复旧 Long Task，不创建第二 Contract，不把本文件变成第二 Context/Design Authority。
- 不 reset/checkout/clean 当前 dirty worktree；DRA 产生的已修改和未跟踪 Context、Design、resource、verification 文件是当前任务输入。先读 `git status --short --branch` 与实际 diff，保护无关用户改动。
- 按仓库规则直接在当前 `main` 工作区收敛；不要自动创建 feature branch 或 worktree。Long Task 为 Final Gate 所需的本地 candidate commit 可以创建，但不得 push、开 PR。
- 第一次 Authority Lock 返回 model checkpoint 后，严格停止所有产品实现、编辑、build 和 test；按 Skill 要求向中文用户只发送指定句子，等待下一条精确回复后再继续。
- 不执行 Mini Program upload、AppID migration、review submission、public release、远端 staging/production deployment、购买/升级服务、生产流量或不可逆生产 mutation；这些需要另外明确授权。
- 不改变 provider/basemap/tile/native-map 的外观或能力来“匹配原型”；它们在 selected visual authority 之外。
- 不伪造图片、天气、路线、定位、sensor、上传、审核、发布或持久化成功；fixture 只可经现有 adapter 用于明确的测试场景。
- 不用静态截图、H5、prototype、自报 JSON 或历史运行结果关闭能在真实 target 上独立失败的义务。

## 新对话应执行的 Long Task 顺序

1. 用户用下方 prompt 显式选择 `$long-task-workflow`；新任务读取本文件、全部 owning Source/Context、完整 selected handoff 和当前 diff。
2. 在同一个 `delivery-contract.yaml` Draft 中把本文件作为 revised initial proposal/Material Source，纳入正式 handoff 与 immutable canonical resources；完成 Source inventory、markers、semantic Fact manifest、Control 22-field closure、relations、applicability、Outcomes、Checks/Assertions/External Confirmations。不得创建第二份中间 plan。
3. 重新完成 repository-bound Architecture Deliberation 与 `Context Delta` 判断；先运行 design-resource preflight，再运行 Long Task preflight，修复所有 unreachable/decision-required/closure 问题。
4. 只有 Source、Contract、Context、design closure、repository scope 和 proof bindings 完整后才 Compile/Authority Lock。
5. 第一次 Compile 后遵守不可跳过的 model checkpoint；该回合不改代码、不 build、不 test。
6. 用户精确解除卡点后，按 Long Task packet-first 规则实施、集成、做 cheap/warm/targeted feedback；所有 proof-bearing 结果回到当前 verification workspace。
7. 完成 current code、Context、tests 与 clean candidate commit 后，运行唯一 source-recompiled Final Gate；不并行运行默认 Workflow Contract conformance。无法由 machine observer 建立的目标事实保持 blocking external，不做虚假完成声明。

## 可直接粘贴到新对话的启动 Prompt

```text
$long-task-workflow

请在 E:\dev\Starward 当前 main 工作区启动一个全新的 Single-Goal Long Task，完成微信小程序 Field Signal I21 的真实生产实现与当前 owner-trial WEAPP candidate 验证。完整启动 Source 与导航索引是：
E:\dev\Starward\.codex\work-items\wechat-miniapp-field-signal-i21-long-task-input.md

必须完整读取该文件列出的 owning project_context、DESIGN.md、I21 formal design-resource handoff/canonical closure、implementation mapping、当前 production code 与当前 dirty diff；范围是正式闭包的 5 Surfaces、9 routes、62 Controls 和全部适用条件，不得只做摘要中的示例。把本文件作为 revised initial proposal/Material Source，与 formal handoff 一起进入同一个 delivery-contract.yaml Draft，按 long-task-workflow 完成 Source/Contract/semantic/design closure、Architecture Deliberation、design-resource preflight、Contract preflight、Compile、强制模型切换卡点、实现、当前候选验证和唯一 Final Gate。

不要恢复旧任务 wechat-miniapp-v2-1-1-drift-correction；当前应为 active_task_missing。保护已有 dirty worktree，不 reset/checkout/clean；直接在 main 收敛，不自动创建 branch/worktree，不 push/开 PR。不得执行 upload、AppID migration、review submission、public release、远端部署或购买。第一次 Authority Lock 后必须停在 Skill 规定的模型卡点，不能提前改产品代码、build 或 test。
```
