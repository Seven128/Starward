# SPOT-R01 / NIGHT-R01 · 详情信息重排与独立“今夜”并入点位夜空

Status: `accepted-for-next-candidate / pending-user-review`  
Recorded: `2026-08-06`  
Scope ceiling: 微信小程序全局导航、地图进入夜空的相关分支、观星点详情的概览/攻略/场地/夜空分段，以及为这些页面提供事实的共享组件、交互、响应式与资产资源。  
Iteration intent: 修订现有 Open Design 候选供下一轮审计；不回写原始产品/技术方案，不生成正式 handoff，不改变 `DESIGN.md`、Context、Contract 或生产代码。

## 1. Source and baseline

Source: 当前对话中的用户审计意见。它是下一版候选的显式约束，但在用户最终选定前仍是 task-local delta。

Controlling background remains:

- Product proposal SHA-256 `641F11B9BC000278040D35CC895FBBF5B45F85194E4566E0B9F05081EBBE0BF2`.
- Technical proposal SHA-256 `7D48822A49A2FD1E93344F1FE31D9B144F4D0C79D9E42C47435E16FAF220F122`.
- `DESIGN.md#wechat-mini-program--soft-instruments-v1` and Open Design design system `user:soft-instruments`.
- Complete-product Open Design project `starward-miniapp-complete-product-2026-08-05`, baseline conversation `92c8ae92-241e-492a-95f7-d0666ce30e3d`.
- Map Open Design project `starward-miniapp-map-page-2026-08-05`.

## 2. User feedback, preserved verbatim

> 观星点详情页：代表媒体图库要放在概览的最前面，这里的图片要放真实拍摄的星空照片，夜空里面要多加一行，今晚推荐观测目标，例如猎户座木星、金星、流星雨、双星伴月等等，攻略要有一个展示图片的位置，把攻略调整放在概览的后面，作为第二个项

> 今夜与星空夜族这个底部栏的大页面不要了，并到单个关心点的详情页组里面的夜空去

## 3. Normalized pending requirement

### 3.1 观星点详情分段与内容顺序

观星点详情的吸顶分段顺序从 `概览 / 场地 / 夜空 / 攻略` 调整为：

1. `概览`
2. `攻略`
3. `场地`
4. `夜空`

`攻略`是概览之后的第二个分段，不再位于末尾。稳定内部 route key 可暂时保持不变，用户可见顺序与焦点/读序必须按上面定义。

### 3.2 概览首项：代表媒体图库

- 概览正文最前面是 `代表媒体图库`，先于今晚结论、路线、设施、风险和其他摘要。
- 图库使用真实相机拍摄的星空照片，不使用 CSS 渐变、抽象占位图、AI 生成图或把 UI 图标冒充照片。
- 当前没有用户指定点位的授权现场照片，因此本轮候选使用来源和许可明确的真实星空实拍，并持续标注 `实拍代表媒体 · 非本点位现场`；不能写成“该观星点实景”。
- 每张照片保留可发现的摄影者/来源/许可或公共领域信息、替代文本和查看大图入口；加载失败、无媒体、审核中仍需有诚实状态。
- 资源可嵌入 HTML 以保持离线审计，不得依赖运行时外网。

本轮允许的三张实拍候选均来自 Wikimedia Commons 且标注 CC0：

1. `Orion constellation.jpg`，摄影者 Taavi Niittee，CC0 1.0：`https://commons.wikimedia.org/wiki/File:Orion_constellation.jpg`。
2. `Milky Way Night Sky (Unsplash).jpg`，摄影者 Guillaume guillaume，2013 年发布并在 Commons 标注 CC0 1.0：`https://commons.wikimedia.org/wiki/File:Milky_Way_Night_Sky_(Unsplash).jpg`。
3. `Star trails (33247004142).jpg`，摄影者 hannahisabelnic，CC0 1.0：`https://commons.wikimedia.org/wiki/File:Star_trails_(33247004142).jpg`。

### 3.3 攻略图片

- 每个攻略卡片具有稳定的图片区域，至少包含图片、来源/状态、标题、摘要、作者/类型、更新时间和进入详情的操作。
- 没有攻略图片时显示明确空态，不能通过装饰渐变伪装成实拍。
- 图片裁切不遮挡关键内容；在大字、窄屏和加载失败时卡片仍然可理解。

### 3.4 夜空新增“今晚推荐观测目标”

- 点位详情 `夜空` 分段在首层新增一整行 `今晚推荐观测目标`。
- 示例目标可包含 `猎户座`、`木星`、`金星`、`流星雨`、`双星伴月`，但必须持续标注为示例/候选，不可声称它们在任意日期、地点均可见。
- 每个目标至少表达名称、适合时段或不可用状态、方向/类型的可理解摘要，以及进入目标或星图详情的操作。
- 推荐目标由同一个 `spot_id + date + time + timezone` SkyContext 派生；缺失、过期、估算、数据不足与硬安全阻断不能被伪装成推荐。

### 3.5 取消独立“今夜”一级页面

