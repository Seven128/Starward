# 地图 / 我的候选：交互说明与验证边界

本文件是本轮资源实验的采用前说明，不是生产改动或采用记录。用户评审仍在进行，尚无方向被选定。当前业务与交互要求由 `project_context/areas/main/screen-contracts/wechat-miniapp.md` 及其子节点拥有，精确视觉值仍由根 `DESIGN.md` 的小程序 profile 拥有。本文件不改变这些上游。

## 证据层级

| 层级 | 本轮可以陈述的结果 | 不能据此陈述的结果 |
| --- | --- | --- |
| 静态 Figma 候选 | 已有实际节点与 PNG；状态版可以表达布局、字级、候选状态和可编辑层级 | 不证明原生地图、触控、键盘、无障碍、业务数据或连续过渡可用 |
| 独立交接补丁 | 执行任务报告实际 My 说明自然两行、42px，导出前后 Map PNG SHA 相同；原始说明缺失，补丁只插入一个 Text 并让纵向布局撑高 | 不证明手机已阅读、其他宽度已重排、生产已修改 |
| 当前代码观察 | 下文列出实际 owner 和已观察到的处理逻辑 | 代码存在不等于本轮运行验证通过，测试文件存在不等于测试已执行 |
| 采用后工作 | 在现有 owner 中投射选定布局，保留状态、数据和交互责任，并验证同一候选的真实运行结果 | 本文不授权或宣告上线，不将待测记为通过 |

本次抽查实际 layer coverage snapshot `experiment-1/B/coverage/map/coverage-map-map-day-layers-390.json`：root `1:7119`，140 个节点，`reactions` 总数为 0。它是静态状态画板，不能称为已连线交互原型；不将该抽查外推为所有画板的完整审计。

## 地图交互

