# Sky Canvas 开发 Handoff

## 1. 交付结论

本目录中的 Sky Canvas 当前资源已被选定为开发用 `implementation constraint`，覆盖微信小程序和独立 Operations Web。它负责回答：页面怎样组织、组件有哪些状态、用户怎样操作、界面怎样反馈、开发应从哪个现有 owner 接入。

它不是逐像素 `exact-target`，也不是生产验收。边界如下：

- `DESIGN.md#wechat-mini-program--sky-canvas-v1` 仍是颜色、字体角色、间距、圆角、阴影和 motion token 的唯一精确值 owner。
- Mini Program 与 Operations Screen Contract 仍是页面职责、动作、反馈、恢复和可访问性语义 owner。
- BFF、数据库、传感器 adapter、地图 adapter 和 Operations application service 仍是数据、权限、审核、合并和发布规则 owner。
- Open Design HTML 中的地点、天气、天文、投稿和审核数据都是明确的设计 fixture；开发必须换成真实 contract/state，不得复制为生产成功路径。

正式交付物：

- Mini Program handoff：`selected-handoff/miniapp-sky-canvas-current.md`
- Operations handoff：`selected-handoff/operations-sky-canvas-current.md`
- 完整结构化说明：`selected-source/implementation-handoff-spec.json`
- Mini Program Fact manifest：`selected-source/miniapp-fact-manifest.json`
- Operations Fact manifest：`selected-source/operations-fact-manifest.json`
- Mini Program feasibility：`selected-source/miniapp-implementation-feasibility.json`
- Operations feasibility：`selected-source/operations-implementation-feasibility.json`
- 可编辑上游：Open Design 项目 `starward-sky-canvas-core-2026-08-25`

## 2. 开发读取顺序

1. 先读对应 Screen Contract，确认页面职责和不可变业务语义。
2. 再读 `DESIGN.md` 的 Sky Canvas profile，获取精确设计 token 和模式规则。
3. 打开本 handoff 与相应 HTML 入口，确认页面组合、组件状态和交互反馈。
4. 从 feasibility 文件给出的现有 owner 候选中做架构选择；DRA 不替实现阶段强制指定唯一库或 primitive。
5. 将 fixture state 映射到真实 query/mutation/store/permission lifecycle。
6. 在真实 WEAPP 或 Operations production entry 上验证；浏览器原型和 handoff preflight 不能替代生产证据。

## 3. 全局体验规则

- 气质是户外、活力、轻量、简洁、略可爱；不是行政后台、旅行商城、天气仪表盘或发光玩具。
- Map 或 Sky 始终是主要视觉对象；结论和下一步动作次之；专业证据、来源和完整度再后置展开。
- 使用圆角、轻量表面、路径绿、月光金、淡蓝紫选择色和短促因果动效表达活力；不使用卡片墙、持续粒子、任意 glow 或大面积高饱和蓝紫。
- 正文与导航使用项目许可安全的原生 CJK stack；时间、角度、百分比、距离和风速才使用 instrument/mono 字形。
- 可见控件可以紧凑，但触控/键盘命中区不得缩小；选中、忙碌、错误、展开和权限状态不能只靠颜色或动画表达。
- 手机端隐藏 scrollbar chrome，但不能禁用、裁掉或劫持内容滚动；位置恢复仍由真实 scroll owner 负责。
- 桌面 hover 不能改变布局盒大小。键盘 `focus-visible` 轮廓只能画在既定 focus ring 内，不得溢出覆盖相邻元素；触屏不出现 hover 残留。
- 动画必须可中断、从当前值 retarget、不排队、不循环。Reduced Motion 删除位移、旋转和抛物线，只保留短促填充/透明度状态变化。
- 图标通过一个语义 adapter 消费。通用 Search/Filter/Chevron/Clock/Compass/Route/Facility/Cloud/Rain/Wind/Moon 可来自兼容的轻量图标库；Sky Canvas 专属星图符号可做项目资产，但不得形成第二套 icon/token 真相。

## 4. 页面与路由职责

