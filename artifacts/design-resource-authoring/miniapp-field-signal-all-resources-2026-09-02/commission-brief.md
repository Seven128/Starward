# Open Design Commission Brief — Starward 微信小程序统一内容流与紧凑表单候选

> Commission class：style-bearing / critical material revision / interactive prototype candidate。
> Provider boundary：只修改既有 Open Design task project 的五个候选文件；不得编辑仓库、选择方向、冻结资源、生成正式 handoff 或声称生产合规。
> Owner lifecycle：主 DRA 流程会在独立审计通过后按用户授权自行完成 selection/freeze/formal handoff；provider 不承担该决定。

## 1. 目标与范围

在同一个 Starward 微信小程序全量交互原型候选中，逐项落实 I21 的 13 项反馈及其直接依赖：

1. Spot panel 三档挂载同一份、同序、同 identity 的 objective document；extent 只裁剪同一内容。合法图片只在 medium→large 拉出。
2. 缩短 `想去/分享/云观星` action rail；普通缺失值统一显示`暂无数据`，内部状态语义不得折叠。
3. `概览/天文` section rail 的两个按钮与 outer pill 上下边贴紧，gap=0。
4. Curved Time Ruler 上移、无外框、无左右箭头并可真实横拖、preview、snap、commit/cancel。
5. Search entry 与 route 中可见字符串/外框/位置不变；suggestions、filters与partition节奏更紧凑且“密而不挤”。
6. medium→large 先拉出图片，接近顶部后再淡出 Search、Location、Layer controls。
7. 无图保留compact handle band；有图时handle覆盖image；只有`104×40rpx`小长矩形热区启动extent drag。
8. `spot-panel`与`layer-sheet`使用一个互斥bottom-presentation枚举，任何帧只允许一个visible/active；layer→marker直接到new spot medium且不跳。
9. Active soft使用更浅的`#F5F6FF`并辅以内边界/indicator/checked state。
10. Settings只保留一个可点击/拖动/键盘操作的day→night→observation三态track，以Sun/Moon/Star做因果动效；退休独立observation CTA。
11. My只重排既有职责，进一步紧凑，并以克制的语义彩色icon tile提高扫描性。
12. 重新组织“观星点信息提交”表单：以divider-backed field cells、必要的top-label complex groups、就地校验/上传恢复和唯一final submit实现“小巧、精致、信息密度高但密而不挤”，同时保留既有draft/upload/idempotency/privacy/rights/moderation语义。
13. 通用控件采用成熟组件库reuse-first：设计viewport只展示Starward UI/UX；README/coverage外层明确“library / component / Starward adaptation”。下一步production默认使用`@taroify/core`对应组件并由一个Starward adapter投射exact tokens与语义，不复制library品牌外观、不引入第二icon/form-state/UI truth；无等价组件时才用Taro平台原语或bounded thin composition。

“全量”是覆盖边界：五个stable Product Surfaces、62个current material Controls，以及适用route/state/mode/viewport/text/a11y/motion都必须可达和可审计；不是任意重做页面。不得新增产品职责、字段、图层、算法、API、商业模块、第三方品牌内容或假数据。

## 2. Exact authority binding

