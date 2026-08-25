# 《今晚去观星》Sky Canvas 当前设计资源

这是项目唯一当前 Open Design 资源，承载已确认的 Sky Canvas 视觉方向、关键产品交互、投稿与运营治理闭环，以及开发消费提示。它不保留旧方向、旧页面或并行版本。

本资源已被选定为 Mini Program 与 Operations 的正式 implementation constraint，并已生成可机器预检的结构化 handoff。它仍是可交互设计 fixture，不是生产代码、真实数据、pixel-exact target、WEAPP/Admin 运行时证明或发布验收证据。

## 当前设计方向

- 户外、轻快、有活力、简洁、略带亲和与可爱；圆角表达友好但不把内容拆成卡片墙。
- 地图或天空是核心任务对象；今晚判断与下一步行动其次；来源、时效、专业矩阵和治理证据按需展开。
- 月光金、路径绿、时间紫与风险珊瑚只承担语义角色，不做无意义的渐变堆叠、循环粒子或装饰性发光。
- 中文使用平台常规 CJK 字体；等宽 instrument face 只用于时间、角度、百分比、距离和风速。
- 通用图标使用本地 Lucide 文件；评审页面不按屏手绘图标。生产仍由项目 `semantic-asset` adapter 统一解析。
- 手机内保留必要滚动并隐藏滚动条外观；外部评审画布可以正常滚动。

## 页面入口

- `index.html`：地图 Finder、地点详情、天文信息、方位天空与核心微交互。
- `supporting.html`：我的、今晚计划、设置，以及仅在功能启用后进入路由树的内容导入流程。
- `contribution.html`：三类投稿、渐进表单、草稿/上传恢复、当前用户状态与历史。
- `operations.html`：独立认证桌面运营端的 Queue、Case、媒体、合并、发布评估、上下架、替换/退役和审计。
- `workbench.html`：当前资源实际复用的 token、字体角色、图标、选择态、通知、Sheet、状态与实现映射。
- `artifact-manifest.json`：当前入口、画面、状态、实现消费边界与排除项索引。

所有页面使用页头导航互相到达。直接通过本地 HTTP 预览目录即可；没有外部字体、网络图片、跟踪代码或产品数据依赖。

## 正式开发 Handoff

- Mini Program 稳定目标键：`target-miniapp-sky-canvas-current-constraint`。
- Operations 稳定目标键：`target-operations-sky-canvas-current-constraint`。
- 人读开发说明：`docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/implementation-handoff.md`。
- 机器可读规格：`docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/selected-source/implementation-handoff-spec.json`。
- 已发布 handoff：`selected-handoff/miniapp-sky-canvas-current.md` 与 `selected-handoff/operations-sky-canvas-current.md`。
- 两个 handoff 的正式 preflight 均通过；该结果只证明设计输入闭包与完整性，不证明生产实现一致性。

## 核心体验

### 地图与 Finder

- 默认 `closed`：地图、Search、快速条件、观测条件、标记和整卡 callout 构成干净首屏，不显示底部大框。
- 首次选中快速条件或提交查询进入 `peek`；上拉或点击安静把手进入 `expanded`。
- Sheet 内只展示进阶条件与结果，不重复快速条件，没有“展开筛选”按钮或解释性头部。
- Back/Escape 与下拉按 `expanded → peek → closed` 逐级返回；`extent` 与 `open_reason` 独立。
- `观测条件` 在同一个地图上切换单一分析叠加与唯一选中时间，不复制地图或时间状态。
- 整个地点 callout 是详情入口；不保留“查看地点判断”文字行。

### 地点详情

- 路线、今晚判断、夜空入口和地点事实采用轻量分组，减少表格式标签、重复标题和分隔线。
- 收藏主星保持视觉主导；激活时最多三颗流星一次进入并停止，active 保留短静态拖尾，无持续旋转、环绕或发光。
- `今晚夜空` 是判断之后、分段标签之前的唯一紧凑整行入口。

### 天文信息

- 天空、共享时间、结论时窗、条件带和目标列表共用一个正式地点与 Observation Context。
- 时间拖动同步更新天空对象、条件值、选中分段和目标方位。
- 暮光、云、月亮、降水、风、来源和目标使用统一图标；对齐轨道和矩阵仍拥有数值，不拆成指标卡片墙。
- 来源、有效/更新时间以及完整、部分、陈旧、不可用状态保持可达。

### 方位天空

