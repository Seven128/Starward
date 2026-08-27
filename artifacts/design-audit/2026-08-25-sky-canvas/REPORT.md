# Sky Canvas 当前候选逐页设计审计

审计日期：2026-08-27
审计对象：当前工作区最终候选 `a587d41aca2997cc1019c7b9ad8441f21c4e05750b69843a601b45c402e7e961`
设计依据：`DESIGN.md`、Mini Program / Operations 正式 Handoff、`implementation-handoff-spec.json` 与 selected-source canonical HTML。
运行证据：`artifacts/miniapp/native/runs/wechat-devtools-2026-08-27T13-35-53-321Z-d3f8a03e/session.json`（最终候选、完整生产原生 9/9 单会话）。

## 审计口径

- 正式 Handoff 将两个采用目标声明为 `implementation constraint`，并明确 Mini Program 不是 `pixel-exact target`。因此本报告检查同条件的视觉语言、布局职责、组件几何、交互状态与生产语义，不把设计稿缺失的微信状态栏/胶囊、真实腾讯地图瓦片或动态服务端事实强行判作逐像素相等。
- Mini Program 设计画布内的手机 specimen 为 312×675（390×844 的 0.8 倍）；比较脚本先裁取 specimen，再归一化到声明的 390×844。开发者工具的 382×825 内容截图同样归一化，避免把画布留白误判为 UI 差异。
- 自动化 fixture 只在 `MINIAPP_DEVELOPMENT_FIXTURE_MODE=1` 的隔离测试构建中可达，并有永久可见提示。本报告的生产原生与 Operations 证据使用 run-unique PostgreSQL/PostGIS、Redis namespace、私有媒体文件系统和真实 API/UI mutation；生产启动不导入 fixture/sample/demo，样本来源不能通过正式发布完整度策略。

## 总体结论

实现已通过生产功能、基础设施和 selected-design constraint 检查；不能、也不应把正式声明为 `implementation constraint` 的 handoff 误报成 formal `pixel-exact target`。12 个 Mini Program frame（其中 Profile Import 按门控缺席）和 7 个 Operations frame 均已逐页打开并并排检查。最终完整生产原生会话在同一候选指纹下 9/9 journey 通过，所有 journey 的 `injected_fixture` 均为 `null`，unexpected console error 0、exception 0、cleanup passed；返回箭头由 source-derived PNG 在真实 native tree 中显示，Sky 主画面与方位画面也已按原生 `statusBarHeight` 避开状态栏。

仍未由当前证据建立的条件包括：真实手机方向传感器/触觉/户外亮度，以及 formal handoff 中已失效的 feasibility source digest。它们不被开发者工具截图、静态检查或历史结果替代。

## Mini Program 逐页结果

| # | Frame | 当前结论 | 与设计资源的可见差异 / 边界 |
|---|---|---|---|
| 1 | Map / Finder | 通过约束 | 搜索、三枚 quick filter、条件栏、正式 marker/callout、Finder 自动收起和双主导航成立；真实腾讯地图替代稿内示意底图，属于生产边界。 |
| 2 | Spot Detail / Dusk | 通过约束 | 已通过生产“设置→夜间”路径取到 dusk/night 状态；Hero、路线、决策、今晚夜空、tabs 与设施均存在。服务端因测试来源不足而诚实显示“资料不足”，不伪造稿内积极结论。 |
| 3 | Astronomy | 通过约束 | 星空、同一 Observation Context、结论、主/备窗口、时间 scrubber、条件随时间变化与专业矩阵入口成立；顶部身份区实测 `padding-top: 47px`，避开 iPhone 12/13 模拟器状态栏。资料不足提示使首屏密度与完整数据静态稿不同。 |
| 4 | Orientation | 通过约束；真机待验 | sensor-follow-only、授权/拒绝、方向天空、地平线、对象列表与无传感器降级成立；顶部返回/身份/动作区避开状态栏。开发者工具不能证明真实方向流与触觉。 |
| 5 | My | 通过约束 | 计划通过真实页面/API 创建并回读，身份 hero、今晚计划、计划/投稿/设置入口和双主导航成立；身份文案与日期取当前验收身份。 |
| 6 | Plan Detail | 通过 | 已有计划是主画面，不再是创建表单；正式地点、窗口、3/5 出发复核、路线节点、revision/readback 均由生产 owner 提供。 |
| 7 | Settings | 通过约束 | 日间/夜间/观测光、选点偏好、可访问性、权限/隐私、提醒和数据责任存在；真实微信安全区使首屏可见折叠与静态稿不同。 |
| 8 | Profile Import | 通过门控 | feature gate 关闭时路由树不存在，符合正式 Handoff；未伪造截图或隐藏路由。 |
| 9 | Contribution Intake | 通过 | 正式地点上下文、现场报告/资料纠错/新增地点三类、草稿/待审核提示和“提交不等于公开”成立。 |
| 10 | Contribution Form | 通过约束 | progressive form、日期时间、事实多选、说明、媒体、权利确认、草稿和提交分离均由真实表单 owner 提供；动态内容长度导致折叠位置不同。 |
| 11 | Upload Recovery | 通过生产 DevTools 最终证据 | 生产 UI/API 创建真实草稿和媒体上传会话，恢复列表回读后重新打开真实 pending media，提交门禁保持关闭；失败/重试/过期/清理由同一生产 owner 与专项测试覆盖。最终完整会话包含 `recovery-draft-resume` 与 `recovery-upload-open` 原生截图，且 `injected_fixture:null`。 |
| 12 | Review History | 通过 | 当前身份两条提交由生产 UI/API 产生并回读；submission、canonical merge、publication impact 三轴分开，未把接收等同发布。 |