- Design-system ID：`user:starward-mini-program-sky-canvas-field-signal-revision`。
- Stable target：`target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02`。
- Canonical owner：`E:\Dev\Starward\DESIGN.md#wechat-mini-program--sky-canvas-field-signal`。
- Exact-value base：`E:\Dev\Starward\docs\design-resources\miniapp-design-system-2026-09-02-sky-canvas-field-signal\selected-source\DESIGN.md`，SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e`。
- Current component/layout source：`E:\Dev\Starward\docs\design-resources\miniapp-field-signal-unified-flow-forms\selected-source\DESIGN.md`，SHA-256 `0fd87614b7d80c8d3f3c880fe39e81c9b7beda89f41e8492e4c113022eda4dd4`。
- Canonical section：57,582 chars / 85,819 UTF-8 bytes / SHA-256 `086088d3f54d4bcede978fa0d4c09002bd8660dab0294536106b8e8459f706fa`。
- Provider exact body（heading + LF + trimmed section + one LF）：57,631 chars / 85,870 bytes / SHA-256 `53eaac22d20d7b2a3b2bd501c1199558f9601d1afc5ed611d4e5ef7518c8a99d`。
- Formal run前structured body、registry root、linked system project与run-resolved body必须逐字节一致。
- Unified-flow-modes、compact-continuity及更早component sources只作immutable audit provenance，不能成为generation dependency、fallback、compatibility UI或inspiration。

全局精确视觉继续服从根Design Authority：

- Day canvas/surface=`#FFFFFF`；局部subtle=`#F6F7F5`；active soft=`#F5F6FF`。Night低色度近黑；Observation严格closed black/warm-red，过渡不得闪白/蓝/黄/绿/中性灰。
- Type roles：conclusion 18/25、page 17/23、section 13.5/19、body 12/17、ordinary 11.5/16、compact 10.5/14.5、metadata 10/14、status 9.5/13.5、final 12.5/17 CSS px/line-height；中文letter-spacing=0。
- Generic visible glyph=`22/24/28rpx`；可见尺寸与≥`88rpx`/44px semantic target分离。不得为命中区放大文字、icon、surface或边界。
- 320/375/390px content inset=`24rpx`，430px=`32rpx`；related 6–8rpx、group 10–14rpx、section 18–24rpx。先移除无效chrome，再以baseline、weight、alignment、必要divider建立层级。
- 所有material surface/state change有因果、可中断、可反向并从live presentation retarget。Reduced motion取消装饰travel/rotation/spring，但保留直接操控、snap和明确状态。
- Generic glyph只经`SemanticIcon`和已记录local asset pipeline；禁止`@taroify/icons`、第二icon/token/UI system、runtime remote asset或未审license素材。
- Open-source UI research同时形成production reuse mapping。候选继续只展示当前Field Signal tokens/common families，不运行或模拟第三方runtime；README/coverage必须说明`@taroify/core@1.0.6`是当前research-qualified preferred substrate、Ant Design Mobile只作规范参考、TDesign native只作隔离fallback、Taro primitive承担语义独有控件。不得复制任何library品牌视觉、CDN或默认form state。
- Phone viewport不显示date/revision/version/vN/旧版/新版、demo/fixture/reviewer/debug/resource-generation copy或操作/实现说明。

## 3. Product and Screen sources

只从以下current sources读取产品、route、Control、state、recovery与accessibility：

- `E:\Dev\Starward\project_context\global.md`
- `E:\Dev\Starward\project_context\areas\main.md`
- `E:\Dev\Starward\project_context\areas\main\product-surfaces\wechat-miniapp.md`
- `E:\Dev\Starward\project_context\areas\main\screen-contracts\wechat-miniapp.md`
- `E:\Dev\Starward\project_context\areas\main\screen-contracts\wechat-miniapp\surfaces-and-controls.md`
- `E:\Dev\Starward\project_context\areas\main\screen-contracts\wechat-miniapp\map-and-finder.md`
- `E:\Dev\Starward\project_context\areas\main\screen-contracts\wechat-miniapp\spot-and-sky.md`
- `E:\Dev\Starward\project_context\areas\main\screen-contracts\wechat-miniapp\shared-state-and-recovery.md`

Primary navigation只有Map/My。五个stable Surfaces：

1. `miniapp-map-discovery`：Map + `spot/search` child + spot panel + integrated layer/condition/time/source controls。
2. `miniapp-sky-orientation`：panel `云观星`进入的`sky/detail` full-sky child。
3. `miniapp-my-library`：account hub + Plan/Contribution/Settings；Favorite只属于Search/panel relation。
4. `miniapp-profile-content`：safe links/import/draft/rights/association/moderation。
5. `miniapp-contribution-intake`：spot context/kind/topics/time/evidence/rights/location/media/durable submit/status。

Retired routes/controls必须absent：`spot/detail`、`spot/sky`、`sky/professional`、`sky/targets`；Finder Sheet/callout；Detail/Night tabs；quick/more/advanced draft filters；right expanding layer rail；`observation-mode-control`；任何compatibility entry。

## 4. Complete current material Control inventory — 62