- 只从天文信息进入，并携带相同正式地点、选中时间、时区与 revision。
- 只跟随手机方向；没有手动方向按钮、步进器、方向滑杆或拖拽改朝向。
- 权限、校准、可用、拒绝和设备不可用复用紧凑恢复面板；无法获得可信方向时不伪造方位/高度，文字对象列表继续可用。

## 我的与辅助页面

- 主导航严格只有地图与我的；我的根页只有标题、设置 gear、账户概况和少量日常入口。
- 收藏浏览仍属于地图 Finder 的“想去”分区；我的页面不展示收藏数量、列表或重复入口。
- 今晚计划拥有出发前复核、路线节点和可恢复的静态/动态信息，不复制地点详情。
- 设置独立拥有显示模式、权限、提醒与数据操作；封闭观测红光在这里显式进入和退出。
- 内容导入遵循 `SOURCE → EDIT_DRAFT → ASSOCIATE_SPOT → PREVIEW → SUBMIT`，保护用户编辑、权利与地点身份；功能关闭时页面不进入当前路由树。

## 投稿与审核

- 投稿类型完整覆盖 `FIELD_REPORT`、`CORRECTION`、`NEW_SPOT_PROPOSAL`；字段按类型渐进展示。
- 已有正式地点的现场报告不读取当前位置；新地点精确坐标需要单独同意。
- 草稿、上传会话和提交幂等身份可恢复；上传失败从断点继续，完成项不重传；原始 EXIF 不进入公开媒体。
- 用户状态分成三条独立轴：
  - `submissionState`：草稿、待审核、需补充、接收、拒绝、撤回。
  - `mergeState`：未开始、准备、已合并、被替代。
  - `publicationImpact`：无、候选 revision 更新、active revision 更新、地点上架。
- 审核接收只表示投稿可进入 canonical owner 处理，不表示事实已合并或地点已公开。

## 运营工作台

- 它是独立认证的响应式桌面 Web，不是小程序内的 demo 控制台。
- Queue 与 Case 审核投稿；媒体审阅逐项判断安全、权利、格式和净化结果。
- Merge Preview 逐字段选择 canonical 值；Commit 绑定投稿 revision、正式地点 revision、幂等键、回执和审计。
- Publication Assessment 重新检查正式地点完整性、来源有效性、安全阻断、revision 与读模型；只有通过后才能上架。
- 上架、暂停、下架、替换和退役分别展示影响、恢复点与读模型结果；历史、想去关系和计划不会被静默删除。
- 审计事件只追加并脱敏；审计日志不是恢复按钮。

## 开发消费边界

- 视觉 token 的生产 owner：`apps/wechat-miniapp/src/styles/tokens.scss`。
- Mini Program 共享组件扩展点：`apps/wechat-miniapp/src/components/**`。
- 通用/天文图标统一入口：现有 `semantic-asset` component/adapter。
- Mini Program 路由 owner：`src/pages`、`src/spot`、`src/sky`、`src/content/contribution`。
- 运营端 owner：`apps/admin-web/src/app`。
- 复用 owner、adapter 和单一状态真值；不要复制 DRA fixture、页面私有 reducer、旧 `.card/.soft-button` 视觉语义或第二套 token/icon truth。
- UI 库是否采用仍需实现阶段的兼容性、主题、包体、无障碍和退出成本证据；本设计资源不指定一个生产依赖。

## 图标与许可

- 通用图标：Lucide Static `1.33.0`，ISC，许可见 `assets/icons/LICENSE-lucide.txt`。
- 收藏流星：Font Awesome Free `7.3.1` 的 `meteor`，许可见 `assets/icons/LICENSE-fontawesome.txt`。
- 这些是评审资源内的本地文件，不代表生产依赖已选定。

## 未由本资源证明

- WEAPP 真实渲染、腾讯地图样式/叠加层、原生层级与触摸竞争。
- 真实天文、天气、路线、开放、安全、地点、投稿、审核或发布数据。
- 传感器权限、方向精度、校准、前后台生命周期、触觉与代表设备表现。
- 真实 owner 认证/RBAC、上传限额/扫描、并发冲突、合并事务、发布 side effect/readback 与替换一致性。
- 生产无障碍、性能、隐私安全、pixel-exact target 或 production conformance。

这些结论必须由当前生产候选在真实 WeChat DevTools/设备、Admin 浏览器、服务端 API 与项目声明的验证边界内建立。