| 资源 frame | 产品职责 | 生产入口/owner | 关键完成条件 |
| --- | --- | --- | --- |
| `map-finder-day` | 地图发现、搜索、快速条件、同图分析、Finder closed/peek/expanded | `pages/map/index` | 一张 physical Map、一个选择态、一个筛选真相、一个 selected time |
| `spot-detail-dusk` | 正式地点身份、今晚判断、路线、设施/安全/来源、页面级动作 | `spot/detail/index` | 只接受 formal `spot_id`；硬阻断优先于评分 |
| `spot-night-astronomy` | 地点/时间天文摘要、窗口、对齐条件、目标、2D 星图 | `spot/sky/index` | 所有数值共享一个 versioned Observation Context |
| `spot-night-orientation` | 跟随手机方向的方位天空 | `sky/detail/index` | 只从天文信息进入；sensor-follow-only；不伪造 heading |
| `my-home` | 账户中心与内容入口 | `pages/my/index` | 不重复 Finder 收藏列表；Map/My 是唯一一级目的地 |
| `plan-detail` | 出发准备、路线节点、动态条件反馈 | `content/plan/detail/index` | 不复制地点事实；动态失败可恢复 |
| `settings` | 模式、权限、提醒和数据动作 | `content/settings/index` | 观测红光模式只有这里拥有入口/退出 |
| `profile-import` | 受 feature gate 控制的内容导入 | gate 开启时才注册 | 禁用时页面与入口都不存在 |
| `contribution-*` | 投稿类型、渐进表单、上传恢复、状态历史 | `content/contribution/index` | draft/upload/submit/review/merge/publication 分离 |
| `moderation-*` | 认证审核队列、Case、媒体、合并 | `apps/admin-web/src/app` | 原始证据不可覆盖；每个写动作有 receipt/audit/readback |
| `publication-assessment` | fail-closed 上架评估与发布动作 | `apps/admin-web/src/app` + server service | 审核接受不等于合并；合并不等于发布 |
| `spot-replacement-retirement` | suspend/unpublish/replace/retire | Operations application service | 保留历史、关系和影响预览；禁止 successor cycle |
| `operations-audit` | 追加式脱敏审计 | Operations read model | actor/action/object/reason/time/result 可归因 |

## 5. Map / Finder 组件契约

### 5.1 Search 与快速条件

- Search 是地图页唯一常驻搜索入口，建议、历史和搜索结果覆盖层始终锚定输入框。
- 快速条件位于 Search 下方，只保留最常用的立即提交项；高级条件只在 Finder Sheet 中出现。
- chip 的字级和可见高度采用紧凑规格，文字不挤压，水平 padding 轻量；选中蓝紫使用淡色角色，不回到旧的深饱和描边。
- 选中时右上角出现一颗较大的淡黄色圆角星，中心位于 chip 右上角，框外部分由 chip clip 掉；取消选择时执行反向淡出。
- `unselected → selected` 的第一次快速条件提交可把 Finder 从 `closed` 自动打开到 `peek`；后续条件改变只更新同一个 projection。

### 5.2 Finder Bottom Sheet

- extent 只有 `closed | peek | expanded`。默认 `closed`，此时地图下方没有大白框。
- handle 同时拥有 drag、tap 和 accessible toggle；不再展示“展开筛选/收起筛选”按钮。
- Sheet 不展示“找今晚的观星点”标题/说明，也不重复快速条件。
- `peek` 展示第一组高级筛选和首个有用结果；`expanded` 展示完整高级筛选、搜索上下文及 `想去/其他观星点` 两个可折叠分区。
- 高级条件使用 opening snapshot + draft；提交后更新结果，关闭未提交 draft 时丢弃。Back/Escape/向下拖依次 `expanded → peek → closed`。
- 长筛选和结果列表由 Sheet 内明确 scroll owner 承担，滚动条外观隐藏，但 wheel/touch/keyboard/位置恢复全部保留。

### 5.3 地图分析与观测条件

- `观测条件` 状态条可以点击；点击后在同一张地图上打开 map-coupled focus layer。
- 同时最多一个可选分析层：光环境、总云量或“今晚观测条件”；普通底图和默认 formal markers 不是同级 layer tab。
- 状态条只显示当前分析、关键指标和本地时间。focus 状态也只显示同一个 selected time，不创建第二条时间条或第二个 time store。
- 分析层改变地图表达，不改变正式地点、天文、机会判断或安全事实。

### 5.4 marker、callout 与结果

- Finder result、marker 和 callout 共用 selected formal spot。
- 点结果先选中地图 marker/callout，不直接跳详情；点整个 callout 才进入详情。
- callout 保留地点名、简短判断、关键时间/风险状态与右侧箭头，不展示“查看地点判断”文本行。
- ordinary POI 不能伪装为 formal spot；partial/stale/error 仍保留静态地点身份和安全恢复动作。