- Shared 5：`mini-primary-navigation`, `display-mode-switcher`, `data-source-disclosure`, `notification-feedback`, `page-state-recovery`。
- Map/Search 13：`map-search-entry`, `spot-search-shell`, `spot-search-field`, `spot-search-query-overlay`, `spot-search-filter-group`, `spot-search-filter-choice`, `spot-search-result-list`, `spot-search-result-card`, `map-location-control`, `map-analysis-focus-layer`, `map-layer-selector`, `map-time-control`, `map-marker-panel-coordinator`。
- Spot panel 17：`map-spot-information-panel`, `map-spot-panel-handle`, `map-spot-panel-section-nav`, `map-spot-panel-action-bar`, `spot-favorite-action`, `spot-share-action`, `spot-cloud-stargazing-action`, `spot-media-gallery`, `spot-navigation-action`, `spot-contribution-entry`, `spot-route-summary`, `spot-facility-evidence`, `guide-article-viewer`, `sky-professional-matrix`, `sky-target-list`, `sky-time-scrubber`, `sky-map-canvas`。
- Full-sky 5：`sky-orientation-canvas`, `sky-orientation-sensor`, `sky-orientation-recovery`, `sky-orientation-object-list`, `sky-orientation-time-ruler`。
- My 8：`my-account-header`, `my-settings-action`, `my-profile-summary`, `my-grouped-entry-list`, `my-plan-entry`, `my-contribution-entry`, `plan-editor`, `settings-form`。
- Profile/content 6：`profile-link-editor`, `profile-link-open-copy`, `import-source-rights`, `import-draft-editor`, `import-spot-association`, `import-preview-submit`。
- Contribution 8：`contribution-kind-control`, `contribution-spot-context`, `contribution-topic-control`, `contribution-observed-at`, `contribution-location-consent`, `contribution-media-upload`, `contribution-submit`, `contribution-status-list`。

Repeated rows/markers/ticks复用owner family key。`coverage.json`逐个disposition全部62个current Controls；retired control `source-lift-focus-layer`, `map-analysis-time-bar`, `spot-tonight-decision`, `observation-mode-control`及所有retired routes必须absent。

### 4.1 Library / component / Starward adaptation mapping

此映射写入README/coverage元数据或phone外audit documentation；不得显示在产品viewport：

- `mini-primary-navigation` → Taroify `Tabbar` → Starward owns two-route state, exact tokens, safe panel avoidance and `SemanticIcon`。
- Search → Taroify `Search`, `Cell.Group`/`Cell`, `Checkbox.Group` → Starward owns stationary-frame transition, Back/edge-back, query overlay, filter ornament and results。
- Spot panel → Taroify `FloatingPanel` (`anchors`, `contentDraggable=false`) → Starward owns same document, media/chrome phase, nav-safe height, bottom enum and exact `104×40rpx` handle; mark WEAPP header-hit/nested-scroll proof required and Taro-ScrollView adapter fallback if it fails。
- Section/action rails → Taroify `Sidebar`, `Button.Group`/`Button` → Starward owns exact flush/short geometry, section target and action semantics。
- Layer sheet → Taroify `Popup(placement=bottom)` → Starward owns fixed size, image choices, no-close-chrome and mutual exclusion。
- Curved Time Ruler → Taro enhanced horizontal `ScrollView` → Starward owns curve/real-slice preview/snap; no generic Slider/Picker substitution。
- Settings/My → Taroify `Radio.Group`, `Cell.Group`/`Cell`, ordinary `Switch` → Starward owns three-state animated track and colored-icon hierarchy。
- Contribution → Taroify `Form`, `Form.Item`, `Form.Feedback`, `Field`, `Input`, `Textarea`, `Radio.Group`, `Checkbox.Group`, `DatetimePicker` + `Popup`, `Uploader`, `Progress`, `Button` → Starward/Product Surface own context, conditional location, draft, validation policy, transport, media identity, idempotency, pending receipt and sole submit。
- Transient feedback → Taroify `Toast` only when `notification-feedback` requires it; field errors remain inline and persistent recovery stays in the owning surface。

Candidate须把此映射和implementation-unverified边界写清楚，但不能假装HTML prototype使用了Taroify或已证明WEAPP compatibility、tree shaking、bundle size、IME/safe-area/accessibility/gesture behavior。

## 5. Search and compact density

