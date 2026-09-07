# 实验 1 · B · 独立生成记录

调用 `.agents/skills/starward-design-resource/SKILL.md`。本目录只含脚本与说明；未操作 Figma、浏览器、生产代码或 Skill。未读取 A 的目录、脚本、候选或评语。

共同 run.json 的宿主记录为 `gpt-6-astra / high`，source 为主任务 host rollout turn_context（2026-09-07）；本子任务继承调用设置，没有换模型。独立子任务自身尚未取得额外宿主配置证明，用量 `null`。本记录不是模型自报证明。

## 三个事前假设

1. **连续清单**：地图的开放、设施用清晰的横向事实行，让可用的短事实共享基线；我的由账户头、计划与贡献的连续共享面、两个日常入口组成。用细分隔和邻近关系减轻容器重量，主要对象和未核实进入条件一眼可读。
2. **关联矩阵**：地图设施值落在一个低对比矩阵，开放条件在同组保持完整；我的用一个分隔的浅色工具面将计划地点与草稿/审核放在同一对象组，链接与导入仍为常规行。它与方向 1 在分组方式和视觉重心不同，重心由单条清单移到可比状态与地点。
3. **标签分区**：地图以短类别列和全宽事实列区分到达/设施；我的计划用日期侧栏、内容入口用简短标签形成阅读轴。它与前两者在列结构、节奏和容器策略不同，不增加功能，也不以颜色作为方向差异。

方向名仅存于资源外，不写进产品画面。全部初稿是 day 390×844。其他主题调用主动报错，避免把未经回看的主题输出当交付。

## 固定与拟议差异

- 字体使用调用方实际加载的 Noto Sans SC Regular / Medium。正文 15/22，次正文 14/21，动作 14/20，地点 20/28，来源元数据 12/18；不缩小字维持单行。标题 600 近似使用当前共同可用 Medium，不伪造字体字重。
- 原生 Text、Auto Layout、Component 和 Instance 保持可编辑。搜索、导航、面板动作等实例来自本画板裁切外的原生 master；未写入父 root 之外。页面叠层、系统区、地图和手柄是明确的绝对定位例外。
- 所有命名 control 都具有至少 44px 高度；把手仅自己的 76×44 区域承担拖拽。控件不因为小图标被缩小命中区。
- 地图使用共同 OSM PNG 原始 390×480，图像不调色、无重画；顶部 y=88，marker 锚点是图像 (195,209)。归属保留于可读的白底小行。它是外部参考，不是腾讯 native map 或当前 WEAPP 证据。
- 候选 medium 顶部 y=330，底部到主导航 y=754（高 424）；这是资源探索的拟议几何，较当前 DESIGN `clamp(320px,56vh,480px)` 的屏幕高度表达更短，目的是保证共同固定地图锚点在面板上方可见。采用前需要与实际内容 viewport 和 native 安全区一起校准。没有改变 hidden/small/medium/large 的业务语义。
- medium 只裁切同一 retained document；time 位于天文区，可能在该状态不可见。不会为了检查核心 key 增造时间浮卡。概览/天文仍是向同文档定位，点击应先扩到 large；当前脚本不声称静态节点验证了真实滚动。
- 我的仅保留紧凑账户和一个 gear。原生产卡内重复统计及列表设置没有被复制；计划、贡献、链接和导入保持真实职责。
- 共同输入的样例日期、地点和账户状态均为 fixture；界面不显示模拟数据说明，但本说明明确不是实时或私人资料。停车/厕所/开放暂无数据，夜间进入条件待核实，无许可结论。

## 输入与代码所有者

已读 AGENTS.md、project_context/global.md、project_context/context.toml、DESIGN.md 小程序段、`.codex/skills/uiux_design/SKILL.md`。已读主 WeChat Screen Contract 及其 map-and-finder、surfaces-and-controls、spot-and-sky、information-design、shared-state-and-recovery。已读共同 brief、run.json、test-plan-current.md，以及设计资源开发方案中当前范围和生成要求。

新 Skill 引用读取：references/starward-miniapp.md、design-method.md、figma-runtime.md、delivery-and-review.md，及 scripts/figma-helpers.js。

代码核对：地图 index.tsx、spot-panel.tsx、time-ruler.tsx 的 owner 与主要行为；我的 index.tsx、features/my/my-library-page.tsx、plan-entry.ts；components/custom-nav.tsx、semantic-asset.tsx、semantic-asset.scss；当前资产目录。主导航已核对实际由 `apps/wechat-miniapp/src/app.config.ts` 拥有原生 tabBar。docs/source-plan.md 的范围声明已读，它明确仅属原生 App，故本任务使用独立小程序合同。

资产缺项已报告并由主任务统一解决：两组可复用 `docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/selected-source/assets/icons/` 的既有 Lucide 1.33 ISC SVG 几何，按当前 token 配色；未读旧布局或旧视觉规范。脚本将语义 location/layers/user/conditions/horizon/share 映射为 locate-fixed/layers-3/user-round/clock-3/link/send，其余使用 search/map/settings/images/download/chevron-right/star/compass。缺项显式报错，未引入第二风格。star 优先由主任务共享当前 semantic 源。

## 交互与恢复说明

有效 press-out 才提交点击，drag-away/cancel 不提交；按下仅即时状态反馈。面板只有把手经过方向阈值后取得 vertical owner，从 live presentation 拖动，release 按位置与速度落到同一合法档；tap 无动作。ruler 横向取得 owner 后独占，preview 对应真实离散切片，commit 写唯一时间，cancel 返回旧值，LIGHT 不伪造小时变化。搜索返回保留 map/camera/selection。打开 layers 与 spot panel 由一个枚举协调器互斥。分享只由用户主动点击分享公开地点摘要；云观星需要正式点与有效上下文。我的 child-route 失败留原账户/草稿并提供原 owner 恢复。

主任务负责真实原型跳转 wiring、Scripter 执行、导出与同轮 snapshot。静态资源不能证明手感、原生地图、主题白闪、身份隔离或手机可读性。

## 轮次状态

round-0 脚本已编写，尚未执行到实际 Figma；尚未看到任何本组 PNG，未做视觉通过声明、量表自评或用户偏好代填。等待本组六张真实 PNG 后按原始比例回看，再决定是否使用最多两轮正式视觉修订。技术修复与视觉修订分开记录。

执行前静态技术检查：`node --check design.js` 通过。已修复原生 horizontal Auto Layout 的轴 sizing、Instance 不能 appendChild 的选中线实现，并核对实际导航 owner；这些修复发生在首次导出之前，不计正式视觉修订。不以语法检查代替 Figma 写入、中文重排或像素证据。