## 6. Spot Detail 与收藏动效

- header 首层只放地点身份、距离/路线、收藏和页面级动作；设施事实不与动作 chrome 混在一起。
- `去这里 →` 是身份/路线行尾部的安静文字动作，外部导航前重新检查硬阻断。
- `今晚夜空` 只出现一次，位于 Tonight 判断之后、内容 segment 之前，采用紧凑整行入口而不是巨大底部按钮。
- 收藏未激活是无填充白色描边星，外部 hit area 保持完整但视觉上不画按钮边框。
- 激活：主星旋转并轻微收缩后填充淡黄色；最多三颗大小不同的带短拖尾流星从 effect stage 外进入并停止。主星必须比卫星更亮、更大；卫星、尾迹在 active 状态保留但保持低对比且静止。
- 取消：主星回到原尺寸和空心描边；卫星与尾迹从当前状态淡出。快速点击从当前动画值 retarget，不排队。
- mutation 失败时，动画回到服务端权威状态，并通过 `notification-feedback` 给出可读错误；Finder `想去` 与 Detail 使用同一 favorite relation。

## 7. 天文信息 Handoff

参考项目 `https://perseids.giraffetree.cn/` 的角色是“单地点、单夜晚、时间驱动的天文信息组织与交互启发”，不是品牌、布局或数据 fidelity target。开发复用的是逻辑：先选地点/日期/时间，再让星空、目标和条件证据同步变化；不得抓取或复制其专有页面、品牌或数据。

父页信息顺序：

1. 正式地点与当前本地时间；
2. 今晚结论、主时窗和备选时窗；
3. 共享 time scrubber；
4. 天空曲线/2D SkyScene；
5. 对齐的暮光、总云/分层云、月亮、降水、风和光环境 bands；
6. 建议目标与可见区间；
7. 来源、有效期、catalog/algorithm/data revision 和 partial/stale/unavailable 反馈；
8. `方位天空` 子页入口。

时间交互：

- scrubber 拖动时进入 preview，只更新高频投影；释放/确认后 commit 一次。
- `SkyScene`、目标列表、矩阵、结论窗口和来源有效性必须从同一个 `{spot_id, timezone, selected_time, data_revision, catalog_revision, algorithm_revision}` 读取。
- 缺失值显示缺失/部分/过期，不用 fixture 数字补齐，也不因字体、颜色或 icon 改变事实含义。
- icon 负责快速识别；对齐轨道、矩阵和曲线仍是数据比较的主表达，不能拆成一墙孤立 metric cards。

## 8. 方位天空 Handoff

- 只从天文信息父页进入，并继承 formal `spot_id`、committed time、timezone 和 revision；返回时恢复精确时间、滚动位置和逻辑 focus。
- sensor 只改变 SkyScene 的呈现朝向，不改变天文真相、地点或选中时间。
- 状态：`permission → calibrating → ready`，以及 `denied | unavailable | stale-sensor`。
- 页面没有手动模式、方向加减按钮、slider、拖拽 heading 或虚构 motion fallback。
- 未授权/拒绝/不可用时，使用同一套简洁圆角 recovery panel：方向 icon、一个友好标题、一句用途/隐私说明、一个紧凑主动作和一个安静稍后再说。
- 不可信时停止显示“当前方向”结论；非 Canvas 的 celestial object list 始终为无障碍和降级场景可用。
- listener 在 blur/unmount/permission change 时确定性 cleanup；屏幕只保留完成当前任务所需的方向状态，不记录连续姿态轨迹。

## 9. My / Plan / Settings

- My 是账户中心和内容路由，不展示收藏地点列表、收藏计数或与 Finder 竞争的入口。
- Plan 以出发准备和路线节点为主，不复制 Spot Detail 的地点证据；动态条件失败时保留已有计划并给出重试。
- Settings 统一管理显示模式、观测红光模式、权限、提醒和数据动作。Observation 模式改变亮度与色彩角色，不改变路由和任务顺序。
- feature-gated Import 禁用时不留灰按钮或旧路由；启用后按 `SOURCE → EDIT_DRAFT → ASSOCIATE_SPOT → PREVIEW → SUBMIT`，并显式区分 `spot_id` 与 `spot_proposal_id`。

## 10. 投稿与上传