- Map只显示一个fixed floating Search field。Entry与Search route中的outer rect/fill/border/radius/shadow/visible query-or-placeholder/type baseline/slot/caret origin不变；只在同一leading`88rpx`slot做Search↔Back。两态无trailing `x`/clear/chevron。
- Search child默认autofocus；外部有效tap可blur并关闭suggestions/IME，保留route/query/filters/results/scroll。Back、system/微信Back与edge-back均pop回Map。Field以下content以clip/reveal + `translateY(-12px→0)` + opacity / 180ms出现，field本身不动；退出160ms反向。
- Suggestion overlay紧贴field下沿`4rpx`；row visible=`72rpx`、target=`88rpx`、icon=`22rpx`、padding=`16rpx`、row间只有1rpx divider。
- Filters从field/overlay下沿`4–6rpx`开始；choice visible=`44rpx`、target=`88rpx`、padding=`10rpx`、icon=`20rpx`、gap=`4rpx`、compact label。到首个partition视觉距离=`12–16rpx`；无“筛选条件”标题/divider/quick-more/advanced/draft/apply。
- Partition heading用body/600；retain同一DOM/state tree，以measured height/clip+opacity 160ms可中断展开收起；不remount、`display:none`、reset scroll、闪白、抖动。
- Image result card的leading readable field固定52%；合法media cover整卡，day gradient从`.82`到52% `.66`再于66%淡至transparent，左半仍可透图。无图只render solid card，无media node/placeholder/fixed gap。Whole card唯一action，选择后marker/result都默认打开medium panel。

## 6. One-document spot panel

- `visibility hidden|visible` + `extent small|medium|large`。Small=`232rpx+bottom-safe`；Medium=`clamp(500rpx,52dvh,700rpx)`；Large填满primary navigation上方viewport且不覆盖Map/My nav。
- 三档永久挂载同一objective document：identity → route/access/facility/safety → guides/field/source → astronomy → sky geometry → ruler → matrices/targets/source。Small/Medium只裁剪；Large才有唯一internal vertical scroll。禁止per-extent DOM/JSX branches、duplicate mapping、reorder或remount。
- Ordinary missing/unprovided/unverified visible value=`暂无数据`。Loading/permission/stale/error/not-applicable仍是不同internal state；真实风险/失败必须显示具体影响与恢复，不得被`暂无数据`遮蔽。
- 只有居中`104×40rpx`handle hot region可起vertical drag；dash=`52×5rpx`，assistive target≥`88×88rpx`且不覆盖邻近action。Pointer down只tonal反馈；越过8px vertical threshold才preview；tap/release no-op；body/content/media/top edge不拖。
- 无media保留`40rpx`compact handle band并在drag中持续；有media时handle覆盖image、band随media reveal收为0。无media node/placeholder/gap。Large media=`clamp(300rpx,27dvh,420rpx)`。
- medium→large progress：media reveal=`clamp((p-.50)/.28)`；接近top后Search/Location/Layer chrome opacity=`1-clamp((p-.82)/.12)`，hit/semantics与opacity同步。反向从live progress镜像。无media不虚构media phase，但chrome阈值不变。
- Large左edge`32rpx`right-swipe或handle pull-down执行large→medium；named controls等价。Back顺序owned disclosure→large→medium→small→hidden→route。
- Section rail absolute/fixed于panel viewport中点：right=`10rpx`、outer=`60×104rpx`、padding=0、overflow clip；2×`52rpx`items、gap=0、共享divider，贴紧上下边。Active=`#F5F6FF`+indicator；无shadow/translate，不占document width。
- Bottom action pill左右inset=`40rpx`、visible=`52–56rpx`、outer lane=`88rpx`、icon=`22rpx`；三项等宽。Favorite与filter共用rounded-star `SemanticIcon`。

## 7. One bottom presentation and layer selector

- 唯一Map state：`bottomPresentation = none | spot-panel | layer-sheet`。Selected spot与previous extent可保留在model，但不是第二visible/active flag。任一帧只有一个bottom surface拥有visible/hit/semantics/selected trigger。
- Panel→layer直接retarget为layer，panel退出后hidden/inert；layer trigger才active。Layer打开时marker/result intent直接retarget为new spot medium，不恢复旧panel再切换。再次trigger、Map tap或Back以180ms退出；只有无更新intent时才恢复previous panel extent。
- Trigger active=`#F5F6FF`+inset boundary且坐标不变。Sheet=`332rpx+safe-bottom`、fixed height、三张本地abstract image-backed cards：`光污染/总云量/观测机会`；无handle、`x`、Close row、“关闭图层”、第二condition card或base-map choice。

## 8. Raised draggable arrowless Curved Time Ruler