| 场景 | 必须保留的用户结果与状态 | 当前代码观察 | 静态表达与采用后验证 |
| --- | --- | --- | --- |
| 正式 marker → medium | 首次有效激活正式点位即选择并打开同一个 medium 面板；保留共享时间。聚合点先放大聚合范围。空白地图点击退出面板；平移/缩放由地图独占 | `pages/map/index.tsx` 的 `onMarkerTap` 区分聚合；`openDetail` 直接设 medium、选择点位和 spot-panel，异步回调核对请求代次、点位和 reset version | medium PNG 只表示选中后的布局。运行时验证单次 marker、生效前换点、聚合、退出中重选及地图 pan/pinch 不被遮挡层抢走 |
| small / medium / large | hidden 是可见性，不是第四档；三档保留同一正式事实文档，extent 只改变裁切。large 才开启文档纵向滚动；不重排事实或为每档另建数据映射 | `spot-panel.tsx` 复用一个 ScrollView，`scrollY={extent === "large"}`；当前代码有 handle/extent controls，是否符合实际可见命中几何需运行检查 | 多个静态画板不是同一运行中树的证明。采用后核对同一节点/数据身份、滚动位置、异步加载及缩小再放大的保留行为 |
| handle 拖动、轻点和取消 | 只有小长矩形 handle 命中区发起 extent 拖动。pointer down、阈值内 tap 不改变档位；正文/媒体不发起 extent。方向未定先等待，选定 owner 后不转移；反向输入从实时位置改目标，不排队 | `index.tsx` 有 handle touch start/move/end/cancel、单触点身份检查、位置测量与 spring owner；handle 本身没有 onClick 档位轮换 | 拖动轨迹、阈值、惯性、多指、取消、中途反向和正文纵滚须在 WEAPP 连续执行。静态 handle 外观不是手势证明 |
| large 返回 medium | large 左边缘 Back 手势或 handle 下拉回 medium，保留点位、章节与有意义滚动；普通 Back 按 owner 优先级处理 disclosure 和面板，再考虑路由 | 上游 DESIGN/Context 明确此义务；本次读取没有建立原生系统 Back / edge-back 接线已完整实现的证据 | 必须分别测屏幕手势、系统返回、可访问 extent 操作及取消。不能用按钮跳图或绘制轨迹代替。存在缺口时在原 owner 补齐 |
| 概览 / 天文章节定位 | 身份下左对齐文字、短下划线、同文档吸顶；small/medium 激活先到 large 再对齐章节。直接滚动更新选中项，不能改地图相机/点位或外部页面滚动；辅助激活完成后焦点到目标标题 | `spot-panel.tsx` 有 sectionRequest、spotId 校验、章节位置测量、scroll anchor、`onExtent("large")`；当前 ScrollView 使用 `scrollWithAnimation={false}`，不据此宣称已实现可中断动画与标题焦点恢复 | 核验真实吸顶遮挡、异步增高、快速交替、滚动同步、焦点与 reduced motion。此处是章节定位，不是两个切换页面 |
| 有图 / 无图与 chrome | 仅合法可用媒体在 medium→large 中连续展开；无图完全省略媒体节点并保留 compact handle band。有图展开和 Search/location/layer 的 near-top 淡出遵守当前 owner 时序；退出按其恢复规则；主导航不被覆盖 | 当前 Map 有连续 panel/spring 与 chrome 样式参数；静态有图/无图 coverage 不覆盖中间帧 | 对同一点位连续录制展开、收起和取消，检查图片与 Search 可读内容不重叠、不闪现空媒体区；媒体授权和原生渲染另核验 |
| layer 与 panel 互斥 | 一个 `none | spot-panel | layer-sheet` presentation owner。打开 layer 移除当前 panel 的活跃命中/语义，保留可恢复模型；新 marker 直接转新点位 medium。没有新意图时关闭 layer 可恢复先前面板 | `index.tsx` 有单 enum、`extentBeforeLayer` 和点位一致性检查；`openDetail` 清空旧恢复目标。三个分析 layer，底图不作为第四项 | 同次连续运行验证 panel→layer→新marker、关闭→恢复、系统 Back、输入发生于退出期间；任何时刻不能出现两个活跃命中面 |
| 时间 preview / commit / cancel | Layer 中时间、选中层、指标、地图反馈共视口；尺下真实轨道水平移动，中心指示固定。preview 只投射真实 slice；合法 release/snap 提交唯一 Observation Context；取消/离页/失败回已提交值 | `time-ruler.tsx` 使用 enhanced horizontal ScrollView、onPreview/onCommit/onCancel，hide/unmount/多触点/frames变化取消；`commitMapTime` 核对请求与 context revision/fingerprint，失败恢复原时刻；`map-time-frame.ts` 精确时刻缺失返回无信号，不借相邻预报 | 验证真实 frames 的 timestamp、polygon、metric、point summary 同步；不能把刻度动画当真实数据更新。`LIGHT` 为来源注明周期的静态数据，不能制造小时变化；动态 CLOUD/OPPORTUNITY 只取对应 frame，缺失诚实呈现；无 frames 不可假造滑动值 |
| 搜索进入与返回 | Search 进入保持同一输入场的可见几何/文字，只转 leading icon；保留物理 Map、camera、筛选、时间和 layer。整卡合法激活提交正式点位→已有 Map medium；drag-away/取消不提交。Back/系统/edge-back 共用返回语义 | `search-page.tsx` 有 `navigateBack` 失败的局部恢复通知、选择请求代次保护、输入 focus 状态；本轮未验证原生过渡或滚动/焦点恢复 | 核验输入法、blur/suggestion竞态、筛选立即提交、想去/其他分组、选择失败、返回失败、重复点击及重入后 query/filter/partition/scroll。不得新建第二张 Map 或清空共享时间 |
| 云观星上下文 | 仅可见正式 spot 面板入口带合法 Observation Context 推送 `sky/detail`；保持 spot/time/timezone/revision，不能回退到 GPS 或伪造星空。出入不丢 Map 有用状态 | `onPanelCloud` 检查 selected、detail、FORMAL_SPOT 身份一致，传 spotId/contextId/date/selectedAt/timezone/dataRevision；未就绪在原动作附近恢复 | 核验陈旧/缺失上下文被阻止、返回到同一面板、时间一致、前后台 sensor 停启。静态 sky 箭头/文案不证明传感器或星位准确 |

代码路径均相对于 `apps/wechat-miniapp/src/`。业务原值、提交边界、formal spot 资格、媒体审查、来源与风险不因布局选择改变。

## 我的交互