- kind：`FIELD_REPORT | CORRECTION | NEW_SPOT_PROPOSAL`。字段按 kind 渐进出现，不先展示整张行政表格。
- 从 Detail 进入时只带 formal `spot_id`/label，不重新申请当前位置；新地点精确位置单独征得同意。
- draft 是 identity-scoped server record，包含 revision；上传 session 与 submit idempotency identity 独立。
- 图片先做格式、大小和 metadata sanitation；raw path、EXIF 和精确贡献者位置不进入普通 read model 或日志。
- 上传失败从已确认进度继续，不重复创建完成对象；过期/放弃 session 的对象有确定清理与可见结果。
- UI 同时展示但绝不合并三条状态轴：
  - submission：`DRAFT / PENDING_REVIEW / CHANGES_REQUESTED / ACCEPTED / REJECTED / WITHDRAWN`；
  - merge：`NOT_STARTED / READY / MERGED / SUPERSEDED`；
  - publication impact：`NONE / CANDIDATE_UPDATED / ACTIVE_REVISION_UPDATED / SPOT_PUBLISHED`。

## 11. Operations

- Operations 是独立、认证、owner-only 的桌面 Web，不是小程序里的 demo 管理页。
- Queue 负责定位待审对象；Case 同屏保留原始证据、历史、决定和原因。
- Media Review 只消费 sanitized derivative 和来源/权利信息。
- Merge Preview 逐事实展示当前 canonical value、候选 value、来源和冲突；Commit 需要当前 submission/spot revision、幂等 identity、服务端 receipt 和 audit。
- Publication Assessment 重新执行完整性、来源有效性、安全、并发和 public projection 检查。只有完整结果才能启用 publish。
- suspend、unpublish、replace、retire 是不同命令和反馈；replacement 预览影响关系，禁止 successor cycle。
- 所有写操作先呈现 object + effect + risk + recovery point；结果以 server receipt 和 readback 为准，client toast 不能单独证明成功。

## 12. 实现可行性与依赖边界

Mini Program 已观察到的现有 substrate：

- platform：WeChat Mini Program；
- framework/runtime：Taro + React；
- UI system：项目本地 primitives/components；
- token adapter：`apps/wechat-miniapp/src/styles/tokens.scss`；
- component owners：`src/components`、`src/features` 及现有 route-local owners；
- route owners：`src/pages`、`src/spot`、`src/sky`、`src/content`。

Operations 已观察到的现有 substrate：

- platform：Browser Web；
- framework/runtime：React + Vite；
- UI/token owner：`apps/admin-web/src/app/page.tsx` 与 `styles.css`；
- route owner：`apps/admin-web/src`。

允许的方案集合是：复用现有组件、组合现有 primitives、扩展共享组件、通过 token theme，或新建一个边界清晰的共享组件。选择其中一种不会禁止其他仍有证据支持的方案。禁止引入第二套重型 UI system、复制 reducer/store、按页面手画同类 icon、让 client 计算服务端拥有的天文/安全/发布真相，或让 HTML fixture 进入非测试启动路径。

## 13. 验收边界

正式 DRA preflight 只证明：

- canonical entry 与依赖可读且 hash 一致；
- Mini Program/Operations 各自的 target、condition、subject、state-matrix 与 Fact manifest 闭合；
- 每个 material component family 都有真实仓库 owner 候选；
- platform/framework/UI/token/component-root/route-root 六类 substrate 观察完整；
- feasibility 文本没有复制精确视觉值，也没有替技术权威强制选库；
- handoff 没有已知 blocker。

它不证明：真实 WEAPP 渲染、腾讯地图覆盖层、设备传感器、网络/权限生命周期、真实天文/天气数据、认证审核写入、上架副作用与 readback、代表性设备性能、生产无障碍或发布就绪。这些必须由实现阶段在当前生产入口上验证。

## 14. 更新规则

- 普通反馈只修改 Open Design 的一个 current 项目，不保留旧截图、旧页面、平行候选或 `vNext`。
- Open Design 的 `.file-versions` 不属于项目交付；`.file-versions` 与 `.od-skills` 都不得进入正式 selected-source dependency closure。
- 已发布的 `selected-source` 和 `selected-handoff` 是 Harness 要求的不可变 Source 例外；它们不作为第二个活跃设计方向。
- 若未来可见设计或语义发生变化，重新评审当前资源并发布新的不可变选择身份，再更新 Screen Contract 指针；不得覆盖已采纳 snapshot。
- 若只是生产实现选择、bug 修复或不改变可见语义的代码重构，不回写 DRA 资源。