- 复用Taro enhanced horizontal `ScrollView`的`scrollX`、`enhanced`、`showScrollbar=false`、`fastDeceleration`与scroll lifecycle；project-local只做curved projection、label pruning、event band和valid-slice snap。不引入第二UI suite或手写另一套scroll physics。
- 无outer border/card/background/shadow/instruction/visible arrows。Visible block=`84rpx`并较前上移`16rpx`；direct lane=`88rpx`；center axis=`2×34rpx`；tick step=`34rpx`，minor=`9rpx`、major=`20rpx`、selected=`32rpx`。
- Pointer/touch horizontal drag实际移动track，每帧preview nearest real slice；scroll end/projected offset snap最近valid slice并≤120ms commit；cancel回committed offset。键盘/辅助技术increment/decrement存在但无visible arrow chrome。

## 9. Three-state Settings control

- `display-mode-switcher`是唯一`day|night|observation`owner，默认day；`observation-mode-control`退休。普通二元权限/提醒仍用标准Switch。
- Track max-width=`560rpx`、visible height=`72rpx`、三站等宽、每站target≥`88rpx`；thumb含Sun/Moon/Star与短label。语义为single-choice radiogroup/adjustable，不是binary Switch。
- Tap站点直接选；tap当前thumb有next则前进一步。Horizontal drag越过8px后跟手，release按position+velocity吸附相邻站；右向day→night→observation，左向反向，不wrap/跳站。方向键/Home/End/SR direct choice等价。
- Day↔Night：180ms thumb + Sun/Moon scale/rotation/opacity交叉。Night↔Observation先原子绑定closed black/warm-red target tokens，再Moon/Star交叉；反向镜像。Reduced motion即时snap + ≤80ms icon opacity。

## 10. Compact colored-icon My

- 只保留account/profile/Plan/Contribution/profile-links/import/settings职责。Compact header min-height=`120rpx`、avatar=`72rpx`、gear visible=`48rpx`/target=`88rpx`；status strip与Plan/Contribution共享surface/divider；routine row target=`88rpx`。
- Plan、Contribution、Profile Link、Import/Settings用`48rpx`soft icon tile + `24rpx`统一stroke glyph；分别可用sky/trail/meteor/risk-or-neutral语义色。同屏最多三种非risk accent；颜色只辅助分组，label/shape/chevron仍表达用途。
- 不新增Favorite副本、订单/钱包/会员/勋章/促销/banner、社交统计、假数据、第三方业务或第二icon system。

## 11. Compact Contribution Intake

- `content/contribution/index`只有一个keyboard-safe vertical scroll owner。Top chrome只保留quiet Back + page title；Panel entry以安静context row显示formal spot，My entry在同位提供“选择观星点/新地点”，二者进入同一form owner。
- 字段顺序：kind + spot context → topics + observed time → evidence narrative → 仅new-place出现的location consent/location → bounded media + rights → one final submit → current-user status。不得因视觉分组新增wizard/step store或字段。
- Simple field使用divider-backed cell：target≥`88rpx`、visible=`72–80rpx`、horizontal padding=`16–20rpx`、label column=`144–176rpx`；complex field使用top label，label gap=`8rpx`，group gap=`8–12rpx`、section gap=`20–24rpx`。Label/value/helper使用当前ordinary/body/metadata roles；无空helper占位、per-field card或nested surface。
- Kind single-select、topics wrap-safe multi-select的visible=`48–56rpx`而target=`88rpx`；textarea min=`176–208rpx`。Validation在blur/submit后就地插入并focus/scroll第一个invalid field，不跳顶；200% text把horizontal row转stack。
- Media在390px三列、320px/200% text两列；cell=`128–136rpx`、gap=`8–12rpx`；thumbnail/progress/retry/remove共用cell，达到上限隐藏add而不占位。Failure保留draft/media identity/idempotency key；location/rights/privacy只在适用字段旁出现。
- `contribution-submit`是唯一filled final commit，content-width、visible=`80–88rpx`。默认在document末端；若固定必须使用一个`88rpx+safe-bottom` lane并给scroll等量inset，且不得重复。Submitting防重复；success只显示真实pending review，不声称发布/核验。

## 12. Motion, state, viewport and accessibility audit