当前 owner：`features/my/my-library-page.tsx`、`features/my/plan-entry.ts`、`hooks/use-contribution-history`、`services/api-client` 和现有 query/app store。候选不得另建身份、计划、贡献状态真源。

| 场景 | 当前代码事实 | 采用后义务与验证 |
| --- | --- | --- |
| 身份与加载 | library query key 绑定 `currentDraftUserId`，未解析身份用挂载标识隔离；回写计划/偏好前核对当前 owner；`useDidShow` 刷新身份并对过期 active queries refetch | 候选账户标题/gear 不得跳过鉴权或显示他人缓存。测冷启动、未解析身份、切换/失效、网络恢复、迟到旧请求；未取得数量时显示加载/不可用，不能以 0 或样例 1/2 代替 |
| 计划标题和目的地 | `selectPlanEntry` 按各计划 timezone 的当天日期，依次选今日、最近未来、最近历史，并区分“今晚计划/观星计划/已保存计划”；导航沿用 planId | 不能将候选固定日期和地点当真实常量。测跨午夜/时区、无计划、多计划、历史计划；保留原 detail 路由和数据 |
| 贡献与状态 | 当前代码按 server submissions 派生 draft 与 pending/changes-requested 数量；拥有独立加载、错误、旧值和重试路径；My 与面板进入同一个 contribution owner | 说明不改变提交流程；样例“1 条草稿 / 2 条待审核”只属于本轮静态 fixture。既有数据可用时保留旧值并明确未刷新；无权或无数据不能声称成功/最新 |
| 子页打开和失败 | `openPage` 防重复导航；Taro.navigateTo 成功清对应失败通知，失败说明当前内容保留；设置、计划、贡献、链接、导入沿用独立 child routes | 单一 gear 只替换设置入口的呈现位置。命名、键盘/读屏作用与失败恢复不变；不同时保留第二个设置入口 |
| 返回滚动与焦点 | My Tab 常驻且返回时刷新；本次实际 ScrollView 未见显式 scrollTop 恢复或 opener focus 恢复接线，因此不能把“常驻”当作已验证完整返回体验 | 记录用户离开前有意义的滚动位置和 opener；Back 后恢复该位置与逻辑焦点，身份/数据改变使 opener 消失时落在最近稳定所属组。测系统返回、导航失败、刷新导致增高、连进连出。保留已编辑草稿，不因返回刷新覆盖本地编辑 |

## 同一候选的连续运行检查

下面是采用后待执行检查，本轮没有把它们记为通过。

1. 在 320/375/390/430 logical px、标准字号与对应 safe area，实际量取可见控件和命中区。每个动作至少 44 logical px，扩展命中区不得互相侵占；不以 `88rpx` 在所有宽度都等于 44px 为前提。文本重排，整页不横滚，不缩小正文解决长说明。200%/大字仍按 owner 暂停，不悄悄恢复为本轮生产义务。
2. 同一个运行会话完成 Map marker→medium→handle large→章节定位→滚动→取消/返回 medium→layer→真实时间 preview/cancel/commit→Search 返回→sky 返回→My 子页返回。记录身份、spotId、context revision/time、滚动与焦点；不是各状态分别冷启动拍图。
3. 在上述活跃 route/state 上经 Settings 同一三态控制切换 day→night→observation，再反向切回；不重置地点、查询、档位、时间、草稿和有用滚动。观察切换中间帧、骨架/图层/原生边界白闪、过期请求回流、媒体 opt-in 和 observation 黑/暖红闭合色域。
4. 以 reduced motion、取消、快速反向和前后台恢复重复关键操控；核验过程只由一个手势 owner 消费，焦点不逐帧跳、读屏只播报提交/重要状态。真实原生地图、系统 Back、sensor、provider 和设备阅读各自保留证据边界。
5. 对缺失、旧值、加载、离线、身份恢复、长中文逐项观察实际内容；source-backed 风险和恢复不能藏在省略号或固定高度后。保存同一最终候选的截图/连续录屏、状态读回和所用版本；失败修复后仅重跑受影响链路。

本次仅补充文档；没有运行 WEAPP、接入原生手势或为候选添加 Figma reaction 连线。实际检查和人工评审状态继续由本轮实测记录拥有。