- 删除底部全局导航中的独立 `今夜/夜空` 入口；全局底栏候选调整为 `地图 / 我的` 两项。
- 不再存在“从底栏进入、以当前位置或普通地点作为上下文”的独立大页面。
- 原 APP-03 资源不再代表一个一级路由；它保留为 `观星点详情 > 夜空` 的聚焦交互资源，以继续承载专业数据、目标列表、简化星图、传感器/手动方向、日期时间和黑红观测模式的必要细节。
- 详情夜空使用确定的 `spot_id`。日期与时间仍可编辑；地点不可脱离该详情页任意切换。
- 专业数据、目标列表、星图和观测模式均是当前观星点详情的下钻页面，返回后恢复同一详情页、同一夜空分段和同一 SkyContext。

### 3.6 地图与普通地点分支

- 地图上的正式观星点仍可进入详情，再从详情进入夜空。
- 因独立夜空页面被取消，普通城市/景区/POI 搜索只负责移动地图和展示附近观星点，不再提供 `查看此处夜空`。
- 若附近没有正式观星点，候选显示 `选择附近观星点`、调整区域或商用版 `建议新增观星点`，不能为普通 POI 暗中创建 `spot_id`。
- 这是为使本轮候选可操作的解释，仍属于 pending product reconciliation；若用户后续要求保留任意地点夜空能力，需要重新明确其页面归属。

## 4. Interaction and accessibility consequences

1. 详情分段切换保持懒加载、焦点恢复、滚动位置恢复和独立失败/重试；新顺序不能复用旧数组顺序造成读序错乱。
2. 图库支持水平浏览或分页，但不得产生文档级横向滚动；隐藏原生滚动条时仍保留触摸、键盘和辅助技术可达性。
3. 照片触发器和目标卡均满足至少 `88rpx × 88rpx`（候选中 44×44 CSS px）。
4. 图像有有效替代文本；摄影者、来源和“非本点位现场”不能只通过悬浮显示。
5. 从夜空下钻并返回时恢复所选目标、日期时间、滚动位置、模式与焦点；进入黑红观测模式仍遵守闭合黑/暖红规则。
6. 两项底栏在 320/375/430、大字和安全区下均无原生横向滚动条、无碰撞，并保留明确选中态与无颜色提示。

## 5. Non-global replacement rules

- 不删除产品领域中的“今晚结论”或用户可见的“今晚推荐观测目标”；仅删除独立全局 `今夜/夜空` 一级入口。
- 不删除夜空、专业数据、星图和观测模式能力；它们改由观星点详情夜空拥有。
- 不把所有攻略都删除；只调整详情分段顺序并增加攻略图片区域。
- 不把代表性实拍宣称为具体观星点实景，也不因使用真实照片而放松来源、许可、位置隐私或审核状态。
- 不改变 MAP-R01 的筛选标签、筛选交互或三组层级。

## 6. Product/technical implications held pending selection

- 原产品/技术方案的三项全局导航、直接查看任意地点夜空、`pages/night/index`、当前位置/手动地点 SkyContext 入口和相关验收需在最终选定后更新。
- `SpotSkyContext` 将从“spot/current/manual location”收紧为详情夜空中的 `spot_id` 上下文；是否仍保留后台通用 location context 作为未来能力为 `decision-required`。
- Demo 路由、tabBar 配置、返回恢复、分享路径、埋点漏斗和缓存 key 需要删除独立 Night route，迁移到 spot detail/night 子路由。
- 真实媒体需要许可、来源、衍生裁切说明、内容审核、EXIF/GPS 清理、缓存和失败降级；候选照片仅证明版式与事实呈现，不代表生产素材库已准备。
- 今晚目标的天文计算、事件目录、可见性阈值、地点/时间算法与来源仍由产品/技术方案拥有，示例文案不能变成算法事实。

## 7. Resource dispositions

| Resource | Disposition | Reason |
| --- | --- | --- |
| APP-01 全局流程/路由图 | `new-revision-needed` | 删除独立 Night、改为两项底栏、更新普通地点与详情夜空分支 |
| APP-02 点位详情原型 | `new-revision-needed` | 图库前置、攻略第二、攻略图片、目标行和夜空下钻 |
| APP-03 夜空聚焦原型 | `new-revision-needed` | 从一级页面改为详情夜空聚焦资源 |
| APP-05/06/07/08 跨页资源 | `new-revision-needed` | 组件、交互、响应式、实拍/来源规则均改变 |
| MAP-01/02/03/04 | `new-revision-needed` | 全局底栏和普通地点流改变；MAP-R01 必须不回退 |
| 新的独立图片 moodboard | `not-needed` | 实拍与许可可在现有详情/资产资源中充分表达 |
| Figma 副本 | `not-needed` | 当前仍是 Open Design 审计循环，无协作副本需求 |

## 8. Reconciliation status

`accepted-for-next-candidate / pending-user-review`。没有最终选定、原始方案回写、Design Authority adoption、formal handoff 或生产实现。