- 所有page/panel/list/matrix/Search/My/Contribution/Full-Sky保留真实scroll但不显示纵横scrollbar chrome或占位；H5 prototype使用跨引擎隐藏chrome，不以`overflow:hidden`裁正文。
- Reachable conditions：320/375/390/430px；100/200% text；day/night/observation；normal/reduced motion；normal/reduced transparency；touch/keyboard/screen reader；cold/loading/empty/success/meaningful partial/stale/error/offline/recovery/disabled/pressed/focused；permission/calibration/accuracy/unavailable/retry。
- Required journeys：cold Map→marker medium；small/medium/large同document identity；media/no-media medium→large phase；handle-only drag/tap no-op/cancel；panel→layer→marker mutual exclusion；Search same text/compact suggestions/filters/Back/outside blur；ruler direct drag/snap/cancel/no arrows；Settings day↔night↔observation tap/drag/keyboard；My compact colored-icon hierarchy；Cloud→Full-Sky Back；Panel/My→Contribution contextual entry；compact form keyboard/validation；media progress/failure/retry/draft preservation；single submit→pending；320px/200% text reflow。
- State变化不得抖动、闪白、跳坐标或突然`display:none`。非marker Map tap以220ms从live position隐藏panel。No visible tutorial/debug/data-pipeline copy。
- Every interactive object有name/role/value/checked/expanded/focus order；gesture有named/keyboard/SR等价路径；active和mode不只靠颜色。

## 13. Content, security and external boundaries

- Candidate values是representative non-live structure；不得连接网络、持久化、读取真实账户/位置/EXIF/cookie/token/user media。Unknown不能变0，risk不能改写为正向建议。
- Contribution/import不能发布未审核facts；Share排除private/transient state；sensor pose不持久化且离开foreground停止。
- Screenshot只提供defect evidence和interaction/density inspiration；不得复制第三方品牌、专有图片/地图/图标/token/文案/商业模块。
- Native Map/sensor/keyboard/share/safe-area/performance/data truth仍为production-unverified boundary。

## 14. Minimal sufficient outputs

只维护既有五个candidate files：

1. `index.html` — canonical interactive entry；phone UI + phone外audit shell。
2. `assets/styles.css` — current design-system projection，不建第二token truth；不得复制Taroify默认视觉。
3. `assets/app.js` — deterministic local interactions；no network/persistence/product algorithm。
4. `coverage.json` — exact `surface → route → control → state/condition → locator`与current/retired disposition。
5. `README.md` — sources、candidate/provider/native boundaries及完整library/component/adaptation mapping；不做formal handoff、dependency-installed或production claim。

只有真实unresolved owner conflict才新增`DECISION_REQUIRED.md`并停止affected claim；无冲突不得保留空文件。不得生成per-control PNG、第二套静态页、marketing deck、owner-operations或redundant component implementation。

## 15. Completion checks

- Exact designSystemId；structured/registry/linked/run-resolved body=`53eaac22d20d7b2a3b2bd501c1199558f9601d1afc5ed611d4e5ef7518c8a99d`；section=`086088d3f54d4bcede978fa0d4c09002bd8660dab0294536106b8e8459f706fa`；current source=`0fd87614b7d80c8d3f3c880fe39e81c9b7beda89f41e8492e4c113022eda4dd4`；no plugin/scenario/template snapshot。
- 5/5 Surfaces、9/9 current routes、62/62 current Controls covered；retired routes/keys、prohibited visible copy、unresolved items=0。
- Canonical entry无query即可用；关键交互真实；four widths×two text scales×three modes×motion/transparency/a11y可审查且无page horizontal overflow/scrollbar chrome。
- Static checks：HTML/JS/JSON parse、local references、exact Control/Surface sets、prohibited copy、retired absence、no external fonts/tiles/images/scripts/CDN/analytics、no secrets。
- Return canonical entry、exact file list、actual agent/model/reasoning/service-tier provenance、diagnostics和unresolved decisions。不得select/freeze/handoff/edit production code或声称owner/production acceptance。

## 16. Provider selection

- Open Design `0.21.1`；existing project `starward-miniapp-field-signal-all-resources`；conversation `4f290527-9979-4b24-b92c-8365b470bf9d`。
- Functional capability=`frontend-design`；project kind=`design-resource`；intent=`design-resource-authoring`。
- Agent/model/reasoning=`codex` / `gpt-5.6-sol` / `xhigh`；不得降级，effective provenance必须匹配。
- No plugin、scenario或template snapshot；service tier如实报告。

若effective provenance或exact design-system resolution缺失/不匹配，返回`highest_performance_unverified`，不得把run当formal candidate revision。