## Operations 逐页结果

| # | Frame | 当前结论 | 与设计资源的可见差异 / 边界 |
|---|---|---|---|
| 1 | Moderation Queue | 通过约束 | 认证 shell、优先队列、筛选、风险、时间与打开动作成立；当前服务数据为 2 条，不复制设计稿数量。 |
| 2 | Moderation Case | 通过约束 | 原始投稿事实、安全/隐私检查、理由、决策与三轴提示成立；身份清洗与服务端回读保持可见。 |
| 3 | Media Review | 通过约束 | 净化派生物、媒体 provenance、权利/扫描/当前媒体状态和采用/不采用动作成立；使用真实媒体对象而非彩色占位块。 |
| 4 | Canonical Merge | 通过约束 | preview 与 commit 分离，revision、理由、receipt/readback 门禁成立；当前 Case 不满足条件时保持禁用。 |
| 5 | Publication Assessment | 通过 | fresh server assessment fail-closed，并逐项列出缺失证据；没有把设计稿 7/7 成功态硬编码到当前不完整地点。 |
| 6 | Replacement / Retirement | 通过约束 | current/successor、影响预览、reason、revision 与高影响动作门禁成立；服务缺少 assessment/revision 时不制造成功。 |
| 7 | Immutable Audit | 通过 | actor/action/object/result 时间线、筛选、搜索、刷新、导出当前视图成立；事件来自实际操作链路。 |

## 验证与限制

- `npm run check:miniapp:fast`：通过（contracts/API/Mini Program 类型、83 个测试通过、1 个仅由基础设施 lane 覆盖的测试跳过、设计系统、workflow、icons、semantic assets、design bindings）。
- `npm run test:miniapp:infrastructure`：通过；PostgreSQL/PostGIS、Redis、身份隔离、冲突恢复、备份恢复、HTTP/RBAC 与清理均通过。
- `npm run build --workspace @starward/admin-web`：通过，构建内含 `tsc --noEmit`。
- `make validate-context`、`make validate-harness`：通过；touched modularity warning 0，9 个已登记 owner/移除条件的 waiver 保持可见。新 Operations 启动器已拆为 224 行生命周期 owner 与 131 行生产数据 owner，无新增 waiver。
- Operations 生产数据启动器 smoke：真实鉴权用户、4 条真实投稿与 1 个真实 JPEG 通过生产 API 写入 run-unique PostgreSQL/私有文件系统；ready 明确报告 `fixture_mode:false`、`memory_test_mode:false`，退出后数据库和 Redis namespace 清理完成。
- Mini Program / Operations handoff preflight 仍分别因 `source.miniapp.tokens` 与 `source.operations.platform` 的冻结 feasibility digest 过期而 fail-closed。不可覆盖已采用的不可变 handoff；需要另行发布新选择版本才可闭合该形式校验。
- 最终原生闭环：候选 `a587d41aca2997cc1019c7b9ad8441f21c4e05750b69843a601b45c402e7e961`，完整 9/9 journey，同一候选前后指纹一致；run-unique PostgreSQL/PostGIS、Redis namespace、私有媒体文件系统，`fixture_mode:false`、`memory_test_mode:false`；known exact DevTools opaque envelope 2 条，unexpected console error 0、exception 0，完整清理通过。
- 真机方向传感器、触觉、减少动效、红光模式无闪白及低端机性能仍需声明设备 lane；当前不作通过声明。

## 证据目录

- `reference/`：canonical selected-source 设计截图。
- `implementation/`：当前候选原生 Mini Program 与 Operations 截图。
- `comparison/`：同 frame 并排图；左为设计资源，右为当前实现。
- `compose_comparisons.py`：包含 Mini Program specimen/viewport 归一化规则。
