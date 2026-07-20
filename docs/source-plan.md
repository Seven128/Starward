# 《今晚去观星》React Native APP 完整 Source Plan

> 文档性质：供后续 /long-task-workflow 读取的上游 Source Plan。
>
> 权威边界：本计划保存用户意图、必要推导、待决策项与可观察验收，不是 Delivery Contract，不绑定真实 owner、文件、runner、proof 或 Assertion，也不宣称实现完成。

## 1. Goal And Success Definition

### 目标用户

- 新手观星用户：需要直接结论、容易到达的地点、明确时间、基础设施和手机拍摄建议。
- 星空摄影爱好者：需要银河/月亮/行星/流星雨等目标的时间与方向、真实机位、前景、月光、分层云量、摄影参数与设备适配。
- 星空目视观测爱好者：需要暗度、透明度、视宁度、四向遮挡、平整平台、设备搬运距离、临时光源和安全条件。
- 亲子、露营、骑行、公共交通和不同设备条件的用户，通过偏好预设进入同一决策闭环。

### 要解决的问题

用户不应分别打开天气、地图、光污染、星图、天象日历和摄影参数工具后自行拼接结论。产品必须将地点、天气、天文、光污染、地形遮挡、路线、设施、安全、用户能力和设备条件合成为一份可执行方案。

### 最终可观察结果

- 用户在 React Native iOS/Android APP 中完成“判断条件 → 选择主备地点 → 生成行程 → 导航 → 现场辅助 → 实况反馈”的闭环。
- 首页先回答今晚是否值得出发、最佳窗口、推荐地点、预计车程、可见目标和是否需要立即出发，再按需下钻专业数据。
- 地图、地点详情、路线、行程、天空、摄影和现场模式共享一致的地点、时间、路线和风险状态。
- 断网现场仍可读取观测数据包、地图与方向信息、切换备选点、记录实况，并在联网后安全同步。
- 推荐与预测可解释、可追溯、标注新鲜度/可信度/来源，不能把模型输出包装成确定事实。
- 系统在安全、隐私、性能、数据质量、供应商故障和户外真实设备条件下具有明确降级与恢复路径。

### 成功边界

- 本计划覆盖产品大纲和技术架构的完整目标形态，并保留 MVP、V1、V2、V3 的范围顺序。
- 用户本轮明确最终载体是 Expo + React Native APP；早期 PWA 只作为原大纲中的验证建议记录，不作为本交付的替代完成形态。
- 参考图只提供信息层级、布局与交互模式证据；产品逻辑以产品大纲为准，视觉身份以项目 DESIGN.md 为准。

## 2. Background, Current State And Source Inventory

### 当前项目事实

- 仓库/工程名为 Starward，用户侧产品名为《今晚去观星》，品牌句为“从黄昏走入星夜”。
- 当前仓库有 Tiny Context、DESIGN.md、Open Design 参考导出、项目级 React Native 交互动效 Skill 与一份官方来源技术/数据决策包；仍没有生产 APP、后端、数据管线、已购买供应商或真实生产集成。
- DESIGN.md 已声明移动端优先、390 × 844 主视口、44px 触控目标、结论/行动/证据三级信息层、日间/夜间/红光模式、地图与时间共用曲线和圆形节点语法。
- project_context/** 已声明地点、时间窗口、路线、到达、风险和专业证据是一组协调状态，并声明 DESIGN.md/Source Plan/Context 对项目 Skill 的单向上位权威关系。

### 文本来源

- S-ARCH：技术架构附件，2,042 行，53,663 bytes，SHA-256 1de938f5a16c1e3040ec967457479031d576b00c25d3b34c85ebb69d555b38b3。
  - 来源路径：C:\Users\777\.codex\attachments\536861fc-7965-421e-ba5c-36af501fad92\pasted-text.txt
  - 覆盖：React Native/Expo、原生模块、地图/坐标、后端领域、数据源、推荐、API、缓存、任务、媒体、部署、安全、可观测性、测试、性能、风险与工程顺序。
- S-PRODUCT：产品大纲附件，1,995 行，42,179 bytes，SHA-256 4dd9c487f89955673fcb3f59dd4e38817683835f8f204b72dee6ee4c861bf0a3。
  - 来源路径：C:\Users\777\.codex\attachments\0d11984e-40b8-43ee-b8dc-a7f4ebac3505\pasted-text.txt
  - 覆盖：目标用户、场景、五入口信息架构、全部功能、数据模型、通知、MVP/V1/V2/V3、指标、后台与风险。
- S-DESIGN：仓库根 DESIGN.md，提供视觉 token、品牌语义、布局、组件、模式和视觉禁区。
- S-CONTEXT：project_context/global.md、architecture.md、areas/main.md，提供 durable surface/interaction 边界；本轮独立 UI/Context workflow 已更新交互责任与 Skill 单向权威，供应商推荐仍未被写成已决生产事实。
- S-RESEARCH：仓库 `docs/technical-data-source-decisions.md`，2026-07-20 官方/一手资料调研，覆盖移动栈、天气、地图/路线、VIIRS、DEM、星表、卫星、专业天象、推送、对象存储/CDN、离线加工、成本、POC、商务/法务门和官方证据；其中 `recommended` 不自动等于已批准 DEC，`contract_gate`/`poc_gate`/`external_confirmation` 不得由 Agent 伪造完成。
- S-INTERACTION：仓库 `.codex/skills/uiux_design/SKILL.md` 及其 references，提供 React Native Press/Gesture Handler/Reanimated/Bottom Sheet/触觉/无障碍/双平台执行映射和上游许可；它必须先读并服从 S-DESIGN、本计划与 S-CONTEXT，不是平级或反向权威。
- S-APPLE：Emil Kowalski `apple-design` Skill，固定审阅 revision `6bf24434f7730ad169077756cf9c7cd7bd675fc6`，MIT License；只采纳可迁移的即时反馈、直接操控、中断/速度连续、空间一致、克制触觉、无障碍与交互原型原则，不采纳其 web 代码、玻璃材质、系统字体默认或让 Android 模仿 iOS。
- S-USER：用户指令要求以 React Native APP 为目标、细化到基本布局/具体内容/控件级、不得遗漏两份附件任一细节、参考但不复制截图；进一步要求完成技术/数据源调研和 Starward React Native 交互规范，全部写回 DESIGN.md 与 Source Plan，并由项目 Skill 执行但不形成循环权威；数据源必须先满足真实性、目标区稳定性和合法可运营性，再在合格候选中优先选择最低实际总成本，付费时尽可能选择便宜的方案。

### 图像来源与证据处置

- S-IMG-01，941 × 1672，SHA-256 1b73a4917aae62f882fabad387269103008d0b91ebb8d324c5c51b37c00b99f4。
  - 来源路径：C:\Users\777\AppData\Local\Temp\codex-clipboard-160192c7-186e-4294-b97d-d7790c031f18.png
  - 证据：深色五入口底栏；评分先行首页；路线起终点、摘要、地图与目的地面板；连续专业数据区；装备分类和卡片。
  - 不采纳：概念稿 Logo、望远镜 3D 资产、过度蓝色发光和具体文案/数值。
- S-IMG-02，941 × 1672，SHA-256 e6b1bbc9fd1e546b5c7815921e08c3b3209bd1ff1cef5f1f4ac7c15dac8e6584。
  - 来源路径：C:\Users\777\AppData\Local\Temp\codex-clipboard-b56a3b3b-41c3-491e-b7c1-607e101edec0.png
  - 证据：观星地图 → 地点详情 → 天空天气 → 装备与计划的任务链；地图筛选、地点浮层、详情主操作、小时预报、装备检查清单。
  - 不采纳：海报包装、品牌图标、摄影器材装饰和具体页面复制。
- S-IMG-03，520 × 980，SHA-256 b9a0198b7da8685b16c17367382d85d6f3e92e5220a991f48761c72ca439be85。
  - 来源路径：C:\Users\777\AppData\Local\Temp\codex-clipboard-16460253-e9cf-44ce-a0fd-6ce6a4a57ee7.png
  - 证据：行程详情顶部标题/时长；总览、分日、待规划分段；备注、图片空间、路线概览；底部固定“复制/地图”动作。
- S-IMG-04，520 × 980，SHA-256 3dedabfed726f549412e2e7125b6b60adbab8ff35bb2f4b2dc64042016ba68e8。
  - 来源路径：C:\Users\777\AppData\Local\Temp\codex-clipboard-867996f9-41e3-4706-8525-5f81e4efb9a6.png
  - 证据：行程首页搜索与筛选胶囊、横向行程卡、空白区导入提示、主要新建按钮和浮动新增入口。
  - 不采纳：把“小红书导入”提升为 MVP；该能力仍按产品大纲放在 V2。
- S-IMG-05，520 × 980，SHA-256 7c01985603041f7168641e9598b4ea54938d2d976d453ceacc99a32c59b5b0ab。
  - 来源路径：C:\Users\777\AppData\Local\Temp\codex-clipboard-49524788-0998-4e74-a2db-3beee60df21e.png
  - 证据：全程/分日/待规划的全屏地图切换、路线分段颜色和日程标签。
- S-IMG-06，520 × 980，SHA-256 9f692307721a577688b95ef6da53ba10649a1ec76d69aa71659e9f06963185c8。
  - 来源路径：C:\Users\777\AppData\Local\Temp\codex-clipboard-37aa291f-06e7-41fa-a1d4-4b7b7b90ae28.png
  - 证据：行程总览中的内嵌地图、分日摘要卡、待规划入口、天气区域和固定操作。
- S-IMG-07，520 × 980，SHA-256 711e936c027e5624f3636176795d9ceda33d79165de67c322f2842e2790878e4。
  - 来源路径：C:\Users\777\AppData\Local\Temp\codex-clipboard-c025cbf7-d8d2-465c-a76d-dc8746acb07a.png
  - 证据：分日路线上的编号地点、选中地点卡、路线段摘要和底部路线切换。
- S-IMG-08，520 × 980，SHA-256 219dcbc6692e0fd838a3af89233949cf0c2fa99ef7f9c1f4b3f85eddb52b5cb4。
  - 来源路径：C:\Users\777\AppData\Local\Temp\codex-clipboard-29f40458-4072-46d4-bad5-d93a50a0f5ec.png
  - 证据：全天空光污染极坐标图、地平线开关、视角分段、亮度图例、保存图片和关闭动作。
- S-IMG-09，520 × 980，SHA-256 bd933a5a1ec66691f1784ecd2a3d5d86978c1a1c0a42ec06869465c430ca1f47。
  - 来源路径：C:\Users\777\AppData\Local\Temp\codex-clipboard-be377b20-93ed-4514-b17a-fadb09806bc3.png
  - 证据：光污染年份图层、地图图例、点位浮层、SQM/地面亮度/银河与目标可见性、趋势入口、精选点入口。
  - 不采纳：直接把 VIIRS 或估算值称为确定 Bortle；必须保留数据年份、方法与置信度。
- S-IMG-10，520 × 980，SHA-256 da490ee44e40bc199cc8030cb26c0e1c905e6408d1b7f012a2b5d6a53909324e。
  - 来源路径：C:\Users\777\AppData\Local\Temp\codex-clipboard-7911cbeb-bc58-4bce-a404-c4d00f872e96.png
  - 证据：位置与方向、月相、天气摘要、连续黑夜/银河时间带、晨昏预报、主/对比模型、15 日入口和专业工具底栏。
  - 不采纳：高密度数据直接成为新手首屏；本产品坚持先结论再下钻。

### 来源优先级和冲突处理

1. 本轮用户明确指令优先。
2. 产品能力和业务规则以 S-PRODUCT 为准。
3. 实现边界和技术义务以 S-ARCH 为准。
4. 已有视觉事实以 S-DESIGN 为准。
5. 已有 durable 边界以 S-CONTEXT 为证据。
6. S-RESEARCH 证明当前外部事实和推荐路径，但不能替代用户/产品 DEC、合同、采购、法务、POC 或现场确认。
7. S-INTERACTION 是 S-DESIGN/本计划/S-CONTEXT 的下游实现伴随指南；S-APPLE 仅为其有署名的上游灵感，不改变 Starward 品牌或平台规则。
8. S-IMG-01～10 只支持布局/交互推导，不允许覆盖前述权威来源。

## 3. Delivery Scope

### In Scope

- Expo + React Native + TypeScript 的 iOS/Android APP。
- 今晚决策、专业预报、观星地图、地点详情、路线、主备方案、行程、天空模拟、摄影、现场模式、离线、贡献、通知、账号/隐私。
- 模块化单体后端、数据工作进程、管理后台、天气/天文/地理/路线/推荐数据底座。
- MVP、V1、V2、V3 的完整目标与依赖，按原大纲的渐进边界实施。
- 生产质量所需的安全、隐私、可观测性、测试、性能、备份、部署与数据许可。

### Release Scope Preserved From Source

- MVP：当前位置/日期、今晚结论、基础天气与天文、光污染地图、人工初始地点、地点详情/筛选/推荐/主备、外部导航、简单行程卡、手机摄影基础预设、地点上传、评论/评分/实况、基础埋点。
- V1：多模型、小时专业预报、15 日趋势、完整路线/行程编辑、360°星图、银河/月亮/行星、设备档案、AI 摄影解释、现场模式、离线地图/缓存、动态主备切换。
- V2：共同编辑、行程复制、装备分工、全景/遮挡、贡献等级、图文攻略导入、更完整评价、地点热度与拥挤预测。
- V3：AR、镜头视场/构图、空间站、流星雨数量、极光/彗星/日月食、星轨/银河轨迹、摄影计算器、天象日历与专业内容。

### Non-goals

<a id="non-goal.generic-weather-dashboard"></a>
<!-- ty-source-item:start key=ng-generic-weather-dashboard kind=non_goal -->
- **NG generic-weather-dashboard**：不把产品做成只展示接口字段的天气仪表盘、通用星图或旅游路线工具。
<!-- ty-source-item:end -->

<a id="non-goal.pwa-as-final-product"></a>
<!-- ty-source-item:start key=ng-pwa-as-final-product kind=non_goal -->
- **NG pwa-as-final-product**：移动网页/PWA 可用于历史方案中的数据验证，但不能替代本轮明确要求的 React Native APP 完成形态。
<!-- ty-source-item:end -->

<a id="non-goal.mini-program-full-parity"></a>
<!-- ty-source-item:start key=ng-mini-program-full-parity kind=non_goal -->
- **NG mini-program-full-parity**：微信小程序仅是后续分享、轻查询、邀请和拉新入口，不承担全部专业能力。
<!-- ty-source-item:end -->

<a id="non-goal.mvp-general-social-network"></a>
<!-- ty-source-item:start key=ng-mvp-general-social-network kind=non_goal -->
- **NG mvp-general-social-network**：MVP 不做通用信息流、关注/粉丝、私信或与观星决策无关的动态。
<!-- ty-source-item:end -->

<a id="non-goal.mvp-heavy-professional-suite"></a>
<!-- ty-source-item:start key=ng-mvp-heavy-professional-suite kind=non_goal -->
- **NG mvp-heavy-professional-suite**：MVP 不做完整内置导航、完整 AR、高精度构图、所有天象工具、大规模共同编辑、自动解析所有社交平台攻略或专业设备控制。
<!-- ty-source-item:end -->

### Forbidden Shortcuts

<a id="forbidden-shortcut.client-side-source-stitching"></a>
<!-- ty-source-item:start key=fs-client-side-source-stitching kind=forbidden_shortcut -->
- **FS client-side-source-stitching**：移动端不得直接并发十几个供应商接口并在页面临时拼装结论；必须消费后端标准化、版本化、可解释的聚合结果。
<!-- ty-source-item:end -->

<a id="forbidden-shortcut.unexplained-single-score"></a>
<!-- ty-source-item:start key=fs-unexplained-single-score kind=forbidden_shortcut -->
- **FS unexplained-single-score**：不得用一个无拆分、无阻断、无可信度、无原因的总分代表推荐。
<!-- ty-source-item:end -->

<a id="forbidden-shortcut.fake-or-guaranteed-data"></a>
<!-- ty-source-item:start key=fs-fake-or-guaranteed-data kind=forbidden_shortcut -->
- **FS fake-or-guaranteed-data**：不得用看似真实的 fixture/fallback 遮蔽缺失，也不得使用“绝对晴朗、保证可见”等确定性承诺。
<!-- ty-source-item:end -->

<a id="forbidden-shortcut.lowest-sticker-price-provider"></a>
<!-- ty-source-item:start key=fs-lowest-sticker-price-provider kind=forbidden_shortcut -->
- **FS lowest-sticker-price-provider**：不得因免费额度或最低接口/套餐标价选择未通过来源可追溯、目标区质量/稳定性、商业许可和安全降级硬门的数据源，也不得通过漏算加权调用、计算/存储/出网、工程运维、合规、故障或迁移成本伪造“最低价”。
<!-- ty-source-item:end -->

<a id="forbidden-shortcut.coordinate-mixing"></a>
<!-- ty-source-item:start key=fs-coordinate-mixing kind=forbidden_shortcut -->
- **FS coordinate-mixing**：不得在业务层混用 WGS84/GCJ-02、反写高德坐标为权威值、用 GCJ-02 做天文计算或依赖肉眼修正。
<!-- ty-source-item:end -->

<a id="forbidden-shortcut.ai-invented-exposure"></a>
<!-- ty-source-item:start key=fs-ai-invented-exposure kind=forbidden_shortcut -->
- **FS ai-invented-exposure**：AI 不得随意编造曝光参数，只能解释确定性规则和提供有依据的个性化建议。
<!-- ty-source-item:end -->

<a id="forbidden-shortcut.ar-only-core"></a>
<!-- ty-source-item:start key=fs-ar-only-core kind=forbidden_shortcut -->
- **FS ar-only-core**：AR 不得成为天空/现场核心路径的唯一实现；不支持设备必须有通用天空或摄像头+传感器降级。
<!-- ty-source-item:end -->

<a id="forbidden-shortcut.online-only-field-mode"></a>
<!-- ty-source-item:start key=fs-online-only-field-mode kind=forbidden_shortcut -->
- **FS online-only-field-mode**：仅联网可用的现场模式不算完成。
<!-- ty-source-item:end -->

<a id="forbidden-shortcut.static-screen-completion"></a>
<!-- ty-source-item:start key=fs-static-screen-completion kind=forbidden_shortcut -->
- **FS static-screen-completion**：静态设计稿、预览 Kit、无真实状态流的页面壳或单一平台演示不能算 APP 完成。
<!-- ty-source-item:end -->

## 4. Outcome Overview

- OUT mobile-shell-and-preferences：用户进入原生 APP、完成权限/偏好/设备设置并通过五个一级入口导航。
- OUT tonight-decision：用户获得可解释的今晚结论、主备地点与可执行时间/路线建议。
- OUT forecast-and-astronomy：用户按小时、日期、模型与天体查看可靠的天气/天文证据。
- OUT map-route-discovery：用户在地图中筛选地点、图层和路线并保持统一选择状态。
- OUT spot-detail-and-trust：用户判断一个地点的天空、交通、设施、安全、实景和可信度。
- OUT itinerary-and-collaboration：用户创建、编辑、复制、分享并在后续版本协同行程。
- OUT sky-orientation-ar：用户通过时间、方向、遮挡和可选 AR 判断天空目标。
- OUT shooting-assistant：用户基于设备与现场条件获得可解释摄影方案和检查表。
- OUT field-offline-safety：用户在低光/断网现场获得方向、天气、备选、停车与安全辅助。
- OUT community-contribution：用户上传地点/实况/图片、评价与纠错，系统分离长期事实和临时状态。
- OUT notifications-and-toolbox：用户按地点/目标/阈值接收通知并访问后续专业天象工具。
- OUT identity-profile-privacy：用户以游客或账号方式管理内容、设备、隐私、导出和注销。
- OUT admin-data-operations：运营人员治理地点/内容/数据源/规则并可重放推荐。
- OUT quality-release-observability：系统可部署、监控、恢复、测试并达到来源声明的性能与质量目标。

### APP 基本布局与路由层级

- 根壳以 390×844 为主基线：系统/安全区 → 可选页面标题或地点/日期上下文 → 可滚动内容或沉浸画布 → 底部安全区内五入口 tab。普通页面保留稳定标题/返回；地图、天空、现场可沉浸并收起底栏，但始终提供可预测返回和当前模式/地点/时间。
- “今晚”是纵向决策页：顶部地点/经纬度/具体观测点/日期/预设/刷新 → 结论 hero 与主行动 → 条件摘要/专业展开 → 可见目标时间线 → 三至五个推荐地点 → 主/近距/天气/暗空备选 → 日月/银河关键时间；安全阻断可在首屏越级出现。
- “观星地图”是全屏地图任务页：顶部搜索与地点/日期/预设 → 快捷筛选/图层/定位 → 地图 Marker/聚合/路线/天体方向 → 选中地点底部 sheet；路线模式增加起终点、全程/主备/分段、编号节点、拖拽顺序和底部方案/导航动作。
- 地点详情是 stack 页面：媒体/身份 → 今晚结论/风险/主行动 → 吸顶“今晚、天空、到达、设施、安全、实况”分区 → 光污染/地平线极坐标和实景 → 最后一公里/设施事实 → 评价/可信度 → 底部主备/导航及更多动作。
- “行程”一级页先显示搜索/状态分组、进行中/历史/收藏卡和新建/复制入口；创建页为约束表单；详情页为标题/日期/revision/离线状态 → 总览/观星阶段或分日/待规划/地图 tabs → 地图、天气、驾驶/徒步、阶段时间线、候选和路线方案 → 底部保存/版本/分享/下载动作。
- “天空”是沉浸画布：顶部地点/时间/搜索/图层 → 2D/3D 天空或可选相机 AR → 方位/精度/选中目标详情 → 底部时间 scrubber/事件快跳/跟随/校准；构图视场和轨迹按版本/设备出现，不支持时保留通用天空。
- “我的”是分组列表页：游客/账号与安全、当前偏好与多预设、我的内容、设备/摄影预设、通知、离线/同步、位置与隐私、帮助/数据来源；内容列表、设备管理、导出/注销均为二级 stack，不把后台状态藏在 toast。
- 专业预报、路线、摄影助手、专业工具箱、贡献/纠错、通知规则和隐私流程作为对应主任务的二级页面或 sheet；它们继承发起页地点/时刻/目标/行程，不另建平行上下文。
- 现场模式从行程/地点进入独立沉浸路由：常驻地点/在线离线/定位精度/夜间或红光/安全会话 → 当前状态和返程 → 单手工具网格 → 停车/备选/安全/同步；退出前处理持续定位和待同步内容。
- 管理后台不是 APP tab，而是独立 Next.js 受控表面；分享页/官网是轻量 Next.js 公共或授权投影，只承接链接打开/复制/下载，不复制 APP 的完整专业功能。
- 所有主列表/长页/画布都分别设计 loading、empty、no-results、stale/partial/degraded、error、disabled、saving、success；底部固定动作不得遮住最后内容，键盘/文本放大/系统导航/横屏沉浸由安全区与滚动容器处理。

## 5. Outcomes

<a id="outcome.mobile-shell-and-preferences"></a>

### OUT mobile-shell-and-preferences：原生 APP 壳、初次使用与偏好

#### Observable Result

<!-- ty-source-item:start key=result-mobile-shell-and-preferences kind=outcome_result -->
用户可在 iOS/Android Development Build 中进入同一业务 APP，先以游客完成基础查询，在需要时授权定位/通知等能力，保存一个或多个推荐偏好预设，并稳定访问“今晚、观星地图、行程、天空、我的”五个一级入口。
<!-- ty-source-item:end -->

#### Product Requirements

<a id="mobile-shell-and-preferences.requirement.react-native-app"></a>
<!-- ty-source-item:start key=req-mobile-shell-and-preferences-react-native-app kind=requirement -->
- **REQ react-native-app** [direct: S-USER, S-ARCH]：最终交付是 Expo + React Native + TypeScript 双端 APP，一套业务代码；高德地图、AR、高频传感器、亮度等特殊能力允许平台专属实现和自定义 Expo Native Module。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.requirement.five-primary-destinations"></a>
<!-- ty-source-item:start key=req-mobile-shell-and-preferences-five-primary-destinations kind=requirement -->
- **REQ five-primary-destinations** [direct: S-PRODUCT 五]：全局一级入口固定为“今晚、观星地图、行程、天空、我的”；装备属于“我的/摄影/行程”内容，不因参考图而替换一级 IA。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.requirement.guest-basic-query"></a>
<!-- ty-source-item:start key=req-mobile-shell-and-preferences-guest-basic-query kind=requirement -->
- **REQ guest-basic-query** [direct: S-ARCH 15.2]：不登录也可使用基础查询；受保护写入或协作能力的登录边界由 DEC guest-auth-capability-matrix 决定。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.requirement.permission-minimization"></a>
<!-- ty-source-item:start key=req-mobile-shell-and-preferences-permission-minimization kind=requirement -->
- **REQ permission-minimization** [direct: S-ARCH 3.5, 15.2]：默认只请求前台定位；精确定位、通知、相机/相册、限时后台定位只在用户发起相应功能时逐项说明并请求；后台定位仅在用户明确开启现场行程后运行并自动停止。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.requirement.onboarding-basic-and-user-types"></a>
<!-- ty-source-item:start key=req-mobile-shell-and-preferences-onboarding-basic-and-user-types kind=requirement -->
- **REQ onboarding-basic-and-user-types** [direct: S-PRODUCT 6.1]：首次引导可填写/确认当前定位、常用出发地、所在城市、是否愿意在需要时开启持续定位、是否愿意接收天气/天象提醒，并可多选新手观星、星空摄影、目视观测、露营观星、亲子观星；意愿开关不等同提前取得系统权限。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.requirement.travel-and-facility-preferences"></a>
<!-- ty-source-item:start key=req-mobile-shell-and-preferences-travel-and-facility-preferences kind=requirement -->
- **REQ travel-and-facility-preferences** [direct: S-PRODUCT 6.1]：出行字段完整覆盖自驾/骑行/公共交通/步行、最大单程时间/驾车距离/徒步距离、必须直达、山路/非铺装路/夜间徒步、露营/过夜接受度；设施硬要求完整覆盖停车、厕所、手机信号、平整平台、允许露营、便利店/补给/饮用水，以及“需要安全照明但观测区不得有明显光源”的双重条件。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.requirement.target-and-equipment-preferences"></a>
<!-- ty-source-item:start key=req-mobile-shell-and-preferences-target-and-equipment-preferences kind=requirement -->
- **REQ target-and-equipment-preferences** [direct: S-PRODUCT 6.1]：观测目标完整覆盖普通星空、银河、月亮、行星、流星雨、彗星、国际/中国空间站、深空目标、日出/日落与星空联合摄影；设备完整覆盖裸眼、双筒、天文望远镜、手机、相机、镜头焦段、三脚架、赤道仪和滤镜。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.requirement.preference-profiles"></a>
<!-- ty-source-item:start key=req-mobile-shell-and-preferences-preference-profiles kind=requirement -->
- **REQ preference-profiles** [direct: S-PRODUCT 6.1, S-ARCH 5.2]：用户可将上述基础/类型/出行/设施/目标/设备字段和常用出发地保存为多套命名预设，并明确哪些是硬阻断、排序偏好或未限制。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.requirement.profile-examples"></a>
<!-- ty-source-item:start key=req-mobile-shell-and-preferences-profile-examples kind=requirement -->
- **REQ profile-examples** [direct: S-PRODUCT 6.1]：产品支持“带家人轻松观星、银河摄影、大型望远镜目视、两小时内临时出发”等语义明确的预设，但示例不得偷偷成为未确认默认值。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.requirement.global-state-language"></a>
<!-- ty-source-item:start key=req-mobile-shell-and-preferences-global-state-language kind=requirement -->
- **REQ global-state-language** [derived from S-CONTEXT and S-ARCH 9.4]：所有数据页面可区分 loading、empty、no-results、stale/degraded、partial、error、success；同时显示影响判断的数据更新时间、来源/缓存/缺失和恢复动作。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.requirement.mobile-accessibility"></a>
<!-- ty-source-item:start key=req-mobile-shell-and-preferences-mobile-accessibility kind=requirement -->
- **REQ mobile-accessibility** [direct + derived: S-DESIGN, S-CONTEXT]：以 390 × 844 为主视口，兼容安全区和文本放大；重要触控目标不小于 44px；选择不只依赖颜色；图标按钮有可访问名称；支持 reduced motion、屏幕阅读器顺序和明确焦点。
<!-- ty-source-item:end -->

#### User Flow And States

- 正常流：启动 → 游客进入/登录选择 → 位置用途说明 → 允许或手动选择城市/出发地 → 选择用户类型 → 设置出行/设施/目标/设备 → 命名并保存预设 → 进入今晚首页。
- 权限拒绝：显示手动城市/坐标/出发地路径，不阻断无定位基础查询；需要后台定位时重新说明用途而不是循环弹系统框。
- 已有用户：可选择已保存的预设和常用出发地；若产品恢复上次选择也必须明确当前值，且不把过期 NightReport 恢复为“实时”结论。
- 多预设：切换预设后明确提示推荐需要重新计算；计算期间保留旧结果但标注 stale，不混为新结果。

#### Controls And Product Feedback

<a id="mobile-shell-and-preferences.control.primary-tab-bar"></a>
- **CTRL primary-tab-bar**
  - Source class: direct IA；布局与状态为 derived。
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-primary-tab-bar-location kind=control -->
  - Location: 每个一级页面底部安全区内；沉浸式地图/天空可收缩但必须有可预测返回。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-mobile-shell-and-preferences-primary-tab-bar-user-task kind=requirement -->
  - User task: 在今晚、地图、行程、天空、我的之间切换。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-primary-tab-bar-trigger kind=control -->
  - Trigger: 点击一个标签；深链可直接激活目标标签。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-primary-tab-bar-input kind=control -->
  - Input: 五个固定目标和当前激活目标。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-primary-tab-bar-loading kind=control -->
  - Loading: 目标页显示稳定骨架，底栏保持尺寸和选中状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-primary-tab-bar-empty kind=control -->
  - Empty: 不适用；入口本身始终存在。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-primary-tab-bar-success kind=control -->
  - Success: 切换目标并保留各标签必要的导航状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-primary-tab-bar-failure kind=control -->
  - Failure: 深链无效时返回对应入口并展示可恢复错误。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-primary-tab-bar-feedback kind=control -->
  - Feedback: 图标+文字、选中形状/字重/颜色多重提示、可访问选中状态。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.control.permission-step"></a>
- **CTRL permission-step**
  - Source class: direct permission intent；逐项页面结构为 derived。
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-permission-step-location kind=control -->
  - Location: 首次引导的独立步骤；以后在触发相关功能时按需出现。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-mobile-shell-and-preferences-permission-step-user-task kind=requirement -->
  - User task: 理解权限用途并选择允许、暂不允许或手动替代。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-permission-step-trigger kind=control -->
  - Trigger: 首次需要前台定位/通知/相机，或用户主动开启现场后台定位。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-permission-step-input kind=control -->
  - Input: 权限类型、用途说明、数据使用边界、系统当前状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-permission-step-loading kind=control -->
  - Loading: 请求系统权限时禁用重复提交并显示系统处理中状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-permission-step-empty kind=control -->
  - Empty: 设备不支持该能力时显示降级路径。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-permission-step-success kind=control -->
  - Success: 显示已授权范围并继续原任务。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-permission-step-failure kind=control -->
  - Failure: 拒绝/受限时不责备用户，提供手动输入或设置页入口；永久拒绝不反复弹窗。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-permission-step-feedback kind=control -->
  - Feedback: 明确“现在为何需要、是否持续、如何关闭”，后台定位另行强调自动停止。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.control.preference-wizard"></a>
- **CTRL preference-wizard**
  - Source class: direct fields；分步控件为 derived。
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-preference-wizard-location kind=control -->
  - Location: 首次引导和“我的 → 偏好预设 → 新建/编辑”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-mobile-shell-and-preferences-preference-wizard-user-task kind=requirement -->
  - User task: 配置用户类型、交通/距离/徒步、设施硬条件、观测目标和设备。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-preference-wizard-trigger kind=control -->
  - Trigger: 首次设置、新建预设或编辑现有预设。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-preference-wizard-input kind=control -->
  - Input: REQ onboarding-basic-and-user-types、REQ travel-and-facility-preferences、REQ target-and-equipment-preferences 的全部字段，带单位阈值、硬条件/偏好语义和命名文本。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-preference-wizard-loading kind=control -->
  - Loading: 保存时保持输入、禁用重复保存并显示进度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-preference-wizard-empty kind=control -->
  - Empty: 未选择可选项时显示“未限制”，硬要求区不得用隐含默认。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-preference-wizard-success kind=control -->
  - Success: 保存预设并显示将影响推荐的摘要；可设为当前预设。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-preference-wizard-failure kind=control -->
  - Failure: 字段级校验保留用户输入；服务失败允许本地草稿和重试。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-preference-wizard-feedback kind=control -->
  - Feedback: 单位、范围、风险影响和“硬性阻断/排序偏好”差异靠近控件显示。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.control.profile-switcher"></a>
- **CTRL profile-switcher**
  - Source class: direct multi-profile capability；placement derived。
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-profile-switcher-location kind=control -->
  - Location: 今晚首页位置/日期附近及“我的 → 偏好预设”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-mobile-shell-and-preferences-profile-switcher-user-task kind=requirement -->
  - User task: 切换当前推荐画像。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-profile-switcher-trigger kind=control -->
  - Trigger: 点击当前预设名称。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-profile-switcher-input kind=control -->
  - Input: 已保存预设列表与新建入口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-profile-switcher-loading kind=control -->
  - Loading: 切换后 NightReport 重算；旧结果保持但标 stale。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-profile-switcher-empty kind=control -->
  - Empty: 无预设时引导创建，允许继续使用无偏好基础模式。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-profile-switcher-success kind=control -->
  - Success: 当前预设更新，相关结果刷新并说明变化。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-profile-switcher-failure kind=control -->
  - Failure: 保留原预设和结果，提供重试。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-mobile-shell-and-preferences-profile-switcher-feedback kind=control -->
  - Feedback: 显示预设关键限制摘要，不只显示名称。
<!-- ty-source-item:end -->

#### Technical Obligations And Boundaries

<a id="mobile-shell-and-preferences.obligation.mobile-client-stack"></a>
<!-- ty-source-item:start key=obl-mobile-shell-and-preferences-mobile-client-stack kind=technical_obligation -->
- **OBL mobile-client-stack** [direct: S-ARCH 3.1]：移动端采用 Expo Router、TanStack Query、Zustand、React Hook Form + Zod、Reanimated、Gesture Handler、Expo SQLite/FileSystem/SecureStore/Location/Sensors/Notifications；实际版本由 DEC dependency-version-baseline 决定。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.obligation.mobile-layering"></a>
<!-- ty-source-item:start key=obl-mobile-shell-and-preferences-mobile-layering kind=technical_obligation -->
- **OBL mobile-layering** [direct: S-ARCH 3.1–3.2]：Screen 只组合路由/生命周期；Feature 表达今晚/地图/地点/预报/天空/行程/现场/摄影/社区/我的；Domain 表达天气/天文/地理/推荐/同步；Data 负责 API/本地库/缓存；Native 隔离地图/方向/AR/亮度；UI System 和 Telemetry 横切。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.obligation.native-new-architecture"></a>
<!-- ty-source-item:start key=obl-mobile-shell-and-preferences-native-new-architecture kind=technical_obligation -->
- **OBL native-new-architecture** [direct: S-ARCH 1.2]：以 React Native 新架构的 Fabric/TurboModules 作为 Swift/Objective-C/Kotlin/Java/C++ 原生模块与原生视图扩展基线；“一套业务代码”不要求地图、AR、传感器等底层实现强行相同。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.non-completing.web-shell-only"></a>
<!-- ty-source-item:start key=ncomp-mobile-shell-and-preferences-web-shell-only kind=non_completing -->
- **NCOMP web-shell-only** [direct: S-USER, S-PRODUCT 十二]：只有 PWA、网页壳、Expo Go 演示或单平台页面，不算 React Native APP Outcome 完成。
<!-- ty-source-item:end -->

#### Implementation Hints

- **HINT proposed-mobile-modules**：S-ARCH 建议 mobile/features、domains、native、database、services、ui 的模块化结构；具体目录和 owner 留给 Contract authoring。

#### Acceptance Scenarios

<a id="mobile-shell-and-preferences.acceptance.guest-manual-location"></a>
<!-- ty-source-item:start key=ac-mobile-shell-and-preferences-guest-manual-location kind=acceptance -->
- **AC guest-manual-location**
  - Accepts: REQ guest-basic-query, REQ permission-minimization, CTRL permission-step
  - Given: 新用户未登录且拒绝前台定位。
  - When: 用户选择手动城市或出发地并继续。
  - Then: 用户能进入基础今晚查询，界面明确使用手动位置且不重复强迫授权。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.acceptance.preference-save-and-switch"></a>
<!-- ty-source-item:start key=ac-mobile-shell-and-preferences-preference-save-and-switch kind=acceptance -->
- **AC preference-save-and-switch**
  - Accepts: REQ onboarding-basic-and-user-types, REQ travel-and-facility-preferences, REQ target-and-equipment-preferences, REQ preference-profiles, REQ profile-examples, CTRL preference-wizard, CTRL profile-switcher
  - Given: 用户已填写一套带交通、设施、目标和设备条件的预设。
  - When: 用户保存并切换为当前预设。
  - Then: 预设摘要可见，后续推荐进入重算且旧结果在完成前被标为 stale。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.acceptance.primary-navigation"></a>
<!-- ty-source-item:start key=ac-mobile-shell-and-preferences-primary-navigation kind=acceptance -->
- **AC primary-navigation**
  - Accepts: REQ five-primary-destinations, CTRL primary-tab-bar
  - Given: APP 已进入任意一级页面。
  - When: 用户依次选择五个一级入口。
  - Then: 每个入口可达、选中状态明确、底栏不遮挡内容且必要的标签内状态被保留。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.acceptance.permission-scope"></a>
<!-- ty-source-item:start key=ac-mobile-shell-and-preferences-permission-scope kind=acceptance -->
- **AC permission-scope**
  - Accepts: REQ permission-minimization, CTRL permission-step
  - Given: 用户只进行首页附近地点查询，未开启现场行程。
  - When: APP 请求定位能力。
  - Then: 只请求完成该任务所需的前台权限，不请求永久后台定位。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.acceptance.global-data-states"></a>
<!-- ty-source-item:start key=ac-mobile-shell-and-preferences-global-data-states kind=acceptance -->
- **AC global-data-states**
  - Accepts: REQ global-state-language, REQ mobile-accessibility
  - Given: 同一页面分别遇到无数据、筛选无结果、缓存过期、部分供应商失败和完全失败。
  - When: 用户查看状态和可执行动作。
  - Then: 五种状态语义可区分、关键内容布局稳定、可访问技术可读且不存在伪造数据。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.acceptance.native-app-shape"></a>
<!-- ty-source-item:start key=ac-mobile-shell-and-preferences-native-app-shape kind=acceptance -->
- **AC native-app-shape**
  - Accepts: REQ react-native-app, OBL mobile-client-stack, OBL mobile-layering, OBL native-new-architecture, NCOMP web-shell-only
  - Given: iOS 与 Android 的目标构建环境和需要的自定义原生能力已准备。
  - When: 两个平台启动同一业务版本。
  - Then: 两端可进入五入口 APP 壳，原生能力通过明确适配层暴露，且结果不是网页壳或 Expo Go 限制版。
<!-- ty-source-item:end -->

#### Risks And Recovery

<a id="mobile-shell-and-preferences.risk.location-permission-boundary"></a>
<!-- ty-source-item:start key=risk-mobile-shell-and-preferences-location-permission-boundary kind=risk_fact fact=permission_boundary_change outcome=mobile-shell-and-preferences -->
- **RISK location-permission-boundary**
  - Fact: permission_boundary_change
  - Affected Outcome: mobile-shell-and-preferences
  - Basis: APP 涉及前台精确定位、通知、相机和可选后台定位。
  - Consequence: Contract 必须独立证明请求时机、拒绝降级、系统设置恢复和后台自动停止，不能只证明“授权成功”。
<!-- ty-source-item:end -->

<a id="mobile-shell-and-preferences.risk.mobile-native-boundary"></a>
<!-- ty-source-item:start key=risk-mobile-shell-and-preferences-mobile-native-boundary kind=risk_fact fact=critical_user_path outcome=mobile-shell-and-preferences -->
- **RISK mobile-native-boundary**
  - Fact: critical_user_path
  - Affected Outcome: mobile-shell-and-preferences
  - Basis: 全部主流程依赖原生 APP 壳、路由、权限和跨平台模块。
  - Consequence: 壳层或原生桥接故障会阻断所有 Outcome，需先建立真实双端基线和降级。
<!-- ty-source-item:end -->

<a id="outcome.tonight-decision"></a>

### OUT tonight-decision：今晚结论、推荐和主备方案

#### Observable Result

<!-- ty-source-item:start key=result-tonight-decision kind=outcome_result -->
用户选择位置、观星夜、偏好和目标后，一次获得“是否建议出发、何时出发、去哪里、能看什么、怎么走、何时失效”的可解释结论；安全阻断、数据不确定性、主地点和多种备选不会被一个总分掩盖。
<!-- ty-source-item:end -->

#### Product Requirements

<a id="tonight-decision.requirement.night-context"></a>
<!-- ty-source-item:start key=req-tonight-decision-night-context kind=requirement -->
- **REQ night-context** [direct: S-PRODUCT 三/6.2A, S-ARCH 9.3]：报告输入至少包含位置或出发地、今晚/明晚/自定义日期、所在地时区、当前偏好预设、观测目标和必要路线条件；首页顶部显示当前定位名称、经纬度、数据对应的具体观测点、最后更新时间、手动刷新和定位精度；“观星夜”以地点当地日落所属日期定义。
<!-- ty-source-item:end -->

<a id="tonight-decision.requirement.decision-summary"></a>
<!-- ty-source-item:start key=req-tonight-decision-decision-summary kind=requirement -->
- **REQ decision-summary** [direct: S-PRODUCT 6.2B/核心场景]：首层显示综合评分和“非常适合、适合、条件一般、不建议、存在安全风险”之一，并显示最佳窗口、可观测总时长、有利条件、阻碍因素、距窗口时间、建议出发时间及是否需要立即出发。
<!-- ty-source-item:end -->

<a id="tonight-decision.requirement.condition-summary"></a>
<!-- ty-source-item:start key=req-tonight-decision-condition-summary kind=requirement -->
- **REQ condition-summary** [direct: S-PRODUCT 6.2C]：摘要覆盖当前天气、温度/体感、总/高/中/低云、地面水平能见度、空气质量、风速/风向、降雨概率、湿度/露点、光污染、月相/照明、月升落、日升落、天文昏影/晨光、无月黑夜和银河窗口；普通用户默认摘要，专业用户下钻完整数据。
<!-- ty-source-item:end -->

<a id="tonight-decision.requirement.visible-targets"></a>
<!-- ty-source-item:start key=req-tonight-decision-visible-targets kind=requirement -->
- **REQ visible-targets** [direct: S-PRODUCT 6.2D]：按时间列出银河、月亮、明亮行星、主要星座、流星雨、彗星、空间站和特殊天象；每项给出可见/最佳时间、方位、高度、亮度或难度、天气/月光影响和推荐地点。
<!-- ty-source-item:end -->

<a id="tonight-decision.requirement.recommended-spots"></a>
<!-- ty-source-item:start key=req-tonight-decision-recommended-spots kind=requirement -->
- **REQ recommended-spots** [direct: S-PRODUCT 6.2E]：首页显示三至五个地点，包含名称、实景、距离/车程、综合匹配、光污染、最佳时段、天气、直达/徒步、设施标签、适合人群、推荐原因和风险/缺点，并支持看地图、加入计划、导航和设为备选。
<!-- ty-source-item:end -->

<a id="tonight-decision.requirement.primary-and-backups"></a>
<!-- ty-source-item:start key=req-tonight-decision-primary-and-backups kind=requirement -->
- **REQ primary-and-backups** [direct: S-PRODUCT 6.2F, S-ARCH 7.3]：系统至少区分主地点、近距离备选、天气备选和更暗但更远的进阶点；天气、降雨、道路或到达窗口变化时提示切换并解释为何更稳妥。
<!-- ty-source-item:end -->

<a id="tonight-decision.requirement.layered-scoring"></a>
<!-- ty-source-item:start key=req-tonight-decision-layered-scoring kind=requirement -->
- **REQ layered-scoring** [direct: S-PRODUCT 6.6, S-ARCH 八]：分别计算天气、天文、暗度、地点、可达、安全、用户匹配与数据可信度；综合分应用可信度/新鲜度惩罚，安全规则独立于加权平均。
<!-- ty-source-item:end -->

<a id="tonight-decision.requirement.scoring-factor-coverage"></a>
<!-- ty-source-item:start key=req-tonight-decision-scoring-factor-coverage kind=requirement -->
- **REQ scoring-factor-coverage** [direct: S-PRODUCT 6.6C]：排序必须保留五组因素：天空质量含光污染、高/中/低云、通透度、视宁度/实验性稳定度、能见度、月光、空气质量、湿度/露点、风、降雨/雾；目标匹配含地平线上方、高度、无遮挡方位、最亮/最高时刻、银河核心、月光干扰和摄影前景；地点质量含暗度、开阔、安全、交通、停车、平台、厕所、露营、信号和最近实况；出行成本含距离、驾车、收费、徒步、山路强度和能否赶上窗口；可信度含模型一致、资料新鲜、实况数量、核验和预报提前量。
<!-- ty-source-item:end -->

<a id="tonight-decision.requirement.profile-weighting-intent"></a>
<!-- ty-source-item:start key=req-tonight-decision-profile-weighting-intent kind=requirement -->
- **REQ profile-weighting-intent** [direct: S-PRODUCT 6.6D]：新手更重易达/设施/安全/明确目标；摄影更重光污染/云/银河方向/月光/前景/风；目视更重暗度/通透度/视宁度/无遮挡/设备搬运；亲子更重车程/厕所/停车/安全/较早窗口；露营更重营地/过夜安全/水电/全天预报；具体权重由 DEC recommendation-weights-thresholds 决定。
<!-- ty-source-item:end -->

<a id="tonight-decision.requirement.hard-blockers"></a>
<!-- ty-source-item:start key=req-tonight-decision-hard-blockers kind=requirement -->
- **REQ hard-blockers** [direct: S-PRODUCT 6.6B, S-ARCH 8.2]：雷暴/暴雨/强对流、关闭、道路不可达、潮汐/山洪等重大风险、设备不安全风速、硬性直达条件不满足、目标方向完全遮挡、数据严重过期、到达晚于窗口结束必须警告或阻断，不能被高分抵消。
<!-- ty-source-item:end -->

<a id="tonight-decision.requirement.continuous-window"></a>
<!-- ty-source-item:start key=req-tonight-decision-continuous-window kind=requirement -->
- **REQ continuous-window** [direct: S-ARCH 8.3]：按 DEC observation-window-resolution 确定的 15 或 30 分钟粒度联合天气、天文、月光、目标高度、遮挡、光污染和用户条件，返回连续通过区间而非单一最佳时刻。
<!-- ty-source-item:end -->

<a id="tonight-decision.requirement.explainability-and-validity"></a>
<!-- ty-source-item:start key=req-tonight-decision-explainability-and-validity kind=requirement -->
- **REQ explainability-and-validity** [direct: S-PRODUCT 6.6E, S-ARCH 8.5/9.4]：结果说明推荐原因、未选更近点原因、主要风险、模型分歧、失效条件、有效截止、备选优势、generatedAt/expiresAt、freshness、confidence、sources、warnings 和 partial。
<!-- ty-source-item:end -->

<a id="tonight-decision.requirement.learning-ranking-boundary"></a>
<!-- ty-source-item:start key=req-tonight-decision-learning-ranking-boundary kind=requirement -->
- **REQ learning-ranking-boundary** [direct: S-ARCH 8.6]：后续可用用户点击、导航、行程完成、现场实况、推荐满意度和主备切换训练地点排序；学习模型只能优化非阻断排序，不能替代安全阻断、天文几何、许可证规则、数据过期判断或用户硬条件，训练/上线仍受 DEC recommendation-weights-thresholds 和 DEC analytics-consent-policy 约束。
<!-- ty-source-item:end -->

<a id="tonight-decision.requirement.route-timeout-degradation"></a>
<!-- ty-source-item:start key=req-tonight-decision-route-timeout-degradation kind=requirement -->
- **REQ route-timeout-degradation** [direct: S-ARCH 十八]：路线供应商超时时先返回直线距离与缓存路线并标明降级，异步补全真实路线，不阻塞整个首页。
<!-- ty-source-item:end -->

#### User Flow And States

- 正常流：确认位置/日期/偏好/目标 → 生成 NightReport → 先看结论 → 查看主备地点 → 下钻原因/专业数据 → 加入计划或导航。
- 安全阻断：显示阻断原因和可执行替代，不允许总分视觉压过安全状态。
- 部分数据：返回仍可用的结论，但逐字段说明缺失、缓存来源和可信度下降；无法形成诚实结论时明确不可判断。
- 条件变化：刷新/推送新数据后重算，比较旧新结论并提示主备切换；旧快照保留为历史证据，不被覆盖。

#### Controls And Product Feedback

<a id="tonight-decision.control.location-date-refresh"></a>
- **CTRL location-date-refresh**
  - Source class: direct controls；布局 derived from S-IMG-01/S-IMG-10。
<!-- ty-source-item:start key=ctrl-tonight-decision-location-date-refresh-location kind=control -->
  - Location: 今晚首页顶部紧凑上下文区。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-tonight-decision-location-date-refresh-user-task kind=requirement -->
  - User task: 确认报告对应地点/日期并刷新。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-location-date-refresh-trigger kind=control -->
  - Trigger: 点击地点、日期分段或刷新图标。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-location-date-refresh-input kind=control -->
  - Input: 当前定位/手动出发地、今晚/明晚/自定义日期、定位精度、更新时间。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-location-date-refresh-loading kind=control -->
  - Loading: 局部刷新指示；旧报告保留并标 stale，避免整页清空。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-location-date-refresh-empty kind=control -->
  - Empty: 无位置时给手动城市/地图选点，不展示伪推荐。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-location-date-refresh-success kind=control -->
  - Success: 上下文更新并产生新报告；变化摘要可见。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-location-date-refresh-failure kind=control -->
  - Failure: 保留旧报告和过期标记，显示重试/改位置。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-location-date-refresh-feedback kind=control -->
  - Feedback: 明确观星夜日期、时区、精度、上次/下次更新时间。
<!-- ty-source-item:end -->

<a id="tonight-decision.control.decision-hero"></a>
- **CTRL decision-hero**
  - Source class: direct content；视觉层级 derived from S-DESIGN/S-IMG-01。
<!-- ty-source-item:start key=ctrl-tonight-decision-decision-hero-location kind=control -->
  - Location: 今晚首页首个主要内容区。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-tonight-decision-decision-hero-user-task kind=requirement -->
  - User task: 一眼判断是否出发及下一步。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-decision-hero-trigger kind=control -->
  - Trigger: 报告加载或上下文改变。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-decision-hero-input kind=control -->
  - Input: 结论等级、综合/分层分数、最佳窗口、时长、原因、风险、距窗口时间。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-decision-hero-loading kind=control -->
  - Loading: 保持卡片尺寸的骨架；不先显示默认分数。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-decision-hero-empty kind=control -->
  - Empty: 数据不足时显示“暂无法判断”和缺失项。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-decision-hero-success kind=control -->
  - Success: 结论、窗口和一个明确下一步动作同时可见。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-decision-hero-failure kind=control -->
  - Failure: 安全/数据错误采用可读说明和替代入口，不只显示错误码。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-decision-hero-feedback kind=control -->
  - Feedback: 颜色之外使用标题、图标和原因；安全风险优先级最高。
<!-- ty-source-item:end -->

<a id="tonight-decision.control.condition-summary-expander"></a>
- **CTRL condition-summary-expander**
  - Source class: direct progressive disclosure。
<!-- ty-source-item:start key=ctrl-tonight-decision-condition-summary-expander-location kind=control -->
  - Location: 决策卡下方的连续摘要条/紧凑网格。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-tonight-decision-condition-summary-expander-user-task kind=requirement -->
  - User task: 查看关键条件并进入专业预报。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-condition-summary-expander-trigger kind=control -->
  - Trigger: 点击摘要项或“查看完整条件”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-condition-summary-expander-input kind=control -->
  - Input: 天气、云层、风、湿度/露点、光污染、月相和关键时间。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-condition-summary-expander-loading kind=control -->
  - Loading: 每项独立骨架并保持列宽。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-condition-summary-expander-empty kind=control -->
  - Empty: 缺失项标“暂无数据”并说明来源状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-condition-summary-expander-success kind=control -->
  - Success: 摘要可扫读，点击进入对应专业行/时间。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-condition-summary-expander-failure kind=control -->
  - Failure: 单项失败不清空其他指标。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-condition-summary-expander-feedback kind=control -->
  - Feedback: 单位、趋势、更新时间和异常/不确定状态靠近数据。
<!-- ty-source-item:end -->

<a id="tonight-decision.control.visible-target-timeline"></a>
- **CTRL visible-target-timeline**
  - Source class: direct target list；timeline layout derived。
<!-- ty-source-item:start key=ctrl-tonight-decision-visible-target-timeline-location kind=control -->
  - Location: 首页决策与条件之后。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-tonight-decision-visible-target-timeline-user-task kind=requirement -->
  - User task: 按时间选择今晚值得看的目标。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-visible-target-timeline-trigger kind=control -->
  - Trigger: 滚动、选择目标或打开全部。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-visible-target-timeline-input kind=control -->
  - Input: 目标、可见/最佳时间、方位、高度、难度、影响因素、推荐点。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-visible-target-timeline-loading kind=control -->
  - Loading: 顺序稳定的时间占位。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-visible-target-timeline-empty kind=control -->
  - Empty: 显示“该条件下无可靠目标”及改变日期/地点入口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-visible-target-timeline-success kind=control -->
  - Success: 选择目标可带入地图、天空和摄影助手。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-visible-target-timeline-failure kind=control -->
  - Failure: 单个目标计算失败时保留其余结果并说明。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-visible-target-timeline-feedback kind=control -->
  - Feedback: 当前/即将开始/已结束与受云/月光/遮挡影响状态明确。
<!-- ty-source-item:end -->

<a id="tonight-decision.control.recommendation-card"></a>
- **CTRL recommendation-card**
  - Source class: direct fields；horizontal/vertical responsive layout derived from references。
<!-- ty-source-item:start key=ctrl-tonight-decision-recommendation-card-location kind=control -->
  - Location: 首页推荐地点区，首屏之后。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-tonight-decision-recommendation-card-user-task kind=requirement -->
  - User task: 比较并对地点采取地图、计划、导航或备选动作。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-recommendation-card-trigger kind=control -->
  - Trigger: 点击卡片或其显式动作。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-recommendation-card-input kind=control -->
  - Input: REQ recommended-spots 的完整字段与主/备类型。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-recommendation-card-loading kind=control -->
  - Loading: 三至五个稳定占位；路线降级状态不阻塞其他字段。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-recommendation-card-empty kind=control -->
  - Empty: 说明被哪些硬条件筛空，提供调整筛选/距离/日期。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-recommendation-card-success kind=control -->
  - Success: 选中状态同步到地图和方案；动作结果可撤销时提示。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-recommendation-card-failure kind=control -->
  - Failure: 路线/图片等局部失败不伪造；重试只刷新失败子项。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-recommendation-card-feedback kind=control -->
  - Feedback: 推荐原因和缺点同卡呈现，不能只突出分数。
<!-- ty-source-item:end -->

<a id="tonight-decision.control.plan-backup-selector"></a>
- **CTRL plan-backup-selector**
  - Source class: direct main/backup semantics；presentation derived。
<!-- ty-source-item:start key=ctrl-tonight-decision-plan-backup-selector-location kind=control -->
  - Location: 推荐区末尾或行程生成前确认层。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-tonight-decision-plan-backup-selector-user-task kind=requirement -->
  - User task: 确认主地点并理解三类备选。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-plan-backup-selector-trigger kind=control -->
  - Trigger: 设为主地点、设为备选、系统建议切换。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-plan-backup-selector-input kind=control -->
  - Input: 当前主地点、近距离/天气/暗空备选及切换原因。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-plan-backup-selector-loading kind=control -->
  - Loading: 切换时重算路线/到达/窗口，旧状态锁定并标正在更新。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-plan-backup-selector-empty kind=control -->
  - Empty: 某类备选不存在时说明，不用占位假地点。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-plan-backup-selector-success kind=control -->
  - Success: 主备身份在首页、地图、行程和离线包同步。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-plan-backup-selector-failure kind=control -->
  - Failure: 保留原方案，显示哪项计算失败和重试。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-tonight-decision-plan-backup-selector-feedback kind=control -->
  - Feedback: 切换影响距离、到达、窗口和风险的差异摘要。
<!-- ty-source-item:end -->

#### Technical Obligations And Boundaries

<a id="tonight-decision.obligation.night-report-aggregation"></a>
<!-- ty-source-item:start key=obl-tonight-decision-night-report-aggregation kind=technical_obligation -->
- **OBL night-report-aggregation** [direct: S-ARCH 5.9/9.2]：移动端通过 POST /v1/night-reports 获取聚合快照；服务端校验上下文、规范化时区、查询天气/天文/光污染/地形、检索候选、硬过滤、少量真实路线、窗口评分、主备选择、解释/来源/可信度并持久化可重放快照。
<!-- ty-source-item:end -->

<a id="tonight-decision.obligation.deterministic-safety-and-scoring"></a>
<!-- ty-source-item:start key=obl-tonight-decision-deterministic-safety-and-scoring kind=technical_obligation -->
- **OBL deterministic-safety-and-scoring** [direct: S-ARCH 八]：安全、天文几何、过期和用户硬条件由确定性规则执行并版本化；学习排序只能优化非阻断排序。
<!-- ty-source-item:end -->

<a id="tonight-decision.non-completing.score-only-report"></a>
<!-- ty-source-item:start key=ncomp-tonight-decision-score-only-report kind=non_completing -->
- **NCOMP score-only-report** [direct: S-PRODUCT 6.6E, S-ARCH 8.1]：只返回或显示一个总分，即使数值正确，也不能算今晚决策完成。
<!-- ty-source-item:end -->

<a id="tonight-decision.non-completing.client-provider-calls"></a>
<!-- ty-source-item:start key=ncomp-tonight-decision-client-provider-calls kind=non_completing -->
- **NCOMP client-provider-calls** [direct: S-ARCH 二十二]：由 APP 直接拼接天气/地图/天文/光污染供应商响应不能算聚合决策完成。
<!-- ty-source-item:end -->

#### Implementation Hints

- **HINT report-snapshot-shape**：保留 S-ARCH NightReport 的 context、summary、windows、weather、astronomy、visibleTargets、primary/nearbyBackup/weatherBackup/darkSkyAlternative、confidence、sources、rulesetVersion、inputHash 语义。
- **HINT candidate-route-bound**：先用 PostGIS 距离预筛，再对前 10～20 个候选请求真实路线并返回前 3～5 个推荐，具体数量若成为成本/体验规则需由 DEC candidate-routing-limits 决定。

#### Acceptance Scenarios

<a id="tonight-decision.acceptance.successful-night-report"></a>
<!-- ty-source-item:start key=ac-tonight-decision-successful-night-report kind=acceptance -->
- **AC successful-night-report**
  - Accepts: REQ night-context, REQ decision-summary, REQ condition-summary, REQ explainability-and-validity, CTRL location-date-refresh, CTRL decision-hero, OBL night-report-aggregation
  - Given: 有有效位置、观星夜、偏好且核心数据新鲜。
  - When: 用户请求今晚报告。
  - Then: 一次结果先给结论/窗口/原因，再提供摘要与来源/有效期，且不要求客户端拼接供应商。
<!-- ty-source-item:end -->

<a id="tonight-decision.acceptance.hard-safety-block"></a>
<!-- ty-source-item:start key=ac-tonight-decision-hard-safety-block kind=acceptance -->
- **AC hard-safety-block**
  - Accepts: REQ hard-blockers, REQ layered-scoring, OBL deterministic-safety-and-scoring
  - Given: 候选地点同时具有高天空分和已确认道路封闭。
  - When: 推荐引擎生成结果。
  - Then: 地点被阻断或以安全风险状态呈现，高分不能抵消封路。
<!-- ty-source-item:end -->

<a id="tonight-decision.acceptance.profile-sensitive-ranking"></a>
<!-- ty-source-item:start key=ac-tonight-decision-profile-sensitive-ranking kind=acceptance -->
- **AC profile-sensitive-ranking**
  - Accepts: REQ scoring-factor-coverage, REQ profile-weighting-intent
  - Given: 同一候选集合包含近且有设施但较亮的地点，以及远且暗、无设施但适合摄影的地点。
  - When: 分别使用亲子预设和银河摄影预设生成排序。
  - Then: 两次计算保留五组完整分项并按来源定义的不同倾向产生可解释差异，安全阻断不随画像改变。
<!-- ty-source-item:end -->

<a id="tonight-decision.acceptance.main-and-backups"></a>
<!-- ty-source-item:start key=ac-tonight-decision-main-and-backups kind=acceptance -->
- **AC main-and-backups**
  - Accepts: REQ recommended-spots, REQ primary-and-backups, CTRL recommendation-card, CTRL plan-backup-selector
  - Given: 候选集合中存在距离、天气和暗度取舍不同的地点。
  - When: 用户查看推荐并选择主方案。
  - Then: 主地点与可用备选分类、原因、缺点和切换影响均可见并同步到后续表面。
<!-- ty-source-item:end -->

<a id="tonight-decision.acceptance.continuous-window-selection"></a>
<!-- ty-source-item:start key=ac-tonight-decision-continuous-window-selection kind=acceptance -->
- **AC continuous-window-selection**
  - Accepts: REQ continuous-window
  - Given: 连续若干采样点满足条件而后续采样点不满足。
  - When: 系统计算观测窗口。
  - Then: 返回连续起止区间并记录所用粒度，不只返回峰值时刻。
<!-- ty-source-item:end -->

<a id="tonight-decision.acceptance.partial-provider-failure"></a>
<!-- ty-source-item:start key=ac-tonight-decision-partial-provider-failure kind=acceptance -->
- **AC partial-provider-failure**
  - Accepts: REQ explainability-and-validity, REQ route-timeout-degradation, REQ global-state-language, CTRL condition-summary-expander
  - Given: 一家天气供应商失败且路线供应商超时，但缓存路线和其他数据仍可用。
  - When: 用户打开今晚首页。
  - Then: 页面返回明确 partial/stale 结果、指出缺失与缓存来源，先显示直线/缓存路线并允许异步更新。
<!-- ty-source-item:end -->

<a id="tonight-decision.acceptance.visible-target-selection"></a>
<!-- ty-source-item:start key=ac-tonight-decision-visible-target-selection kind=acceptance -->
- **AC visible-target-selection**
  - Accepts: REQ visible-targets, CTRL visible-target-timeline
  - Given: 今晚存在多个不同时段的可见目标。
  - When: 用户选择其中一个目标。
  - Then: 可见/最佳时间、方位、高度、难度和影响因素可见，并可将目标带入地图/天空/摄影流程。
<!-- ty-source-item:end -->

<a id="tonight-decision.acceptance.no-score-only-completion"></a>
<!-- ty-source-item:start key=ac-tonight-decision-no-score-only-completion kind=acceptance -->
- **AC no-score-only-completion**
  - Accepts: NCOMP score-only-report, NCOMP client-provider-calls
  - Given: 实现只展示总分或由客户端直接拼供应商数据。
  - When: 检查今晚决策结果。
  - Then: 该实现明确不得被判为 Outcome 完成。
<!-- ty-source-item:end -->

<a id="tonight-decision.acceptance.learning-cannot-override-safety"></a>
<!-- ty-source-item:start key=ac-tonight-decision-learning-cannot-override-safety kind=acceptance -->
- **AC learning-cannot-override-safety**
  - Accepts: REQ learning-ranking-boundary, OBL deterministic-safety-and-scoring
  - Given: 后续排序模型因历史点击偏好提高一个道路已关闭地点的相关性。
  - When: 生成推荐结果。
  - Then: 确定性安全阻断仍排除/阻断该地点，模型输入/版本可追溯且不能更改许可证、过期或硬条件结果。
<!-- ty-source-item:end -->

#### Risks And Recovery

<a id="tonight-decision.risk.critical-decision-path"></a>
<!-- ty-source-item:start key=risk-tonight-decision-critical-decision-path kind=risk_fact fact=critical_user_path outcome=tonight-decision -->
- **RISK critical-decision-path**
  - Fact: critical_user_path
  - Affected Outcome: tonight-decision
  - Basis: “今晚是否出发”是产品第一核心场景并直接影响夜间出行。
  - Consequence: 正常、阻断、部分数据、过期、刷新和备选切换均需独立证明。
<!-- ty-source-item:end -->

<a id="tonight-decision.risk.recommendation-schema"></a>
<!-- ty-source-item:start key=risk-tonight-decision-recommendation-schema kind=risk_fact fact=public_api_or_schema_change outcome=tonight-decision -->
- **RISK recommendation-schema**
  - Fact: public_api_or_schema_change
  - Affected Outcome: tonight-decision
  - Basis: NightReport 是移动端、推荐、行程、缓存和历史重放共享的公开契约。
  - Consequence: 字段、枚举、版本和兼容策略必须在 Contract 中绑定并验证，不能随页面实现漂移。
<!-- ty-source-item:end -->

<a id="outcome.forecast-and-astronomy"></a>

### OUT forecast-and-astronomy：专业天气、时间轴与天文证据

#### Observable Result

<!-- ty-source-item:start key=result-forecast-and-astronomy kind=outcome_result -->
用户可从摘要下钻到小时、15 日、模型对比、昼夜蒙影、地图图层和天体事件；每项都携带单位、时间、模型/算法版本、可信度与数据状态，并明确“估计透明度/实验性大气稳定度”等边界。
<!-- ty-source-item:end -->

#### Product Requirements

<a id="forecast-and-astronomy.requirement.hourly-forecast"></a>
<!-- ty-source-item:start key=req-forecast-and-astronomy-hourly-forecast kind=requirement -->
- **REQ hourly-forecast** [direct: S-PRODUCT 6.3A]：按小时展示晴/多云/阴/雨/雷雨等天气、总云、高云（产品解释为 5km 以上）、中云（2～5km）、低云（2km 以下）、天空通透度、视宁度/实验性稳定度、地面水平能见度、温度/体感、湿度、露点/结露风险、小时降水量/概率、风速/阵风/风向、气压/变化参考、AQI、雾概率和月亮亮度/方位/高度；若供应商层定义不同必须说明并标准化，不能只换标签。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.requirement.model-comparison"></a>
<!-- ty-source-item:start key=req-forecast-and-astronomy-model-comparison kind=requirement -->
- **REQ model-comparison** [direct: S-PRODUCT 6.3B, S-ARCH 6.1]：高级模式显示主模型、对比模型、晴天钟式模型、分歧和可信度；普通用户看到系统解释而非被迫自行判读。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.requirement.fifteen-day-trend"></a>
<!-- ty-source-item:start key=req-forecast-and-astronomy-fifteen-day-trend kind=requirement -->
- **REQ fifteen-day-trend** [direct: S-PRODUCT 6.3C]：15 日趋势包括每日天气、高低温、云量、降雨、月相/月升落、无月黑夜长度、银河窗口和观星等级；远期明确低可信度。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.requirement.twilight-timeline"></a>
<!-- ty-source-item:start key=req-forecast-and-astronomy-twilight-timeline kind=requirement -->
- **REQ twilight-timeline** [direct: S-PRODUCT 6.3D]：按夜晚 → 天文晨光 → 航海晨光 → 民用晨光 → 白天 → 民用昏影 → 航海昏影 → 天文昏影 → 夜晚连续展示，并提炼完全天黑、无月黑夜和最佳观星三个结果。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.requirement.weather-map-layers"></a>
<!-- ty-source-item:start key=req-forecast-and-astronomy-weather-map-layers kind=requirement -->
- **REQ weather-map-layers** [direct: S-PRODUCT 6.3E]：提供卫星云图、云量、雾、降雨、风场、空气质量、光污染和综合指数图层；每层显示数据源、生成/下次更新时间、透明度和图例。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.requirement.astronomy-domain"></a>
<!-- ty-source-item:start key=req-forecast-and-astronomy-astronomy-domain kind=requirement -->
- **REQ astronomy-domain** [direct: S-ARCH 5.5/6.3]：计算日升落、三类蒙影、月相/照明/月升落、行星、银河、天体升起/中天/落下、无月黑夜、窗口、星图状态、日月食与天象事件；服务端为权威，客户端可离线计算动画。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.requirement.milky-way-visibility"></a>
<!-- ty-source-item:start key=req-forecast-and-astronomy-milky-way-visibility kind=requirement -->
- **REQ milky-way-visibility** [direct: S-ARCH 6.4]：银河可见性联合天文黑夜、月光、云量、光污染、核心高度、目标方向遮挡和通透度，并提供升起/中天/落下、方位、高度、拱桥姿态及时间交集。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.requirement.transparency-seeing-boundary"></a>
<!-- ty-source-item:start key=req-forecast-and-astronomy-transparency-seeing-boundary kind=requirement -->
- **REQ transparency-seeing-boundary** [direct: S-ARCH 6.2]：首期称“通透度估计”，输入高/中/低云、能见度、湿度、露点差、PM2.5、PM10、气溶胶、海拔和月光，输出估计等级、原始因素、可信度与不确定性；数据模型保留 seeing_provider_value、seeing_estimated_value、seeing_confidence、seeing_method_version，无明确专业模型/现场校准时只能显示“实验性大气稳定度”。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.requirement.satellite-data"></a>
<!-- ty-source-item:start key=req-forecast-and-astronomy-satellite-data kind=requirement -->
- **REQ satellite-data** [direct: S-ARCH 6.5]：空间站/亮星卫星使用带 epoch 的 OMM JSON 与 SGP4，考虑太阳照明和观察位置；空间站 6～12 小时、一般亮星卫星每日更新，过期时降低可信度。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.requirement.time-coordinate-provenance"></a>
<!-- ty-source-item:start key=req-forecast-and-astronomy-time-coordinate-provenance kind=requirement -->
- **REQ time-coordinate-provenance** [direct: S-ARCH 6.3/7.1/19.4]：所有时间权威保存 UTC、地点保存 IANA 时区、API 不接受无时区字符串；天文结果记录算法/星表版本、观察位置/海拔、计算时间和 time scale。
<!-- ty-source-item:end -->

#### User Flow And States

- 摘要下钻：从首页某指标进入同一地点/时间的对应专业行并保持上下文。
- 时间浏览：按小时横向/表格查看，固定行标签与时间列；选择时间同步天体、地图图层和天空。
- 模型分歧：先显示系统解释，再允许查看模型值；模型缺失/运行过期独立标识。
- 远期：15 日只作规划趋势，临近出发重新计算，不把远期等级当实时承诺。

#### Controls And Product Feedback

<a id="forecast-and-astronomy.control.hourly-matrix"></a>
- **CTRL hourly-matrix**
  - Source class: direct content；continuous matrix layout from S-DESIGN/S-IMG-01。
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-hourly-matrix-location kind=control -->
  - Location: “今晚 → 完整条件”主视图。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-forecast-and-astronomy-hourly-matrix-user-task kind=requirement -->
  - User task: 比较连续小时和专业指标。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-hourly-matrix-trigger kind=control -->
  - Trigger: 上下滑指标、横滑时间、点击时间列。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-hourly-matrix-input kind=control -->
  - Input: REQ hourly-forecast 全部指标、单位、质量标记和月亮状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-hourly-matrix-loading kind=control -->
  - Loading: 固定行高/列宽骨架，已加载列不闪回。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-hourly-matrix-empty kind=control -->
  - Empty: 单个指标无数据时保留行并说明，不用 0 代替。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-hourly-matrix-success kind=control -->
  - Success: 当前时间、最佳窗口和选中时间明显且同步其他表面。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-hourly-matrix-failure kind=control -->
  - Failure: 某模型失败时保留可用模型并显示 partial。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-hourly-matrix-feedback kind=control -->
  - Feedback: 冻结行标签/时间头、趋势或阈值语义、更新时间和可访问表格说明。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.control.model-selector"></a>
- **CTRL model-selector**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-model-selector-location kind=control -->
  - Location: 小时预报标题区的高级模式控制。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-forecast-and-astronomy-model-selector-user-task kind=requirement -->
  - User task: 查看主模型、对比模型和分歧解释。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-model-selector-trigger kind=control -->
  - Trigger: 打开模型选择器或选择模型。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-model-selector-input kind=control -->
  - Input: 可用模型、运行时间、分辨率、来源许可、健康状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-model-selector-loading kind=control -->
  - Loading: 切换仅更新数据区并保持选择器稳定。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-model-selector-empty kind=control -->
  - Empty: 只有一个模型时说明“暂无可比较模型”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-model-selector-success kind=control -->
  - Success: 模型值和系统解释同步更新。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-model-selector-failure kind=control -->
  - Failure: 失败模型明确不可用，自动回到主模型但不隐藏分歧。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-model-selector-feedback kind=control -->
  - Feedback: 显示模型运行批次、可信度及“为何分歧”说明。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.control.trend-calendar"></a>
- **CTRL trend-calendar**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-trend-calendar-location kind=control -->
  - Location: 条件页面的“15 日趋势”入口和独立视图。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-forecast-and-astronomy-trend-calendar-user-task kind=requirement -->
  - User task: 选择未来日期进行周末规划。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-trend-calendar-trigger kind=control -->
  - Trigger: 点击日期卡或日期选择器。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-trend-calendar-input kind=control -->
  - Input: 15 日逐日指标和可信度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-trend-calendar-loading kind=control -->
  - Loading: 日期骨架保持横向位置。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-trend-calendar-empty kind=control -->
  - Empty: 某日超出数据范围时禁用并说明。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-trend-calendar-success kind=control -->
  - Success: 选定日期可带入今晚报告/行程创建。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-trend-calendar-failure kind=control -->
  - Failure: 保留最后可用趋势并标过期。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-trend-calendar-feedback kind=control -->
  - Feedback: 远期可信度随日期显式降低，不与临近预报同样强调。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.control.twilight-window-strip"></a>
- **CTRL twilight-window-strip**
  - Source class: direct；graphic language from S-DESIGN/S-IMG-10。
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-twilight-window-strip-location kind=control -->
  - Location: 条件摘要与专业预报之间，可展开详情。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-forecast-and-astronomy-twilight-window-strip-user-task kind=requirement -->
  - User task: 判断天黑、无月和最佳窗口的连续关系。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-twilight-window-strip-trigger kind=control -->
  - Trigger: 点击时间带、拖动时间游标。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-twilight-window-strip-input kind=control -->
  - Input: 昼夜/三类蒙影、月升落、银河/目标窗口、最佳窗口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-twilight-window-strip-loading kind=control -->
  - Loading: 保持时间轴刻度和高度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-twilight-window-strip-empty kind=control -->
  - Empty: 极区或无事件时用真实说明替代普通时间段。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-twilight-window-strip-success kind=control -->
  - Success: 选择时刻同步小时矩阵、天空和摄影。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-twilight-window-strip-failure kind=control -->
  - Failure: 单类事件失败不伪造时间，标出算法/数据问题。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-twilight-window-strip-feedback kind=control -->
  - Feedback: 图例、起止、持续时长、当前时刻和重叠区域可读。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.control.weather-layer-panel"></a>
- **CTRL weather-layer-panel**
  - Source class: direct；map overlay interaction from S-IMG-09。
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-weather-layer-panel-location kind=control -->
  - Location: 地图的图层面板。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-forecast-and-astronomy-weather-layer-panel-user-task kind=requirement -->
  - User task: 切换一个主要栅格/矢量气象层并理解图例。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-weather-layer-panel-trigger kind=control -->
  - Trigger: 点击图层按钮、选择图层、调整透明度或时间。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-weather-layer-panel-input kind=control -->
  - Input: 图层列表、时间、透明度、来源、版本、图例。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-weather-layer-panel-loading kind=control -->
  - Loading: 地图保持可操作并显示瓦片加载进度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-weather-layer-panel-empty kind=control -->
  - Empty: 当前范围无数据时保留底图并说明。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-weather-layer-panel-success kind=control -->
  - Success: 新图层原子替换，图例/时间/来源同步。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-weather-layer-panel-failure kind=control -->
  - Failure: 回退上一可用图层，不留下半加载混合状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-forecast-and-astronomy-weather-layer-panel-feedback kind=control -->
  - Feedback: 当前层名称、年份/批次、透明度和数据新鲜度常驻可见。
<!-- ty-source-item:end -->

#### Technical Obligations And Boundaries

<a id="forecast-and-astronomy.obligation.weather-provider-normalization"></a>
<!-- ty-source-item:start key=obl-forecast-and-astronomy-weather-provider-normalization kind=technical_obligation -->
- **OBL weather-provider-normalization** [direct + external research: S-ARCH 6.1, S-USER, S-RESEARCH]：天气供应商实现统一 Provider 接口并先标准化/质检再进入业务；QWeather 按量候选承担中国常规天气/预警，Open-Meteo 免费端点只用于非商业 POC、付费 customer endpoint 只在经验证的分层云/能见度/多模型增益值得其 12 个月 TCO 时采购，ECMWF Open Data 仅作批处理基准/后备研究，具体合同由 DEC weather-provider-contracts 与 DEC provider-budget-and-paid-redundancy 决定，不默认同时支付两个天气源。QWeather 天气可按条款缓存但 GeoAPI 禁止批量缓存/索引，预警展示完整 `refer.sources`；Open-Meteo 商业生产不得使用 free endpoint，付费数据仍保留 CC BY 4.0 attribution/modification chain；所有 key 仅服务端持有。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.obligation.weather-model-schema"></a>
<!-- ty-source-item:start key=obl-forecast-and-astronomy-weather-model-schema kind=technical_obligation -->
- **OBL weather-model-schema** [direct: S-ARCH 6.1]：WeatherProviderRun 至少保存 id、provider、model、modelRunTime、ingestedAt、resolutionKm、status、sourceLicense；每小时记录 gridCellId/providerRunId/validTimeUtc、temperature/apparentTemperature、humidity/dewPoint/pressure、total/low/mid/highCloud、visibility、precipitationAmount/probability、windSpeed/gust/direction、fogProbability 和 qualityFlags；内部统一 SI 单位，展示层转换，空值不转 0。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.obligation.astronomy-versioning"></a>
<!-- ty-source-item:start key=obl-forecast-and-astronomy-astronomy-versioning kind=technical_obligation -->
- **OBL astronomy-versioning** [direct: S-ARCH 6.3]：使用 Astronomy Engine 外加自有领域封装，服务端/客户端共享语义；来源文档记录该库声称约 1 角分精度，但产品不得直接把声明当证明，结果和离线算法均版本化并按 EXT astronomy-authoritative-validation 的确认容差用黄金数据校验。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.non-completing.experimental-seeing-as-fact"></a>
<!-- ty-source-item:start key=ncomp-forecast-and-astronomy-experimental-seeing-as-fact kind=non_completing -->
- **NCOMP experimental-seeing-as-fact** [direct: S-ARCH 6.2]：无专业数据源或现场校准却把估算值标成正式“视宁度”，不能算本 Outcome 完成。
<!-- ty-source-item:end -->

#### Implementation Hints

- **HINT astronomy-package-capsule**：太阳、月亮、行星、银河、蒙影、窗口和坐标转换可共享领域包；实际路径留给 Contract。

#### Acceptance Scenarios

<a id="forecast-and-astronomy.acceptance.hourly-professional-view"></a>
<!-- ty-source-item:start key=ac-forecast-and-astronomy-hourly-professional-view kind=acceptance -->
- **AC hourly-professional-view**
  - Accepts: REQ hourly-forecast, CTRL hourly-matrix, OBL weather-model-schema
  - Given: 目标地点有完整小时天气和月亮数据。
  - When: 用户从摘要进入专业视图并选择一个小时。
  - Then: 全部指标以明确单位/质量状态对齐展示，选中时间同步且没有把缺失值显示为 0。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.acceptance.model-disagreement"></a>
<!-- ty-source-item:start key=ac-forecast-and-astronomy-model-disagreement kind=acceptance -->
- **AC model-disagreement**
  - Accepts: REQ model-comparison, CTRL model-selector, OBL weather-provider-normalization
  - Given: 两个模型对后半夜低云结论明显不同。
  - When: 用户查看模型比较。
  - Then: 系统先说明一致区间、分歧区间和可信度，再允许查看各模型值/批次/来源。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.acceptance.future-trend"></a>
<!-- ty-source-item:start key=ac-forecast-and-astronomy-future-trend kind=acceptance -->
- **AC future-trend**
  - Accepts: REQ fifteen-day-trend, CTRL trend-calendar
  - Given: 用户选择远期日期。
  - When: 查看趋势并把日期带入计划。
  - Then: 每日条件与天文窗口可见，低可信度显著，且不会被描述为实时确定结果。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.acceptance.twilight-and-milky-way"></a>
<!-- ty-source-item:start key=ac-forecast-and-astronomy-twilight-and-milky-way kind=acceptance -->
- **AC twilight-and-milky-way**
  - Accepts: REQ twilight-timeline, REQ milky-way-visibility, CTRL twilight-window-strip
  - Given: 银河窗口与天文黑夜、月落和地点遮挡部分重叠。
  - When: 用户查看连续时间带。
  - Then: 完全天黑、无月和可用银河区间分别可见，最佳区间只取真实交集。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.acceptance.experimental-atmosphere-label"></a>
<!-- ty-source-item:start key=ac-forecast-and-astronomy-experimental-atmosphere-label kind=acceptance -->
- **AC experimental-atmosphere-label**
  - Accepts: REQ transparency-seeing-boundary, NCOMP experimental-seeing-as-fact
  - Given: 没有正式视宁度供应商或现场校准。
  - When: 用户查看大气稳定指标。
  - Then: 产品显示“通透度估计/实验性大气稳定度”、因素、可信度和不确定性，不显示正式视宁度结论。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.acceptance.layer-provenance"></a>
<!-- ty-source-item:start key=ac-forecast-and-astronomy-layer-provenance kind=acceptance -->
- **AC layer-provenance**
  - Accepts: REQ weather-map-layers, CTRL weather-layer-panel
  - Given: 用户在地图选择一个有时间版本的气象或光污染图层。
  - When: 图层完成加载。
  - Then: 图例、数据源、生成/下次更新时间、年份或批次和透明度控制与图层一致。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.acceptance.astronomy-provenance"></a>
<!-- ty-source-item:start key=ac-forecast-and-astronomy-astronomy-provenance kind=acceptance -->
- **AC astronomy-provenance**
  - Accepts: REQ astronomy-domain, REQ satellite-data, REQ time-coordinate-provenance, OBL astronomy-versioning
  - Given: 用户查询天体位置或空间站过境。
  - When: 系统生成结果。
  - Then: 结果使用正确位置/时区并携带算法/星表或轨道 epoch/版本；过期轨道降低可信度。
<!-- ty-source-item:end -->

#### Risks And Recovery

<a id="forecast-and-astronomy.risk.forecast-schema"></a>
<!-- ty-source-item:start key=risk-forecast-and-astronomy-forecast-schema kind=risk_fact fact=public_api_or_schema_change outcome=forecast-and-astronomy -->
- **RISK forecast-schema**
  - Fact: public_api_or_schema_change
  - Affected Outcome: forecast-and-astronomy
  - Basis: 多供应商标准化字段、时间/单位和算法版本被移动端、缓存、推荐和离线共同消费。
  - Consequence: Contract 需约束单位、时区、空值、质量标记和兼容升级。
<!-- ty-source-item:end -->

<a id="forecast-and-astronomy.risk.model-observability"></a>
<!-- ty-source-item:start key=risk-forecast-and-astronomy-model-observability kind=risk_fact fact=weak_observability outcome=forecast-and-astronomy -->
- **RISK model-observability**
  - Fact: weak_observability
  - Affected Outcome: forecast-and-astronomy
  - Basis: 预报准确性、山区微气候和视宁度无法仅靠实验室测试确认。
  - Consequence: 必须结合供应商契约、黄金数据、现场对比和长期校准，UI 测试不能独立证明准确。
<!-- ty-source-item:end -->

<a id="outcome.map-route-discovery"></a>

### OUT map-route-discovery：地图发现、筛选与路线

#### Observable Result

<!-- ty-source-item:start key=result-map-route-discovery kind=outcome_result -->
用户可从当前位置、手动出发地或行程进入观星地图，在统一时间和偏好上下文中查看地点状态、图层与数量，按天空/出行/设施/适配条件筛选，选择主地点和备选地点，比较真实驾车/步行路线，并把同一选择带回今晚、详情和行程；地图坐标转换、路线失败和数据不足均有可见边界。
<!-- ty-source-item:end -->

#### Product Requirements

<a id="map-route-discovery.requirement.map-content-and-status"></a>
<!-- ty-source-item:start key=req-map-route-discovery-map-content-and-status kind=requirement -->
- **REQ map-content-and-status** [direct: S-PRODUCT 6.4A]：基础地图显示用户位置、观星点、收藏、主推荐、备选、路线、最后一段步行和当前可见范围地点数量；地点至少区分推荐、条件一般、暂不推荐、数据不足、临时关闭/存在风险，且状态不只依赖颜色。
<!-- ty-source-item:end -->

<a id="map-route-discovery.requirement.complete-map-filters"></a>
<!-- ty-source-item:start key=req-map-route-discovery-complete-map-filters kind=requirement -->
- **REQ complete-map-filters** [direct: S-PRODUCT 6.4B]：筛选覆盖光污染、今晚评分、云量、无月黑夜、银河/指定目标、八向无遮挡；直达/停车步行/车程/徒步/山路/收费/夜间到达；厕所、停车、平台、露营、信号、水电、补给、管理、收费、开放时间；新手、亲子、摄影、目视、大型望远镜、露营和无障碍/低徒步。
<!-- ty-source-item:end -->

<a id="map-route-discovery.requirement.complete-map-layers"></a>
<!-- ty-source-item:start key=req-map-route-discovery-complete-map-layers kind=requirement -->
- **REQ complete-map-layers** [direct: S-PRODUCT 6.4C]：图层支持观星点、观星指数、光污染、总云及高/中/低云、降雨、雾、卫星云图、空气质量、地形/海拔、银河中心、月亮、指定天体、日出日落方向和用户实况；栅格/矢量/符号层的互斥、叠加、顺序与密度由 DEC map-layer-composition-and-density 决定。
<!-- ty-source-item:end -->

<a id="map-route-discovery.requirement.selected-spot-summary"></a>
<!-- ty-source-item:start key=req-map-route-discovery-selected-spot-summary kind=requirement -->
- **REQ selected-spot-summary** [direct: S-PRODUCT 6.4D]：点击地点标记后，底部摘要包含名称、实景、距离/车程、今晚评分、最佳时间、光污染、主要设施、适合类型，以及加入计划、详情、导航操作。
<!-- ty-source-item:end -->

<a id="map-route-discovery.requirement.route-map-planning"></a>
<!-- ty-source-item:start key=req-map-route-discovery-route-map-planning kind=requirement -->
- **REQ route-map-planning** [direct: S-PRODUCT 6.4E, 6.7D]：路线页显示主路线、顺序编号地点、驾车和最后步行两段，可在全程/主地点/备选或分段视图切换、选点看实景/详情、拖动排序，并给出总距离、预计总时长、到达时间、收费、主要道路、步行距离和各点建议窗口。
<!-- ty-source-item:end -->

<a id="map-route-discovery.requirement.route-mode-coverage"></a>
<!-- ty-source-item:start key=req-map-route-discovery-route-mode-coverage kind=requirement -->
- **REQ route-mode-coverage** [direct: S-PRODUCT 6.1, S-ARCH 4.1/5.7/6.8]：路线聚合按用户交通支持驾车、步行和骑行，并在供应商/地区可用时支持公共交通、电动车；观星执行路线仍明确拆出最后一段步行/搬运，任一模式缺失必须说明而不能套用驾车时间。
<!-- ty-source-item:end -->

<a id="map-route-discovery.requirement.route-variants-and-degradation"></a>
<!-- ty-source-item:start key=req-map-route-discovery-route-variants-and-degradation kind=requirement -->
- **REQ route-variants-and-degradation** [direct: S-PRODUCT 6.7D, S-ARCH 5.7]：用户可比较“最快到主地点、先到备选再决定、主地点失败转备选”等方案；MVP 以外部导航链接执行导航，路线供应商失败时仍保留直线距离、缓存快照、停车点和手动跳转，不伪装为实时路线。
<!-- ty-source-item:end -->

<a id="map-route-discovery.requirement.map-selection-coordination"></a>
<!-- ty-source-item:start key=req-map-route-discovery-map-selection-coordination kind=requirement -->
- **REQ map-selection-coordination** [derived from S-CONTEXT, S-IMG-05～07]：地图、卡片、详情、今晚和行程共享选中地点、日期/时刻、预设、主备角色和路线方案；切换其中任一项应明确刷新依赖数据，不能出现地图选中 A 而卡片操作 B。
<!-- ty-source-item:end -->

<a id="map-route-discovery.requirement.search-and-candidate-bounds"></a>
<!-- ty-source-item:start key=req-map-route-discovery-search-and-candidate-bounds kind=requirement -->
- **REQ search-and-candidate-bounds** [direct: S-ARCH 4.3～4.4]：附近搜索先用 PostGIS 距离预筛，再按天气/天文/光污染/设施过滤，只对前 10～20 个候选请求真实路线并形成前 3～5 个推荐；这些数值是来源建议，最终阈值由 DEC candidate-routing-limits 固化。
<!-- ty-source-item:end -->

#### User Flow And States

- 正常流：进入地图 → 确认地点/日期/预设 → 浏览状态标记 → 搜索或打开筛选/图层 → 选择地点摘要 → 详情/加入主备 → 查看路线 → 调整顺序或方案 → 外部导航/保存行程。
- 空范围：无地点时保留地图、范围和已选筛选，给出扩大范围、清除冲突条件、上传地点的可解释动作，不制造推荐点。
- 数据降级：气象/光污染瓦片不可用时基础地图、缓存地点和路线仍工作；过期层保留版本标记；路线失败不影响地点详情和离线停车信息。
- 坐标状态：业务数据始终以 WGS84 参与天文/距离逻辑，高德适配层只为展示/路线转换 GCJ-02；转换精度或来源不足时公开质量状态。

#### Controls And Product Feedback

<a id="map-route-discovery.control.map-search-context-bar"></a>
- **CTRL map-search-context-bar**
  - Source class: direct search/context need；布局 derived。
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-search-context-bar-location kind=control -->
  - Location: 地图顶部安全区内。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-map-route-discovery-map-search-context-bar-user-task kind=requirement -->
  - User task: 搜索地点/区域并确认当前出发地、日期和偏好。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-search-context-bar-trigger kind=control -->
  - Trigger: 点击搜索、位置、日期或预设胶囊。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-search-context-bar-input kind=control -->
  - Input: POI/地点关键词、手动位置、日期/时刻、偏好预设。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-search-context-bar-loading kind=control -->
  - Loading: 搜索建议和上下文更新各自显示进度，不锁死地图。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-search-context-bar-empty kind=control -->
  - Empty: 无建议时说明搜索范围并提供地图选点/上传地点。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-search-context-bar-success kind=control -->
  - Success: 移动视口或刷新当前范围结果，显示结果数和上下文。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-search-context-bar-failure kind=control -->
  - Failure: 保留原视口与输入，可重试或改用手动坐标。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-search-context-bar-feedback kind=control -->
  - Feedback: 当前上下文常驻可见，任何更改都提示哪些结果正在重算。
<!-- ty-source-item:end -->

<a id="map-route-discovery.control.map-filter-sheet"></a>
- **CTRL map-filter-sheet**
  - Source class: direct fields；分组/冲突反馈 derived。
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-filter-sheet-location kind=control -->
  - Location: 地图筛选按钮打开的半屏/全屏面板。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-map-route-discovery-map-filter-sheet-user-task kind=requirement -->
  - User task: 设置天空、出行、设施和用户适配条件。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-filter-sheet-trigger kind=control -->
  - Trigger: 点击筛选；从无结果提示可直接打开冲突项。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-filter-sheet-input kind=control -->
  - Input: REQ complete-map-filters 的全部字段、硬条件/排序偏好语义和当前预设。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-filter-sheet-loading kind=control -->
  - Loading: 预估结果数异步更新，控件保持可编辑。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-filter-sheet-empty kind=control -->
  - Empty: 尚未设置时显示“当前预设，无额外筛选”；结果为零时指出最可能冲突条件。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-filter-sheet-success kind=control -->
  - Success: 应用后地图原子更新，按钮显示已启用数量和硬条件。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-filter-sheet-failure kind=control -->
  - Failure: 保留草稿，说明无法计算的字段并允许移除该项。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-filter-sheet-feedback kind=control -->
  - Feedback: 每个阈值有单位；重置与应用分开；若后续要把临时筛选保存为偏好，必须回到已定义的偏好预设流程，硬阻断不与排序偏好混淆。
<!-- ty-source-item:end -->

<a id="map-route-discovery.control.map-layer-selector"></a>
- **CTRL map-layer-selector**
  - Source class: direct fields；interaction from S-IMG-09。
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-layer-selector-location kind=control -->
  - Location: 地图右侧图层入口打开的面板。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-map-route-discovery-map-layer-selector-user-task kind=requirement -->
  - User task: 选择观星、气象、光污染、地形、天体方向或实况层。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-layer-selector-trigger kind=control -->
  - Trigger: 点击图层按钮、图层行、时间或透明度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-layer-selector-input kind=control -->
  - Input: 图层可用性、版本、时间、图例、许可归属和透明度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-layer-selector-loading kind=control -->
  - Loading: 单层逐步加载并显示进度，基础地图与其他稳定层不闪烁。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-layer-selector-empty kind=control -->
  - Empty: 当前层/范围无数据时给出覆盖范围与可用替代层。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-layer-selector-success kind=control -->
  - Success: 图层、图例、时间和来源一起切换。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-layer-selector-failure kind=control -->
  - Failure: 自动回到最后成功状态并显示重试。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-layer-selector-feedback kind=control -->
  - Feedback: 常驻显示当前主要层、数据年份/批次、过期状态和图例。
<!-- ty-source-item:end -->

<a id="map-route-discovery.control.map-marker-density-surface"></a>
- **CTRL map-marker-density-surface**
  - Source class: direct marker/status/count；聚合行为 derived。
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-marker-density-surface-location kind=control -->
  - Location: 地图画布。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-map-route-discovery-map-marker-density-surface-user-task kind=requirement -->
  - User task: 理解范围内地点分布并选择一个地点。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-marker-density-surface-trigger kind=control -->
  - Trigger: 缩放/移动地图、点击地点或按 DEC map-layer-composition-and-density 生成的聚合/密度表示。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-marker-density-surface-input kind=control -->
  - Input: 地点坐标、状态、角色、评分可信度、收藏、当前范围数量和已确认的密度呈现策略。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-marker-density-surface-loading kind=control -->
  - Loading: 已有标记保持，范围边缘显示增量加载而非全部消失。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-marker-density-surface-empty kind=control -->
  - Empty: 无地点时显示空范围提示，不显示幽灵标记。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-marker-density-surface-success kind=control -->
  - Success: 选中态与相机/摘要同步；高密度表示可继续缩放或进入可识别地点列表。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-marker-density-surface-failure kind=control -->
  - Failure: 单个地点异常被排除并记录，不破坏整个地图。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-map-marker-density-surface-feedback kind=control -->
  - Feedback: 形状/标签/图标区分主备、风险和数据不足；可访问列表提供等价选择。
<!-- ty-source-item:end -->

<a id="map-route-discovery.control.selected-spot-sheet"></a>
- **CTRL selected-spot-sheet**
  - Source class: direct；sheet layout from S-IMG-02/S-IMG-07。
<!-- ty-source-item:start key=ctrl-map-route-discovery-selected-spot-sheet-location kind=control -->
  - Location: 选中标记后的底部可拖动面板。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-map-route-discovery-selected-spot-sheet-user-task kind=requirement -->
  - User task: 快速判断地点并采取加入计划、详情或导航动作。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-selected-spot-sheet-trigger kind=control -->
  - Trigger: 点击地点标记或可访问地点列表项。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-selected-spot-sheet-input kind=control -->
  - Input: REQ selected-spot-summary 的全部内容和主备状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-selected-spot-sheet-loading kind=control -->
  - Loading: 面板骨架保留地点名/动作位置，路线字段单独加载。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-selected-spot-sheet-empty kind=control -->
  - Empty: 无图片/路线/评分分别显示真实缺失，不隐藏其余内容。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-selected-spot-sheet-success kind=control -->
  - Success: 关键信息与动作可用，拖到展开态可看更多证据。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-selected-spot-sheet-failure kind=control -->
  - Failure: 保留地点身份和重试；写操作失败回滚角色并说明。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-selected-spot-sheet-feedback kind=control -->
  - Feedback: 主地点/备选/已收藏状态即时可见，导航前显示路线新鲜度。
<!-- ty-source-item:end -->

<a id="map-route-discovery.control.route-plan-editor"></a>
- **CTRL route-plan-editor**
  - Source class: direct；tabs/numbered route from S-IMG-05～07。
<!-- ty-source-item:start key=ctrl-map-route-discovery-route-plan-editor-location kind=control -->
  - Location: 路线全屏页或行程地图模式。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-map-route-discovery-route-plan-editor-user-task kind=requirement -->
  - User task: 比较方案、查看分段并调整地点顺序。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-route-plan-editor-trigger kind=control -->
  - Trigger: 打开路线、切换全程/分段、拖动地点、选择方案。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-route-plan-editor-input kind=control -->
  - Input: 起点、主备地点、顺序、出行方式、真实路线/步行段、时间窗口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-route-plan-editor-loading kind=control -->
  - Loading: 旧路线以 stale 样式保留，重算进度和被改动段明确。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-route-plan-editor-empty kind=control -->
  - Empty: 少于一个目的地时提供添加地点；无路线时保留直线关系和原因。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-route-plan-editor-success kind=control -->
  - Success: 编号、线路、距离/时长/收费/到达和窗口一致更新并可保存。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-route-plan-editor-failure kind=control -->
  - Failure: 恢复最后成功路线或接受无路线草稿，不静默丢失排序。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-route-plan-editor-feedback kind=control -->
  - Feedback: 每次重排显示影响的到达时间/窗口；撤销入口可见。
<!-- ty-source-item:end -->

<a id="map-route-discovery.control.external-navigation-action"></a>
- **CTRL external-navigation-action**
  - Source class: direct MVP action。
<!-- ty-source-item:start key=ctrl-map-route-discovery-external-navigation-action-location kind=control -->
  - Location: 地点摘要、详情、路线和现场停车卡。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-map-route-discovery-external-navigation-action-user-task kind=requirement -->
  - User task: 将选定目的地/停车点交给已安装地图应用导航。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-external-navigation-action-trigger kind=control -->
  - Trigger: 点击“开始导航”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-external-navigation-action-input kind=control -->
  - Input: WGS84 权威坐标、转换后的导航坐标、地点名、停车点、可用地图应用。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-external-navigation-action-loading kind=control -->
  - Loading: 解析应用和坐标时防重复触发。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-external-navigation-action-empty kind=control -->
  - Empty: 无支持应用或精确坐标不可公开时解释并允许复制公开地址/近似点。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-external-navigation-action-success kind=control -->
  - Success: 显示即将打开的应用、目的地类型后发起系统跳转。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-external-navigation-action-failure kind=control -->
  - Failure: 返回 APP 后保留路线，提供换应用或复制坐标。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-map-route-discovery-external-navigation-action-feedback kind=control -->
  - Feedback: 明确导航到“观星点/停车点/公开近似点”，不让用户误以为内置导航正在持续引导。
<!-- ty-source-item:end -->

#### Technical Obligations And Boundaries

<a id="map-route-discovery.obligation.amap-adapter"></a>
<!-- ty-source-item:start key=obl-map-route-discovery-amap-adapter kind=technical_obligation -->
- **OBL amap-adapter** [direct + external research: S-ARCH 4.1, S-RESEARCH]：中国主场景使用获法人技术服务许可的 Android/iOS 高德原生 3D SDK，后端使用高德 Web 路线、后台使用高德 JS；React Native 上层只经统一 MapAdapter 使用用户位置、相机、Marker、Polyline、合法 Tile Layer 和投影能力，平台差异不得渗入业务模型。MapView/OfflineMapManager 初始化前完成高德隐私告知/同意接口，披露其位置/搜索/设备/网络/传感器采集，保留不可移除 logo；离线地图只走合同允许的双端原生能力，禁止服务端抓取高德或 OSM 公共瓦片。
<!-- ty-source-item:end -->

<a id="map-route-discovery.obligation.authoritative-coordinate-boundary"></a>
<!-- ty-source-item:start key=obl-map-route-discovery-authoritative-coordinate-boundary kind=technical_obligation -->
- **OBL authoritative-coordinate-boundary** [direct: S-ARCH 4.2]：数据库、天气、天文、遥感和 PostGIS 只以 WGS84 为权威；GCJ-02 仅在高德适配层生成/缓存且可按算法版本重建，保存坐标来源、水平精度和验证时间。
<!-- ty-source-item:end -->

<a id="map-route-discovery.obligation.spatial-query-boundary"></a>
<!-- ty-source-item:start key=obl-map-route-discovery-spatial-query-boundary kind=technical_obligation -->
- **OBL spatial-query-boundary** [direct: S-ARCH 4.3～4.4]：Spot 使用 PostGIS geography(Point,4326) 与 GiST/KNN 空间索引，区域/光污染/地形/路线等用 geometry(Polygon/LineString,4326)；视口/附近查询、过滤和路线候选必须有上限、分页/游标和取消过期请求。
<!-- ty-source-item:end -->

<a id="map-route-discovery.non-completing.poi-as-ground-truth"></a>
<!-- ty-source-item:start key=ncomp-map-route-discovery-poi-as-ground-truth kind=non_completing -->
- **NCOMP poi-as-ground-truth** [direct: S-ARCH 6.8]：只靠高德 POI 推断厕所夜间开放、平台可架设备、路灯、停车容量等地点事实，不能算地图/地点能力完成。
<!-- ty-source-item:end -->

#### Implementation Hints

- **HINT map-adapter-contract**：MapAdapter 可覆盖 showUserLocation、setCamera、setMarkers、setPolylines、setTileLayers、project；真实模块位置由 Contract 绑定。
- **HINT map-request-cancellation**：相机移动、筛选或日期变化应取消旧查询并只接受最新上下文响应，避免旧结果覆盖新视口。
- **HINT route-snapshot**：保存路线供应商、请求参数摘要、坐标系、生成时间、过期时间和线路几何，供离线/故障时明确降级。

#### Acceptance Scenarios

<a id="map-route-discovery.acceptance.map-status-and-context"></a>
<!-- ty-source-item:start key=ac-map-route-discovery-map-status-and-context kind=acceptance -->
- **AC map-status-and-context**
  - Accepts: REQ map-content-and-status, REQ map-selection-coordination, CTRL map-search-context-bar, CTRL map-marker-density-surface
  - Given: 当前范围同时存在主推荐、备选、风险和数据不足地点。
  - When: 用户移动视口并选择任一地点。
  - Then: 数量、标记状态、选中摘要和全局地点/时间上下文一致，颜色之外仍能辨认状态。
<!-- ty-source-item:end -->

<a id="map-route-discovery.acceptance.filter-no-results"></a>
<!-- ty-source-item:start key=ac-map-route-discovery-filter-no-results kind=acceptance -->
- **AC filter-no-results**
  - Accepts: REQ complete-map-filters, CTRL map-filter-sheet
  - Given: 用户组合了互相冲突的硬筛选并得到零结果。
  - When: 筛选应用完成。
  - Then: 地图保留范围和筛选，指出冲突/结果数并提供逐项放宽或重置，而不是显示假地点。
<!-- ty-source-item:end -->

<a id="map-route-discovery.acceptance.layer-version-and-failure"></a>
<!-- ty-source-item:start key=ac-map-route-discovery-layer-version-and-failure kind=acceptance -->
- **AC layer-version-and-failure**
  - Accepts: REQ complete-map-layers, CTRL map-layer-selector
  - Given: 用户切换到一个部分瓦片失败的年度光污染层。
  - When: 新层无法完整加载。
  - Then: 系统回退上一成功层或清晰显示缺口，图例、年份、来源和失败状态不与旧层错配。
<!-- ty-source-item:end -->

<a id="map-route-discovery.acceptance.selected-spot-action"></a>
<!-- ty-source-item:start key=ac-map-route-discovery-selected-spot-action kind=acceptance -->
- **AC selected-spot-action**
  - Accepts: REQ selected-spot-summary, CTRL selected-spot-sheet
  - Given: 一个地点缺少图片但有评分、设施和路线。
  - When: 用户点击其标记并设为备选。
  - Then: 真实缺图状态与其余摘要同时可见，备选角色同步到地图/今晚/行程且失败可回滚。
<!-- ty-source-item:end -->

<a id="map-route-discovery.acceptance.route-reorder"></a>
<!-- ty-source-item:start key=ac-map-route-discovery-route-reorder kind=acceptance -->
- **AC route-reorder**
  - Accepts: REQ route-map-planning, REQ map-selection-coordination, CTRL route-plan-editor
  - Given: 一个主地点、两个备选和分开的驾车/步行段均有时间窗口。
  - When: 用户拖动改变顺序。
  - Then: 受影响线路、编号、距离、到达时间和窗口一起重算，期间旧路线标 stale 且可撤销。
<!-- ty-source-item:end -->

<a id="map-route-discovery.acceptance.route-mode-and-last-mile"></a>
<!-- ty-source-item:start key=ac-map-route-discovery-route-mode-and-last-mile kind=acceptance -->
- **AC route-mode-and-last-mile**
  - Accepts: REQ route-mode-coverage, CTRL route-plan-editor
  - Given: 用户预设为骑行且目的地停车/道路结束后还有设备搬运步行段。
  - When: 生成路线方案。
  - Then: 骑行和最后步行/搬运分别显示距离、时间和可用性；供应商无骑行结果时明确缺失而不展示驾车 ETA。
<!-- ty-source-item:end -->

<a id="map-route-discovery.acceptance.route-provider-degradation"></a>
<!-- ty-source-item:start key=ac-map-route-discovery-route-provider-degradation kind=acceptance -->
- **AC route-provider-degradation**
  - Accepts: REQ route-variants-and-degradation, CTRL external-navigation-action
  - Given: 路线供应商超时但存在缓存路线和已验证停车点。
  - When: 用户查看并发起导航。
  - Then: APP 标明缓存时间与非实时状态，允许导航到停车点/换应用，不把直线距离描述为驾车路线。
<!-- ty-source-item:end -->

<a id="map-route-discovery.acceptance.coordinate-round-trip"></a>
<!-- ty-source-item:start key=ac-map-route-discovery-coordinate-round-trip kind=acceptance -->
- **AC coordinate-round-trip**
  - Accepts: REQ search-and-candidate-bounds, OBL amap-adapter, OBL authoritative-coordinate-boundary, OBL spatial-query-boundary, NCOMP poi-as-ground-truth
  - Given: 同一 WGS84 地点参与附近搜索、天文计算和高德展示。
  - When: 系统生成地图标记与候选路线。
  - Then: 搜索/天文仍使用权威坐标，高德仅显示转换结果，候选调用受上限约束且 POI 未覆盖自有地点事实。
<!-- ty-source-item:end -->

#### Risks And Recovery

<a id="map-route-discovery.risk.coordinate-schema"></a>
<!-- ty-source-item:start key=risk-map-route-discovery-coordinate-schema kind=risk_fact fact=public_api_or_schema_change outcome=map-route-discovery -->
- **RISK coordinate-schema**
  - Fact: public_api_or_schema_change
  - Affected Outcome: map-route-discovery
  - Basis: 坐标字段、转换版本和路线快照被地图、天文、天气、推荐、离线和后台共同消费。
  - Consequence: Contract 必须固定权威坐标、展示坐标、精度/来源语义与兼容迁移。
<!-- ty-source-item:end -->

<a id="map-route-discovery.risk.route-critical-path"></a>
<!-- ty-source-item:start key=risk-map-route-discovery-route-critical-path kind=risk_fact fact=critical_user_path outcome=map-route-discovery -->
- **RISK route-critical-path**
  - Fact: critical_user_path
  - Affected Outcome: map-route-discovery
  - Basis: 路线和最后一公里错误会直接影响夜间到达和安全。
  - Consequence: 必须以真实供应商契约、缓存降级、停车点校验和户外路线测试验证，不能只用直线距离单测。
<!-- ty-source-item:end -->

<a id="map-route-discovery.risk.map-permission"></a>
<!-- ty-source-item:start key=risk-map-route-discovery-map-permission kind=risk_fact fact=permission_boundary_change outcome=map-route-discovery -->
- **RISK map-permission**
  - Fact: permission_boundary_change
  - Affected Outcome: map-route-discovery
  - Basis: 从手动位置升级到前台持续定位或外部地图跳转涉及系统授权和跨应用边界。
  - Consequence: 每种定位级别和拒绝路径需独立验收，不得因地图存在而默认申请后台定位。
<!-- ty-source-item:end -->

<a id="outcome.spot-detail-and-trust"></a>

### OUT spot-detail-and-trust：地点详情、真实性与风险判断

#### Observable Result

<!-- ty-source-item:start key=result-spot-detail-and-trust kind=outcome_result -->
用户可在一个地点详情中由“今晚是否适合”逐层核对光污染/遮挡、实景、交通最后一公里、设施、安全和用户实况，理解数据来源、更新时间、可信度及精确坐标公开范围，并完成收藏、主备、导航、天空、拍摄、实况或纠错操作；资料缺失、过期、冲突和临时关闭不会被漂亮卡片掩盖。
<!-- ty-source-item:end -->

#### Product Requirements

<a id="spot-detail-and-trust.requirement.spot-identity-and-freshness"></a>
<!-- ty-source-item:start key=req-spot-detail-and-trust-spot-identity-and-freshness kind=requirement -->
- **REQ spot-identity-and-freshness** [direct: S-PRODUCT 6.5A]：详情基础信息完整包含名称、经纬度/访问级别、地址、海拔、地点类型、开放时间、收费、数据更新时间、数据可信度和最近用户实况时间。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.requirement.spot-tonight-comparison"></a>
<!-- ty-source-item:start key=req-spot-detail-and-trust-spot-tonight-comparison kind=requirement -->
- **REQ spot-tonight-comparison** [direct: S-PRODUCT 6.5B]：今晚区包含综合评分、最佳/无月/银河窗口、云量变化、降雨、风、月光、可见天象、数据可信度和相对附近地点优劣，并延续硬阻断/原因/行动/专业证据层级。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.requirement.light-pollution-evidence"></a>
<!-- ty-source-item:start key=req-spot-detail-and-trust-light-pollution-evidence kind=requirement -->
- **REQ light-pollution-evidence** [direct: S-PRODUCT 6.5C, S-ARCH 6.6]：光污染区显示地图、指数/合法推导的 Bortle 区间、主要光源与城市光穹方向、用户实测、路灯/营地灯/车辆灯等临时风险，以及数据集年份、许可、置信度和估算方法；规范化数据保留 radiance_nw_cm2_sr、light_pollution_index、estimated_sky_brightness、estimated_bortle_min/max、confidence、dataset_version，VIIRS 辐射值不得直接命名为 Bortle。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.requirement.directional-horizon"></a>
<!-- ty-source-item:start key=req-spot-detail-and-trust-directional-horizon kind=requirement -->
- **REQ directional-horizon** [direct: S-PRODUCT 6.5D, S-ARCH 6.7]：记录北、东北、东、东南、南、西南、西、西北遮挡、整体开阔度、山体/树林/建筑/电塔类型和适合方向；可将版本化 DEM 地形、人工修正、全景识别轮廓取最大有效遮挡并叠加星图。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.requirement.spot-media-provenance"></a>
<!-- ty-source-item:start key=req-spot-detail-and-trust-spot-media-provenance kind=requirement -->
- **REQ spot-media-provenance** [direct: S-PRODUCT 6.5E, S-ARCH 12]：媒体覆盖地点全景、各方向实景、白天、夜间和星空样片，并显示拍摄日期/时间、手机或相机、镜头/焦段、方向、曝光、备注、可信度和是否原地点拍摄；公开资产移除精确 GPS、序列号与隐私 EXIF。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.requirement.last-mile-access"></a>
<!-- ty-source-item:start key=req-spot-detail-and-trust-last-mile-access kind=requirement -->
- **REQ last-mile-access** [direct: S-PRODUCT 6.5F]：交通区完整描述直达、停车位置/容量、停车后步行距离/时间、累计爬升、道路类型、夜间风险、越野车、雨后状况、门禁/预约和外部导航；位置类字段携带验证时间和来源。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.requirement.facilities-and-emergency"></a>
<!-- ty-source-item:start key=req-spot-detail-and-trust-facilities-and-emergency kind=requirement -->
- **REQ facilities-and-emergency** [direct: S-PRODUCT 目标用户/6.5G]：设施区覆盖厕所、饮用水、电源、手机信号、平整观测平台/大型设备展开空间、露营、住宿、补给、遮雨、垃圾处理和紧急求助条件，并能表达夜间开放、收费、容量、季节性、未知或临时不可用。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.requirement.spot-safety"></a>
<!-- ty-source-item:start key=req-spot-detail-and-trust-spot-safety kind=requirement -->
- **REQ spot-safety** [direct: S-PRODUCT 6.5H]：安全区覆盖山路/悬崖/水域、野生动物、治安、极端天气、潮汐/水位、封路、结伴要求和最近风险报告；高风险或关闭状态在首屏与导航前重复呈现且不能被总分抵消。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.requirement.multidimensional-reviews"></a>
<!-- ty-source-item:start key=req-spot-detail-and-trust-multidimensional-reviews kind=requirement -->
- **REQ multidimensional-reviews** [direct: S-PRODUCT 6.5I]：评价维度包括天空暗度、开阔度、实际云量、交通便利、设施完整、安全、拥挤、手机信号、摄影适配和目视适配；短实况保留到达时间和具体观察，不能压成一个平均总分。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.requirement.spot-actions"></a>
<!-- ty-source-item:start key=req-spot-detail-and-trust-spot-actions kind=requirement -->
- **REQ spot-actions** [direct: S-PRODUCT 6.5J]：详情提供收藏、分享、加入今晚计划、设为主地点、设为备选地点、立即导航、查看 360°天空、获取拍摄参数、上传实况和纠错；动作按登录、坐标访问、风险和数据可用性显示 disabled 原因。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.requirement.coordinate-visibility"></a>
<!-- ty-source-item:start key=req-spot-detail-and-trust-coordinate-visibility kind=requirement -->
- **REQ coordinate-visibility** [direct: S-PRODUCT 风险, S-ARCH 15.3]：地点坐标支持 public_exact、public_approximate、verified_only、invite_only、private、hidden；对可能引发人流/垃圾、私人土地侵入、夜间扰民、生态破坏或不安全驾驶的敏感/高风险地点，不默认公开精确坐标，并支持模糊/仅核验可见、暂停推荐和季节性关闭；地图/分享/导航/离线所有出口遵守同一策略。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.requirement.trust-and-conflict"></a>
<!-- ty-source-item:start key=req-spot-detail-and-trust-trust-and-conflict kind=requirement -->
- **REQ trust-and-conflict** [direct: S-PRODUCT 6.11D, S-ARCH 5.3]：地点事实显示来源、核验方式、最近确认、样本数、置信度、审核状态和冲突；官方/管理员、已核验贡献、普通贡献与过期临时实况权重不同，但具体等级/阈值由 DEC moderation-trust-policy 决定。
<!-- ty-source-item:end -->

#### User Flow And States

- 正常流：从地图/推荐打开 → 先看今晚结论、阻断和主行动 → 展开光污染/遮挡/实景 → 核对停车步行、设施、安全 → 查看评价/实况与可信度 → 设主备/导航/天空/拍摄。
- 资料不足：每个区块独立显示 unknown、最后核验时间和“贡献/纠错”，不会用空白或 0 代替未知；首屏结论降低可信度。
- 冲突：官方开放信息、历史资料和最新用户实况矛盾时显示冲突来源/时间，并优先保护安全（例如暂停导航而非静默选一个值）。
- 坐标受限：公开用户看到近似区域和申请/邀请说明；授权用户才能在导航、离线包和分享中取得精确点。

#### Controls And Product Feedback

<a id="spot-detail-and-trust.control.spot-hero"></a>
- **CTRL spot-hero**
  - Source class: direct content；hierarchy derived from S-DESIGN/S-IMG-02。
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-hero-location kind=control -->
  - Location: 地点详情首屏，媒体之后或与媒体重叠的稳定标题区。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-spot-detail-and-trust-spot-hero-user-task kind=requirement -->
  - User task: 识别地点并快速判断今晚是否可去。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-hero-trigger kind=control -->
  - Trigger: 打开详情或切换日期/预设。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-hero-input kind=control -->
  - Input: 身份、今晚结论、主阻断、窗口、距离/车程、可信度、开放/风险状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-hero-loading kind=control -->
  - Loading: 地点身份立即显示，动态今晚数据用固定骨架。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-hero-empty kind=control -->
  - Empty: 无今晚报告时仍显示静态事实并给出生成/刷新入口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-hero-success kind=control -->
  - Success: 结论、最佳窗口、关键原因与主要行动首屏可读。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-hero-failure kind=control -->
  - Failure: 动态失败与静态事实分离，不能把旧评分显示为当前。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-hero-feedback kind=control -->
  - Feedback: 风险/关闭高于推荐分；更新时间、可信度和主备状态可见。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.control.spot-media-gallery"></a>
- **CTRL spot-media-gallery**
  - Source class: direct；gallery interaction derived。
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-media-gallery-location kind=control -->
  - Location: 详情顶部图库及“实景与样片”区。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-spot-detail-and-trust-spot-media-gallery-user-task kind=requirement -->
  - User task: 核对真实环境、方向和摄影参考。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-media-gallery-trigger kind=control -->
  - Trigger: 滑动缩略图、打开全屏、切换白天/夜间/全景/样片。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-media-gallery-input kind=control -->
  - Input: 已审核媒体、方向/时间/设备/曝光、原地点证明、可信度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-media-gallery-loading kind=control -->
  - Loading: 使用与媒体比例一致的占位并逐张加载。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-media-gallery-empty kind=control -->
  - Empty: 按类别显示缺失并提供上传入口，不用装饰图伪装实景。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-media-gallery-success kind=control -->
  - Success: 全屏图与结构化元数据、方向和审核状态对应。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-media-gallery-failure kind=control -->
  - Failure: 单图失败可重试/跳过，图库其余内容继续可用。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-media-gallery-feedback kind=control -->
  - Feedback: AI/处理图、非原地点、模糊位置和过期素材有显著标签。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.control.evidence-section-nav"></a>
- **CTRL evidence-section-nav**
  - Source class: derived from long detail content。
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-evidence-section-nav-location kind=control -->
  - Location: 首屏下方吸顶分段导航。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-spot-detail-and-trust-evidence-section-nav-user-task kind=requirement -->
  - User task: 在今晚、天空、到达、设施、安全、实况之间快速跳转。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-evidence-section-nav-trigger kind=control -->
  - Trigger: 点击分段或滚动进入区块。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-evidence-section-nav-input kind=control -->
  - Input: 可用区块、缺失/风险徽标和当前滚动位置。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-evidence-section-nav-loading kind=control -->
  - Loading: 导航结构稳定，动态徽标渐进出现。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-evidence-section-nav-empty kind=control -->
  - Empty: 缺少内容的区块仍可进入并解释缺口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-evidence-section-nav-success kind=control -->
  - Success: 目标标题不被安全区/吸顶栏遮挡，选中状态同步。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-evidence-section-nav-failure kind=control -->
  - Failure: 锚点失效时回到区块顶部，不改变地点。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-evidence-section-nav-feedback kind=control -->
  - Feedback: 含高风险或未核验内容的区块显示非颜色唯一的提示。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.control.horizon-polar-view"></a>
- **CTRL horizon-polar-view**
  - Source class: direct；graphic/legend from S-IMG-08。
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-horizon-polar-view-location kind=control -->
  - Location: “光污染与地平线”区，可全屏。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-spot-detail-and-trust-horizon-polar-view-user-task kind=requirement -->
  - User task: 判断指定方向、高度的遮挡和光穹。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-horizon-polar-view-trigger kind=control -->
  - Trigger: 拖动方位、切换地平线/光污染/目标叠加或视角。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-horizon-polar-view-input kind=control -->
  - Input: 0～359°地形/人工/全景轮廓、八向摘要、目标轨迹、版本/置信度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-horizon-polar-view-loading kind=control -->
  - Loading: 保留方位刻度和图例，轮廓分层加载。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-horizon-polar-view-empty kind=control -->
  - Empty: 无轮廓时显示八向文字事实或明确未知。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-horizon-polar-view-success kind=control -->
  - Success: 北向、方位/高度、有效遮挡、光源和目标交互一致。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-horizon-polar-view-failure kind=control -->
  - Failure: 某数据层失败即隐藏该层并标注，不合成虚假轮廓。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-horizon-polar-view-feedback kind=control -->
  - Feedback: 图例解释地形/人工/估算、较暗/较亮与数据版本；支持文字等价描述。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.control.access-facility-fact-list"></a>
- **CTRL access-facility-fact-list**
  - Source class: direct fields；fact-row pattern derived。
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-access-facility-fact-list-location kind=control -->
  - Location: “到达与设施”区。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-spot-detail-and-trust-access-facility-fact-list-user-task kind=requirement -->
  - User task: 核对车辆、步行、门禁和现场资源。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-access-facility-fact-list-trigger kind=control -->
  - Trigger: 展开分组或点击具体事实。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-access-facility-fact-list-input kind=control -->
  - Input: REQ last-mile-access 与 REQ facilities-and-emergency 的全部字段、来源、验证时间。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-access-facility-fact-list-loading kind=control -->
  - Loading: 静态事实优先呈现，动态开放/路线单独加载。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-access-facility-fact-list-empty kind=control -->
  - Empty: unknown 与“没有”严格区分并提供纠错。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-access-facility-fact-list-success kind=control -->
  - Success: 每行显示值、单位/状态、核验时间和必要说明。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-access-facility-fact-list-failure kind=control -->
  - Failure: 动态字段失败不覆盖已核验静态值，标明冲突。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-access-facility-fact-list-feedback kind=control -->
  - Feedback: 硬要求不满足、季节性/夜间限制和最后一公里风险被提升。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.control.safety-block"></a>
- **CTRL safety-block**
  - Source class: direct；priority placement derived。
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-safety-block-location kind=control -->
  - Location: 首屏风险条、独立安全区和导航确认。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-spot-detail-and-trust-safety-block-user-task kind=requirement -->
  - User task: 理解是否应取消、结伴、换地点或采取防护。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-safety-block-trigger kind=control -->
  - Trigger: 打开详情、风险更新、点击导航/加入计划。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-safety-block-input kind=control -->
  - Input: 全部安全事实、风险等级、来源、时间、关闭状态和替代地点。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-safety-block-loading kind=control -->
  - Loading: 未取到最新风险时明确“正在核对”，不短暂显示安全。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-safety-block-empty kind=control -->
  - Empty: 无报告显示“暂无已知报告”，不等同“无风险”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-safety-block-success kind=control -->
  - Success: 风险、行动建议和主备替代清楚可见。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-safety-block-failure kind=control -->
  - Failure: 风险源失败时按保守策略降级并阻止无提示导航。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-safety-block-feedback kind=control -->
  - Feedback: 用户确认不能消除风险标签；高风险动作有再次说明和取消路径。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.control.trust-panel"></a>
- **CTRL trust-panel**
  - Source class: direct trust requirement。
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-trust-panel-location kind=control -->
  - Location: 每个关键事实的来源入口及详情末尾汇总。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-spot-detail-and-trust-trust-panel-user-task kind=requirement -->
  - User task: 判断资料为何可信、哪里不确定。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-trust-panel-trigger kind=control -->
  - Trigger: 点击可信度/更新时间/来源标签。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-trust-panel-input kind=control -->
  - Input: 来源、许可、核验主体/方法、样本、冲突、规则/数据版本和审核状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-trust-panel-loading kind=control -->
  - Loading: 已知来源先显示，细节增量加载。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-trust-panel-empty kind=control -->
  - Empty: 无证据时直说“未核验”，提供贡献/纠错。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-trust-panel-success kind=control -->
  - Success: 用户能区分模型估算、公开数据、管理员核验与临时用户实况。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-trust-panel-failure kind=control -->
  - Failure: 证据接口失败时保留摘要并标不可验证。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-trust-panel-feedback kind=control -->
  - Feedback: 不用抽象星级代替来源、样本和新鲜度。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.control.spot-action-dock"></a>
- **CTRL spot-action-dock**
  - Source class: direct actions；sticky layout derived。
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-action-dock-location kind=control -->
  - Location: 详情底部安全区内，主动作与更多动作分层。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-spot-detail-and-trust-spot-action-dock-user-task kind=requirement -->
  - User task: 对当前地点执行收藏、主备、导航、天空、拍摄、实况或纠错。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-action-dock-trigger kind=control -->
  - Trigger: 点击主按钮/更多菜单。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-action-dock-input kind=control -->
  - Input: 地点身份、权限、登录、坐标访问、风险、当前计划和数据可用性。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-action-dock-loading kind=control -->
  - Loading: 单个写操作显示局部进度，防重复但不锁整页。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-action-dock-empty kind=control -->
  - Empty: 不适用动作隐藏或 disabled 并给出原因/解锁路径。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-action-dock-success kind=control -->
  - Success: 状态原子更新并同步到地图、今晚和行程。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-action-dock-failure kind=control -->
  - Failure: 乐观更新回滚，用户输入/当前位置不丢失。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-spot-detail-and-trust-spot-action-dock-feedback kind=control -->
  - Feedback: 导航/分享明确坐标精度，风险地点行动前再次提示。
<!-- ty-source-item:end -->

#### Technical Obligations And Boundaries

<a id="spot-detail-and-trust.obligation.normalized-spot-entities"></a>
<!-- ty-source-item:start key=obl-spot-detail-and-trust-normalized-spot-entities kind=technical_obligation -->
- **OBL normalized-spot-entities** [direct: S-ARCH 5.3]：Spot 不得成为一个大 JSON；至少分离 spot、spot_access、spot_facility、spot_horizon_sector、spot_light_source、spot_media、spot_status_history、spot_verification、spot_visibility_policy，并保留版本/来源/审核。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.obligation.media-privacy-pipeline"></a>
<!-- ty-source-item:start key=obl-spot-detail-and-trust-media-privacy-pipeline kind=technical_obligation -->
- **OBL media-privacy-pipeline** [direct: S-ARCH 12]：媒体走短期上传凭证 → 对象存储 → 服务端确认 → 处理 → EXIF 清理 → 缩略图/WebP/AVIF → 审核 → 地点归属验证 → 发布；全景另存投影、方向、北向、遮挡轮廓、识别版本和人工修正。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.non-completing.single-rating"></a>
<!-- ty-source-item:start key=ncomp-spot-detail-and-trust-single-rating kind=non_completing -->
- **NCOMP single-rating** [direct: S-PRODUCT 6.5I]：只有一个总评分、没有维度/时间/样本/来源和短实况，不能算地点评价完成。
<!-- ty-source-item:end -->

#### Implementation Hints

- **HINT spot-section-fetching**：地点身份/安全/坐标策略优先，动态今晚、媒体和长列表按区块加载；区块失败不应让详情整体白屏。
- **HINT horizon-composition**：每个方位有效遮挡取 max(地形、人工建筑、全景识别)，但保留各层来源以供解释和纠错。

#### Acceptance Scenarios

<a id="spot-detail-and-trust.acceptance.spot-first-screen"></a>
<!-- ty-source-item:start key=ac-spot-detail-and-trust-spot-first-screen kind=acceptance -->
- **AC spot-first-screen**
  - Accepts: REQ spot-identity-and-freshness, REQ spot-tonight-comparison, CTRL spot-hero, CTRL evidence-section-nav
  - Given: 地点静态资料可用但今晚报告正在刷新。
  - When: 用户打开详情。
  - Then: 地点身份、开放/风险和旧报告新鲜度先可见，动态骨架不把旧评分伪装为当前结论。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.acceptance.light-and-horizon"></a>
<!-- ty-source-item:start key=ac-spot-detail-and-trust-light-and-horizon kind=acceptance -->
- **AC light-and-horizon**
  - Accepts: REQ light-pollution-evidence, REQ directional-horizon, CTRL horizon-polar-view
  - Given: 年度 VIIRS、地形轮廓和人工遮挡来自不同版本。
  - When: 用户查看指定方向及目标轨迹。
  - Then: 辐射/估算 Bortle 区间、各遮挡层、有效轮廓、版本和置信度可区分，目标只在真实无遮挡区间标可用。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.acceptance.media-provenance"></a>
<!-- ty-source-item:start key=ac-spot-detail-and-trust-media-provenance kind=acceptance -->
- **AC media-provenance**
  - Accepts: REQ spot-media-provenance, CTRL spot-media-gallery, OBL media-privacy-pipeline
  - Given: 上传样片带原始 GPS/序列信息且拍摄方向由用户结构化提交。
  - When: 媒体审核后公开。
  - Then: 公开资产无敏感 EXIF，方向/时间/设备/曝光和原地点核验仍可见并与图片对应。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.acceptance.last-mile-and-facilities"></a>
<!-- ty-source-item:start key=ac-spot-detail-and-trust-last-mile-and-facilities kind=acceptance -->
- **AC last-mile-and-facilities**
  - Accepts: REQ last-mile-access, REQ facilities-and-emergency, CTRL access-facility-fact-list
  - Given: 停车位已核验、厕所开放未知、雨后道路有临时报告。
  - When: 用户核对到达条件。
  - Then: 三种事实分别显示值/unknown/临时状态及时间来源，硬要求冲突被明确提升。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.acceptance.safety-overrides-score"></a>
<!-- ty-source-item:start key=ac-spot-detail-and-trust-safety-overrides-score kind=acceptance -->
- **AC safety-overrides-score**
  - Accepts: REQ spot-safety, CTRL safety-block
  - Given: 天空评分很高但最新报告显示封路或潮汐危险。
  - When: 用户打开地点或点击导航。
  - Then: 风险/关闭覆盖推荐表现，系统给出取消/备选行动且不允许无提示继续。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.acceptance.reviews-and-trust"></a>
<!-- ty-source-item:start key=ac-spot-detail-and-trust-reviews-and-trust kind=acceptance -->
- **AC reviews-and-trust**
  - Accepts: REQ multidimensional-reviews, REQ trust-and-conflict, CTRL trust-panel, NCOMP single-rating
  - Given: 地点有多个维度评价、一次具体实况和一条冲突资料。
  - When: 用户查看评价与可信度。
  - Then: 维度、样本、时间、贡献级别和冲突逐项可见，短实况未被平均分吞没。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.acceptance.coordinate-policy-all-exits"></a>
<!-- ty-source-item:start key=ac-spot-detail-and-trust-coordinate-policy-all-exits kind=acceptance -->
- **AC coordinate-policy-all-exits**
  - Accepts: REQ coordinate-visibility, REQ spot-actions, CTRL spot-action-dock, OBL normalized-spot-entities
  - Given: 一个 invite_only 地点被未受邀用户打开。
  - When: 用户尝试分享、导航、离线下载或设为行程地点。
  - Then: 所有出口一致只提供允许的近似信息/申请路径，精确坐标未出现在 UI、深链、文件或遥测中。
<!-- ty-source-item:end -->

#### Risks And Recovery

<a id="spot-detail-and-trust.risk.spot-persistence"></a>
<!-- ty-source-item:start key=risk-spot-detail-and-trust-spot-persistence kind=risk_fact fact=persistent_data_change outcome=spot-detail-and-trust -->
- **RISK spot-persistence**
  - Fact: persistent_data_change
  - Affected Outcome: spot-detail-and-trust
  - Basis: 地点事实、历史状态、媒体、遮挡、核验和访问策略均为长期版本化数据。
  - Consequence: Contract 必须定义不可覆盖的来源记录、审核迁移、冲突和回滚验证。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.risk.coordinate-security"></a>
<!-- ty-source-item:start key=risk-spot-detail-and-trust-coordinate-security kind=risk_fact fact=security_boundary_change outcome=spot-detail-and-trust -->
- **RISK coordinate-security**
  - Fact: security_boundary_change
  - Affected Outcome: spot-detail-and-trust
  - Basis: 精确小众地点、私人土地和上传 EXIF 可能暴露敏感位置或造成生态/人身风险。
  - Consequence: 服务端授权、媒体清理、分享/缓存防泄漏和审计必须贯穿全部出口，不能只靠前端隐藏。
<!-- ty-source-item:end -->

<a id="spot-detail-and-trust.risk.field-truth-observability"></a>
<!-- ty-source-item:start key=risk-spot-detail-and-trust-field-truth-observability kind=risk_fact fact=weak_observability outcome=spot-detail-and-trust -->
- **RISK field-truth-observability**
  - Fact: weak_observability
  - Affected Outcome: spot-detail-and-trust
  - Basis: 夜间开放、路灯、门禁、停车容量、道路和遮挡无法由公开 POI 或自动测试充分证明。
  - Consequence: 必须结合管理员核验、现场贡献、过期机制、冲突提示和实地抽测。
<!-- ty-source-item:end -->

<a id="outcome.itinerary-and-collaboration"></a>

### OUT itinerary-and-collaboration：可执行行程与后续协作

#### Observable Result

<!-- ty-source-item:start key=result-itinerary-and-collaboration kind=outcome_result -->
用户可从今晚、地点、分享链接或行程首页创建一份可执行观星计划，获得主备地点、出发/到达/观测/返回时段、路线、装备和风险，在总览、时间线、地图和待规划候选之间编辑且可恢复历史；MVP 可复制/分享，V2 才开放多人共同编辑和图文攻略候选提取，协作冲突不会静默覆盖。
<!-- ty-source-item:end -->

#### Product Requirements

<a id="itinerary-and-collaboration.requirement.itinerary-home"></a>
<!-- ty-source-item:start key=req-itinerary-and-collaboration-itinerary-home kind=requirement -->
- **REQ itinerary-home** [direct: S-PRODUCT 6.7A]：行程首页区分进行中、历史、收藏的公开行程，提供新建、从观星地点快速生成、从分享链接复制；小红书等图文提取只作为 V2 候选来源，不进入 MVP 完成条件。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.requirement.itinerary-inputs-and-generation"></a>
<!-- ty-source-item:start key=req-itinerary-and-collaboration-itinerary-inputs-and-generation kind=requirement -->
- **REQ itinerary-inputs-and-generation** [direct: S-PRODUCT 6.7B]：新建输入包含名称、日期、出发地、人数、交通方式、观测目标、用户类型、最晚返回、露营/过夜、是否共同编辑；系统生成主/备地点、出发/到达/返回、观测窗口、路线、装备清单和风险提醒。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.requirement.itinerary-overview"></a>
<!-- ty-source-item:start key=req-itinerary-and-collaboration-itinerary-overview kind=requirement -->
- **REQ itinerary-overview** [direct: S-PRODUCT 6.7C]：总览完整显示标题、日期/时长、备注、图片空间、路线地图、天气、总驾驶/徒步、主地点和备选地点；地点、天气和路线快照均显示生成/更新时间。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.requirement.observation-timeline"></a>
<!-- ty-source-item:start key=req-itinerary-and-collaboration-observation-timeline kind=requirement -->
- **REQ observation-timeline** [direct: S-PRODUCT 6.7C]：单夜按“出发、日落前勘察、蓝调、晚间观测、无月黑夜、银河最佳窗口、返回、次日清晨”等真实阶段组织，而非机械 DAY 1；多日露营才提供 Day 1/Day 2，并允许阶段按目标裁剪。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.requirement.unplanned-candidates"></a>
<!-- ty-source-item:start key=req-itinerary-and-collaboration-unplanned-candidates kind=requirement -->
- **REQ unplanned-candidates** [direct: S-PRODUCT 6.7C]：待规划区保存用户、好友、系统备选及后续分享内容识别地点；可在地图查看分布并将候选加入正式时段，未采用候选保持来源和原因。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.requirement.itinerary-route-options"></a>
<!-- ty-source-item:start key=req-itinerary-and-collaboration-itinerary-route-options kind=requirement -->
- **REQ itinerary-route-options** [direct: S-PRODUCT 6.7D]：至少提供最省时间、最少徒步、光污染更低、设施更完整、天气备选；每条显示车程、到达、收费、道路、最后步行、到达时天气/天象和能否赶上窗口，MVP 将详细导航交给外部地图。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.requirement.versioned-editing"></a>
<!-- ty-source-item:start key=req-itinerary-and-collaboration-versioned-editing kind=requirement -->
- **REQ versioned-editing** [direct: S-PRODUCT 6.7E, S-ARCH 5.10]：用户可拖拽地点/时段、增删地点、把候选纳入计划、设主备、改出发时间并重算、天气变化后刷新，保存/查看/恢复历史版本；刷新不得静默覆盖用户编辑。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.requirement.copy-share-export"></a>
<!-- ty-source-item:start key=req-itinerary-and-collaboration-copy-share-export kind=requirement -->
- **REQ copy-share-export** [direct: S-PRODUCT 6.7F]：支持复制为我的行程、分享给好友、生成图片摘要/微信分享卡片、导出地点列表和导航入口；每个出口遵守地点坐标访问策略和隐私设置。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.requirement.share-link-web-surface"></a>
<!-- ty-source-item:start key=req-itinerary-and-collaboration-share-link-web-surface kind=requirement -->
- **REQ share-link-web-surface** [direct: S-PRODUCT 6.7A/6.7F, S-ARCH 总体架构]：分享链接可落到轻量 Next.js 分享页/官网或授权深链，展示允许公开的行程/地点摘要、复制到 APP/打开 APP/下载入口；它不承担完整专业能力、不替代 RN APP，并在登录/邀请撤回/坐标受限/链接过期时服务端返回正确投影。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.requirement.collaborative-plan"></a>
<!-- ty-source-item:start key=req-itinerary-and-collaboration-collaborative-plan kind=requirement -->
- **REQ collaborative-plan** [direct: S-PRODUCT 6.7G, V2]：V2 支持邀请好友，把候选放入待规划、地图查看、加入时段并实时共享最终方案；共同编辑覆盖地点、出发时间、车辆、装备分工、食物补给、露营和主备方案，角色/邀请/撤销规则由 DEC collaboration-roles 决定。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.requirement.collaboration-conflicts"></a>
<!-- ty-source-item:start key=req-itinerary-and-collaboration-collaboration-conflicts kind=requirement -->
- **REQ collaboration-conflicts** [direct: S-ARCH 5.11]：结构化行程使用服务器顺序号、实体 revision、乐观锁、WebSocket 增量 Patch、字段级冲突提示、操作日志和可恢复版本；不先用全局 CRDT，只有自由文本确需同时编辑时才局部采用。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.requirement.itinerary-offline-handoff"></a>
<!-- ty-source-item:start key=req-itinerary-and-collaboration-itinerary-offline-handoff kind=requirement -->
- **REQ itinerary-offline-handoff** [direct: S-ARCH 3.4]：已生成行程提供“下载观测数据包”和更新状态，在出发前检查坐标权限、地图范围、天气/天文/路线版本、主备和紧急联系人；包的离线行为由 OUT field-offline-safety 验收。
<!-- ty-source-item:end -->

#### User Flow And States

- 正常流：行程首页 → 新建/快速生成/复制 → 完成输入 → 查看系统草案 → 在总览/时间线/地图/待规划间调整 → 比较路线 → 保存 → 下载观测包 → 分享/导航。
- 重算流：时间、地点、预设或天气变化 → 显示受影响字段和旧快照 → 用户选择接受新建议、只更新天气或保留原计划 → 生成新 revision。
- 冲突流（V2）：收到远端 Patch → 无冲突字段增量合并 → 同字段冲突显示双方值/时间/作者 → 用户选择/重新编辑 → 记录可恢复版本。
- 空白流：首页无行程时解释能从今晚/地点快速生成；待规划为空时给添加/从推荐导入，不放虚假示例卡。

#### Controls And Product Feedback

<a id="itinerary-and-collaboration.control.itinerary-library"></a>
- **CTRL itinerary-library**
  - Source class: direct；layout from S-IMG-04。
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-library-location kind=control -->
  - Location: “行程”一级页。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-itinerary-and-collaboration-itinerary-library-user-task kind=requirement -->
  - User task: 找到进行中/历史/收藏计划或开始新计划。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-library-trigger kind=control -->
  - Trigger: 搜索、切换分组/筛选、点击卡片、新建/复制链接。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-library-input kind=control -->
  - Input: 行程列表、状态、日期、地点缩略、参与者、离线包状态和分享链接。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-library-loading kind=control -->
  - Loading: 分组标题与卡片骨架稳定，刷新不清空已有列表。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-library-empty kind=control -->
  - Empty: 各分组有真实空状态和“从今晚/地点生成”动作；V2 导入明确标版本。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-library-success kind=control -->
  - Success: 卡片显示标题、日期/时长、主备、最新状态并进入同一行程。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-library-failure kind=control -->
  - Failure: 列表缓存可读，失败项可单独重试；无效分享链接说明原因。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-library-feedback kind=control -->
  - Feedback: 进行中、过期天气、未下载离线包和协作更新有可访问徽标。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.control.itinerary-creation-form"></a>
- **CTRL itinerary-creation-form**
  - Source class: direct fields；form behavior derived。
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-creation-form-location kind=control -->
  - Location: 新建/复制后编辑页。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-itinerary-and-collaboration-itinerary-creation-form-user-task kind=requirement -->
  - User task: 提供生成计划所需约束。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-creation-form-trigger kind=control -->
  - Trigger: 点击新建、从地点快速生成或复制为我的。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-creation-form-input kind=control -->
  - Input: REQ itinerary-inputs-and-generation 的全部用户字段及预填地点/日期。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-creation-form-loading kind=control -->
  - Loading: 生成时保留输入并逐步显示地点、路线、窗口状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-creation-form-empty kind=control -->
  - Empty: 可选项显示未限制；日期、出发地等必需项有就地说明。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-creation-form-success kind=control -->
  - Success: 生成带版本和来源的可编辑草案，不直接替用户确认出发。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-creation-form-failure kind=control -->
  - Failure: 字段输入和本地草稿保留，可移除失败约束或重试。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-creation-form-feedback kind=control -->
  - Feedback: 单位/时区、最晚返回冲突、露营安全和协作版本要求贴近字段显示。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.control.itinerary-detail-tabs"></a>
- **CTRL itinerary-detail-tabs**
  - Source class: direct structure；tabs from S-IMG-03/S-IMG-06。
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-detail-tabs-location kind=control -->
  - Location: 行程详情标题下，含总览、阶段/分日、待规划、地图。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-itinerary-and-collaboration-itinerary-detail-tabs-user-task kind=requirement -->
  - User task: 在摘要、正式安排、候选和空间路线之间切换。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-detail-tabs-trigger kind=control -->
  - Trigger: 点击分段或从深链打开特定区。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-detail-tabs-input kind=control -->
  - Input: 行程 revision、阶段/天数和待规划数量。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-detail-tabs-loading kind=control -->
  - Loading: 标题/分段不跳动，各面板独立骨架。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-detail-tabs-empty kind=control -->
  - Empty: 对应面板说明缺口并提供添加，不隐藏入口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-detail-tabs-success kind=control -->
  - Success: 各面板使用同一 revision、主备和时间上下文。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-detail-tabs-failure kind=control -->
  - Failure: 单面板失败不退出详情，显示重试和缓存时间。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-detail-tabs-feedback kind=control -->
  - Feedback: 未保存、更高远端 revision、风险和过期快照常驻可见。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.control.itinerary-overview-card"></a>
- **CTRL itinerary-overview-card**
  - Source class: direct content；map/card from S-IMG-03/S-IMG-06。
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-overview-card-location kind=control -->
  - Location: 行程“总览”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-itinerary-and-collaboration-itinerary-overview-card-user-task kind=requirement -->
  - User task: 一屏核对行程、地图、天气、驾驶/徒步与主备地点。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-overview-card-trigger kind=control -->
  - Trigger: 打开总览、切换版本或刷新数据。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-overview-card-input kind=control -->
  - Input: REQ itinerary-overview 的全部字段、快照时间和离线状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-overview-card-loading kind=control -->
  - Loading: 文字摘要优先，地图/天气局部加载。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-overview-card-empty kind=control -->
  - Empty: 图片或备注缺失显示添加入口；路线/天气缺失显示原因。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-overview-card-success kind=control -->
  - Success: 总览与时间线/地图一致，主要风险和下一动作突出。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-overview-card-failure kind=control -->
  - Failure: 静态计划仍可读，动态数据单独降级。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-itinerary-overview-card-feedback kind=control -->
  - Feedback: “计划值”和“最新条件”并列，用户能决定是否更新。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.control.observation-timeline-editor"></a>
- **CTRL observation-timeline-editor**
  - Source class: direct；interaction derived。
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-observation-timeline-editor-location kind=control -->
  - Location: 行程阶段/分日面板。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-itinerary-and-collaboration-observation-timeline-editor-user-task kind=requirement -->
  - User task: 排序、增删和调整观星阶段及地点。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-observation-timeline-editor-trigger kind=control -->
  - Trigger: 拖拽、编辑时间、添加阶段/地点、切换 Day。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-observation-timeline-editor-input kind=control -->
  - Input: 阶段类型、时间区间、地点、目标、天气/天文窗口、交通段。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-observation-timeline-editor-loading kind=control -->
  - Loading: 重算时保持原时间线并标影响节点。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-observation-timeline-editor-empty kind=control -->
  - Empty: 新草案提供基于目标的建议阶段，不强制全部阶段。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-observation-timeline-editor-success kind=control -->
  - Success: 无重叠/不可达冲突，地图路线和汇总同步更新。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-observation-timeline-editor-failure kind=control -->
  - Failure: 拖拽回滚或保留本地未保存草稿，可撤销/重试。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-observation-timeline-editor-feedback kind=control -->
  - Feedback: 赶不上窗口、跨午夜/时区、路程不足和安全冲突就地显示。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.control.candidate-tray"></a>
- **CTRL candidate-tray**
  - Source class: direct；map distribution from S-IMG-05～07。
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-candidate-tray-location kind=control -->
  - Location: “待规划”面板和地图候选层。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-itinerary-and-collaboration-candidate-tray-user-task kind=requirement -->
  - User task: 比较候选并加入时段/设为备选/移除。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-candidate-tray-trigger kind=control -->
  - Trigger: 添加地点、好友 Patch、系统备选、V2 内容提取或拖入时间线。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-candidate-tray-input kind=control -->
  - Input: 地点、来源、加入者、推荐原因、当前条件和坐标访问级别。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-candidate-tray-loading kind=control -->
  - Loading: 候选摘要先显示，路线/今晚条件逐项加载。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-candidate-tray-empty kind=control -->
  - Empty: 提供地图/推荐入口；V2 导入不可用时不显示可执行假按钮。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-candidate-tray-success kind=control -->
  - Success: 加入正式安排后地图、编号、路线和 revision 更新。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-candidate-tray-failure kind=control -->
  - Failure: 候选保留，说明哪项计算/写入失败。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-candidate-tray-feedback kind=control -->
  - Feedback: 来源、重复、坐标受限、过期推荐和未采用原因可见。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.control.route-option-comparator"></a>
- **CTRL route-option-comparator**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-route-option-comparator-location kind=control -->
  - Location: 行程地图/路线方案抽屉。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-itinerary-and-collaboration-route-option-comparator-user-task kind=requirement -->
  - User task: 按时间、徒步、暗度、设施或天气选择方案。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-route-option-comparator-trigger kind=control -->
  - Trigger: 打开路线方案或更改约束。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-route-option-comparator-input kind=control -->
  - Input: 五类方案、逐段路线、到达条件、窗口和成本。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-route-option-comparator-loading kind=control -->
  - Loading: 方案独立加载，先显示可用项和比较维度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-route-option-comparator-empty kind=control -->
  - Empty: 无可行方案时说明硬冲突并提供改地点/时间。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-route-option-comparator-success kind=control -->
  - Success: 选定方案成为当前 revision，差异和理由保留。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-route-option-comparator-failure kind=control -->
  - Failure: 上一方案仍可见并标 stale，可继续编辑约束。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-route-option-comparator-feedback kind=control -->
  - Feedback: 不用单个“最佳”标签掩盖取舍；窗口错过和风险最显著。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.control.version-and-share-actions"></a>
- **CTRL version-and-share-actions**
  - Source class: direct capabilities；combined action surface derived。
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-version-and-share-actions-location kind=control -->
  - Location: 行程更多菜单、底部主动作和版本面板。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-itinerary-and-collaboration-version-and-share-actions-user-task kind=requirement -->
  - User task: 保存/恢复版本、复制、分享、导出、下载离线包。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-version-and-share-actions-trigger kind=control -->
  - Trigger: 点击对应动作。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-version-and-share-actions-input kind=control -->
  - Input: 当前 revision、目标版本、分享范围、坐标策略、媒体模板和数据包状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-version-and-share-actions-loading kind=control -->
  - Loading: 每个任务有独立进度/取消；长任务离开页面后仍可查看。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-version-and-share-actions-empty kind=control -->
  - Empty: 不可分享/下载的受限地点显示原因和替代摘要。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-version-and-share-actions-success kind=control -->
  - Success: 生成可追溯版本/副本/链接/图片/文件或完整数据包。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-version-and-share-actions-failure kind=control -->
  - Failure: 不发布半成品；本地编辑保留，任务可重试。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-version-and-share-actions-feedback kind=control -->
  - Feedback: 分享前预览公开字段；恢复版本前显示差异；下载显示大小/更新时间。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.control.collaboration-panel"></a>
- **CTRL collaboration-panel**
  - Source class: direct V2 capability。
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-collaboration-panel-location kind=control -->
  - Location: 行程参与者/共同编辑面板。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-itinerary-and-collaboration-collaboration-panel-user-task kind=requirement -->
  - User task: 邀请、查看成员/车辆/装备分工并处理更新冲突。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-collaboration-panel-trigger kind=control -->
  - Trigger: 开启共同编辑、邀请链接、远端 Patch 或冲突。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-collaboration-panel-input kind=control -->
  - Input: 成员角色、在线状态、revision、字段 Patch、操作日志和邀请状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-collaboration-panel-loading kind=control -->
  - Loading: 连接状态可见，本地已保存内容不消失。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-collaboration-panel-empty kind=control -->
  - Empty: 仅自己时说明如何邀请；无权限时只读并解释。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-collaboration-panel-success kind=control -->
  - Success: 无冲突增量合并，参与者看到一致 revision。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-collaboration-panel-failure kind=control -->
  - Failure: 离线操作排队；冲突逐字段展示双方值，不用最后写入静默覆盖。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-itinerary-and-collaboration-collaboration-panel-feedback kind=control -->
  - Feedback: 作者/时间/同步状态、撤销邀请和恢复版本明确；自由文本 CRDT 仅在启用处说明。
<!-- ty-source-item:end -->

#### Technical Obligations And Boundaries

<a id="itinerary-and-collaboration.obligation.itinerary-version-model"></a>
<!-- ty-source-item:start key=obl-itinerary-and-collaboration-itinerary-version-model kind=technical_obligation -->
- **OBL itinerary-version-model** [direct: S-ARCH 5.10～5.11]：Itinerary、时段、Stop、参与者、车辆、装备分工、目标、路线、天气快照、现场状态和版本是结构化实体；写入携带 revision/幂等键，服务端顺序号与操作日志支持重放和恢复。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.obligation.collaboration-transport"></a>
<!-- ty-source-item:start key=obl-itinerary-and-collaboration-collaboration-transport kind=technical_obligation -->
- **OBL collaboration-transport** [direct: S-ARCH 5.11]：V2 实时协作经鉴权 WebSocket 推增量 Patch；断线后按游标补齐，冲突按字段处理，CRDT 只允许在明确的自由文本边界局部引入。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.non-completing.day-template-copy"></a>
<!-- ty-source-item:start key=ncomp-itinerary-and-collaboration-day-template-copy kind=non_completing -->
- **NCOMP day-template-copy** [direct: S-PRODUCT 6.7C]：单夜计划仅复制通用 DAY 1/DAY 2 旅游模板、没有真实观星阶段和天文窗口，不能算行程体验完成。
<!-- ty-source-item:end -->

#### Implementation Hints

- **HINT itinerary-snapshot-diff**：计划刷新可产生“保留用户编辑 + 替换动态快照”的差异视图，避免整份重新生成。
- **HINT share-rendering**：图片摘要/微信卡片应从当前 revision 的可公开投影生成，不由前端截图临时拼接敏感信息。

#### Acceptance Scenarios

<a id="itinerary-and-collaboration.acceptance.create-generated-plan"></a>
<!-- ty-source-item:start key=ac-itinerary-and-collaboration-create-generated-plan kind=acceptance -->
- **AC create-generated-plan**
  - Accepts: REQ itinerary-home, REQ itinerary-inputs-and-generation, CTRL itinerary-library, CTRL itinerary-creation-form
  - Given: 用户从一个地点快速生成并填写日期、起点、人数、目标和最晚返回。
  - When: 系统完成草案生成。
  - Then: 主备、出发/到达/观测/返回、路线、装备和风险均有来源/状态，草案可编辑且未自动确认出发。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.acceptance.overview-consistency"></a>
<!-- ty-source-item:start key=ac-itinerary-and-collaboration-overview-consistency kind=acceptance -->
- **AC overview-consistency**
  - Accepts: REQ itinerary-overview, CTRL itinerary-detail-tabs, CTRL itinerary-overview-card
  - Given: 行程含一主一备、天气快照和驾车/徒步段。
  - When: 用户在总览、地图和阶段面板切换。
  - Then: 三处使用同一 revision/地点/时间，总驾驶/徒步与地图分段一致且快照时间可见。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.acceptance.astronomy-timeline"></a>
<!-- ty-source-item:start key=ac-itinerary-and-collaboration-astronomy-timeline kind=acceptance -->
- **AC astronomy-timeline**
  - Accepts: REQ observation-timeline, CTRL observation-timeline-editor, NCOMP day-template-copy
  - Given: 单夜计划跨午夜且有蓝调、无月和银河窗口。
  - When: 用户调整出发时间。
  - Then: 真实阶段按当地观星夜重算，跨午夜不拆错日期，无法赶上的窗口在节点旁提示。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.acceptance.candidate-to-plan"></a>
<!-- ty-source-item:start key=ac-itinerary-and-collaboration-candidate-to-plan kind=acceptance -->
- **AC candidate-to-plan**
  - Accepts: REQ unplanned-candidates, CTRL candidate-tray
  - Given: 待规划含用户、系统和好友来源候选。
  - When: 用户从地图把一个候选拖入晚间观测阶段。
  - Then: 来源保留，候选变为正式 Stop，编号/路线/时间/revision 同步且失败不会丢候选。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.acceptance.route-tradeoff"></a>
<!-- ty-source-item:start key=ac-itinerary-and-collaboration-route-tradeoff kind=acceptance -->
- **AC route-tradeoff**
  - Accepts: REQ itinerary-route-options, CTRL route-option-comparator
  - Given: 最快路线徒步更长而设施路线可能错过窗口。
  - When: 用户比较并选择方案。
  - Then: 五类取舍、逐段到达条件和窗口冲突可见，选定方案以新 revision 保存而非无解释“最佳”。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.acceptance.refresh-version"></a>
<!-- ty-source-item:start key=ac-itinerary-and-collaboration-refresh-version kind=acceptance -->
- **AC refresh-version**
  - Accepts: REQ versioned-editing, CTRL version-and-share-actions, OBL itinerary-version-model
  - Given: 用户已手调顺序后天气更新改变推荐。
  - When: 用户选择刷新计划。
  - Then: 系统显示差异并保留用户编辑，接受结果生成可恢复版本，拒绝时原 revision 不变。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.acceptance.secure-share-and-offline"></a>
<!-- ty-source-item:start key=ac-itinerary-and-collaboration-secure-share-and-offline kind=acceptance -->
- **AC secure-share-and-offline**
  - Accepts: REQ copy-share-export, REQ share-link-web-surface, REQ itinerary-offline-handoff, CTRL version-and-share-actions
  - Given: 行程含一个 invite_only 地点和可公开主地点。
  - When: 用户生成分享图片、导出列表并下载自己的观测包。
  - Then: 公开产物隐藏受限精确坐标，自有授权包按策略包含数据并显示版本/大小/更新状态。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.acceptance.collaboration-conflict"></a>
<!-- ty-source-item:start key=ac-itinerary-and-collaboration-collaboration-conflict kind=acceptance -->
- **AC collaboration-conflict**
  - Accepts: REQ collaborative-plan, REQ collaboration-conflicts, CTRL collaboration-panel, OBL collaboration-transport
  - Given: V2 两名有权成员离线修改同一出发时间、不同成员另加候选点。
  - When: 双方重新联网同步。
  - Then: 不冲突候选增量合并，同字段时间冲突显示双方值/作者并由用户解决，操作日志和恢复版本完整。
<!-- ty-source-item:end -->

#### Risks And Recovery

<a id="itinerary-and-collaboration.risk.itinerary-migration"></a>
<!-- ty-source-item:start key=risk-itinerary-and-collaboration-itinerary-migration kind=risk_fact fact=data_migration outcome=itinerary-and-collaboration -->
- **RISK itinerary-migration**
  - Fact: data_migration
  - Affected Outcome: itinerary-and-collaboration
  - Basis: 行程结构、阶段类型、快照和 revision 会跨 MVP/V1/V2 持久保存并进入离线副本。
  - Consequence: 每次 schema/阶段演进需兼容旧行程、离线迁移与恢复版本，不能原地丢弃历史。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.risk.collaboration-security"></a>
<!-- ty-source-item:start key=risk-itinerary-and-collaboration-collaboration-security kind=risk_fact fact=security_boundary_change outcome=itinerary-and-collaboration -->
- **RISK collaboration-security**
  - Fact: security_boundary_change
  - Affected Outcome: itinerary-and-collaboration
  - Basis: 分享/邀请将地点、时间、车辆、装备、联系人和受限坐标扩展给其他账号。
  - Consequence: Contract 需固定角色、邀请有效期、撤销、服务端字段授权、审计和受限数据投影。
<!-- ty-source-item:end -->

<a id="itinerary-and-collaboration.risk.plan-critical-path"></a>
<!-- ty-source-item:start key=risk-itinerary-and-collaboration-plan-critical-path kind=risk_fact fact=critical_user_path outcome=itinerary-and-collaboration -->
- **RISK plan-critical-path**
  - Fact: critical_user_path
  - Affected Outcome: itinerary-and-collaboration
  - Basis: 出发/到达/返回与主备路线直接指导夜间行动。
  - Consequence: 时间、跨午夜、路线、风险和离线更新必须端到端验证并允许恢复，不以卡片渲染成功代替可执行性。
<!-- ty-source-item:end -->

<a id="outcome.sky-orientation-ar"></a>

### OUT sky-orientation-ar：360°天空、方向与可选 AR

#### Observable Result

<!-- ty-source-item:start key=result-sky-orientation-ar kind=outcome_result -->
用户可为任一地点/时间在所有受支持设备上查看 2D/3D 天空，搜索并跟踪星座、银河、日月、行星、恒星、深空目标及后续天象轨迹，把方位/高度与地点真实遮挡对齐；现场可用稳定方向引导，传感器异常可校准/手动降级，V3 支持的设备可额外开启 AR 与摄影视场，但 AR 从不成为核心路径。
<!-- ty-source-item:end -->

#### Product Requirements

<a id="sky-orientation-ar.requirement.universal-sky-view"></a>
<!-- ty-source-item:start key=req-sky-orientation-ar-universal-sky-view kind=requirement -->
- **REQ universal-sky-view** [direct: S-PRODUCT 6.8A, S-ARCH 3.7]：所有支持设备具备可手势旋转的 2D/3D 星空视图，按所选 WGS84 地点、IANA 时区和时刻显示星座、银河、月亮、太阳、行星、主要恒星、深空目标、地平线、方位角和高度角。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.requirement.sky-time-control"></a>
<!-- ty-source-item:start key=req-sky-orientation-ar-sky-time-control kind=requirement -->
- **REQ sky-time-control** [direct: S-PRODUCT 6.8B]：可选择现在、今晚最佳、自定义时刻、拖动时间轴，并快速跳到月落、银河最高、指定天体升起/落下；选定时刻同步今晚、地点、摄影和轨迹状态。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.requirement.orientation-guidance"></a>
<!-- ty-source-item:start key=req-sky-orientation-ar-orientation-guidance kind=requirement -->
- **REQ orientation-guidance** [direct: S-PRODUCT 6.8C, S-ARCH 3.6]：现场方向融合 Device Motion、磁力计、陀螺仪、加速度/重力、GPS、地磁偏角和设备朝向，输出稳定方位/俯仰/横滚，显示向左/右转角、目标离地平线高度和当前精度。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.requirement.orientation-calibration"></a>
<!-- ty-source-item:start key=req-sky-orientation-ar-orientation-calibration kind=requirement -->
- **REQ orientation-calibration** [direct: S-ARCH 3.6]：检测磁场异常/漂移，提供 8 字校准；汽车、金属平台附近提示误差；传感器缺失、精度低或权限拒绝时允许触控浏览、手动北向/地点和文字方位降级。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.requirement.real-obstruction-overlay"></a>
<!-- ty-source-item:start key=req-sky-orientation-ar-real-obstruction-overlay kind=requirement -->
- **REQ real-obstruction-overlay** [direct: S-PRODUCT 6.8D]：可叠加地点全景或有效遮挡轮廓，显示山体/建筑，判断目标遮挡、银河升起方向、日落/月升/银河与前景重合，并辅助选择具体机位和镜头方向；估算/人工/实拍来源可区分。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.requirement.celestial-trajectories"></a>
<!-- ty-source-item:start key=req-sky-orientation-ar-celestial-trajectories kind=requirement -->
- **REQ celestial-trajectories** [direct: S-PRODUCT 6.8E]：轨迹覆盖日出/日落、月升/月落、银河中心升起/中天/落下、行星升起/最高/落下，以及 V3 空间站过境路径和流星雨辐射点，路径带日期、方向、高度和可见窗口。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.requirement.camera-field-of-view"></a>
<!-- ty-source-item:start key=req-sky-orientation-ar-camera-field-of-view kind=requirement -->
- **REQ camera-field-of-view** [direct: S-PRODUCT 6.8F, V3]：高级视场模拟按机型、传感器尺寸、镜头焦段、手机主摄/超广角计算覆盖范围，叠加目标与前景以辅助构图；未知裁切系数或镜头信息不可假设默认准确。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.requirement.optional-ar"></a>
<!-- ty-source-item:start key=req-sky-orientation-ar-optional-ar kind=requirement -->
- **REQ optional-ar** [direct: S-ARCH 3.7, V3]：iOS 用 ARKit、支持安卓用 ARCore，不支持设备降级为摄像头+传感器叠加或通用天空；能力检测、追踪质量和相机权限在开启前可见，关闭 AR 后回到同一地点/时间/目标。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.requirement.sky-rendering-budget"></a>
<!-- ty-source-item:start key=req-sky-orientation-ar-sky-rendering-budget kind=requirement -->
- **REQ sky-rendering-budget** [direct: S-ARCH 3.7]：天空使用 GPU 加速并按亮度/天空区块拆分星表，避免一次加载完整目录；层级、标签密度和动画按设备性能/热状态降级，核心方位与目标不可因装饰效果丢失。
<!-- ty-source-item:end -->

#### User Flow And States

- 规划流：从地点/今晚打开天空 → 带入发起页地点/时刻并可切今晚最佳 → 搜索目标 → 拖动时间/快跳 → 开遮挡/轨迹 → 保存方向到行程或进入摄影。
- 现场流：打开指南针跟随 → 检查精度 → 必要时校准 → 按“向左/右、抬高”找到目标 → 低精度时切手动北向/静态星图。
- AR 流：能力/权限检查 → 开相机 → 追踪初始化 → 叠加目标/遮挡；追踪丢失时暂停叠加并退回非 AR，不让错误标记继续漂浮。
- 数据缺口：地点无遮档、目标不在目录、轨道过期或时间无可见窗口时分别说明，不用虚构轨迹或默认开阔地平线。

#### Controls And Product Feedback

<a id="sky-orientation-ar.control.sky-canvas"></a>
- **CTRL sky-canvas**
  - Source class: direct；interaction derived。
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-canvas-location kind=control -->
  - Location: “天空”一级页及地点/行程深链的主画布。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-sky-orientation-ar-sky-canvas-user-task kind=requirement -->
  - User task: 浏览完整天空并选择天体/方向。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-canvas-trigger kind=control -->
  - Trigger: 拖动、缩放、旋转、点击天体或双击复位。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-canvas-input kind=control -->
  - Input: 地点、时刻、星表/天体状态、地平线、图层和方向模式。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-canvas-loading kind=control -->
  - Loading: 先显示地平线/方位网格，再渐进加载亮星与深层目录。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-canvas-empty kind=control -->
  - Empty: 目录或地点不可用时保留方位框架并说明缺失。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-canvas-success kind=control -->
  - Success: 画布、方位/高度、选中天体和时间保持一致且手势流畅。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-canvas-failure kind=control -->
  - Failure: 渲染层可重建/降级，不让导航和文本详情崩溃。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-canvas-feedback kind=control -->
  - Feedback: 选中目标有名称、方位、高度、可见/遮挡状态；标签密度可调且支持屏幕阅读器列表替代。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.control.sky-object-and-layer-panel"></a>
- **CTRL sky-object-and-layer-panel**
  - Source class: direct content；panel derived。
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-object-and-layer-panel-location kind=control -->
  - Location: 天空顶部搜索和图层面板。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-sky-orientation-ar-sky-object-and-layer-panel-user-task kind=requirement -->
  - User task: 搜索目标、开关银河/星座/深空/轨迹/遮挡并控制标签。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-object-and-layer-panel-trigger kind=control -->
  - Trigger: 搜索、分类筛选或点击图层。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-object-and-layer-panel-input kind=control -->
  - Input: 可用目录、目标别名、层状态和数据版本。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-object-and-layer-panel-loading kind=control -->
  - Loading: 搜索结果渐进返回，画布保持。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-object-and-layer-panel-empty kind=control -->
  - Empty: 无匹配时提供类别/拼写建议，不选虚假近似目标。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-object-and-layer-panel-success kind=control -->
  - Success: 目标居中/锁定，图层原子切换且图例更新。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-object-and-layer-panel-failure kind=control -->
  - Failure: 单个目录/图层错误不影响基础天体与手动浏览。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-object-and-layer-panel-feedback kind=control -->
  - Feedback: V3/设备受限功能标识版本和原因；不可见与被遮挡含义分开。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.control.sky-time-scrubber"></a>
- **CTRL sky-time-scrubber**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-time-scrubber-location kind=control -->
  - Location: 天空底部安全区上方，可收起。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-sky-orientation-ar-sky-time-scrubber-user-task kind=requirement -->
  - User task: 查看天空随时间运动并跳至关键事件。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-time-scrubber-trigger kind=control -->
  - Trigger: 拖动时间、点击现在/最佳/月落/银河最高/目标升落。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-time-scrubber-input kind=control -->
  - Input: 当地观星夜、时区、事件列表、播放速度和当前时刻。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-time-scrubber-loading kind=control -->
  - Loading: 时间刻度稳定，事件计算显示局部进度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-time-scrubber-empty kind=control -->
  - Empty: 某事件本夜不存在时禁用并说明下一次日期。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-time-scrubber-success kind=control -->
  - Success: 画布、轨迹、遮挡、详情和摄影入口同步到精确时刻。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-time-scrubber-failure kind=control -->
  - Failure: 回到最后有效时刻，保留用户目标和地点。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-sky-time-scrubber-feedback kind=control -->
  - Feedback: 当前日期/时区、是否跨午夜、实时/模拟状态和播放速度始终可辨。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.control.orientation-follow-toggle"></a>
- **CTRL orientation-follow-toggle**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-follow-toggle-location kind=control -->
  - Location: 天空画布边缘的“跟随/自由”切换。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-sky-orientation-ar-orientation-follow-toggle-user-task kind=requirement -->
  - User task: 让手机朝向控制星图或恢复手势浏览。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-follow-toggle-trigger kind=control -->
  - Trigger: 点击跟随、旋转设备或手动拖动画布。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-follow-toggle-input kind=control -->
  - Input: OrientationEngine 姿态、精度、传感器/位置状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-follow-toggle-loading kind=control -->
  - Loading: 引擎初始化期间显示稳定性进度，画布仍可触控。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-follow-toggle-empty kind=control -->
  - Empty: 设备无传感器时禁用并提供手动北向。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-follow-toggle-success kind=control -->
  - Success: 画布平滑跟随且显示方向/精度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-follow-toggle-failure kind=control -->
  - Failure: 自动退出跟随到冻结/手动模式，不继续显示失真的实时状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-follow-toggle-feedback kind=control -->
  - Feedback: 跟随状态、真北/磁北语义、向左/右角和误差范围可见。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.control.orientation-calibration-sheet"></a>
- **CTRL orientation-calibration-sheet**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-calibration-sheet-location kind=control -->
  - Location: 精度徽标或异常提示打开的面板。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-sky-orientation-ar-orientation-calibration-sheet-user-task kind=requirement -->
  - User task: 校准方向或选择手动降级。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-calibration-sheet-trigger kind=control -->
  - Trigger: 磁场异常、漂移、低精度或用户点击精度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-calibration-sheet-input kind=control -->
  - Input: 磁场强度、传感器可用性、误差等级、环境提示。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-calibration-sheet-loading kind=control -->
  - Loading: 采样过程显示实时进度/稳定度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-calibration-sheet-empty kind=control -->
  - Empty: 无可校准传感器时直接给手动北向和触控模式。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-calibration-sheet-success kind=control -->
  - Success: 新精度等级与校准时间显示并返回跟随。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-calibration-sheet-failure kind=control -->
  - Failure: 不宣称校准成功，保留手动模式和环境排查建议。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-orientation-calibration-sheet-feedback kind=control -->
  - Feedback: 8 字动作、远离汽车/金属提示、振动/文字反馈与跳过入口清晰。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.control.obstruction-and-trajectory-overlay"></a>
- **CTRL obstruction-and-trajectory-overlay**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-obstruction-and-trajectory-overlay-location kind=control -->
  - Location: 天空图层与选中目标详情。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-sky-orientation-ar-obstruction-and-trajectory-overlay-user-task kind=requirement -->
  - User task: 比较目标轨迹与真实地平线/前景。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-obstruction-and-trajectory-overlay-trigger kind=control -->
  - Trigger: 开启遮挡、选择目标或日期、点击轨迹区段。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-obstruction-and-trajectory-overlay-input kind=control -->
  - Input: 地形/人工/全景轮廓、轨迹、方向/高度、可信度和来源。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-obstruction-and-trajectory-overlay-loading kind=control -->
  - Loading: 各层独立占位并显示计算状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-obstruction-and-trajectory-overlay-empty kind=control -->
  - Empty: 无地点轮廓时用明确“未知地平线”，可查看纯天文地平线。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-obstruction-and-trajectory-overlay-success kind=control -->
  - Success: 可见/被遮挡区段、升起/中天/落下和前景重合时刻可读。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-obstruction-and-trajectory-overlay-failure kind=control -->
  - Failure: 失败层被移除并标注，基础轨迹继续可用。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-obstruction-and-trajectory-overlay-feedback kind=control -->
  - Feedback: 实测/人工/估算线型和图例不同，提供文字区间摘要。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.control.field-of-view-overlay"></a>
- **CTRL field-of-view-overlay**
  - Source class: direct V3。
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-field-of-view-overlay-location kind=control -->
  - Location: 天空/摄影的高级构图面板。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-sky-orientation-ar-field-of-view-overlay-user-task kind=requirement -->
  - User task: 选择设备镜头并预览覆盖范围。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-field-of-view-overlay-trigger kind=control -->
  - Trigger: 开启“视场”、选择机身/手机摄像头/焦段/方向。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-field-of-view-overlay-input kind=control -->
  - Input: 传感器尺寸、裁切系数、焦段、画幅方向和目标。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-field-of-view-overlay-loading kind=control -->
  - Loading: 保留目标中心，边框参数计算局部加载。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-field-of-view-overlay-empty kind=control -->
  - Empty: 设备资料不足时要求补全，不猜测裁切系数。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-field-of-view-overlay-success kind=control -->
  - Success: 视场边框及水平/垂直角与参数一致并可交给摄影方案。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-field-of-view-overlay-failure kind=control -->
  - Failure: 关闭错误边框，保留设备输入和纯天空视图。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-field-of-view-overlay-feedback kind=control -->
  - Feedback: 显示等效/实际焦段语义、方向和估算限制。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.control.ar-mode-toggle"></a>
- **CTRL ar-mode-toggle**
  - Source class: direct V3。
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-ar-mode-toggle-location kind=control -->
  - Location: 天空画布模式切换。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-sky-orientation-ar-ar-mode-toggle-user-task kind=requirement -->
  - User task: 在支持设备上把天空目标叠加摄像头。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-ar-mode-toggle-trigger kind=control -->
  - Trigger: 点击 AR、授权相机并通过能力检查。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-ar-mode-toggle-input kind=control -->
  - Input: ARKit/ARCore 支持、相机权限、姿态/追踪质量、地点/时间/目标。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-ar-mode-toggle-loading kind=control -->
  - Loading: 相机与追踪初始化有明确状态和取消。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-ar-mode-toggle-empty kind=control -->
  - Empty: 不支持/拒绝时直接提供摄像头+传感器或通用天空，不显示死入口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-ar-mode-toggle-success kind=control -->
  - Success: 叠加与非 AR 的目标/时间一致，追踪质量可见。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-ar-mode-toggle-failure kind=control -->
  - Failure: 立即冻结/隐藏不可信叠加并安全返回通用天空。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-sky-orientation-ar-ar-mode-toggle-feedback kind=control -->
  - Feedback: 摄像头使用、追踪丢失、环境过暗/过亮和设备限制以文字+图标说明。
<!-- ty-source-item:end -->

#### Technical Obligations And Boundaries

<a id="sky-orientation-ar.obligation.orientation-engine"></a>
<!-- ty-source-item:start key=obl-sky-orientation-ar-orientation-engine kind=technical_obligation -->
- **OBL orientation-engine** [direct: S-ARCH 3.6]：OrientationEngine 以系统 Device Motion 为主、磁力计校正绝对北、陀螺仪短时平滑，结合重力/GPS/地磁偏角并检测异常；业务层只消费带精度/时间戳的稳定姿态，不读取未处理单一磁力计作为真值。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.obligation.sky-ar-separation"></a>
<!-- ty-source-item:start key=obl-sky-orientation-ar-sky-ar-separation kind=technical_obligation -->
- **OBL sky-ar-separation** [direct: S-ARCH 3.7]：天文状态/渲染、方向融合、相机/AR 会话分层；ARKit/ARCore 为可卸载增强适配器，通用天空不依赖相机权限或 AR 支持。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.non-completing.uncalibrated-heading"></a>
<!-- ty-source-item:start key=ncomp-sky-orientation-ar-uncalibrated-heading kind=non_completing -->
- **NCOMP uncalibrated-heading** [direct: S-ARCH 3.6]：只显示磁力计原始角度、没有精度/异常/校准/降级，却声称准确指向目标，不能算现场方向完成。
<!-- ty-source-item:end -->

#### Implementation Hints

- **HINT sky-catalog-chunks**：星表可按亮度和天区拆包，先渲染导航所需亮星/目标，再按视口加载深空内容。
- **HINT orientation-sampling**：高频传感器采样与 UI 帧率解耦，滤波参数和精度事件可遥测但不得记录用户精确位置。

#### Acceptance Scenarios

<a id="sky-orientation-ar.acceptance.universal-sky"></a>
<!-- ty-source-item:start key=ac-sky-orientation-ar-universal-sky kind=acceptance -->
- **AC universal-sky**
  - Accepts: REQ universal-sky-view, REQ sky-rendering-budget, CTRL sky-canvas, CTRL sky-object-and-layer-panel
  - Given: 中档设备在选定地点/时刻打开含星座、银河、行星和深空目标的天空。
  - When: 用户缩放、旋转并搜索一个目标。
  - Then: 地平线/亮星先可交互，目录按需加载，目标方位高度正确且装饰降级不丢核心信息。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.acceptance.time-jump"></a>
<!-- ty-source-item:start key=ac-sky-orientation-ar-time-jump kind=acceptance -->
- **AC time-jump**
  - Accepts: REQ sky-time-control, CTRL sky-time-scrubber
  - Given: 本夜有月落和银河最高事件并跨午夜。
  - When: 用户在拖动后点击“跳到银河最高”。
  - Then: 日期/时区、画布、轨迹、遮挡和摄影入口同步到事件时刻，模拟状态不与实时混淆。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.acceptance.low-accuracy-guidance"></a>
<!-- ty-source-item:start key=ac-sky-orientation-ar-low-accuracy-guidance kind=acceptance -->
- **AC low-accuracy-guidance**
  - Accepts: REQ orientation-guidance, REQ orientation-calibration, CTRL orientation-follow-toggle, CTRL orientation-calibration-sheet, OBL orientation-engine, NCOMP uncalibrated-heading
  - Given: 手机靠近汽车导致磁场异常。
  - When: 用户开启方向跟随查找目标。
  - Then: APP 标低精度并提示移开/8 字校准，错误实时跟随停止且手动北向/触控浏览可用。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.acceptance.obstruction-trajectory"></a>
<!-- ty-source-item:start key=ac-sky-orientation-ar-obstruction-trajectory kind=acceptance -->
- **AC obstruction-trajectory**
  - Accepts: REQ real-obstruction-overlay, REQ celestial-trajectories, CTRL obstruction-and-trajectory-overlay
  - Given: 银河中心轨迹有一段被有版本的山体/建筑轮廓遮挡。
  - When: 用户查看升起、中天和落下路径。
  - Then: 可见和遮挡区间、来源/置信度及前景重合时刻明确，纯天文轨迹未被误称现场实测。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.acceptance.field-of-view"></a>
<!-- ty-source-item:start key=ac-sky-orientation-ar-field-of-view kind=acceptance -->
- **AC field-of-view**
  - Accepts: REQ camera-field-of-view, CTRL field-of-view-overlay
  - Given: V3 用户选择已知全画幅机身与 24mm 镜头。
  - When: 开启横向视场预览。
  - Then: 覆盖边框按真实传感器/焦段计算并可传入摄影方案；缺少设备参数时该结果不会生成。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.acceptance.ar-degradation"></a>
<!-- ty-source-item:start key=ac-sky-orientation-ar-ar-degradation kind=acceptance -->
- **AC ar-degradation**
  - Accepts: REQ optional-ar, CTRL ar-mode-toggle, OBL sky-ar-separation
  - Given: 安卓设备不支持 ARCore 或追踪在现场丢失。
  - When: 用户请求/正在使用 AR。
  - Then: APP 明确能力/追踪状态并切到摄像头+传感器或通用天空，同一地点/时间/目标保留且不继续显示漂移叠加。
<!-- ty-source-item:end -->

#### Risks And Recovery

<a id="sky-orientation-ar.risk.sensor-observability"></a>
<!-- ty-source-item:start key=risk-sky-orientation-ar-sensor-observability kind=risk_fact fact=weak_observability outcome=sky-orientation-ar -->
- **RISK sensor-observability**
  - Fact: weak_observability
  - Affected Outcome: sky-orientation-ar
  - Basis: 指南针漂移、磁干扰、姿态稳定和遮挡对齐强依赖真实设备与户外环境。
  - Consequence: 需覆盖机型矩阵、金属/车辆场景、已知方位基准和户外校准测试，模拟器通过不足以验收。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.risk.camera-permission"></a>
<!-- ty-source-item:start key=risk-sky-orientation-ar-camera-permission kind=risk_fact fact=permission_boundary_change outcome=sky-orientation-ar -->
- **RISK camera-permission**
  - Fact: permission_boundary_change
  - Affected Outcome: sky-orientation-ar
  - Basis: V3 AR 从无需相机的通用天空跨入相机和平台追踪授权。
  - Consequence: 能力检测、用途说明、拒绝/撤回与无 AR 等价路径必须独立验证。
<!-- ty-source-item:end -->

<a id="sky-orientation-ar.risk.native-platform-split"></a>
<!-- ty-source-item:start key=risk-sky-orientation-ar-native-platform-split kind=risk_fact fact=public_api_or_schema_change outcome=sky-orientation-ar -->
- **RISK native-platform-split**
  - Fact: public_api_or_schema_change
  - Affected Outcome: sky-orientation-ar
  - Basis: 姿态、精度、AR 追踪和星图状态由 iOS/Android 原生适配器共同暴露给业务层。
  - Consequence: Contract 需冻结跨平台语义、能力枚举和降级状态，避免两端相同字段代表不同精度。
<!-- ty-source-item:end -->

<a id="outcome.shooting-assistant"></a>

### OUT shooting-assistant：手机与相机摄影助手

#### Observable Result

<!-- ty-source-item:start key=result-shooting-assistant kind=outcome_result -->
用户为选定地点、时间和目标选择手机/相机、镜头与支撑设备后，获得由确定性规则算出的可执行参数、构图方向、风险与替代方案，按手机/相机能力区分建议，并用 AI 解释取舍而不是编造曝光；出发前与现场检查表可加入行程、离线查看和逐项完成。
<!-- ty-source-item:end -->

#### Product Requirements

<a id="shooting-assistant.requirement.shooting-inputs"></a>
<!-- ty-source-item:start key=req-shooting-assistant-shooting-inputs kind=requirement -->
- **REQ shooting-inputs** [direct: S-PRODUCT 6.9A, S-ARCH 5.13]：输入包含拍摄目标、地点、时间、手机/相机型号、镜头、三脚架、赤道仪、是否接受后期堆栈和经验等级；可复用“我的设备”或临时覆盖，实际/等效焦段语义明确。
<!-- ty-source-item:end -->

<a id="shooting-assistant.requirement.condition-aware-shooting"></a>
<!-- ty-source-item:start key=req-shooting-assistant-condition-aware-shooting kind=requirement -->
- **REQ condition-aware-shooting** [direct: S-PRODUCT 6.9B]：自动读取光污染、月光、云量、风、湿度、目标亮度、目标移动速度、焦段和天体高度，并携带地点/时刻/数据新鲜度与可信度；缺失条件降低建议确定性而不填 0。
<!-- ty-source-item:end -->

<a id="shooting-assistant.requirement.mobile-output"></a>
<!-- ty-source-item:start key=req-shooting-assistant-mobile-output kind=requirement -->
- **REQ mobile-output** [direct: S-PRODUCT 6.9C]：手机建议覆盖主摄/超广角、专业模式、ISO、快门、白平衡、对焦、曝光补偿、连拍张数、夜景模式、堆栈和固定方式，并按设备是否支持相应控制禁用/替代。
<!-- ty-source-item:end -->

<a id="shooting-assistant.requirement.camera-output"></a>
<!-- ty-source-item:start key=req-shooting-assistant-camera-output kind=requirement -->
- **REQ camera-output** [direct: S-PRODUCT 6.9C, S-ARCH 5.13]：相机建议覆盖光圈、快门、ISO、白平衡、对焦、焦段、间隔设置、堆栈张数、赤道仪、降噪、构图方向和星点拖线风险。
<!-- ty-source-item:end -->

<a id="shooting-assistant.requirement.shooting-presets"></a>
<!-- ty-source-item:start key=req-shooting-assistant-shooting-presets kind=requirement -->
- **REQ shooting-presets** [direct: S-PRODUCT 6.9D]：内置手机银河、相机银河、星轨、月亮、流星雨、行星与地景、星空人像、空间站轨迹、日出日落与银河接续预设；超出当前版本的目标显示版本范围，不给无依据参数。
<!-- ty-source-item:end -->

<a id="shooting-assistant.requirement.deterministic-first-ai"></a>
<!-- ty-source-item:start key=req-shooting-assistant-deterministic-first-ai kind=requirement -->
- **REQ deterministic-first-ai** [direct: S-PRODUCT 6.9E, S-ARCH 5.13]：曝光核心先由版本化确定性规则计算；AI 只解释依据、参数取舍、可能问题、无三脚架替代和天气变化调整，并明确模型/生成时间/限制；AI 不得更改未展示依据的核心参数。
<!-- ty-source-item:end -->

<a id="shooting-assistant.requirement.shooting-checklists"></a>
<!-- ty-source-item:start key=req-shooting-assistant-shooting-checklists kind=requirement -->
- **REQ shooting-checklists** [direct: S-PRODUCT 6.9F]：出发前清单含电池、存储卡、三脚架、镜头布、防露、红光手电、保暖、驱蚊、水/补给；现场清单含关自动闪光、手动星点对焦、检查水平、试拍放大、检查结露、避免白光干扰，支持自定义和装备分工。
<!-- ty-source-item:end -->

<a id="shooting-assistant.requirement.plan-persistence"></a>
<!-- ty-source-item:start key=req-shooting-assistant-plan-persistence kind=requirement -->
- **REQ plan-persistence** [direct: S-PRODUCT 数据模型, S-ARCH 5.13]：ShootingPlan 保存目标/地点/时间、设备输入、条件快照、确定性规则版本、参数、AI 解释版本、风险、清单状态和用户调整；更新产生新版本并可加入行程/离线包。
<!-- ty-source-item:end -->

#### User Flow And States

- 正常流：从地点/天空/行程进入 → 选目标与设备 → 自动读取条件 → 选预设/高级输入 → 生成确定性参数 → 查看依据与 AI 解释 → 保存到行程 → 完成清单。
- 设备不支持：设备目录未知或某手动控制不可用时要求确认能力并给替代拍法，不显示不可设置参数。
- 条件变化：新天气/月光或时间变化时旧方案标 stale，显示受影响参数和“重新计算/保留用户调整”。
- AI 失败：确定性方案仍完整可用；解释区显示不可用/重试，不用泛化文案冒充个性化分析。

#### Controls And Product Feedback

<a id="shooting-assistant.control.shooting-setup-form"></a>
- **CTRL shooting-setup-form**
  - Source class: direct fields；form behavior derived。
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-setup-form-location kind=control -->
  - Location: 摄影助手首步，可从地点/天空/行程预填。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-shooting-assistant-shooting-setup-form-user-task kind=requirement -->
  - User task: 选择目标、时空、设备和拍摄约束。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-setup-form-trigger kind=control -->
  - Trigger: 打开摄影助手、切换预设或编辑现有方案。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-setup-form-input kind=control -->
  - Input: REQ shooting-inputs 的全部字段和设备档案。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-setup-form-loading kind=control -->
  - Loading: 设备目录/条件读取独立加载，用户输入保持。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-setup-form-empty kind=control -->
  - Empty: 无设备时提供“临时设备/添加到我的设备”；不默认虚构镜头。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-setup-form-success kind=control -->
  - Success: 表单显示将使用的设备能力、地点/时刻和条件摘要。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-setup-form-failure kind=control -->
  - Failure: 字段级错误可修正，无法读取条件时可保存草稿但不生成确定建议。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-setup-form-feedback kind=control -->
  - Feedback: 单位、实际/等效焦段、设备能力和必需/可选字段靠近控件。
<!-- ty-source-item:end -->

<a id="shooting-assistant.control.shooting-preset-picker"></a>
- **CTRL shooting-preset-picker**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-preset-picker-location kind=control -->
  - Location: 设置表单顶部或目标之后。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-shooting-assistant-shooting-preset-picker-user-task kind=requirement -->
  - User task: 以拍摄场景快速建立参数约束。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-preset-picker-trigger kind=control -->
  - Trigger: 选择九类预设之一。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-preset-picker-input kind=control -->
  - Input: 预设版本、所需设备/目标、适用范围和当前版本能力。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-preset-picker-loading kind=control -->
  - Loading: 预设规则读取时不清空当前输入。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-preset-picker-empty kind=control -->
  - Empty: 无适配预设时进入自定义，并解释原因。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-preset-picker-success kind=control -->
  - Success: 仅预填/约束相关字段，用户可查看变更。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-preset-picker-failure kind=control -->
  - Failure: 恢复先前设置，不落入通用神秘默认。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-preset-picker-feedback kind=control -->
  - Feedback: 预设适用条件、V1/V3 范围和对已有输入的覆盖预览可见。
<!-- ty-source-item:end -->

<a id="shooting-assistant.control.shooting-recommendation"></a>
- **CTRL shooting-recommendation**
  - Source class: direct outputs；hierarchy derived。
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-recommendation-location kind=control -->
  - Location: 生成结果首屏。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-shooting-assistant-shooting-recommendation-user-task kind=requirement -->
  - User task: 按设备设置拍摄参数并理解关键风险。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-recommendation-trigger kind=control -->
  - Trigger: 表单有效后生成/重算或切换方案版本。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-recommendation-input kind=control -->
  - Input: 确定性规则结果、条件快照、设备能力、用户调整和可信度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-recommendation-loading kind=control -->
  - Loading: 参数框架稳定并显示正在计算的部分。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-recommendation-empty kind=control -->
  - Empty: 规则无安全/合理解时明确不可推荐并给改条件建议。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-recommendation-success kind=control -->
  - Success: 手机或相机全部适用参数、构图方向、拖线/风/露水等风险与替代方案分层显示。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-recommendation-failure kind=control -->
  - Failure: 不展示半套参数为成功；保留输入和上次有版本结果。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-recommendation-feedback kind=control -->
  - Feedback: 每个参数有单位/范围/是否用户覆盖，核心依据/规则版本/数据时间可展开。
<!-- ty-source-item:end -->

<a id="shooting-assistant.control.ai-explanation-panel"></a>
- **CTRL ai-explanation-panel**
  - Source class: direct AI role。
<!-- ty-source-item:start key=ctrl-shooting-assistant-ai-explanation-panel-location kind=control -->
  - Location: 确定性参数之后的“为什么/替代方案”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-shooting-assistant-ai-explanation-panel-user-task kind=requirement -->
  - User task: 理解取舍和现场调整，不把 AI 当测光真值。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-ai-explanation-panel-trigger kind=control -->
  - Trigger: 参数生成后展开或请求针对性解释。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-ai-explanation-panel-input kind=control -->
  - Input: 已确定参数、条件、经验等级、允许发送的数据投影和问题。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-ai-explanation-panel-loading kind=control -->
  - Loading: 参数区继续可用，解释显示独立生成/取消状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-ai-explanation-panel-empty kind=control -->
  - Empty: 未启用/不同意 AI 数据处理时显示规则解释，不降低核心能力。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-ai-explanation-panel-success kind=control -->
  - Success: 逐项引用现有参数/条件说明取舍、问题、无脚架替代和天气调整。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-ai-explanation-panel-failure kind=control -->
  - Failure: 明确解释服务失败，不生成占位“建议”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-ai-explanation-panel-feedback kind=control -->
  - Feedback: 标明 AI、生成时间、数据范围和“不替代现场试拍”；用户可反馈但不能直接污染规则真值。
<!-- ty-source-item:end -->

<a id="shooting-assistant.control.shooting-checklist"></a>
- **CTRL shooting-checklist**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-checklist-location kind=control -->
  - Location: 方案页、行程装备区和现场模式。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-shooting-assistant-shooting-checklist-user-task kind=requirement -->
  - User task: 按出发前/现场阶段检查装备和动作。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-checklist-trigger kind=control -->
  - Trigger: 打开清单、勾选、自定义、分配成员或复位新行程。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-checklist-input kind=control -->
  - Input: 来源全量清单、方案设备、参与者、自定义项和完成状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-checklist-loading kind=control -->
  - Loading: 本地状态先显示，同步状态局部提示。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-checklist-empty kind=control -->
  - Empty: 用户清空自定义项后仍提供恢复基础模板；无协作时不显示虚假分工。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-checklist-success kind=control -->
  - Success: 完成状态本地持久化、可离线使用并按 revision/成员同步。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-checklist-failure kind=control -->
  - Failure: 离线写入排队；冲突显示而不丢勾选历史。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-shooting-checklist-feedback kind=control -->
  - Feedback: 出发前/现场分组、负责人、未完成关键项和红光礼仪明确。
<!-- ty-source-item:end -->

<a id="shooting-assistant.control.save-shooting-plan"></a>
- **CTRL save-shooting-plan**
  - Source class: direct persistence need；action derived。
<!-- ty-source-item:start key=ctrl-shooting-assistant-save-shooting-plan-location kind=control -->
  - Location: 参数结果底部固定主动作。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-shooting-assistant-save-shooting-plan-user-task kind=requirement -->
  - User task: 保存、加入行程或更新已有摄影方案。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-save-shooting-plan-trigger kind=control -->
  - Trigger: 点击保存/加入行程。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-save-shooting-plan-input kind=control -->
  - Input: 完整 ShootingPlan、目标行程 revision 和用户调整。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-save-shooting-plan-loading kind=control -->
  - Loading: 防重复提交，显示本地/服务端保存阶段。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-save-shooting-plan-empty kind=control -->
  - Empty: 未选择目标行程时可只保存到“我的方案”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-save-shooting-plan-success kind=control -->
  - Success: 生成方案版本并在行程/离线包可见。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-save-shooting-plan-failure kind=control -->
  - Failure: 本地草稿保留并可重试，不覆盖已保存版本。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-shooting-assistant-save-shooting-plan-feedback kind=control -->
  - Feedback: 保存位置、版本、stale 条件和下一次需要重算的触发项可见。
<!-- ty-source-item:end -->

#### Technical Obligations And Boundaries

<a id="shooting-assistant.obligation.versioned-rule-engine"></a>
<!-- ty-source-item:start key=obl-shooting-assistant-versioned-rule-engine kind=technical_obligation -->
- **OBL versioned-rule-engine** [direct: S-ARCH 5.13]：曝光、拖线、视场和设备约束由可测试、可版本化的确定性规则产生，输入/单位/边界/输出可重放；AI 层只能消费已脱敏投影并返回解释/候选调整，不能覆盖规则字段。
<!-- ty-source-item:end -->

<a id="shooting-assistant.non-completing.ai-only-parameters"></a>
<!-- ty-source-item:start key=ncomp-shooting-assistant-ai-only-parameters kind=non_completing -->
- **NCOMP ai-only-parameters** [direct: S-PRODUCT 6.9E, S-ARCH 5.13]：让大模型直接返回一组参数、没有确定性计算/规则版本/依据/风险，不能算摄影助手完成。
<!-- ty-source-item:end -->

#### Implementation Hints

- **HINT user-adjustment-overlay**：保存“规则基线 + 用户覆盖”而非改写基线，重算时可逐项解释新旧差异。
- **HINT device-capability-catalog**：设备目录应记录数据来源/版本/能力缺口，并允许用户确认实际可用控制。

#### Acceptance Scenarios

<a id="shooting-assistant.acceptance.mobile-plan"></a>
<!-- ty-source-item:start key=ac-shooting-assistant-mobile-plan kind=acceptance -->
- **AC mobile-plan**
  - Accepts: REQ shooting-inputs, REQ condition-aware-shooting, REQ mobile-output, CTRL shooting-setup-form, CTRL shooting-recommendation
  - Given: 用户选择已知手机、银河目标、无赤道仪但有三脚架且完整条件可用。
  - When: 生成手机方案。
  - Then: 主摄/超广角、专业/夜景、ISO/快门/白平衡/对焦/补偿/连拍/堆栈/固定方式只按设备能力显示，依据和条件时间可追溯。
<!-- ty-source-item:end -->

<a id="shooting-assistant.acceptance.camera-plan-and-risk"></a>
<!-- ty-source-item:start key=ac-shooting-assistant-camera-plan-and-risk kind=acceptance -->
- **AC camera-plan-and-risk**
  - Accepts: REQ camera-output, CTRL shooting-recommendation
  - Given: 相机与长焦镜头无赤道仪且目标移动导致拖线风险。
  - When: 用户查看方案。
  - Then: 光圈/快门/ISO/白平衡/对焦/焦段/间隔/堆栈/降噪/构图完整，拖线风险和可操作替代明确。
<!-- ty-source-item:end -->

<a id="shooting-assistant.acceptance.preset-boundary"></a>
<!-- ty-source-item:start key=ac-shooting-assistant-preset-boundary kind=acceptance -->
- **AC preset-boundary**
  - Accepts: REQ shooting-presets, CTRL shooting-preset-picker
  - Given: 用户在当前版本选择一个尚未支持完整轨迹的 V3 预设。
  - When: 预设被选中。
  - Then: APP 明确版本/依赖并阻止无依据完整参数，可保留可用基础字段或进入自定义。
<!-- ty-source-item:end -->

<a id="shooting-assistant.acceptance.ai-is-explanation"></a>
<!-- ty-source-item:start key=ac-shooting-assistant-ai-is-explanation kind=acceptance -->
- **AC ai-is-explanation**
  - Accepts: REQ deterministic-first-ai, CTRL ai-explanation-panel, OBL versioned-rule-engine, NCOMP ai-only-parameters
  - Given: 确定性参数已生成而 AI 服务不可用。
  - When: 用户打开“为什么”。
  - Then: 规则参数和基础依据仍完整可用，AI 失败独立显示且没有新参数覆盖规则结果。
<!-- ty-source-item:end -->

<a id="shooting-assistant.acceptance.checklist-offline"></a>
<!-- ty-source-item:start key=ac-shooting-assistant-checklist-offline kind=acceptance -->
- **AC checklist-offline**
  - Accepts: REQ shooting-checklists, CTRL shooting-checklist
  - Given: 行程清单含全部出发前/现场基础项、自定义项和成员分工。
  - When: 用户断网勾选关键项并稍后同步。
  - Then: 状态本地保存、联网后按 revision 合并，基础清单可恢复且避免白光条款不被遗漏。
<!-- ty-source-item:end -->

<a id="shooting-assistant.acceptance.versioned-save"></a>
<!-- ty-source-item:start key=ac-shooting-assistant-versioned-save kind=acceptance -->
- **AC versioned-save**
  - Accepts: REQ plan-persistence, CTRL save-shooting-plan
  - Given: 已保存方案后天气变化且用户曾覆盖 ISO。
  - When: 用户重算并保存到行程。
  - Then: 新版本保留条件/规则/AI 版本和用户覆盖差异，旧版本可查且离线包引用明确版本。
<!-- ty-source-item:end -->

#### Risks And Recovery

<a id="shooting-assistant.risk.ai-security"></a>
<!-- ty-source-item:start key=risk-shooting-assistant-ai-security kind=risk_fact fact=security_boundary_change outcome=shooting-assistant -->
- **RISK ai-security**
  - Fact: security_boundary_change
  - Affected Outcome: shooting-assistant
  - Basis: AI 解释可能将精确地点、设备、行程时间或用户输入发送到第三方模型。
  - Consequence: DEC ai-provider-privacy 必须定义供应商、同意、最小数据投影、保留和失败降级；服务端不得泄露密钥。
<!-- ty-source-item:end -->

<a id="shooting-assistant.risk.parameter-observability"></a>
<!-- ty-source-item:start key=risk-shooting-assistant-parameter-observability kind=risk_fact fact=weak_observability outcome=shooting-assistant -->
- **RISK parameter-observability**
  - Fact: weak_observability
  - Affected Outcome: shooting-assistant
  - Basis: 参数合理性受真实设备、镜头、目标、风、温湿度和用户操作影响，自动测试不能证明成片质量。
  - Consequence: 需用黄金输入、摄影专家审阅、设备实拍和用户反馈校准，并持续保留规则版本。
<!-- ty-source-item:end -->

<a id="outcome.field-offline-safety"></a>

### OUT field-offline-safety：现场、离线与安全闭环

#### Observable Result

<!-- ty-source-item:start key=result-field-offline-safety kind=outcome_result -->
用户出发前可下载并验证完整观测数据包；到达低光、弱网或断网现场后，仍能以夜间/红光界面核对地点/时间/最佳窗口、方向、目标、缓存天气、拍摄和清单，查看离线地图、返回停车点、切换备选、记录实况与图片；用户主动开启的限时安全模式能显示返程和警告、可选择分享位置，并在结束/超时后停止后台定位。
<!-- ty-source-item:end -->

#### Product Requirements

<a id="field-offline-safety.requirement.field-core-status"></a>
<!-- ty-source-item:start key=req-field-offline-safety-field-core-status kind=requirement -->
- **REQ field-core-status** [direct: S-PRODUCT 6.10]：现场首屏显示当前观星点、当前时间、当前方向、距最佳窗口、目标方向/高度、实时或缓存云量/降雨、风、月亮位置和返程建议时间，每项标识实时/缓存/过期/不可用。
<!-- ty-source-item:end -->

<a id="field-offline-safety.requirement.field-toolkit"></a>
<!-- ty-source-item:start key=req-field-offline-safety-field-toolkit kind=requirement -->
- **REQ field-toolkit** [direct: S-PRODUCT 6.10]：现场入口覆盖 360°星图、指南针、红光模式、拍摄参数、装备清单、离线地图、返回停车位置、上传实况和切换备选地点，核心动作单手可达且不依赖网络完成打开。
<!-- ty-source-item:end -->

<a id="field-offline-safety.requirement.night-red-mode"></a>
<!-- ty-source-item:start key=req-field-offline-safety-night-red-mode kind=requirement -->
- **REQ night-red-mode** [direct: S-PRODUCT 6.10, S-DESIGN]：支持低亮夜间与红光模式；红光不是简单滤镜，需降低发光面积/动效、避免纯白闪屏、保持危险/选择/禁用差异和屏幕阅读器语义，系统键盘/媒体/地图等无法完全变红的边界要预先提示。
<!-- ty-source-item:end -->

<a id="field-offline-safety.requirement.complete-observation-pack"></a>
<!-- ty-source-item:start key=req-field-offline-safety-complete-observation-pack kind=requirement -->
- **REQ complete-observation-pack** [direct: S-ARCH 3.4]：离线包包含地点基本信息、按策略授权的精确坐标/停车点、路线几何/最后步行、未来天气快照、日月/银河窗口、天体方位、光污染/地平线、摄影参数、装备清单、指定范围地图瓦片、主备地点和紧急联系人，并记录大小、范围、各数据版本/过期时间和校验状态。
<!-- ty-source-item:end -->

<a id="field-offline-safety.requirement.offline-capabilities"></a>
<!-- ty-source-item:start key=req-field-offline-safety-offline-capabilities kind=requirement -->
- **REQ offline-capabilities** [direct: S-ARCH 3.4]：断网可查看地图、找回停车点、查看银河/月亮/行星方向、缓存天气、使用指南针、记录实况、切换备选和暂存图片；任何需要最新网络或外部应用的动作明确不可用/降级。
<!-- ty-source-item:end -->

<a id="field-offline-safety.requirement.parking-and-backup"></a>
<!-- ty-source-item:start key=req-field-offline-safety-parking-and-backup kind=requirement -->
- **REQ parking-and-backup** [direct: S-PRODUCT 6.10]：用户可保存/确认停车位置与精度、离线查看方位/距离/步行路线；切换备选必须比较当前地点到备选的路线快照、窗口、风险和缓存新鲜度，并保留撤回/原计划。
<!-- ty-source-item:end -->

<a id="field-offline-safety.requirement.safety-session"></a>
<!-- ty-source-item:start key=req-field-offline-safety-safety-session kind=requirement -->
- **REQ safety-session** [direct: S-PRODUCT 6.10, S-ARCH 3.5]：安全功能包含预计返程、行程联系人、长时间未返回提醒、极端天气、夜间山路和潮汐提醒；后台定位只在用户明确开启现场行程后限时运行、显著显示、可随时结束并自动停止，具体时限/未返回升级由 DEC background-safety-policy 决定。
<!-- ty-source-item:end -->

<a id="field-offline-safety.requirement.location-sharing-consent"></a>
<!-- ty-source-item:start key=req-field-offline-safety-location-sharing-consent kind=requirement -->
- **REQ location-sharing-consent** [direct: S-PRODUCT 6.10, S-ARCH 15]：一键分享当前位置必须由用户明确选择联系人/应用、预览精度/有效期/附带行程信息并确认；离线或发送失败不得显示已送达，分享策略不能绕过地点坐标访问级别。
<!-- ty-source-item:end -->

<a id="field-offline-safety.requirement.offline-write-sync"></a>
<!-- ty-source-item:start key=req-field-offline-safety-offline-write-sync kind=requirement -->
- **REQ offline-write-sync** [direct: S-ARCH 3.3～3.4]：现场实况、图片、清单、停车和计划变更先写本地事务/队列，带本地 ID、幂等键、revision、创建时间和重试状态；联网后按依赖顺序同步，冲突/审核/失败可见，不重复发布。
<!-- ty-source-item:end -->

<a id="field-offline-safety.requirement.local-storage-boundaries"></a>
<!-- ty-source-item:start key=req-field-offline-safety-local-storage-boundaries kind=requirement -->
- **REQ local-storage-boundaries** [direct: S-ARCH 3.3]：SQLite 保存偏好/设备、地点摘要、收藏、行程、天气快照、天文窗口、路线、现场包、待上传内容、同步游标和版本/过期；FileSystem 保存媒体/瓦片等文件，SecureStore 保存小型令牌；敏感离线数据的加密/保留由 DEC offline-pack-policy 决定。
<!-- ty-source-item:end -->

#### User Flow And States

- 出发前：在行程点击下载 → 选择地图范围/媒体 → 显示大小与空间 → 下载/校验 → 标完整或列缺失 → 出发前刷新过期动态数据。
- 到场：确认到达/停车 → 可选开启限时安全模式 → 提示并由用户选择夜间/红光 → 查看目标/窗口/天气 → 使用方向/拍摄/清单 → 记录实况。
- 换点：警告或条件恶化 → 打开主备比较 → 选择备选 → 更新当前现场上下文/返程 → 路线若过期明确标缓存。
- 结束：停止安全模式和持续定位 → 提醒返程/未同步内容 → 联网同步 → 查看每项发布/待审核/失败状态。

#### Controls And Product Feedback

<a id="field-offline-safety.control.offline-pack-manager"></a>
- **CTRL offline-pack-manager**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-pack-manager-location kind=control -->
  - Location: 行程详情、现场入口和“我的 → 离线数据”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-field-offline-safety-offline-pack-manager-user-task kind=requirement -->
  - User task: 下载、更新、校验或删除一份行程观测包。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-pack-manager-trigger kind=control -->
  - Trigger: 点击下载/更新/管理，或动态数据过期提醒。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-pack-manager-input kind=control -->
  - Input: REQ complete-observation-pack 全部内容、地图范围、文件大小、权限、设备空间。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-pack-manager-loading kind=control -->
  - Loading: 分组件进度、剩余大小/可暂停；离开页面后任务可查看。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-pack-manager-empty kind=control -->
  - Empty: 无行程/无授权坐标时解释并提供创建/申请；空间不足列可裁剪项。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-pack-manager-success kind=control -->
  - Success: 校验完整性后显示“可离线”、版本/过期和最后更新。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-pack-manager-failure kind=control -->
  - Failure: 保留可用旧包，列出失败组件并可续传，不把部分包标完整。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-pack-manager-feedback kind=control -->
  - Feedback: 删除前显示影响且可重下；过期天气与仍有效静态地图分开。
<!-- ty-source-item:end -->

<a id="field-offline-safety.control.field-dashboard"></a>
- **CTRL field-dashboard**
  - Source class: direct；layout derived from S-DESIGN。
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-dashboard-location kind=control -->
  - Location: 现场模式首屏。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-field-offline-safety-field-dashboard-user-task kind=requirement -->
  - User task: 低光下一眼确认当前状态、下一窗口、方向和返程。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-dashboard-trigger kind=control -->
  - Trigger: 从行程/地点进入现场或恢复安全会话。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-dashboard-input kind=control -->
  - Input: REQ field-core-status、当前主备、安全会话和离线状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-dashboard-loading kind=control -->
  - Loading: 本地包立即呈现，网络更新只替换带来源字段。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-dashboard-empty kind=control -->
  - Empty: 无包时提供受限在线/手动模式并明确缺少哪些安全数据。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-dashboard-success kind=control -->
  - Success: 结论、窗口倒计时、目标方向、天气/月亮和返程动作单屏可用。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-dashboard-failure kind=control -->
  - Failure: 缓存继续可用且标时间，关键缺口提升为风险而非白屏。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-dashboard-feedback kind=control -->
  - Feedback: 顶部持续显示地点、在线/离线、定位精度、模式和安全会话状态。
<!-- ty-source-item:end -->

<a id="field-offline-safety.control.night-red-mode-toggle"></a>
- **CTRL night-red-mode-toggle**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-field-offline-safety-night-red-mode-toggle-location kind=control -->
  - Location: 现场顶部快捷控制及全局显示设置。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-field-offline-safety-night-red-mode-toggle-user-task kind=requirement -->
  - User task: 在夜间/红光/系统模式间切换并减少暗适应破坏。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-night-red-mode-toggle-trigger kind=control -->
  - Trigger: 点击模式、进入现场时显示模式建议或系统外观变化。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-night-red-mode-toggle-input kind=control -->
  - Input: 模式偏好、屏幕亮度能力、reduced motion 和平台限制。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-night-red-mode-toggle-loading kind=control -->
  - Loading: 不适用；主题原子切换，避免中间白帧。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-night-red-mode-toggle-empty kind=control -->
  - Empty: 设备无法控制系统亮度时说明仅应用内生效。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-night-red-mode-toggle-success kind=control -->
  - Success: 所有自有页面/地图覆盖/图表切换且语义/对比保留。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-night-red-mode-toggle-failure kind=control -->
  - Failure: 回到最后稳定主题，不产生高亮闪屏。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-night-red-mode-toggle-feedback kind=control -->
  - Feedback: 当前模式和不可控制的系统 UI 边界可见，退出现场不强制丢偏好。
<!-- ty-source-item:end -->

<a id="field-offline-safety.control.field-tool-grid"></a>
- **CTRL field-tool-grid**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-tool-grid-location kind=control -->
  - Location: 现场首屏状态下方的快捷区。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-field-offline-safety-field-tool-grid-user-task kind=requirement -->
  - User task: 打开星图、指南针、参数、清单、地图、停车、实况或备选。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-tool-grid-trigger kind=control -->
  - Trigger: 点击一个工具。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-tool-grid-input kind=control -->
  - Input: 工具可用性、离线包组件、权限和当前上下文。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-tool-grid-loading kind=control -->
  - Loading: 打开目标工具时当前现场状态保留。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-tool-grid-empty kind=control -->
  - Empty: 缺组件/权限的工具 disabled 并给下载/授权/替代路径。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-tool-grid-success kind=control -->
  - Success: 深链携带同一地点/时间/目标/方案，返回现场状态不丢。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-tool-grid-failure kind=control -->
  - Failure: 显示局部错误并返回工具网格，不退出安全会话。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-field-tool-grid-feedback kind=control -->
  - Feedback: 工具是否离线可用、是否会请求权限或离开 APP 预先标识。
<!-- ty-source-item:end -->

<a id="field-offline-safety.control.return-to-parking"></a>
- **CTRL return-to-parking**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-field-offline-safety-return-to-parking-location kind=control -->
  - Location: 现场主工具和安全区。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-field-offline-safety-return-to-parking-user-task kind=requirement -->
  - User task: 弱网/断网时找到已确认停车位置。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-return-to-parking-trigger kind=control -->
  - Trigger: 保存停车点、点击返回停车或选择更新位置。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-return-to-parking-input kind=control -->
  - Input: 停车 WGS84 坐标、精度/时间、当前前台位置、缓存步行几何、指南针姿态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-return-to-parking-loading kind=control -->
  - Loading: 定位更新时仍显示最后已知距离/方向和时间。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-return-to-parking-empty kind=control -->
  - Empty: 未保存停车点时提供明确保存流程；定位不可用时显示地图静态关系。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-return-to-parking-success kind=control -->
  - Success: 方位、距离、缓存路线/直线语义和目标精度清楚，可交外部导航。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-return-to-parking-failure kind=control -->
  - Failure: 不显示虚假实时箭头，回退静态地图/坐标并提示定位状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-return-to-parking-feedback kind=control -->
  - Feedback: “停车点”和“观星点”始终区分；保存/覆盖有确认和撤销提示。
<!-- ty-source-item:end -->

<a id="field-offline-safety.control.backup-switcher"></a>
- **CTRL backup-switcher**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-field-offline-safety-backup-switcher-location kind=control -->
  - Location: 现场状态/警告内的“切换备选”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-field-offline-safety-backup-switcher-user-task kind=requirement -->
  - User task: 条件恶化或主地点失效时换到更可行地点。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-backup-switcher-trigger kind=control -->
  - Trigger: 用户点击、极端天气/关闭提醒或主地点阻断。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-backup-switcher-input kind=control -->
  - Input: 主备条件、路线快照、窗口、风险、缓存时间和坐标权限。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-backup-switcher-loading kind=control -->
  - Loading: 比较卡保持，能联网则刷新受影响项。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-backup-switcher-empty kind=control -->
  - Empty: 无备选时提供安全返程/地图缓存，不临时推荐未经验证点。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-backup-switcher-success kind=control -->
  - Success: 用户确认后当前上下文、路线、返程和安全会话更新并保留原计划。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-backup-switcher-failure kind=control -->
  - Failure: 维持原地点并明确失败，不静默部分切换。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-backup-switcher-feedback kind=control -->
  - Feedback: 切换前显示为何、是否赶得上、路线是否缓存及撤回路径。
<!-- ty-source-item:end -->

<a id="field-offline-safety.control.safety-session-panel"></a>
- **CTRL safety-session-panel**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-field-offline-safety-safety-session-panel-location kind=control -->
  - Location: 现场安全区和持续状态条。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-field-offline-safety-safety-session-panel-user-task kind=requirement -->
  - User task: 设置返程、联系人、提醒和限时后台定位。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-safety-session-panel-trigger kind=control -->
  - Trigger: 点击开启现场行程/编辑/结束，或到提醒阈值。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-safety-session-panel-input kind=control -->
  - Input: 预计返程、自动停止、联系人、位置精度/频率、天气/山路/潮汐风险。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-safety-session-panel-loading kind=control -->
  - Loading: 启动系统服务时显示逐项权限/注册状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-safety-session-panel-empty kind=control -->
  - Empty: 无联系人时仍允许本地返程提醒，但明确不能外发；后台权限拒绝提供前台计时。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-safety-session-panel-success kind=control -->
  - Success: 开启范围、停止时间和当前后台状态持续可见，结束后服务停止并确认。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-safety-session-panel-failure kind=control -->
  - Failure: 不宣称保护已开启；提供本地提醒/手动分享替代和设置入口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-safety-session-panel-feedback kind=control -->
  - Feedback: 每个外发/后台行为的接收者、频率、有效期和关闭动作明确。
<!-- ty-source-item:end -->

<a id="field-offline-safety.control.location-share-action"></a>
- **CTRL location-share-action**
  - Source class: direct；confirmation behavior derived。
<!-- ty-source-item:start key=ctrl-field-offline-safety-location-share-action-location kind=control -->
  - Location: 现场安全区。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-field-offline-safety-location-share-action-user-task kind=requirement -->
  - User task: 主动把当前位置/行程摘要分享给指定对象。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-location-share-action-trigger kind=control -->
  - Trigger: 点击“一键分享当前地点”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-location-share-action-input kind=control -->
  - Input: 当前/最后位置、精度/时间、地点访问策略、联系人/应用、有效期和附带字段。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-location-share-action-loading kind=control -->
  - Loading: 获取位置和生成载荷时可取消、防重复。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-location-share-action-empty kind=control -->
  - Empty: 无位置/应用/联系人时提供复制允许字段或稍后重试。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-location-share-action-success kind=control -->
  - Success: 用户预览确认后打开目标通道，并只在收到系统结果时描述为已发起/已送达（若可证）。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-location-share-action-failure kind=control -->
  - Failure: 明确未发送或状态未知，载荷可重试但不自动外发。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-location-share-action-feedback kind=control -->
  - Feedback: 发送前显示精度、时间、接收者和撤销/过期边界。
<!-- ty-source-item:end -->

<a id="field-offline-safety.control.offline-sync-queue"></a>
- **CTRL offline-sync-queue**
  - Source class: direct offline writes；visibility derived。
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-sync-queue-location kind=control -->
  - Location: 现场状态、贡献提交结果和“我的 → 同步”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-field-offline-safety-offline-sync-queue-user-task kind=requirement -->
  - User task: 查看待上传实况/图片/更改并处理失败。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-sync-queue-trigger kind=control -->
  - Trigger: 本地写入、网络恢复、点击重试/取消。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-sync-queue-input kind=control -->
  - Input: 队列项、依赖、幂等键、revision、重试/审核状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-sync-queue-loading kind=control -->
  - Loading: 每项显示上传/处理阶段，批量同步可后台继续。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-sync-queue-empty kind=control -->
  - Empty: 显示“全部已同步”和最后成功时间，而非隐藏状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-sync-queue-success kind=control -->
  - Success: 本地 ID 映射服务端 ID、状态发布/待审核清楚且不重复。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-sync-queue-failure kind=control -->
  - Failure: 项目级原因/重试/导出草稿可用，其他项继续同步。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-field-offline-safety-offline-sync-queue-feedback kind=control -->
  - Feedback: 断网、排队、上传、处理中、待审核、已发布、冲突、失败状态完整。
<!-- ty-source-item:end -->

#### Technical Obligations And Boundaries

<a id="field-offline-safety.obligation.offline-storage-stack"></a>
<!-- ty-source-item:start key=obl-field-offline-safety-offline-storage-stack kind=technical_obligation -->
- **OBL offline-storage-stack** [direct: S-ARCH 3.3]：结构化缓存/队列使用 Expo SQLite（按需要启用 WAL/FTS/SQLCipher），大文件与地图用 Expo FileSystem，小型令牌用由 Android Keystore/iOS Keychain 支撑的 Expo SecureStore；包 manifest/哈希、事务迁移、空间回收和敏感字段边界可验证。
<!-- ty-source-item:end -->

<a id="field-offline-safety.obligation.bounded-background-location"></a>
<!-- ty-source-item:start key=obl-field-offline-safety-bounded-background-location kind=technical_obligation -->
- **OBL bounded-background-location** [direct: S-ARCH 3.5]：单次、前台持续、限时后台定位是显式三种状态；后台能力要求 Development Build/平台配置，只能由安全会话启动并受自动停止、系统限制、显著说明和审计约束。
<!-- ty-source-item:end -->

<a id="field-offline-safety.non-completing.cached-shell-only"></a>
<!-- ty-source-item:start key=ncomp-field-offline-safety-cached-shell-only kind=non_completing -->
- **NCOMP cached-shell-only** [direct: S-ARCH 3.4]：只缓存页面壳或文本、断网不能地图/停车/天体方向/实况/备选，不能算现场离线完成。
<!-- ty-source-item:end -->

#### Implementation Hints

- **HINT offline-pack-manifest**：manifest 可逐组件记录 schemaVersion、contentVersion、source、generatedAt、expiresAt、hash、bytes、coordinateAccess 和 dependency。
- **HINT sync-dependency-order**：先同步实体/行程 revision，再上传媒体并确认，最后提交引用它们的实况；失败按幂等业务键重试。

#### Acceptance Scenarios

<a id="field-offline-safety.acceptance.pack-integrity"></a>
<!-- ty-source-item:start key=ac-field-offline-safety-pack-integrity kind=acceptance -->
- **AC pack-integrity**
  - Accepts: REQ complete-observation-pack, REQ local-storage-boundaries, CTRL offline-pack-manager, OBL offline-storage-stack
  - Given: 行程含主备、停车/步行、地图、天气/天文、摄影、清单和联系人且设备空间足够。
  - When: 用户下载并校验观测包。
  - Then: 每个组件版本/大小/过期/哈希和坐标授权可见，只有全部必需组件通过才标“可离线”。
<!-- ty-source-item:end -->

<a id="field-offline-safety.acceptance.offline-field-use"></a>
<!-- ty-source-item:start key=ac-field-offline-safety-offline-field-use kind=acceptance -->
- **AC offline-field-use**
  - Accepts: REQ field-core-status, REQ field-toolkit, REQ offline-capabilities, CTRL field-dashboard, CTRL field-tool-grid, NCOMP cached-shell-only
  - Given: 用户在完全断网现场打开一份已校验包。
  - When: 查看状态并依次打开离线地图、天空方向、拍摄、清单、实况和备选。
  - Then: 所有来源承诺能力可用并标缓存时间，联网专属动作明确降级且页面不白屏。
<!-- ty-source-item:end -->

<a id="field-offline-safety.acceptance.red-mode-accessible"></a>
<!-- ty-source-item:start key=ac-field-offline-safety-red-mode-accessible kind=acceptance -->
- **AC red-mode-accessible**
  - Accepts: REQ night-red-mode, CTRL night-red-mode-toggle
  - Given: 用户在现场从夜间切换红光并启用文本放大/reduced motion。
  - When: 浏览地图覆盖、状态、危险和禁用工具。
  - Then: 无白帧，危险/选择/禁用不只靠颜色且仍可读，系统 UI 无法控制的边界提前说明。
<!-- ty-source-item:end -->

<a id="field-offline-safety.acceptance.parking-and-backup-offline"></a>
<!-- ty-source-item:start key=ac-field-offline-safety-parking-and-backup-offline kind=acceptance -->
- **AC parking-and-backup-offline**
  - Accepts: REQ parking-and-backup, CTRL return-to-parking, CTRL backup-switcher
  - Given: 当前地点条件恶化、网络中断且包内有已验证停车点和备选路线快照。
  - When: 用户查看停车方向并确认切换备选。
  - Then: 方位/距离/缓存路线语义与精度可见，主备上下文原子切换且旧计划可撤回。
<!-- ty-source-item:end -->

<a id="field-offline-safety.acceptance.bounded-safety-session"></a>
<!-- ty-source-item:start key=ac-field-offline-safety-bounded-safety-session kind=acceptance -->
- **AC bounded-safety-session**
  - Accepts: REQ safety-session, CTRL safety-session-panel, OBL bounded-background-location
  - Given: 用户明确授权限时后台定位并设返程/联系人。
  - When: 开启后主动结束或达到自动停止时间。
  - Then: 开启范围/状态持续可见，结束时后台定位和计划任务可证实停止，拒绝权限时不会宣称已保护。
<!-- ty-source-item:end -->

<a id="field-offline-safety.acceptance.explicit-location-share"></a>
<!-- ty-source-item:start key=ac-field-offline-safety-explicit-location-share kind=acceptance -->
- **AC explicit-location-share**
  - Accepts: REQ location-sharing-consent, CTRL location-share-action
  - Given: 当前地点为受限坐标且用户选择一个外部分享应用。
  - When: 用户预览精度/接收者/有效期并确认。
  - Then: 载荷只含策略允许字段，失败/未知不会显示已送达，也不会后台自动重发。
<!-- ty-source-item:end -->

<a id="field-offline-safety.acceptance.offline-write-replay"></a>
<!-- ty-source-item:start key=ac-field-offline-safety-offline-write-replay kind=acceptance -->
- **AC offline-write-replay**
  - Accepts: REQ offline-write-sync, CTRL offline-sync-queue
  - Given: 用户断网新增实况、两张图片并修改清单，第一次联网上传中断。
  - When: 网络再次恢复。
  - Then: 队列按依赖/幂等键续传且不重复发布，逐项显示待审核/已发布/失败/冲突并保留草稿。
<!-- ty-source-item:end -->

#### Risks And Recovery

<a id="field-offline-safety.risk.background-location-permission"></a>
<!-- ty-source-item:start key=risk-field-offline-safety-background-location-permission kind=risk_fact fact=permission_boundary_change outcome=field-offline-safety -->
- **RISK background-location-permission**
  - Fact: permission_boundary_change
  - Affected Outcome: field-offline-safety
  - Basis: 现场安全模式从前台查询扩展到受系统和商店严格约束的后台位置。
  - Consequence: 需平台实机、拒绝/撤回/系统杀进程/自动停止与商店披露联合验证，默认不申请永久后台定位。
<!-- ty-source-item:end -->

<a id="field-offline-safety.risk.location-share-effect"></a>
<!-- ty-source-item:start key=risk-field-offline-safety-location-share-effect kind=risk_fact fact=irreversible_external_effect outcome=field-offline-safety -->
- **RISK location-share-effect**
  - Fact: irreversible_external_effect
  - Affected Outcome: field-offline-safety
  - Basis: 一旦精确位置或行程信息发到外部联系人/应用，APP 无法保证撤回。
  - Consequence: 必须发送前预览确认、最小精度/有效期、遵守坐标策略并如实呈现发送状态。
<!-- ty-source-item:end -->

<a id="field-offline-safety.risk.offline-critical-path"></a>
<!-- ty-source-item:start key=risk-field-offline-safety-offline-critical-path kind=risk_fact fact=critical_user_path outcome=field-offline-safety -->
- **RISK offline-critical-path**
  - Fact: critical_user_path
  - Affected Outcome: field-offline-safety
  - Basis: 用户可能在黑暗、无网、低温、低电量环境依赖停车、路线、备选和返程信息。
  - Consequence: 需断网/弱网/低存储/低电量/跨进程恢复与真实户外测试，在线 happy path 不能证明完成。
<!-- ty-source-item:end -->

<a id="field-offline-safety.risk.offline-data-migration"></a>
<!-- ty-source-item:start key=risk-field-offline-safety-offline-data-migration kind=risk_fact fact=data_migration outcome=field-offline-safety -->
- **RISK offline-data-migration**
  - Fact: data_migration
  - Affected Outcome: field-offline-safety
  - Basis: SQLite schema、manifest 和离线包会跨 APP/runtime/数据版本长期存在。
  - Consequence: 升级必须迁移或安全重下、保留待同步写入，并证明失败可回滚而不删除用户草稿。
<!-- ty-source-item:end -->

<a id="outcome.community-contribution"></a>

### OUT community-contribution：地点贡献、实况、评价与纠错

#### Observable Result

<!-- ty-source-item:start key=result-community-contribution kind=outcome_result -->
用户可围绕观星地点/行程提交新地点、结构化长期事实、限时现场实况、图片、多维评价和纠错；提交可离线暂存、经过归属/隐私/审核后显示明确状态，长期事实与当晚临时状态不会互相覆盖，争议和确认数量可见；MVP 保持轻社区，不扩展为通用信息流或私信网络。
<!-- ty-source-item:end -->

#### Product Requirements

<a id="community-contribution.requirement.new-spot-submission"></a>
<!-- ty-source-item:start key=req-community-contribution-new-spot-submission kind=requirement -->
- **REQ new-spot-submission** [direct: S-PRODUCT 场景/6.11A]：新地点提交包含地图选点/经纬度、名称、实景图、拍摄日期/时间/镜头方向、地点描述、可观测/适合拍摄方向、交通方式、驾车与徒步路线、停车/搬运、主观实际光污染和观测体验、四周遮挡、厕所/平台/露营等设施及安全提示；坐标精度、来源、公开级别和是否私人/敏感土地必须显式确认。
<!-- ty-source-item:end -->

<a id="community-contribution.requirement.field-report-submission"></a>
<!-- ty-source-item:start key=req-community-contribution-field-report-submission kind=requirement -->
- **REQ field-report-submission** [direct: S-PRODUCT 6.11B]：实况包含当前云量、银河可见、实际能见度、风、雾、现场人数、临时灯光、道路状态、现场图片和到达时间；单位/枚举/unknown 明确，自动位置/时间可由用户核对。
<!-- ty-source-item:end -->

<a id="community-contribution.requirement.long-term-vs-transient"></a>
<!-- ty-source-item:start key=req-community-contribution-long-term-vs-transient kind=requirement -->
- **REQ long-term-vs-transient** [direct: S-PRODUCT 6.11B, S-ARCH 5.12]：厕所、停车容量、直达、常规光源、永久遮挡等长期事实与云量/能见度/雾/人数/临时道路/厕所关闭/临时照明/银河可见等实况分离；临时实况必须有 TTL，不能永久覆盖长期事实。
<!-- ty-source-item:end -->

<a id="community-contribution.requirement.correction-categories"></a>
<!-- ty-source-item:start key=req-community-contribution-correction-categories kind=requirement -->
- **REQ correction-categories** [direct: S-PRODUCT 6.11C]：纠错支持地点不存在、坐标错误、道路无法通行、已关闭、图片不属该地、设施过期和安全风险，并允许证据、位置/时间、紧急程度和联系偏好；安全类优先进入运营处置。
<!-- ty-source-item:end -->

<a id="community-contribution.requirement.contribution-trust-display"></a>
<!-- ty-source-item:start key=req-community-contribution-contribution-trust-display kind=requirement -->
- **REQ contribution-trust-display** [direct: S-PRODUCT 6.11D]：每条地点数据展示上传者（按隐私可匿名）、更新时间、验证状态、确认用户数、最近有效实况和争议；用户能查看自己的草稿、排队、处理中、待审核、已发布、驳回/需补充与撤回状态。
<!-- ty-source-item:end -->

<a id="community-contribution.requirement.light-community-scope"></a>
<!-- ty-source-item:start key=req-community-contribution-light-community-scope kind=requirement -->
- **REQ light-community-scope** [direct: S-PRODUCT 6.11E]：MVP 社区仅评论、多维评分、图片、实况、纠错和行程分享；不建设通用信息流、关注/粉丝、私信或与观星决策无关动态，且不得以参考图扩展此范围。
<!-- ty-source-item:end -->

<a id="community-contribution.requirement.media-upload-privacy"></a>
<!-- ty-source-item:start key=req-community-contribution-media-upload-privacy kind=requirement -->
- **REQ media-upload-privacy** [direct: S-ARCH 12, 15]：上传前说明公开范围并预览/移除 GPS、设备序列和隐私 EXIF；拍摄时间/方向/参数由用户作为结构化字段确认，原始 EXIF 仅可在明确授权后内部留作审核证据。
<!-- ty-source-item:end -->

<a id="community-contribution.requirement.contribution-moderation"></a>
<!-- ty-source-item:start key=req-community-contribution-contribution-moderation kind=requirement -->
- **REQ contribution-moderation** [direct: S-ARCH 5.15]：新地点、媒体、实况、评论/评分和纠错具有自动扫描、重复/归属检查、人工审核、举报、申诉/补充和审计路径；具体自动发布、贡献等级与确认阈值由 DEC moderation-trust-policy 决定。
<!-- ty-source-item:end -->

#### User Flow And States

- 新地点：地图选点 → 检查附近重复/坐标策略 → 分步填写事实/媒体/交通设施安全 → 隐私预览 → 提交/离线排队 → 自动/人工审核 → 发布或补充。
- 现场实况：从地点/现场打开 → 自动预填地点/到达时间 → 快速填写临时条件/图片 → 选择有效期/确认 → 提交；过期后保留历史证据但不参与当前状态。
- 评价：观测后选择多维度、短评/图片 → 预览 → 发布；缺少亲历条件时不伪装已到访，具体资格由 DEC moderation-trust-policy 决定。
- 纠错：选择类别 → 提供现状/证据 → 安全风险立即提示不要继续前往 → 提交 → 跟踪处置/争议。

#### Controls And Product Feedback

<a id="community-contribution.control.new-spot-wizard"></a>
- **CTRL new-spot-wizard**
  - Source class: direct fields；step flow derived。
<!-- ty-source-item:start key=ctrl-community-contribution-new-spot-wizard-location kind=control -->
  - Location: 地图空状态/新增、地点贡献入口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-community-contribution-new-spot-wizard-user-task kind=requirement -->
  - User task: 提交可核验的新观星点。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-new-spot-wizard-trigger kind=control -->
  - Trigger: 点击“上传新地点”或在地图长按选点。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-new-spot-wizard-input kind=control -->
  - Input: REQ new-spot-submission 全部字段、坐标精度/访问级别和重复候选。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-new-spot-wizard-loading kind=control -->
  - Loading: 重复检查/逆地理/上传独立进度，草稿自动本地保存。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-new-spot-wizard-empty kind=control -->
  - Empty: 可选事实为 unknown；必需证据缺失时解释原因，不自动填公开 POI 事实。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-new-spot-wizard-success kind=control -->
  - Success: 显示提交 ID、审核状态、公开投影和可继续补充内容。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-new-spot-wizard-failure kind=control -->
  - Failure: 保留草稿/媒体队列，字段错误就地修正，可导出或重试。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-new-spot-wizard-feedback kind=control -->
  - Feedback: 步骤进度、来源/事实与主观感受区别、精确坐标风险和发布范围可见。
<!-- ty-source-item:end -->

<a id="community-contribution.control.field-report-form"></a>
- **CTRL field-report-form**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-community-contribution-field-report-form-location kind=control -->
  - Location: 现场模式和地点详情“上传实况”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-community-contribution-field-report-form-user-task kind=requirement -->
  - User task: 快速报告当晚临时条件。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-field-report-form-trigger kind=control -->
  - Trigger: 点击上传实况或现场结束提醒。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-field-report-form-input kind=control -->
  - Input: REQ field-report-submission 全部字段、地点/时间/位置精度、TTL 和媒体。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-field-report-form-loading kind=control -->
  - Loading: 本地保存立即完成，媒体/提交可后台排队。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-field-report-form-empty kind=control -->
  - Empty: 未观察项目可标 unknown/跳过，不强迫猜测。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-field-report-form-success kind=control -->
  - Success: 显示有效起止、待审核/已发布和地点当前状态影响。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-field-report-form-failure kind=control -->
  - Failure: 草稿保留，离线排队；过期前未同步时提示是否仍有意义。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-field-report-form-feedback kind=control -->
  - Feedback: “临时、何时失效”常驻；危险道路/封闭字段触发更高优先级说明。
<!-- ty-source-item:end -->

<a id="community-contribution.control.multidimensional-review-form"></a>
- **CTRL multidimensional-review-form**
  - Source class: direct from S-PRODUCT 6.5I/6.11E。
<!-- ty-source-item:start key=ctrl-community-contribution-multidimensional-review-form-location kind=control -->
  - Location: 地点详情“评价”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-community-contribution-multidimensional-review-form-user-task kind=requirement -->
  - User task: 以多维评分、短评和媒体记录亲历体验。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-multidimensional-review-form-trigger kind=control -->
  - Trigger: 点击评价或行程结束提醒。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-multidimensional-review-form-input kind=control -->
  - Input: 暗度、开阔、实际云量、交通、设施、安全、拥挤、信号、摄影/目视适配、时间和短评/图片。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-multidimensional-review-form-loading kind=control -->
  - Loading: 草稿保持，媒体单独上传。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-multidimensional-review-form-empty kind=control -->
  - Empty: 未体验维度可跳过，不用中值代填。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-multidimensional-review-form-success kind=control -->
  - Success: 已填维度、时间、到访/验证状态和审核状态可见。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-multidimensional-review-form-failure kind=control -->
  - Failure: 文本/评分保留并可重试；违规字段说明可修改/申诉。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-multidimensional-review-form-feedback kind=control -->
  - Feedback: 不生成强制总分；临时天气评价与长期地点评价语义分开。
<!-- ty-source-item:end -->

<a id="community-contribution.control.correction-report"></a>
- **CTRL correction-report**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-community-contribution-correction-report-location kind=control -->
  - Location: 地点详情/媒体/事实行的“纠错”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-community-contribution-correction-report-user-task kind=requirement -->
  - User task: 报告具体错误或安全风险并提供证据。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-correction-report-trigger kind=control -->
  - Trigger: 点击纠错，预选当前事实/媒体。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-correction-report-input kind=control -->
  - Input: 七类问题、现值、建议值/位置、证据、时间、紧急程度和联系方式。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-correction-report-loading kind=control -->
  - Loading: 提交时保留页面和草稿。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-correction-report-empty kind=control -->
  - Empty: 无媒体仍可提交安全/关闭事实，但说明核验可能需要补充。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-correction-report-success kind=control -->
  - Success: 生成工单和预计状态；高风险立即在前端显示临时警示（按规则）。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-correction-report-failure kind=control -->
  - Failure: 保留草稿并提供重试/其他求助，不声称风险已处理。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-correction-report-feedback kind=control -->
  - Feedback: 用户能跟踪待审、补充、采纳、驳回/争议和理由。
<!-- ty-source-item:end -->

<a id="community-contribution.control.media-privacy-review"></a>
- **CTRL media-privacy-review**
  - Source class: direct media/privacy。
<!-- ty-source-item:start key=ctrl-community-contribution-media-privacy-review-location kind=control -->
  - Location: 任一媒体提交的发布前步骤。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-community-contribution-media-privacy-review-user-task kind=requirement -->
  - User task: 查看将公开的图像和结构化拍摄信息并去除敏感数据。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-media-privacy-review-trigger kind=control -->
  - Trigger: 选择媒体后、最终提交前。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-media-privacy-review-input kind=control -->
  - Input: 预览、检测到的 EXIF/GPS/序列、用户确认的时间/方向/参数、公开范围。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-media-privacy-review-loading kind=control -->
  - Loading: 本地解析/服务处理状态可见，不锁其他表单。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-media-privacy-review-empty kind=control -->
  - Empty: 无 EXIF 时说明未检测，不自动推断。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-media-privacy-review-success kind=control -->
  - Success: 公开投影不含敏感元数据，用户选择的结构化字段清楚列出。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-media-privacy-review-failure kind=control -->
  - Failure: 阻止公开原图并允许移除媒体/稍后处理。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-media-privacy-review-feedback kind=control -->
  - Feedback: 原始文件是否内部保留、用于什么审核、如何撤回/删除明确。
<!-- ty-source-item:end -->

<a id="community-contribution.control.contribution-status-center"></a>
- **CTRL contribution-status-center**
  - Source class: direct status/trust；center derived。
<!-- ty-source-item:start key=ctrl-community-contribution-contribution-status-center-location kind=control -->
  - Location: “我的 → 我的贡献/同步”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-community-contribution-contribution-status-center-user-task kind=requirement -->
  - User task: 查看草稿、同步、审核、争议、补充和发布结果。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-contribution-status-center-trigger kind=control -->
  - Trigger: 打开中心或点击提交状态通知。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-contribution-status-center-input kind=control -->
  - Input: 全部贡献类型、队列/审核/举报/申诉状态和操作日志摘要。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-contribution-status-center-loading kind=control -->
  - Loading: 本地草稿立即显示，服务状态增量合并。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-contribution-status-center-empty kind=control -->
  - Empty: 显示尚无贡献并链接到地图/现场，不制造活动。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-contribution-status-center-success kind=control -->
  - Success: 每项状态、公开版本、确认数、争议和可用动作明确。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-contribution-status-center-failure kind=control -->
  - Failure: 保留最后状态/时间并允许刷新或联系支持。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-community-contribution-contribution-status-center-feedback kind=control -->
  - Feedback: 驳回/需补充有具体原因；撤回与删除的公开/历史影响预先说明。
<!-- ty-source-item:end -->

#### Technical Obligations And Boundaries

<a id="community-contribution.obligation.immutable-contribution-evidence"></a>
<!-- ty-source-item:start key=obl-community-contribution-immutable-contribution-evidence kind=technical_obligation -->
- **OBL immutable-contribution-evidence** [direct: S-ARCH 7.1, 5.12]：贡献保存来源、原始值、用户、时间/位置精度、审核、置信度和版本；采纳生成新地点版本，不覆盖原始证据；临时实况由 expiresAt 从当前聚合退出。
<!-- ty-source-item:end -->

<a id="community-contribution.obligation.moderated-media-pipeline"></a>
<!-- ty-source-item:start key=obl-community-contribution-moderated-media-pipeline kind=technical_obligation -->
- **OBL moderated-media-pipeline** [direct: S-ARCH 12]：客户端使用短期凭证直传对象存储，服务确认后异步处理/扫描/EXIF 清理/缩略/归属/审核；客户端只在发布状态返回后展示为公开，上传成功不等同审核通过。
<!-- ty-source-item:end -->

<a id="community-contribution.non-completing.unscoped-social-feed"></a>
<!-- ty-source-item:start key=ncomp-community-contribution-unscoped-social-feed kind=non_completing -->
- **NCOMP unscoped-social-feed** [direct: S-PRODUCT 6.11E]：优先建设通用信息流、粉丝或私信而未完成地点事实/实况/纠错闭环，不能算社区 Outcome 完成。
<!-- ty-source-item:end -->

#### Implementation Hints

- **HINT duplicate-spot-review**：新点提交前以空间距离、名称/地址/图片相似度生成重复候选，但不自动合并；管理员可审阅来源差异。
- **HINT ttl-by-fact-type**：不同临时事实可有不同默认 TTL，值由 DEC moderation-trust-policy 决定，客户端始终展示实际 expiresAt。

#### Acceptance Scenarios

<a id="community-contribution.acceptance.new-spot-privacy"></a>
<!-- ty-source-item:start key=ac-community-contribution-new-spot-privacy kind=acceptance -->
- **AC new-spot-privacy**
  - Accepts: REQ new-spot-submission, CTRL new-spot-wizard
  - Given: 用户选择一个可能属于私人土地的精确位置并上传实景。
  - When: 完成新地点提交。
  - Then: 重复/土地与公开级别提示出现，精确坐标不会默认公开，草稿/审核 ID 和字段来源完整。
<!-- ty-source-item:end -->

<a id="community-contribution.acceptance.transient-report-expiry"></a>
<!-- ty-source-item:start key=ac-community-contribution-transient-report-expiry kind=acceptance -->
- **AC transient-report-expiry**
  - Accepts: REQ field-report-submission, REQ long-term-vs-transient, CTRL field-report-form, OBL immutable-contribution-evidence
  - Given: 用户报告“今晚厕所关闭、起雾、看到银河”，长期事实是通常有厕所。
  - When: 实况发布并超过有效期。
  - Then: 有效期内临时状态影响当前展示，过期后退出当前聚合但历史证据保留且未改写长期厕所事实。
<!-- ty-source-item:end -->

<a id="community-contribution.acceptance.multidimensional-review"></a>
<!-- ty-source-item:start key=ac-community-contribution-multidimensional-review kind=acceptance -->
- **AC multidimensional-review**
  - Accepts: REQ light-community-scope, CTRL multidimensional-review-form, NCOMP unscoped-social-feed
  - Given: 用户只体验了天空、交通和摄影三维度。
  - When: 发布评价。
  - Then: 未体验维度保持空，已填维度/时间/验证状态可见，产品未要求关注、发动态或进入通用信息流。
<!-- ty-source-item:end -->

<a id="community-contribution.acceptance.safety-correction"></a>
<!-- ty-source-item:start key=ac-community-contribution-safety-correction kind=acceptance -->
- **AC safety-correction**
  - Accepts: REQ correction-categories, CTRL correction-report
  - Given: 用户报告道路已封且地点存在安全风险。
  - When: 提交含现场时间和证据的纠错。
  - Then: 系统生成高优先级工单、说明未完成核验，并按规则在地点/导航前显示临时风险而不声称已永久关闭。
<!-- ty-source-item:end -->

<a id="community-contribution.acceptance.media-sanitization"></a>
<!-- ty-source-item:start key=ac-community-contribution-media-sanitization kind=acceptance -->
- **AC media-sanitization**
  - Accepts: REQ media-upload-privacy, CTRL media-privacy-review, OBL moderated-media-pipeline
  - Given: 图片包含精确 GPS 和设备序列而用户仅确认拍摄方向/时间。
  - When: 媒体完成处理和审核。
  - Then: 公开版本移除敏感 EXIF，只显示确认的结构化字段；处理失败不会把原图公开。
<!-- ty-source-item:end -->

<a id="community-contribution.acceptance.trust-and-moderation-status"></a>
<!-- ty-source-item:start key=ac-community-contribution-trust-and-moderation-status kind=acceptance -->
- **AC trust-and-moderation-status**
  - Accepts: REQ contribution-trust-display, REQ contribution-moderation, CTRL contribution-status-center
  - Given: 一条贡献被两人确认、另一人争议并要求补充。
  - When: 上传者和普通用户分别查看。
  - Then: 上传者看到审核/补充动作，普通用户看到允许公开的上传者、时间、验证、确认数、最新实况和争议，不把争议内容显示为确定事实。
<!-- ty-source-item:end -->

#### Risks And Recovery

<a id="community-contribution.risk.community-persistence"></a>
<!-- ty-source-item:start key=risk-community-contribution-community-persistence kind=risk_fact fact=persistent_data_change outcome=community-contribution -->
- **RISK community-persistence**
  - Fact: persistent_data_change
  - Affected Outcome: community-contribution
  - Basis: 地点、评价、媒体、实况、纠错、审核和争议形成长期版本与公共内容。
  - Consequence: 需定义草稿/发布/撤回/删除/申诉/历史保留和外键迁移，不允许审核时覆盖原始证据。
<!-- ty-source-item:end -->

<a id="community-contribution.risk.publication-effect"></a>
<!-- ty-source-item:start key=risk-community-contribution-publication-effect kind=risk_fact fact=irreversible_external_effect outcome=community-contribution -->
- **RISK publication-effect**
  - Fact: irreversible_external_effect
  - Affected Outcome: community-contribution
  - Basis: 公开地点、坐标、图片或安全评论可能被复制传播，撤回无法保证外部删除。
  - Consequence: 发布前必须预览范围/精度/隐私和永久性，敏感地点默认保守并有审核/下线路径。
<!-- ty-source-item:end -->

<a id="community-contribution.risk.moderation-security"></a>
<!-- ty-source-item:start key=risk-community-contribution-moderation-security kind=risk_fact fact=security_boundary_change outcome=community-contribution -->
- **RISK moderation-security**
  - Fact: security_boundary_change
  - Affected Outcome: community-contribution
  - Basis: 用户上传、举报、审核证据和原始 EXIF 跨越公众、贡献者、审核员和管理员权限。
  - Consequence: 服务端对象/字段授权、短期上传凭证、扫描、审计和最小化原始证据访问必须验证。
<!-- ty-source-item:end -->

<a id="outcome.notifications-and-toolbox"></a>

### OUT notifications-and-toolbox：条件通知与专业天象工具

#### Observable Result

<!-- ty-source-item:start key=result-notifications-and-toolbox kind=outcome_result -->
用户可按地点/区域、目标和阈值订阅出发前、行程中及长期观星事件，控制时段/通道/冷却并从通知深链回到同一地点、时间、行程或备选决策；后续版本可在独立工具箱查询天象日历、空间站、天体位置、摄影计算器和专业内容，所有结果显示位置/时间/数据或算法版本，而不会把工具堆到新手首页。
<!-- ty-source-item:end -->

#### Product Requirements

<a id="notifications-and-toolbox.requirement.pretrip-notifications"></a>
<!-- ty-source-item:start key=req-notifications-and-toolbox-pretrip-notifications kind=requirement -->
- **REQ pretrip-notifications** [direct: S-PRODUCT 九]：出发前通知覆盖今晚条件达到用户阈值、最佳窗口即将开始、收藏地点天气转好、月落、银河升起和特殊天象将发生。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.requirement.intrip-notifications"></a>
<!-- ty-source-item:start key=req-notifications-and-toolbox-intrip-notifications kind=requirement -->
- **REQ intrip-notifications** [direct: S-PRODUCT 九]：行程中通知覆盖云层快速增加、降雨风险上升、风速超过设备安全范围、主地点道路异常、建议切换备选、预计到达晚于最佳窗口，并引用受影响行程 revision/地点/窗口。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.requirement.long-term-notifications"></a>
<!-- ty-source-item:start key=req-notifications-and-toolbox-long-term-notifications kind=requirement -->
- **REQ long-term-notifications** [direct: S-PRODUCT 九]：长期通知覆盖周末附近优良窗口、新月前后、流星雨/日月食/行星观测、收藏地点新增实况或信息变更。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.requirement.notification-control"></a>
<!-- ty-source-item:start key=req-notifications-and-toolbox-notification-control kind=requirement -->
- **REQ notification-control** [direct: S-PRODUCT 九, 6.13]：每条订阅可设地点/网格、目标、条件阈值、提前量、免打扰时段、通道和启用状态；提供总开关、类别开关、频率/冷却、历史与单条退订，默认值由 DEC notification-defaults-cooldowns 决定。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.requirement.notification-explainability"></a>
<!-- ty-source-item:start key=req-notifications-and-toolbox-notification-explainability kind=requirement -->
- **REQ notification-explainability** [derived from recommendation principles]：通知正文说明“什么变化、何地何时、达到哪个阈值、建议什么”，附来源/生成时间和深链；过期、条件已反转或目标不可访问时打开降级摘要，不进入错误页面。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.requirement.event-driven-evaluation"></a>
<!-- ty-source-item:start key=req-notifications-and-toolbox-event-driven-evaluation kind=requirement -->
- **REQ event-driven-evaluation** [direct: S-ARCH 5.14]：新天气模型/道路/地点状态到达后，定位受影响网格/订阅，批量评估、去重和冷却；禁止为每个用户独立定时拉取；通道经 APNs、FCM、国内安卓厂商和本地通知适配器发送。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.requirement.celestial-calendar"></a>
<!-- ty-source-item:start key=req-notifications-and-toolbox-celestial-calendar kind=requirement -->
- **REQ celestial-calendar** [direct: S-PRODUCT 6.12, V3]：天象日历覆盖月相、日食/月食、流星雨、行星合月等事件、彗星、极光和重要提醒，按用户地点/时区显示可见性，而非只列全球事件标题。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.requirement.station-transits"></a>
<!-- ty-source-item:start key=req-notifications-and-toolbox-station-transits kind=requirement -->
- **REQ station-transits** [direct: S-PRODUCT 6.12, V3]：空间站工具覆盖中国空间站/国际空间站未来若干日可见过境、开始/最高/结束时间、方位/高度、亮度、路径和凌日/凌月预报，并显示轨道 epoch/更新/可信度。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.requirement.object-position-tools"></a>
<!-- ty-source-item:start key=req-notifications-and-toolbox-object-position-tools kind=requirement -->
- **REQ object-position-tools** [direct: S-PRODUCT 6.12]：天体位置覆盖日月升落、银河中心升落/中天、金火木土等行星、主要恒星升起/中天/落下、方位/高度/亮度及指定时间天空地图，并复用 Astronomy 领域语义。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.requirement.photography-tools"></a>
<!-- ty-source-item:start key=req-notifications-and-toolbox-photography-tools kind=requirement -->
- **REQ photography-tools** [direct: S-PRODUCT 6.12, V3]：摄影工具覆盖防脱焦、景深、反向景深、实时极轴镜模拟、最佳摄影时刻和镜头视场；输入单位、公式/规则版本、设备假设和输出限制可见。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.requirement.other-astronomy-tools"></a>
<!-- ty-source-item:start key=req-notifications-and-toolbox-other-astronomy-tools kind=requirement -->
- **REQ other-astronomy-tools** [direct: S-PRODUCT 6.12, V3]：其他工具覆盖 3D 星图、极光地图、流星雨流量监测/可见数量估算、日食/月食模拟和近期彗星可见性，明确实验性、地区覆盖与数据源。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.requirement.educational-content"></a>
<!-- ty-source-item:start key=req-notifications-and-toolbox-educational-content kind=requirement -->
- **REQ educational-content** [direct: S-PRODUCT 6.12, low priority]：内容区可含 NASA APOD、天文机构图片、天象解释、新手指南和当月目标；版权/许可/来源/发布日期清晰，内容用于教育留存但不得占据“今晚”主决策位。
<!-- ty-source-item:end -->

#### User Flow And States

- 订阅：在地点/天象/行程点击提醒 → 选目标/阈值/提前量/时段/通道 → 系统权限说明 → 保存 → 预览下一可能触发和冷却。
- 触发：新数据到达 → 网格/行程影响计算 → 阈值从不满足到满足或风险恶化 → 去重/冷却/免打扰 → 通道发送 → 记录原因和结果。
- 打开：点击通知 → 验证登录/坐标权限/数据新鲜度 → 深链对应今晚/地点/行程/天象；条件已变时显示原触发原因和最新状态。
- 工具箱：按天象、空间站、天体、摄影、其他、内容分类进入 → 选择位置/时间/参数 → 查看结果/解释 → 保存到提醒、天空或行程。

#### Controls And Product Feedback

<a id="notifications-and-toolbox.control.notification-rule-editor"></a>
- **CTRL notification-rule-editor**
  - Source class: direct controls；editor derived。
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-rule-editor-location kind=control -->
  - Location: 地点/行程/天象“提醒我”及“我的 → 通知设置”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-notifications-and-toolbox-notification-rule-editor-user-task kind=requirement -->
  - User task: 创建/编辑地点、目标和阈值通知。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-rule-editor-trigger kind=control -->
  - Trigger: 点击提醒、新建规则或编辑现有规则。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-rule-editor-input kind=control -->
  - Input: 类别、地点/网格/行程、目标、阈值、提前量、免打扰、通道、有效期。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-rule-editor-loading kind=control -->
  - Loading: 保存期间输入保持且防重复。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-rule-editor-empty kind=control -->
  - Empty: 无位置/目标时要求选择；未授权推送仍可保存本地提醒或 disabled 原因。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-rule-editor-success kind=control -->
  - Success: 显示规则摘要、下一评估条件、冷却和权限状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-rule-editor-failure kind=control -->
  - Failure: 草稿保留，可只保存本地/稍后授权或重试服务端。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-rule-editor-feedback kind=control -->
  - Feedback: 阈值单位、触发方向、频率、可能无触发和测试预览明确。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.control.notification-settings-center"></a>
- **CTRL notification-settings-center**
  - Source class: direct profile capability。
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-settings-center-location kind=control -->
  - Location: “我的 → 通知”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-notifications-and-toolbox-notification-settings-center-user-task kind=requirement -->
  - User task: 管理总开关、类别、规则、通道、免打扰和历史。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-settings-center-trigger kind=control -->
  - Trigger: 打开设置、搜索规则、批量启停/删除。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-settings-center-input kind=control -->
  - Input: 系统权限、通道令牌、订阅列表、发送历史和冷却状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-settings-center-loading kind=control -->
  - Loading: 缓存设置先显示，服务状态增量同步。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-settings-center-empty kind=control -->
  - Empty: 无订阅时解释可从地点/天象创建；系统权限关闭时显示设置入口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-settings-center-success kind=control -->
  - Success: 用户看到每条规则状态、上次评估/发送和下一可触发时间。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-settings-center-failure kind=control -->
  - Failure: 本地状态与服务状态冲突时标注并允许重试，不谎称退订成功。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-settings-center-feedback kind=control -->
  - Feedback: 批量删除/总关闭前说明本地/远端影响；单条静音可恢复。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.control.notification-message-deeplink"></a>
- **CTRL notification-message-deeplink**
  - Source class: direct notification content；deep-link behavior derived。
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-message-deeplink-location kind=control -->
  - Location: 系统通知及 APP 内通知中心。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-notifications-and-toolbox-notification-message-deeplink-user-task kind=requirement -->
  - User task: 理解变化并采取查看、换点、调整行程或忽略动作。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-message-deeplink-trigger kind=control -->
  - Trigger: 收到/点击/展开通知。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-message-deeplink-input kind=control -->
  - Input: 触发类型、地点/行程、旧新值、阈值、时间、数据版本和允许动作。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-message-deeplink-loading kind=control -->
  - Loading: 打开后先显示通知快照，再刷新最新状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-message-deeplink-empty kind=control -->
  - Empty: 目标已删除/无权时显示受限摘要和返回路径。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-message-deeplink-success kind=control -->
  - Success: 文案含变化/时空/阈值/行动，深链到同一对象且可见最新差异。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-message-deeplink-failure kind=control -->
  - Failure: 无效深链回到对应一级页并保留通知详情/重试。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-notification-message-deeplink-feedback kind=control -->
  - Feedback: 原触发时间与当前状态分开，不把过期通知当当前事实。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.control.toolbox-index"></a>
- **CTRL toolbox-index**
  - Source class: direct categories；layout derived。
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-toolbox-index-location kind=control -->
  - Location: “天空”内的专业工具箱入口，不替代五个一级导航。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-notifications-and-toolbox-toolbox-index-user-task kind=requirement -->
  - User task: 按类别找到天象、空间站、天体位置、摄影或其他工具/内容。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-toolbox-index-trigger kind=control -->
  - Trigger: 搜索或选择分类/工具。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-toolbox-index-input kind=control -->
  - Input: 工具目录、版本/设备/地区可用性、收藏和数据状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-toolbox-index-loading kind=control -->
  - Loading: 分类结构稳定，工具状态渐进加载。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-toolbox-index-empty kind=control -->
  - Empty: 当前版本无该类工具时显示路线图而非可点击空壳；内容为空不挤占工具。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-toolbox-index-success kind=control -->
  - Success: 每项说明用途、必要输入和版本，进入对应工具。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-toolbox-index-failure kind=control -->
  - Failure: 目录缓存可用，单工具服务不可用有状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-toolbox-index-feedback kind=control -->
  - Feedback: V3、实验性、需联网/定位/设备和许可边界在入口前可见。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.control.celestial-event-detail"></a>
- **CTRL celestial-event-detail**
  - Source class: direct event/station/object fields；combined pattern derived。
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-celestial-event-detail-location kind=control -->
  - Location: 日历、空间站或天体搜索结果详情。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-notifications-and-toolbox-celestial-event-detail-user-task kind=requirement -->
  - User task: 判断事件在当前地点何时何方向可见并设置提醒/打开天空。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-celestial-event-detail-trigger kind=control -->
  - Trigger: 点击事件/过境/天体。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-celestial-event-detail-input kind=control -->
  - Input: 地点、时区、开始/峰值/结束、方位/高度/亮度/可见性、轨迹、数据版本。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-celestial-event-detail-loading kind=control -->
  - Loading: 身份/全局事件先显示，本地可见性独立计算。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-celestial-event-detail-empty kind=control -->
  - Empty: 本地不可见时说明最近可见地点/日期，不伪造路径。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-celestial-event-detail-success kind=control -->
  - Success: 时间、方向、条件、可信度与“提醒/天空/加入行程”动作一致。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-celestial-event-detail-failure kind=control -->
  - Failure: 保留事件来源和最后结果，标过期/轨道失败并可刷新。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-celestial-event-detail-feedback kind=control -->
  - Feedback: 当地时间与 UTC、轨道 epoch、算法版本和实验性标签可展开。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.control.astronomy-calculator-form"></a>
- **CTRL astronomy-calculator-form**
  - Source class: direct photography tools；form pattern derived。
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-astronomy-calculator-form-location kind=control -->
  - Location: 选定摄影计算工具页面。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-notifications-and-toolbox-astronomy-calculator-form-user-task kind=requirement -->
  - User task: 输入镜头/传感器/距离等参数并获取可重算结果。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-astronomy-calculator-form-trigger kind=control -->
  - Trigger: 选择工具、修改字段或套用设备档案。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-astronomy-calculator-form-input kind=control -->
  - Input: 每个工具明确的带单位字段、公式/规则版本和设备能力。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-astronomy-calculator-form-loading kind=control -->
  - Loading: 本地公式即时；需数据源部分显示局部状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-astronomy-calculator-form-empty kind=control -->
  - Empty: 必需字段未填时给示例范围，不预填危险默认。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-astronomy-calculator-form-success kind=control -->
  - Success: 输出值、单位、公式假设、有效范围和相关天空/摄影动作可见。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-astronomy-calculator-form-failure kind=control -->
  - Failure: 字段级校验，不用 NaN/0 伪装结果；旧结果标 stale。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-notifications-and-toolbox-astronomy-calculator-form-feedback kind=control -->
  - Feedback: 输入变化即时说明结果受影响，复制/保存带版本与参数摘要。
<!-- ty-source-item:end -->

#### Technical Obligations And Boundaries

<a id="notifications-and-toolbox.obligation.notification-evaluation-pipeline"></a>
<!-- ty-source-item:start key=obl-notifications-and-toolbox-notification-evaluation-pipeline kind=technical_obligation -->
- **OBL notification-evaluation-pipeline** [direct: S-ARCH 5.14]：订阅按地理网格/目标/阈值索引，新 ProviderRun 或状态事件触发批量评估；事件/规则/数据版本组成幂等业务键，去重、冷却、免打扰和发送结果可审计/重放。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.obligation.push-channel-adapters"></a>
<!-- ty-source-item:start key=obl-notifications-and-toolbox-push-channel-adapters kind=technical_obligation -->
- **OBL push-channel-adapters** [direct + external research: S-ARCH 5.14, S-RESEARCH]：本地通知、APNs、FCM、国内安卓厂商和可替换 Expo Push 实现统一通道状态，管理令牌轮换/失效、平台/发行渠道优先级、回执（若有）、429/5xx 退避、永久错误停发、幂等事件和无推送降级；Expo Push 仅作非关键早期通道（当前 600 通知/秒/项目、无 SLA、receipt 不证明设备收到），关键天气/路线/安全状态在打开 APP 时重验，任何通道均不得被描述为救援或保证送达。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.non-completing.user-polling-cron"></a>
<!-- ty-source-item:start key=ncomp-notifications-and-toolbox-user-polling-cron kind=non_completing -->
- **NCOMP user-polling-cron** [direct: S-ARCH 5.14]：为每个用户独立定时查询天气/事件、没有网格批处理/去重/冷却，不能算通知系统完成。
<!-- ty-source-item:end -->

#### Implementation Hints

- **HINT notification-transition-trigger**：优先在阈值状态发生边沿变化时触发，并在内容中保存旧值/新值/原因；避免每次模型运行重复通知同一状态。
- **HINT toolbox-domain-reuse**：工具箱复用 Astronomy/Shooting/Orientation 的领域结果，不另写一套时区、坐标或事件公式。

#### Acceptance Scenarios

<a id="notifications-and-toolbox.acceptance.pretrip-rule"></a>
<!-- ty-source-item:start key=ac-notifications-and-toolbox-pretrip-rule kind=acceptance -->
- **AC pretrip-rule**
  - Accepts: REQ pretrip-notifications, REQ notification-control, CTRL notification-rule-editor
  - Given: 用户为收藏地点设置“评分达到阈值且银河窗口前 90 分钟”并配置免打扰。
  - When: 新模型使条件首次从不满足变为满足。
  - Then: 规则摘要/单位/冷却生效，只在允许时段触发一次且通知说明地点、窗口、阈值和行动。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.acceptance.intrip-risk-deeplink"></a>
<!-- ty-source-item:start key=ac-notifications-and-toolbox-intrip-risk-deeplink kind=acceptance -->
- **AC intrip-risk-deeplink**
  - Accepts: REQ intrip-notifications, REQ notification-explainability, CTRL notification-message-deeplink
  - Given: 行程中云量和道路状态恶化并推荐备选。
  - When: 用户点击通知。
  - Then: 先看到触发快照/时间再看最新状态，深链对应行程 revision 与备选比较，条件反转时不继续呈现旧结论为当前。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.acceptance.long-term-controls"></a>
<!-- ty-source-item:start key=ac-notifications-and-toolbox-long-term-controls kind=acceptance -->
- **AC long-term-controls**
  - Accepts: REQ long-term-notifications, CTRL notification-settings-center
  - Given: 用户订阅新月、流星雨和收藏地点实况但关闭长期类别。
  - When: 相关事件到达并查看通知中心。
  - Then: 不发送被关闭类别，规则/上次评估/系统权限状态可见且用户可单条恢复。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.acceptance.batch-dedup"></a>
<!-- ty-source-item:start key=ac-notifications-and-toolbox-batch-dedup kind=acceptance -->
- **AC batch-dedup**
  - Accepts: REQ event-driven-evaluation, OBL notification-evaluation-pipeline, OBL push-channel-adapters, NCOMP user-polling-cron
  - Given: 一个 ProviderRun 影响大量网格用户且相同事件被重试。
  - When: 后台批量评估和发送。
  - Then: 受影响订阅按幂等键只产生允许的通知，去重/冷却/通道结果可审计且不存在逐用户轮询任务。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.acceptance.calendar-and-station"></a>
<!-- ty-source-item:start key=ac-notifications-and-toolbox-calendar-and-station kind=acceptance -->
- **AC calendar-and-station**
  - Accepts: REQ celestial-calendar, REQ station-transits, CTRL celestial-event-detail
  - Given: V3 用户选择本地不可见的日食和可见的空间站过境。
  - When: 分别查看事件详情。
  - Then: 日食明确本地不可见，过境显示开始/最高/结束、方位/高度/亮度/路径和轨道 epoch，两者均可正确设提醒/开天空。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.acceptance.position-tools"></a>
<!-- ty-source-item:start key=ac-notifications-and-toolbox-position-tools kind=acceptance -->
- **AC position-tools**
  - Accepts: REQ object-position-tools, CTRL celestial-event-detail
  - Given: 用户查询木星和银河中心在指定当地夜晚的位置。
  - When: 打开位置详情和天空地图。
  - Then: 升起/中天/落下、方位/高度/亮度与所选地点/时区一致，并复用同一 Astronomy 版本。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.acceptance.professional-tool-boundaries"></a>
<!-- ty-source-item:start key=ac-notifications-and-toolbox-professional-tool-boundaries kind=acceptance -->
- **AC professional-tool-boundaries**
  - Accepts: REQ photography-tools, REQ other-astronomy-tools, CTRL toolbox-index, CTRL astronomy-calculator-form
  - Given: 当前版本只启用部分 V3 摄影/天象工具。
  - When: 用户浏览目录并使用防脱焦计算。
  - Then: 可用/实验/未来工具边界清楚，计算输出含单位/假设/版本，未启用工具不作为可操作空壳。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.acceptance.educational-content-priority"></a>
<!-- ty-source-item:start key=ac-notifications-and-toolbox-educational-content-priority kind=acceptance -->
- **AC educational-content-priority**
  - Accepts: REQ educational-content, CTRL toolbox-index
  - Given: APOD 和当月指南有新内容。
  - When: 新手进入今晚首页和专业工具箱。
  - Then: 今晚决策首屏未被内容流占据，工具箱内容区显示来源/许可/发布日期并可进入阅读。
<!-- ty-source-item:end -->

#### Risks And Recovery

<a id="notifications-and-toolbox.risk.notification-population"></a>
<!-- ty-source-item:start key=risk-notifications-and-toolbox-notification-population kind=risk_fact fact=full_population_operation outcome=notifications-and-toolbox -->
- **RISK notification-population**
  - Fact: full_population_operation
  - Affected Outcome: notifications-and-toolbox
  - Basis: 新天气运行或重大事件可能同时评估并发送给大范围订阅用户。
  - Consequence: 必须分片/限速/幂等/干跑/暂停/重放并监控发送规模，不能直接无界全表扫描。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.risk.push-permission"></a>
<!-- ty-source-item:start key=risk-notifications-and-toolbox-push-permission kind=risk_fact fact=permission_boundary_change outcome=notifications-and-toolbox -->
- **RISK push-permission**
  - Fact: permission_boundary_change
  - Affected Outcome: notifications-and-toolbox
  - Basis: 系统推送、国内厂商通道与本地通知有不同授权/令牌/平台行为。
  - Consequence: 需要平台实机覆盖未询问/允许/拒绝/撤回/令牌失效和本地降级，不把系统授权等同订阅有效。
<!-- ty-source-item:end -->

<a id="notifications-and-toolbox.risk.alert-effect"></a>
<!-- ty-source-item:start key=risk-notifications-and-toolbox-alert-effect kind=risk_fact fact=irreversible_external_effect outcome=notifications-and-toolbox -->
- **RISK alert-effect**
  - Fact: irreversible_external_effect
  - Affected Outcome: notifications-and-toolbox
  - Basis: 一次错误或重复风险通知会打扰用户、诱导夜间出行或让用户忽略后续警告。
  - Consequence: 规则上线需影子评估、去重/冷却、抽样审阅、全局暂停和可追溯触发快照。
<!-- ty-source-item:end -->

<a id="outcome.identity-profile-privacy"></a>

### OUT identity-profile-privacy：账号、个人中心、设备与隐私

#### Observable Result

<!-- ty-source-item:start key=result-identity-profile-privacy kind=outcome_result -->
用户无需登录即可完成允许的基础查询，并可在需要收藏、贡献、跨设备、分享/协作等能力时通过手机号验证码、Apple 或微信安全登录；“我的”统一管理偏好、内容、设备、通知、离线/同步、帮助和数据来源，用户可查看/撤销设备会话、控制位置与坐标公开、导出数据和注销账号，且精确位置不会进入产品分析。
<!-- ty-source-item:end -->

#### Product Requirements

<a id="identity-profile-privacy.requirement.auth-methods"></a>
<!-- ty-source-item:start key=req-identity-profile-privacy-auth-methods kind=requirement -->
- **REQ auth-methods** [direct: S-PRODUCT 6.13, S-ARCH 5.1]：身份服务支持手机验证码、Apple 登录和微信登录；具体地区/平台组合与审核要求由 DEC supported-os-device-matrix/DEC localization-scope 固化，不显示当前构建不可用的可点击登录方式。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.requirement.guest-upgrade"></a>
<!-- ty-source-item:start key=req-identity-profile-privacy-guest-upgrade kind=requirement -->
- **REQ guest-upgrade** [direct: S-ARCH 15.2；derived merge behavior]：游客可用基础查询；受保护动作触发登录说明，登录/注册后可明确选择合并本地偏好、收藏、行程草稿、离线/待同步贡献，冲突可预览且由 DEC guest-auth-capability-matrix 决定能力边界。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.requirement.secure-sessions"></a>
<!-- ty-source-item:start key=req-identity-profile-privacy-secure-sessions kind=requirement -->
- **REQ secure-sessions** [direct: S-ARCH 5.1]：服务端签发短期 access token、可撤销/轮换 refresh token 和设备 session ID；令牌只进 SecureStore，不进普通 SQLite/明文；用户可查看设备、最近活动、撤销单个/其他会话并重新认证敏感操作。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.requirement.my-content-library"></a>
<!-- ty-source-item:start key=req-identity-profile-privacy-my-content-library kind=requirement -->
- **REQ my-content-library** [direct: S-PRODUCT 五/6.13]：“我的内容”覆盖收藏地点、历史/即将行程、上传地点/实况、评论/纠错、观测与拍摄记录和离线数据，显示同步/审核/坐标权限/数据新鲜度，并链接到其权威详情而非复制孤立数据。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.requirement.equipment-library"></a>
<!-- ty-source-item:start key=req-identity-profile-privacy-equipment-library kind=requirement -->
- **REQ equipment-library** [direct: S-PRODUCT 6.13, S-ARCH 5.2]：“我的设备”管理手机、相机、镜头、三脚架、望远镜、赤道仪和常用摄影预设，支持多套设备组合、能力/参数/来源/备注，供偏好/摄影/行程明确选择并复用。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.requirement.profile-and-notification-settings"></a>
<!-- ty-source-item:start key=req-identity-profile-privacy-profile-and-notification-settings kind=requirement -->
- **REQ profile-and-notification-settings** [direct: S-PRODUCT 6.13, S-ARCH 5.2]：个人中心可管理用户类型、出行/车程/徒步/设施、目标、设备、常用出发地、多预设及今晚变好、收藏天气、月落/无月、银河、特殊天象、行程恶化、道路/地点变化、协作提醒；通知细节由 OUT notifications-and-toolbox 负责。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.requirement.location-privacy-controls"></a>
<!-- ty-source-item:start key=req-identity-profile-privacy-location-privacy-controls kind=requirement -->
- **REQ location-privacy-controls** [direct: S-ARCH 15.1～15.3]：位置/隐私设置覆盖前台/精确/限时后台用途、常用出发地、位置/行程历史、照片 EXIF、分析粗粒度网格、私密地点和六级坐标策略；不在埋点记录精确位置，行程结束自动停后台定位。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.requirement.data-export"></a>
<!-- ty-source-item:start key=req-identity-profile-privacy-data-export kind=requirement -->
- **REQ data-export** [direct: S-PRODUCT 6.13, S-ARCH 5.1]：用户可请求可理解、版本化的数据导出，覆盖账号/偏好/设备/收藏/行程/贡献/拍摄/通知/授权范围，并显示生成范围、时间、格式、有效期和安全下载；第三方授权数据/他人隐私按规则排除并解释。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.requirement.account-deletion"></a>
<!-- ty-source-item:start key=req-identity-profile-privacy-account-deletion kind=requirement -->
- **REQ account-deletion** [direct: S-PRODUCT 6.13, S-ARCH 5.1/15.2]：用户可发起注销，先展示对设备会话、行程/协作、贡献/公共事实、媒体、离线包和待同步数据的影响，进行重新认证与冷静/撤销（若决定），最终状态/依法保留内容由 DEC data-retention-deletion 决定。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.requirement.help-and-product-info"></a>
<!-- ty-source-item:start key=req-identity-profile-privacy-help-and-product-info kind=requirement -->
- **REQ help-and-product-info** [direct: S-PRODUCT 6.13]：提供开发者反馈、使用帮助、条款、隐私政策、关于、用户社群和数据来源说明；版本/构建/runtime、许可/归属、联系方式和离线可访问的关键安全帮助可见。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.requirement.privacy-compliant-analytics"></a>
<!-- ty-source-item:start key=req-identity-profile-privacy-privacy-compliant-analytics kind=requirement -->
- **REQ privacy-compliant-analytics** [direct: S-ARCH 15.2, S-PRODUCT 十三]：分析只记录经同意的产品事件和粗粒度网格，不记录精确经纬度、原始轨迹、联系人、私密地点或媒体 EXIF；同意、撤回、最小化、保留和第三方边界由 DEC analytics-consent-policy 决定。
<!-- ty-source-item:end -->

#### User Flow And States

- 游客：进入 APP → 手动/前台位置基础查询 → 在受保护动作看到“为什么登录/哪些本地数据会合并” → 选择登录或继续游客。
- 登录：选可用方式 → 系统/验证码授权 → 创建/恢复账号 → 预览本地合并 → 完成并同步；取消/失败返回原任务和草稿。
- 设备/内容：在“我的”进入分类 → 搜索/筛选 → 打开权威详情或管理设备组合/同步状态。
- 隐私：查看当前权限/用途/历史 → 撤回/删除历史/调整坐标策略 → 导出或注销；敏感动作重认证、显示不可逆边界与进度。

#### Controls And Product Feedback

<a id="identity-profile-privacy.control.auth-gate-sheet"></a>
- **CTRL auth-gate-sheet**
  - Source class: direct auth/guest；sheet behavior derived。
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-auth-gate-sheet-location kind=control -->
  - Location: 首次可选登录及受保护动作前。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-identity-profile-privacy-auth-gate-sheet-user-task kind=requirement -->
  - User task: 选择手机号/Apple/微信登录或继续游客。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-auth-gate-sheet-trigger kind=control -->
  - Trigger: 点击登录或执行收藏/贡献/跨设备/协作等受保护动作。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-auth-gate-sheet-input kind=control -->
  - Input: 当前平台可用方式、原任务、游客本地数据和隐私说明。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-auth-gate-sheet-loading kind=control -->
  - Loading: 单一方式授权中防重复，取消仍可返回。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-auth-gate-sheet-empty kind=control -->
  - Empty: 某方式不可用则不显示；全部不可用时保留游客/稍后重试。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-auth-gate-sheet-success kind=control -->
  - Success: 恢复原任务并进入合并预览，不丢页面上下文。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-auth-gate-sheet-failure kind=control -->
  - Failure: 具体区分取消、验证码、网络、账号风险，不清空游客草稿。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-auth-gate-sheet-feedback kind=control -->
  - Feedback: 每种方式的数据共享、登录必要原因和游客限制透明。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.control.guest-data-merge"></a>
- **CTRL guest-data-merge**
  - Source class: derived necessary behavior。
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-guest-data-merge-location kind=control -->
  - Location: 首次从游客登录成功后。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-identity-profile-privacy-guest-data-merge-user-task kind=requirement -->
  - User task: 决定本地偏好、收藏、草稿、离线和待提交内容如何进入账号。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-guest-data-merge-trigger kind=control -->
  - Trigger: 登录发现本地与远端数据。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-guest-data-merge-input kind=control -->
  - Input: 按类型的本地/远端数量、冲突、受限坐标和队列状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-guest-data-merge-loading kind=control -->
  - Loading: 比较/迁移显示分阶段进度且可安全中断恢复。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-guest-data-merge-empty kind=control -->
  - Empty: 无本地数据时跳过并说明无需合并。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-guest-data-merge-success kind=control -->
  - Success: 用户选择的内容幂等合并，冲突决定和未合并项可查。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-guest-data-merge-failure kind=control -->
  - Failure: 原本地数据不删，显示恢复/重试并不退出账号。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-guest-data-merge-feedback kind=control -->
  - Feedback: 不可合并原因、服务器副本和删除本地缓存是分开的后续动作。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.control.profile-hub"></a>
- **CTRL profile-hub**
  - Source class: direct IA。
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-profile-hub-location kind=control -->
  - Location: “我的”一级页。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-identity-profile-privacy-profile-hub-user-task kind=requirement -->
  - User task: 访问账号、预设、内容、设备、通知、离线/同步、隐私、帮助。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-profile-hub-trigger kind=control -->
  - Trigger: 打开“我的”或相关深链。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-profile-hub-input kind=control -->
  - Input: 登录/游客状态、分类摘要、待办/风险/同步数量和 APP 版本。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-profile-hub-loading kind=control -->
  - Loading: 本地摘要先显示，账号状态增量刷新。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-profile-hub-empty kind=control -->
  - Empty: 游客/无内容各有真实引导，不使用虚假头像/活动。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-profile-hub-success kind=control -->
  - Success: 分类、状态和必要警告可达，登出不隐藏本地草稿管理。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-profile-hub-failure kind=control -->
  - Failure: 缓存入口仍可用，远端分类标失败并可重试。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-profile-hub-feedback kind=control -->
  - Feedback: 待同步、待审核、过期离线包、会话风险和政策更新用可访问徽标。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.control.content-library-browser"></a>
- **CTRL content-library-browser**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-content-library-browser-location kind=control -->
  - Location: “我的内容”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-identity-profile-privacy-content-library-browser-user-task kind=requirement -->
  - User task: 筛选并管理收藏、行程、贡献、拍摄和离线数据。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-content-library-browser-trigger kind=control -->
  - Trigger: 选择分类、搜索、状态筛选或点击条目。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-content-library-browser-input kind=control -->
  - Input: REQ my-content-library 的全部类型、状态、时间和分页游标。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-content-library-browser-loading kind=control -->
  - Loading: 分类/筛选保持，列表骨架或缓存内容可见。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-content-library-browser-empty kind=control -->
  - Empty: 每类提供与任务相关的创建/发现入口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-content-library-browser-success kind=control -->
  - Success: 条目摘要与权威对象状态一致，批量动作只对允许项出现。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-content-library-browser-failure kind=control -->
  - Failure: 局部重试且不会把远端失败误作内容已删除。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-content-library-browser-feedback kind=control -->
  - Feedback: 公开/私密、同步/审核、过期和离线占用清楚。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.control.equipment-manager"></a>
- **CTRL equipment-manager**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-equipment-manager-location kind=control -->
  - Location: “我的设备/常用预设”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-identity-profile-privacy-equipment-manager-user-task kind=requirement -->
  - User task: 新增/编辑设备、镜头组合和常用摄影预设。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-equipment-manager-trigger kind=control -->
  - Trigger: 点击新增、扫描/搜索目录、编辑或删除。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-equipment-manager-input kind=control -->
  - Input: 设备类型、品牌型号、传感器/焦段/能力、配件、来源、备注和组合。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-equipment-manager-loading kind=control -->
  - Loading: 目录查询不锁手动输入，保存防重复。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-equipment-manager-empty kind=control -->
  - Empty: 无设备时提供按手机拍摄/手动添加，不推断不存在的器材。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-equipment-manager-success kind=control -->
  - Success: 保存后可加入摄影/偏好/行程选择并显示资料完整度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-equipment-manager-failure kind=control -->
  - Failure: 草稿保留，目录匹配失败可用用户确认值。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-equipment-manager-feedback kind=control -->
  - Feedback: 删除前显示被哪些方案引用；未知/用户确认/目录核验状态分开。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.control.session-security"></a>
- **CTRL session-security**
  - Source class: direct secure sessions。
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-session-security-location kind=control -->
  - Location: “账号与安全 → 登录设备”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-identity-profile-privacy-session-security-user-task kind=requirement -->
  - User task: 查看并撤销当前/其他设备会话或登出。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-session-security-trigger kind=control -->
  - Trigger: 打开列表、撤销、全部登出或检测风险。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-session-security-input kind=control -->
  - Input: session ID 的安全摘要、设备/平台、最近活动、当前位置粗粒度、当前标识。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-session-security-loading kind=control -->
  - Loading: 列表刷新/撤销单项显示进度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-session-security-empty kind=control -->
  - Empty: 无其他会话显示当前设备，不泄露内部令牌。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-session-security-success kind=control -->
  - Success: 服务端撤销并清除对应本地令牌；敏感数据按策略锁定/清理。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-session-security-failure kind=control -->
  - Failure: 不谎称撤销成功，提供重认证/重试且当前会话状态明确。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-session-security-feedback kind=control -->
  - Feedback: 影响设备、时间和不可恢复本地未同步内容在确认前显示。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.control.privacy-center"></a>
- **CTRL privacy-center**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-privacy-center-location kind=control -->
  - Location: “位置与隐私”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-identity-profile-privacy-privacy-center-user-task kind=requirement -->
  - User task: 查看权限用途、坐标/历史/分析/媒体设置并撤回。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-privacy-center-trigger kind=control -->
  - Trigger: 打开中心、修改设置、系统权限变化或政策更新。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-privacy-center-input kind=control -->
  - Input: 系统权限、服务端同意记录、坐标策略、历史/出发地、分析与 EXIF 设置。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-privacy-center-loading kind=control -->
  - Loading: 本地系统状态立即显示，服务同意记录增量加载。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-privacy-center-empty kind=control -->
  - Empty: 无历史/授权时明确“未收集/无记录”，不制造安全感文案。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-privacy-center-success kind=control -->
  - Success: 修改在系统/服务端一致生效并显示时间/范围。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-privacy-center-failure kind=control -->
  - Failure: 标出哪一侧失败并提供设置/重试，不把 UI 开关当事实。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-privacy-center-feedback kind=control -->
  - Feedback: 精确位置、轨迹、联系人、私密点、EXIF 和粗网格逐项说明用途/保留/删除。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.control.export-delete-flow"></a>
- **CTRL export-delete-flow**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-export-delete-flow-location kind=control -->
  - Location: “账号与安全 → 数据导出/账号注销”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-identity-profile-privacy-export-delete-flow-user-task kind=requirement -->
  - User task: 安全导出个人数据或注销账号。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-export-delete-flow-trigger kind=control -->
  - Trigger: 选择导出/注销并完成重认证。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-export-delete-flow-input kind=control -->
  - Input: 数据范围、格式、交付通道、密码/身份确认、删除影响和法定保留说明。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-export-delete-flow-loading kind=control -->
  - Loading: 后台任务显示排队/处理/可下载/过期或注销阶段，可离开后回来。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-export-delete-flow-empty kind=control -->
  - Empty: 无可导出数据仍生成说明；游客注销替换为清除本地数据。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-export-delete-flow-success kind=control -->
  - Success: 导出使用短期安全下载；注销在最终确认后撤销会话并展示可证状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-export-delete-flow-failure kind=control -->
  - Failure: 不删除部分数据后声称完成，显示失败范围、恢复/支持路径。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-export-delete-flow-feedback kind=control -->
  - Feedback: 导出内容清单、链接有效期、注销公共贡献/协作/离线影响及撤销截止（若有）明确。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.control.help-and-source-center"></a>
- **CTRL help-and-source-center**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-help-and-source-center-location kind=control -->
  - Location: “帮助与产品”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-identity-profile-privacy-help-and-source-center-user-task kind=requirement -->
  - User task: 获取帮助、反馈、政策、社群、版本和数据来源。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-help-and-source-center-trigger kind=control -->
  - Trigger: 选择条目、提交反馈或查看来源。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-help-and-source-center-input kind=control -->
  - Input: 帮助目录、政策版本、数据源/许可、构建/runtime、诊断同意和反馈内容。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-help-and-source-center-loading kind=control -->
  - Loading: 关键安全帮助/政策缓存，网络内容显示状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-help-and-source-center-empty kind=control -->
  - Empty: 某来源不可用时保留名称/最后版本和联系入口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-help-and-source-center-success kind=control -->
  - Success: 条款/隐私/来源可追溯，反馈有提交 ID 且诊断数据先预览。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-help-and-source-center-failure kind=control -->
  - Failure: 反馈草稿保留；外链失败有复制/重试。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-identity-profile-privacy-help-and-source-center-feedback kind=control -->
  - Feedback: 用户社群/外链离开 APP 前提示；不自动附带位置、日志或账号敏感字段。
<!-- ty-source-item:end -->

#### Technical Obligations And Boundaries

<a id="identity-profile-privacy.obligation.token-security"></a>
<!-- ty-source-item:start key=obl-identity-profile-privacy-token-security kind=technical_obligation -->
- **OBL token-security** [direct: S-ARCH 5.1, 15.4]：全链路 HTTPS；access 短期、refresh 轮换/撤销且绑定 device session；令牌进 SecureStore，第三方 key 只在服务端/受限原生配置；认证接口限流/风险控制/日志脱敏。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.obligation.privacy-enforcement-server-side"></a>
<!-- ty-source-item:start key=obl-identity-profile-privacy-privacy-enforcement-server-side kind=technical_obligation -->
- **OBL privacy-enforcement-server-side** [direct: S-ARCH 15]：坐标/行程/媒体/导出/删除/协作权限由服务端对象级和字段级授权执行，客户端隐藏不构成安全边界；敏感操作审计且不把敏感字段写日志/遥测。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.non-completing.frontend-only-privacy"></a>
<!-- ty-source-item:start key=ncomp-identity-profile-privacy-frontend-only-privacy kind=non_completing -->
- **NCOMP frontend-only-privacy** [direct: S-ARCH 15]：只有设置页开关或隐藏按钮、服务端仍返回精确坐标/轨迹/EXIF/他人数据，不能算隐私完成。
<!-- ty-source-item:end -->

#### Implementation Hints

- **HINT account-job-status**：导出/注销以可恢复后台作业呈现状态，但作业路径、队列和 runner 由 Contract 绑定。
- **HINT profile-reference-integrity**：设备/预设删除前检查 ShootingPlan/Itinerary 引用，优先归档或保留历史快照而非破坏旧方案。

#### Acceptance Scenarios

<a id="identity-profile-privacy.acceptance.guest-login-merge"></a>
<!-- ty-source-item:start key=ac-identity-profile-privacy-guest-login-merge kind=acceptance -->
- **AC guest-login-merge**
  - Accepts: REQ auth-methods, REQ guest-upgrade, CTRL auth-gate-sheet, CTRL guest-data-merge
  - Given: 游客已有偏好、收藏、行程草稿和一条待上传实况。
  - When: 受保护动作触发可用登录并成功进入既有账号。
  - Then: 原任务保留、用户预览逐类合并/冲突，选择内容幂等进入账号且失败不删除本地副本。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.acceptance.session-revocation"></a>
<!-- ty-source-item:start key=ac-identity-profile-privacy-session-revocation kind=acceptance -->
- **AC session-revocation**
  - Accepts: REQ secure-sessions, CTRL session-security, OBL token-security
  - Given: 账号有当前和另一设备会话。
  - When: 用户重认证后撤销另一设备。
  - Then: 服务端 refresh/access 后续使用失效、当前会话保留、审计不含令牌且失败不误报成功。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.acceptance.profile-content-equipment"></a>
<!-- ty-source-item:start key=ac-identity-profile-privacy-profile-content-equipment kind=acceptance -->
- **AC profile-content-equipment**
  - Accepts: REQ my-content-library, REQ equipment-library, REQ profile-and-notification-settings, CTRL profile-hub, CTRL content-library-browser, CTRL equipment-manager
  - Given: 用户有跨状态贡献、离线包和被摄影方案引用的镜头。
  - When: 在“我的”浏览并尝试删除镜头。
  - Then: 分类状态与权威对象一致，设备删除前显示引用影响并允许归档，预设/通知入口可达。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.acceptance.location-privacy-enforced"></a>
<!-- ty-source-item:start key=ac-identity-profile-privacy-location-privacy-enforced kind=acceptance -->
- **AC location-privacy-enforced**
  - Accepts: REQ location-privacy-controls, CTRL privacy-center, OBL privacy-enforcement-server-side, NCOMP frontend-only-privacy
  - Given: 用户关闭分析同意、删除位置历史并把地点设为 invite_only。
  - When: 随后使用分析、分享、API 和导出。
  - Then: 精确位置不进埋点，历史按状态删除，未授权响应/分享/导出无精确坐标，UI 与服务端记录一致。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.acceptance.secure-export"></a>
<!-- ty-source-item:start key=ac-identity-profile-privacy-secure-export kind=acceptance -->
- **AC secure-export**
  - Accepts: REQ data-export, REQ privacy-compliant-analytics, CTRL export-delete-flow
  - Given: 用户请求全部允许数据且包含协作行程和粗网格分析记录。
  - When: 导出作业完成并下载。
  - Then: 文件含范围/格式/版本并排除他人/第三方受限数据，链接短期受保护，分析无精确轨迹或 EXIF。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.acceptance.account-deletion-completion"></a>
<!-- ty-source-item:start key=ac-identity-profile-privacy-account-deletion-completion kind=acceptance -->
- **AC account-deletion-completion**
  - Accepts: REQ account-deletion, CTRL export-delete-flow
  - Given: 用户有公共贡献、协作行程、多个会话和待同步本地草稿。
  - When: 完成影响预览、重认证和最终注销确认。
  - Then: 会话撤销、各类数据按 DEC data-retention-deletion 显示可证状态，未同步草稿和不可撤回公共影响不被隐藏。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.acceptance.help-and-sources"></a>
<!-- ty-source-item:start key=ac-identity-profile-privacy-help-and-sources kind=acceptance -->
- **AC help-and-sources**
  - Accepts: REQ help-and-product-info, CTRL help-and-source-center
  - Given: 用户离线需要安全帮助并想查看某光污染数据归属。
  - When: 打开帮助与来源中心。
  - Then: 关键帮助可读，最后已知来源/许可/版本和 APP 构建可见，提交反馈不会自动附带敏感诊断。
<!-- ty-source-item:end -->

#### Risks And Recovery

<a id="identity-profile-privacy.risk.identity-security"></a>
<!-- ty-source-item:start key=risk-identity-profile-privacy-identity-security kind=risk_fact fact=security_boundary_change outcome=identity-profile-privacy -->
- **RISK identity-security**
  - Fact: security_boundary_change
  - Affected Outcome: identity-profile-privacy
  - Basis: 登录、会话、对象/字段授权、导出和删除保护全部用户敏感数据。
  - Consequence: 需威胁建模、认证/授权负测、令牌轮换/撤销、速率限制、日志脱敏与管理审计，不能只做 UI 流程测试。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.risk.account-deletion-effect"></a>
<!-- ty-source-item:start key=risk-identity-profile-privacy-account-deletion-effect kind=risk_fact fact=irreversible_external_effect outcome=identity-profile-privacy -->
- **RISK account-deletion-effect**
  - Fact: irreversible_external_effect
  - Affected Outcome: identity-profile-privacy
  - Basis: 最终注销和删除可能不可恢复，并影响协作、公共贡献和本地未同步内容。
  - Consequence: 必须影响预览、重认证、明确最终确认、可选冷静期/撤销决策和逐类删除证明。
<!-- ty-source-item:end -->

<a id="identity-profile-privacy.risk.profile-migration"></a>
<!-- ty-source-item:start key=risk-identity-profile-privacy-profile-migration kind=risk_fact fact=data_migration outcome=identity-profile-privacy -->
- **RISK profile-migration**
  - Fact: data_migration
  - Affected Outcome: identity-profile-privacy
  - Basis: 游客本地数据、账号预设、设备引用和隐私同意会跨版本/账号状态迁移。
  - Consequence: 合并/升级须幂等、有冲突预览和可恢复副本，不得登录后静默清空游客数据。
<!-- ty-source-item:end -->

<a id="outcome.admin-data-operations"></a>

### OUT admin-data-operations：数据管线、运营治理与推荐重放

#### Observable Result

<!-- ty-source-item:start key=result-admin-data-operations kind=outcome_result -->
获授权运营人员可在强认证后台维护/合并/关闭观星点，处理媒体/实况/评论/纠错和风险，查看天气/天文/地图/路线/光污染等数据源运行、版本、许可、缺失与成本，管理失败任务和缓存/预热，以具体 NightReport 快照重放评分/窗口/主备结果并比较规则版本；所有变更经过服务端权限、校验、审计和可恢复版本，不直接覆盖原始数据。
<!-- ty-source-item:end -->

#### Product Requirements

<a id="admin-data-operations.requirement.domain-module-coverage"></a>
<!-- ty-source-item:start key=req-admin-data-operations-domain-module-coverage kind=requirement -->
- **REQ domain-module-coverage** [direct: S-ARCH 五]：后端模块化单体覆盖 Identity、Profile、Spot、Weather、Astronomy、Geo Environment、Route、Recommendation、Night Report、Itinerary、Collaboration、Field Report、Shooting、Notification 和 Admin；跨模块只经明确领域接口/事件，不能把业务逻辑堆进 Controller 或客户端。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.core-entity-coverage"></a>
<!-- ty-source-item:start key=req-admin-data-operations-core-entity-coverage kind=requirement -->
- **REQ core-entity-coverage** [direct: S-ARCH 7.2]：核心实体至少包含 User、UserPreferenceProfile、Equipment、Spot、SpotAccess、SpotFacility、SpotHorizonSector、SpotMedia、SpotVerification、SpotStatusHistory、WeatherProviderRun、WeatherForecastHour、AstronomyEphemeris、ObservationWindow、LightPollutionCell、HorizonProfile、RouteEstimate、NightReport、RecommendationSnapshot、Itinerary、ItineraryStop、FieldReport、ShootingPlan、CelestialEvent、NotificationSubscription、DataSourceRun、DataQualityIssue、ModerationCase、AuditLog。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.provider-source-registry"></a>
<!-- ty-source-item:start key=req-admin-data-operations-provider-source-registry kind=requirement -->
- **REQ provider-source-registry** [direct + external research: S-ARCH 六, S-USER, S-RESEARCH]：每类外部/计算源保存供应商、许可/条款版本、用途、覆盖、归属文本、缓存/派生/再分发/终止边界、版本/运行批次、分辨率、获取/发布时间、状态、成本/计费单位、quota/rate/SLA 和健康；同时保存价格证据日期/币种/税费/汇率日期、免费量/最低消费/合同期、加权计费规则、1k/10k/100k MAU 用量、直接与隐性成本、12 个月 TCO、有效新鲜输出成本、硬门结果、预算/用量告警、续费/退出和批准记录。天气统一 WeatherProvider（forecast/current/warnings/health）。当前推荐中国常规天气/预警以 QWeather 按量候选、Open-Meteo 免费端点仅作非商业 POC且付费端点仅作经价值验证的候选、ECMWF Open Data 作离线基准/备用研究；这不表示合同已批准，生产组合由 DEC weather-provider-contracts、DEC provider-budget-and-paid-redundancy 与 EXT commercial-provider-rights-and-quotas 确认。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.qualified-lowest-tco-selection"></a>
<!-- ty-source-item:start key=req-admin-data-operations-qualified-lowest-tco-selection kind=requirement -->
- **REQ qualified-lowest-tco-selection** [direct + external research: S-USER, S-RESEARCH]：每项数据/地图/路线/推送/对象存储能力先以不可被价格抵消的硬门筛选候选：来源/字段/版本/run/时间/修改链可追溯且同地点/时段/单位对照通过批准的真实性阈值；首发地区/目标网络的到达率、新鲜度、完整度、延迟、错误/限流/恢复通过批准的稳定性阈值；商业许可、归属、缓存/派生/再分发/地域/终止边界可证；健康、过期、熔断、迁移和诚实降级可实施。任一硬门失败即淘汰；只在提供等价最小必需能力的合格候选中，以同一日期/币种/税费、同一容量/失败场景选择预计 12 个月 TCO 最低者。默认每项能力只购买一个合格主源，以合法缓存、本地计算、开放基准或 `unknown`/隐藏降级作后备；第二付费源、套餐升级和预算上限由 DEC provider-budget-and-paid-redundancy 批准。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.astronomy-geo-pipelines"></a>
<!-- ty-source-item:start key=req-admin-data-operations-astronomy-geo-pipelines kind=requirement -->
- **REQ astronomy-geo-pipelines** [direct + external research: S-ARCH 6.3～6.7, S-RESEARCH]：Astronomy Engine/自有包记录算法/星表/观察者/海拔/计算时间/time scale 并以 JPL 低频黄金集验证；Gaia 星表按批准字段/星等/epoch 裁切和 HEALPix 分块并保留 release/MD5/credits/known issues；CelesTrak 使用支持六位 catalog number 的 OMM JSON/CSV + SGP4、保存 epoch/内容 hash/获取时间，服务端不短于上游两小时更新政策且任一非 200 立即停止重试并告警。EOG Annual VNL v2.2 原始 GeoTIFF（EPSG:4326、15 arc-second、radiance+coverage）保留 CC BY 4.0 notice/修改/版本/checksum，经不可变 raw→裁剪/COG/overviews/瓦片/网格指数；零值结合 cloud-free coverage，radiance 不直译实测 Bortle。Copernicus DEM GLO-30/90 经 CCM 注册/适用许可合法获取，保留补缺/nodata/DSM provenance 并预计算带算法版本/采样参数的地平线，不运行时依赖可变在线 View Service；2026-07-28 GLO-30 访问变化必须在实施日复核。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.aggregate-rest-api"></a>
<!-- ty-source-item:start key=req-admin-data-operations-aggregate-rest-api kind=requirement -->
- **REQ aggregate-rest-api** [direct: S-ARCH 九]：移动端主要 API 采用 REST/OpenAPI/JSON `/v1`、Idempotency-Key、ETag、游标分页、标准错误码和生成 TypeScript Client，不以 GraphQL 作为主接口；保留 `/night-reports`、`/spots`/corrections、`/forecasts`、`/astronomy/state|events`、`/sky/catalog-manifest`、`/routes/estimate`、`/itineraries`/offline-pack、`/field-reports`、`/media/uploads`、`/shooting-plans`、`/sync/changes|operations`、`/map-tiles/{layer}/{z}/{x}/{y}` 语义。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.response-data-status"></a>
<!-- ty-source-item:start key=req-admin-data-operations-response-data-status kind=requirement -->
- **REQ response-data-status** [direct: S-ARCH 9.4]：聚合响应统一携带 generatedAt、expiresAt、dataFreshness、confidence、sources、warnings、partial；部分供应商失败可返回降级结果，但逐项说明缺失、缓存来源和降低的结论可信度。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.four-layer-cache"></a>
<!-- ty-source-item:start key=req-admin-data-operations-four-layer-cache kind=requirement -->
- **REQ four-layer-cache** [direct: S-ARCH 十]：缓存分 L1 设备 SQLite/文件、L2 CDN 瓦片/图片/星表/静态、L3 Redis 接口/聚合、L4 PostgreSQL 规范化/物化；使用请求合并、分布式锁、Single Flight、TTL 抖动、stale-while-revalidate、热门预热和新模型批量预计算；键含网格、观星夜、Profile Hash、目标、天气/规则/光污染版本。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.cache-freshness-policy"></a>
<!-- ty-source-item:start key=req-admin-data-operations-cache-freshness-policy kind=requirement -->
- **REQ cache-freshness-policy** [direct: S-ARCH 10.2]：来源建议 TTL 保留为基线：当前天气 5～15 分钟；小时天气 30 分钟～3 小时；当前夜间报告 10～20 分钟；未来报告 1～3 小时；天文日/银河长期至算法变更；光污染/地形/图片版本化永久；路线基础 6～24 小时、交通路线 5～30 分钟；地点 10～30 分钟；实况 1～5 分钟；生产精确值由 DEC cache-ttl-policy 决定。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.background-job-catalog"></a>
<!-- ty-source-item:start key=req-admin-data-operations-background-job-catalog kind=requirement -->
- **REQ background-job-catalog** [direct: S-ARCH 11.1]：任务目录覆盖 weather.ingest、weather.normalize、weather.quality-check、astronomy.precompute、light-pollution.import、light-pollution.tiles、terrain.import、terrain.horizon、satellite.orbit-update、notification.evaluate、media.process、moderation.scan、night-report.prewarm、data-retention.cleanup。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.job-reliability"></a>
<!-- ty-source-item:start key=req-admin-data-operations-job-reliability kind=requirement -->
- **REQ job-reliability** [direct: S-ARCH 11.2]：每个任务幂等、可重试、有唯一业务键、记录输入/输出版本和耗时、失败死信、可人工重放，不重复覆盖有效数据；批量任务有 dry-run/范围/速率/暂停/恢复和结果摘要。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.provider-failure-controls"></a>
<!-- ty-source-item:start key=req-admin-data-operations-provider-failure-controls kind=requirement -->
- **REQ provider-failure-controls** [direct + external research: S-ARCH 11.3, S-USER, S-RESEARCH]：每个供应商适配器有超时、有限重试、熔断、限流、备用/降级源、响应校验、字段缺失、加权用量与实际成本统计；预算/配额接近批准阈值时按已定义顺序停止非关键多模型、动画、预热或回源，禁止重试风暴、自动升档、静默产生超额或让预警/安全信息冒充 fresh。外部数据先标准化/质检，不能直接进入业务接口。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.spot-admin"></a>
<!-- ty-source-item:start key=req-admin-data-operations-spot-admin kind=requirement -->
- **REQ spot-admin** [direct: S-PRODUCT 十四, S-ARCH 5.15]：地点后台支持新增/编辑、地图选点/坐标校验、图片、遮挡/设施、合并/去重、临时关闭、安全警告、推荐状态、精确坐标策略和版本/来源。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.moderation-admin"></a>
<!-- ty-source-item:start key=req-admin-data-operations-moderation-admin kind=requirement -->
- **REQ moderation-admin** [direct: S-PRODUCT 十四, S-ARCH 5.15]：审核覆盖地点、图片、实况、评论、纠错、举报、虚假信息、风险优先、申诉/补充和地点下线；决定保留理由、证据、操作者和审计，不能静默删除来源记录。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.data-source-admin"></a>
<!-- ty-source-item:start key=req-admin-data-operations-data-source-admin kind=requirement -->
- **REQ data-source-admin** [direct + external research: S-PRODUCT 十四, S-ARCH 5.15, S-USER, S-RESEARCH]：数据源后台显示天气接口、天文计算、地图/路线、光污染版本、更新时间、异常/缺失、许可/归属、供应商健康、原始/加权用量、预算、实际成本、预测 12 个月 TCO、单位有效输出成本、硬门状态、续费/退出和受影响范围，并能关联 DataSourceRun/DataQualityIssue；价格证据过期、预算逼近、预测偏差或低价源质量失败均产生可追溯告警。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.recommendation-replay-admin"></a>
<!-- ty-source-item:start key=req-admin-data-operations-recommendation-replay-admin kind=requirement -->
- **REQ recommendation-replay-admin** [direct: S-PRODUCT 十四, S-ARCH 5.15/16.3]：可查看评分明细、按用户类型调试排序因素、对比推荐与现场反馈、标记错误案例，用保存的输入/数据/规则/候选/路线/阻断/解释重放 NightReport 并并排比较规则版本；规则发布边界由 DEC recommendation-weights-thresholds 决定。
<!-- ty-source-item:end -->

<a id="admin-data-operations.requirement.admin-security-audit"></a>
<!-- ty-source-item:start key=req-admin-data-operations-admin-security-audit kind=requirement -->
- **REQ admin-security-audit** [direct: S-ARCH 15.4]：后台强制 MFA、最小角色/字段权限、短会话/重新认证；所有读取敏感坐标/EXIF、写入、合并、下线、规则发布、任务重放、许可变更和用户权限变更记录不可篡改审计。
<!-- ty-source-item:end -->

#### User Flow And States

- 地点治理：搜索/地图定位 → 查看聚合事实/来源/争议 → 编辑或合并预览 → 校验坐标/引用/坐标策略 → 保存新版本 → 影响范围/缓存失效/审计。
- 审核：按风险 SLA 队列 → 查看自动扫描和上下文 → 通过/补充/驳回/下线 → 通知贡献者 → 更新公开投影，不覆盖原证据。
- 数据源：查看健康/运行 → 进入失败批次 → 样本响应/缺失/许可/成本 → 暂停源/切备用/重跑/标问题 → 观察受影响报告恢复。
- 推荐调试：输入报告 ID/条件 → 重放原版本 → 修改候选规则草案 → dry-run 比较 → 审批发布或放弃；草案不能直接影响线上。

#### Controls And Product Feedback

<a id="admin-data-operations.control.admin-spot-editor"></a>
- **CTRL admin-spot-editor**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-spot-editor-location kind=control -->
  - Location: 管理后台地点列表/地图/详情。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-admin-data-operations-admin-spot-editor-user-task kind=requirement -->
  - User task: 新增、核验、编辑、合并、关闭或配置地点公开/推荐状态。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-spot-editor-trigger kind=control -->
  - Trigger: 搜索/选点、打开工单、点击编辑/合并/关闭。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-spot-editor-input kind=control -->
  - Input: 全部 Spot 子实体、版本、来源/冲突、坐标/精度、媒体、引用和访问策略。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-spot-editor-loading kind=control -->
  - Loading: 只读快照先显示，关联/影响异步加载；保存防重复。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-spot-editor-empty kind=control -->
  - Empty: 新点从空表单开始且不把 POI 当事实；无冲突明确显示。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-spot-editor-success kind=control -->
  - Success: 校验后生成新版本/状态历史，关联缓存/推荐失效和审计 ID 可见。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-spot-editor-failure kind=control -->
  - Failure: 不部分覆盖；表单草稿/差异保留，可重试或回滚。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-spot-editor-feedback kind=control -->
  - Feedback: 合并前显示被迁移引用/媒体/评论/坐标策略；安全下线要求原因和时效。
<!-- ty-source-item:end -->

<a id="admin-data-operations.control.moderation-queue"></a>
- **CTRL moderation-queue**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-admin-data-operations-moderation-queue-location kind=control -->
  - Location: 后台审核工作台。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-admin-data-operations-moderation-queue-user-task kind=requirement -->
  - User task: 按风险/时效处理地点、媒体、实况、评论、纠错和举报。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-moderation-queue-trigger kind=control -->
  - Trigger: 过滤队列、认领案件、执行决定或请求补充。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-moderation-queue-input kind=control -->
  - Input: ModerationCase、自动扫描、原始/公开资产、历史、争议、风险等级和 SLA。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-moderation-queue-loading kind=control -->
  - Loading: 队列稳定、证据逐项加载；敏感原始 EXIF 需额外授权。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-moderation-queue-empty kind=control -->
  - Empty: 无待办时显示最后同步/过滤条件，不填样例案件。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-moderation-queue-success kind=control -->
  - Success: 决定、理由、可见范围、通知和审计原子保存。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-moderation-queue-failure kind=control -->
  - Failure: 案件不被错误移出队列，草稿和锁/认领状态可恢复。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-moderation-queue-feedback kind=control -->
  - Feedback: 高风险优先、重复/关联案件、申诉和二次复核清晰。
<!-- ty-source-item:end -->

<a id="admin-data-operations.control.data-source-dashboard"></a>
- **CTRL data-source-dashboard**
  - Source class: direct + external research。
<!-- ty-source-item:start key=ctrl-admin-data-operations-data-source-dashboard-location kind=control -->
  - Location: 后台“数据源与质量”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-admin-data-operations-data-source-dashboard-user-task kind=requirement -->
  - User task: 监视供应商/计算/数据集版本、覆盖、缺失、质量硬门、成本、预算和影响，并比较合格候选。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-data-source-dashboard-trigger kind=control -->
  - Trigger: 选择源/运行/地区/时间、告警深链或刷新。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-data-source-dashboard-input kind=control -->
  - Input: ProviderHealth、DataSourceRun、DataQualityIssue、许可、价格证据、币种/税费、原始/加权用量、12 个月 TCO、有效输出成本、预算/配额、硬门结果、依赖报告数。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-data-source-dashboard-loading kind=control -->
  - Loading: 最新成功快照保留并标 stale，图表/日志按需加载。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-data-source-dashboard-empty kind=control -->
  - Empty: 无运行数据本身成为质量问题；新源显示未验证而非健康。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-data-source-dashboard-success kind=control -->
  - Success: 健康/降级/熔断、最新批次、字段缺失、硬门、预算/TCO 和影响范围一致可查；只有合格且能力等价的候选进入成本排序。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-data-source-dashboard-failure kind=control -->
  - Failure: 监控自身失败有独立状态，不能显示全绿。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-data-source-dashboard-feedback kind=control -->
  - Feedback: 时间/时区、样本、阈值、来源许可、价格证据时效、预测与实际偏差、预算余量、预计恢复/备用/退出状态可见。
<!-- ty-source-item:end -->

<a id="admin-data-operations.control.job-operations-console"></a>
- **CTRL job-operations-console**
  - Source class: direct reliability；console derived。
<!-- ty-source-item:start key=ctrl-admin-data-operations-job-operations-console-location kind=control -->
  - Location: 后台运行/死信详情。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-admin-data-operations-job-operations-console-user-task kind=requirement -->
  - User task: 查看、dry-run、重试、暂停/恢复或重放任务。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-job-operations-console-trigger kind=control -->
  - Trigger: 告警/死信、选择任务/范围并执行操作。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-job-operations-console-input kind=control -->
  - Input: 任务类型、业务键、输入/输出版本、范围、速率、依赖、错误和操作者权限。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-job-operations-console-loading kind=control -->
  - Loading: 长任务显示排队/运行/进度/取消请求，页面可离开。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-job-operations-console-empty kind=control -->
  - Empty: 无失败显示近期成功和最后检查，不隐藏过滤。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-job-operations-console-success kind=control -->
  - Success: 幂等结果、影响数量、跳过/失败、耗时和审计可见。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-job-operations-console-failure kind=control -->
  - Failure: 可从检查点/死信恢复，已有效数据不被覆盖。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-job-operations-console-feedback kind=control -->
  - Feedback: 全量范围、预计成本/写入/缓存影响在确认前高亮；危险操作需重认证。
<!-- ty-source-item:end -->

<a id="admin-data-operations.control.recommendation-replay-console"></a>
- **CTRL recommendation-replay-console**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-admin-data-operations-recommendation-replay-console-location kind=control -->
  - Location: 后台“推荐调试”。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-admin-data-operations-recommendation-replay-console-user-task kind=requirement -->
  - User task: 重放历史报告、解释差异并试验规则草案。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-recommendation-replay-console-trigger kind=control -->
  - Trigger: 输入报告/错误案例、选规则版本并点击重放/比较。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-recommendation-replay-console-input kind=control -->
  - Input: 原位置/观星夜/预设、来源版本、候选/路线、阻断、权重/阈值、现场反馈。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-recommendation-replay-console-loading kind=control -->
  - Loading: 原快照先显示，各版本运行状态独立。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-recommendation-replay-console-empty kind=control -->
  - Empty: 快照缺源时列明无法重放部分，不用当前数据替换历史后声称一致。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-recommendation-replay-console-success kind=control -->
  - Success: 候选、阻断、分项分、窗口、主备、解释和差异并排可追溯。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-recommendation-replay-console-failure kind=control -->
  - Failure: 草案不发布，错误输入/阶段清楚并保留原结果。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-recommendation-replay-console-feedback kind=control -->
  - Feedback: “历史复现”与“使用当前数据模拟”显著区分；发布需独立审批动作。
<!-- ty-source-item:end -->

<a id="admin-data-operations.control.rule-release-control"></a>
- **CTRL rule-release-control**
  - Source class: direct rule version requirement；release behavior derived。
<!-- ty-source-item:start key=ctrl-admin-data-operations-rule-release-control-location kind=control -->
  - Location: 推荐重放后的规则版本页。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-admin-data-operations-rule-release-control-user-task kind=requirement -->
  - User task: 保存、审批、灰度/回滚一个推荐规则版本。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-rule-release-control-trigger kind=control -->
  - Trigger: 从验证通过草案点击提交审批/发布/回滚。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-rule-release-control-input kind=control -->
  - Input: 规则 diff、适用用户/地区、重放样本、指标、风险、审批人和生效时间。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-rule-release-control-loading kind=control -->
  - Loading: 发布任务状态可见，重复请求幂等。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-rule-release-control-empty kind=control -->
  - Empty: 无足够重放/审批证据时 disabled 并列缺口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-rule-release-control-success kind=control -->
  - Success: 生成不可变规则版本、作用域/生效/回滚点和审计。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-rule-release-control-failure kind=control -->
  - Failure: 线上保持旧版本，发布任务可安全恢复/终止。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-rule-release-control-feedback kind=control -->
  - Feedback: 影响用户/缓存预热/通知触发可能性和回滚动作在确认前可见。
<!-- ty-source-item:end -->

<a id="admin-data-operations.control.admin-access-audit"></a>
- **CTRL admin-access-audit**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-access-audit-location kind=control -->
  - Location: 后台账号/角色/审计。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-admin-data-operations-admin-access-audit-user-task kind=requirement -->
  - User task: 管理管理员权限并调查敏感操作。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-access-audit-trigger kind=control -->
  - Trigger: 登录/MFA、角色变更、搜索审计或敏感读取/写入。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-access-audit-input kind=control -->
  - Input: 角色/资源/字段范围、会话、MFA、操作/对象/版本/理由/时间和结果。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-access-audit-loading kind=control -->
  - Loading: 权限检查先于数据；审计分页/导出显示进度。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-access-audit-empty kind=control -->
  - Empty: 无匹配记录显示过滤/保留范围，不能关闭审计。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-access-audit-success kind=control -->
  - Success: 最小授权生效，敏感事件可按操作者/对象/版本追溯。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-access-audit-failure kind=control -->
  - Failure: 默认拒绝敏感动作；授权变更不部分生效。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-admin-data-operations-admin-access-audit-feedback kind=control -->
  - Feedback: 当前角色/字段范围、重认证、导出水印/有效期和不可编辑审计清楚。
<!-- ty-source-item:end -->

#### Technical Obligations And Boundaries

<a id="admin-data-operations.obligation.source-data-immutability"></a>
<!-- ty-source-item:start key=obl-admin-data-operations-source-data-immutability kind=technical_obligation -->
- **OBL source-data-immutability** [direct + external research: S-ARCH 7.1, S-RESEARCH]：所有外部/用户/计算数据保存 UTC、IANA 时区、观星夜、WGS84、供应商/适用许可与归属、下载 URL/时间/大小/checksum、原始格式/CRS/nodata/coverage、算法/工具/规则版本、lineage、来源/审核/可信度；raw restricted 对象不可变，只追加可回滚派生版本，数据库保存引用/当前指针且 Redis 不是唯一真值，临时实况 TTL，推荐可重放。供应商合同禁止保存的数据不进入 raw；删除/撤权/许可终止按 manifest 清理。
<!-- ty-source-item:end -->

<a id="admin-data-operations.obligation.api-contract-generation"></a>
<!-- ty-source-item:start key=obl-admin-data-operations-api-contract-generation kind=technical_obligation -->
- **OBL api-contract-generation** [direct: S-ARCH 9.1]：OpenAPI 是客户端/服务端聚合契约来源，生成 TypeScript Client；错误、分页、幂等、缓存验证和数据状态统一，破坏性演进走新版本/兼容迁移。
<!-- ty-source-item:end -->

<a id="admin-data-operations.obligation.cache-invalidation-events"></a>
<!-- ty-source-item:start key=obl-admin-data-operations-cache-invalidation-events kind=technical_obligation -->
- **OBL cache-invalidation-events** [direct: S-ARCH 十]：供应商新运行、地点/风险/实况、路线、规则、数据集/算法变化发布明确失效事件；stale-while-revalidate 只在允许数据类型使用并保持旧版本标识。
<!-- ty-source-item:end -->

<a id="admin-data-operations.obligation.provider-cost-and-quota-ledger"></a>
<!-- ty-source-item:start key=obl-admin-data-operations-provider-cost-and-quota-ledger kind=technical_obligation -->
- **OBL provider-cost-and-quota-ledger** [direct + derived from S-USER/S-RESEARCH]：为每个候选和已用 provider 维护版本化、可审计且不含 secret 的成本/配额台账，按同一能力/地区/质量门和 1k/10k/100k MAU 的基准/上行/失败场景计算 `订阅/API/超额 + 计算 + 存储/请求/取回 + 出网/CDN + 监控/重试 + 工程运维 + 合规/归属 + 迁移/退出` 的 12 个月 TCO；免费/open data 同样计加工与托管。实际账单/有效输出按月回填预测偏差，采购/续费/升档前重取官方价格和合同；预算告警、硬上限、功能降级和第二付费源触发器可配置并由 DEC provider-budget-and-paid-redundancy 批准，任何套餐不得静默自动升级。
<!-- ty-source-item:end -->

<a id="admin-data-operations.non-completing.direct-provider-pass-through"></a>
<!-- ty-source-item:start key=ncomp-admin-data-operations-direct-provider-pass-through kind=non_completing -->
- **NCOMP direct-provider-pass-through** [direct: S-ARCH 11.3]：外部供应商响应未经标准化/质检直接返回移动端，不能算数据平台完成。
<!-- ty-source-item:end -->

#### Implementation Hints

- **HINT modular-monolith-events**：领域模块可在同一部署内用事务后事件/Outbox 解耦缓存失效和任务，但实际中间件由 Contract 决定。
- **HINT dry-run-first**：地点合并、规则发布、数据保留清理和大型导入优先支持 dry-run 影响摘要及稳定业务键。

#### Acceptance Scenarios

<a id="admin-data-operations.acceptance.domain-and-entities"></a>
<!-- ty-source-item:start key=ac-admin-data-operations-domain-and-entities kind=acceptance -->
- **AC domain-and-entities**
  - Accepts: REQ domain-module-coverage, REQ core-entity-coverage, OBL source-data-immutability
  - Given: 一份 NightReport 涉及用户预设、地点子实体、天气运行、天文窗口、路线、推荐快照和实况。
  - When: 管理员/工程人员追溯报告。
  - Then: 每个领域实体和版本/来源/时区/坐标/规则关联可达，原始输入未被后续更新覆盖。
<!-- ty-source-item:end -->

<a id="admin-data-operations.acceptance.source-pipelines"></a>
<!-- ty-source-item:start key=ac-admin-data-operations-source-pipelines kind=acceptance -->
- **AC source-pipelines**
  - Accepts: REQ provider-source-registry, REQ astronomy-geo-pipelines, REQ provider-failure-controls, CTRL data-source-dashboard, NCOMP direct-provider-pass-through
  - Given: 天气源字段缺失且卫星轨道过期、光污染/DEM 有明确版本。
  - When: 新批次进入系统并被后台查看。
  - Then: 天气在质检前不进入业务、轨道可信度下降，四类源的健康/版本/许可/影响可见且备用/熔断状态真实。
<!-- ty-source-item:end -->

<a id="admin-data-operations.acceptance.qualified-lowest-tco-provider-selection"></a>
<!-- ty-source-item:start key=ac-admin-data-operations-qualified-lowest-tco-provider-selection kind=acceptance -->
- **AC qualified-lowest-tco-provider-selection**
  - Accepts: REQ qualified-lowest-tco-selection, REQ provider-source-registry, REQ data-source-admin, OBL provider-cost-and-quota-ledger, CTRL data-source-dashboard
  - Given: 同一项生产能力有免费、按量和固定月费候选，其中至少一个价格更低但有真实性/目标区稳定性/许可硬门缺口，并已有 1k/10k/100k MAU 与故障场景。
  - When: 团队选择、续费或升级生产 provider。
  - Then: 任何硬门失败者先被淘汰；其余候选按等价最小能力和同一日期/币种/税费的 12 个月完整 TCO 排序，选择最低者并保存价格/假设/有效输出成本/降级/退出证据；第二付费源或升档只有在批准的预算与增量收益触发器成立时发生，不能因免费或标价低绕过质量，也不能静默自动购买。
<!-- ty-source-item:end -->

<a id="admin-data-operations.acceptance.api-data-status"></a>
<!-- ty-source-item:start key=ac-admin-data-operations-api-data-status kind=acceptance -->
- **AC api-data-status**
  - Accepts: REQ aggregate-rest-api, REQ response-data-status, OBL api-contract-generation
  - Given: 一个聚合响应部分使用缓存、一个字段缺失并有 warning。
  - When: 生成客户端请求 `/v1` 接口。
  - Then: OpenAPI/客户端类型、幂等/ETag/分页/错误一致，generatedAt/expiresAt/freshness/confidence/sources/warnings/partial 准确描述降级。
<!-- ty-source-item:end -->

<a id="admin-data-operations.acceptance.cache-policy"></a>
<!-- ty-source-item:start key=ac-admin-data-operations-cache-policy kind=acceptance -->
- **AC cache-policy**
  - Accepts: REQ four-layer-cache, REQ cache-freshness-policy, OBL cache-invalidation-events
  - Given: 新天气模型到达且同一网格/夜晚/预设有并发热门请求。
  - When: 旧报告进入失效和重算。
  - Then: 请求合并/锁/抖动/预热防击穿，旧结果仅以 stale 标识返回，新结果键含全部版本且不会污染其他预设。
<!-- ty-source-item:end -->

<a id="admin-data-operations.acceptance.job-idempotent-replay"></a>
<!-- ty-source-item:start key=ac-admin-data-operations-job-idempotent-replay kind=acceptance -->
- **AC job-idempotent-replay**
  - Accepts: REQ background-job-catalog, REQ job-reliability, CTRL job-operations-console
  - Given: 任一目录任务写入后失败并进入死信。
  - When: 授权人员以同一业务键重放。
  - Then: 有效数据不重复覆盖，输入/输出版本、跳过/写入/失败/耗时和审计清楚且可暂停恢复。
<!-- ty-source-item:end -->

<a id="admin-data-operations.acceptance.spot-merge-and-risk"></a>
<!-- ty-source-item:start key=ac-admin-data-operations-spot-merge-and-risk kind=acceptance -->
- **AC spot-merge-and-risk**
  - Accepts: REQ spot-admin, CTRL admin-spot-editor
  - Given: 两个重复地点分别有媒体、评论、受限坐标和一个最新安全警告。
  - When: 管理员预览并确认合并。
  - Then: 引用/来源/策略/状态历史按计划迁移，安全警告不丢，生成新版本/缓存失效/审计且可回滚。
<!-- ty-source-item:end -->

<a id="admin-data-operations.acceptance.moderation-case"></a>
<!-- ty-source-item:start key=ac-admin-data-operations-moderation-case kind=acceptance -->
- **AC moderation-case**
  - Accepts: REQ moderation-admin, CTRL moderation-queue
  - Given: 高风险纠错附带媒体和原始 EXIF，贡献者可补充。
  - When: 审核员处理并请求补充或下线地点。
  - Then: 原始证据仅获授权可见，决定/理由/通知/公开状态/申诉与审计原子保存且原贡献不被覆盖。
<!-- ty-source-item:end -->

<a id="admin-data-operations.acceptance.source-operation"></a>
<!-- ty-source-item:start key=ac-admin-data-operations-source-operation kind=acceptance -->
- **AC source-operation**
  - Accepts: REQ data-source-admin, CTRL data-source-dashboard
  - Given: 路线供应商错误率/成本异常并影响多个报告。
  - When: 运营查看并切换/暂停供应商。
  - Then: 健康、用量/成本、影响报告与备用状态可见，变更需权限/审计且后续报告准确标降级/恢复。
<!-- ty-source-item:end -->

<a id="admin-data-operations.acceptance.replay-and-release"></a>
<!-- ty-source-item:start key=ac-admin-data-operations-replay-and-release kind=acceptance -->
- **AC replay-and-release**
  - Accepts: REQ recommendation-replay-admin, CTRL recommendation-replay-console, CTRL rule-release-control
  - Given: 一个错误案例有完整历史快照和现场反馈，规则草案改变主备排序。
  - When: 管理员重放、比较并尝试发布。
  - Then: 历史复现与当前模拟分开，分项/阻断/解释差异可追溯；证据/审批不足时禁止发布，失败保持旧版本。
<!-- ty-source-item:end -->

<a id="admin-data-operations.acceptance.admin-security"></a>
<!-- ty-source-item:start key=ac-admin-data-operations-admin-security kind=acceptance -->
- **AC admin-security**
  - Accepts: REQ admin-security-audit, CTRL admin-access-audit
  - Given: 无精确坐标权限的审核员登录且 MFA 过期。
  - When: 尝试读取 invite_only 坐标并执行地点下线。
  - Then: 坐标字段服务端拒绝、敏感写入要求重认证，成功/失败尝试均记录不含 secret 的审计。
<!-- ty-source-item:end -->

#### Risks And Recovery

<a id="admin-data-operations.risk.bulk-data-operations"></a>
<!-- ty-source-item:start key=risk-admin-data-operations-bulk-data-operations kind=risk_fact fact=full_population_operation outcome=admin-data-operations -->
- **RISK bulk-data-operations**
  - Fact: full_population_operation
  - Affected Outcome: admin-data-operations
  - Basis: 数据集导入、缓存预热、保留清理、通知评估和规则重算可能覆盖全区域/全用户。
  - Consequence: Contract 必须规定 dry-run、分片、速率、范围确认、检查点、暂停/回滚和结果对账。
<!-- ty-source-item:end -->

<a id="admin-data-operations.risk.admin-security-boundary"></a>
<!-- ty-source-item:start key=risk-admin-data-operations-admin-security-boundary kind=risk_fact fact=security_boundary_change outcome=admin-data-operations -->
- **RISK admin-security-boundary**
  - Fact: security_boundary_change
  - Affected Outcome: admin-data-operations
  - Basis: 后台可读取敏感坐标/证据并修改地点、规则、权限和数据源。
  - Consequence: MFA、最小字段授权、重认证、WAF/限流、不可篡改审计和负向授权测试是发布前置条件。
<!-- ty-source-item:end -->

<a id="admin-data-operations.risk.schema-and-api"></a>
<!-- ty-source-item:start key=risk-admin-data-operations-schema-and-api kind=risk_fact fact=public_api_or_schema_change outcome=admin-data-operations -->
- **RISK schema-and-api**
  - Fact: public_api_or_schema_change
  - Affected Outcome: admin-data-operations
  - Basis: 规范化实体、OpenAPI、缓存键、离线同步和任务输入同时被移动端/后台/工作进程消费。
  - Consequence: 需要契约版本、生成客户端、兼容迁移、双读/双写或重算策略与跨消费者验证。
<!-- ty-source-item:end -->

<a id="admin-data-operations.risk.dataset-license"></a>
<!-- ty-source-item:start key=risk-admin-data-operations-dataset-license kind=risk_fact fact=irreversible_external_effect outcome=admin-data-operations -->
- **RISK dataset-license**
  - Fact: irreversible_external_effect
  - Affected Outcome: admin-data-operations
  - Basis: 未获商业许可或缺少归属的数据/地图/图片一旦发布到 CDN/客户端会产生难以回收的合规影响。
  - Consequence: 生产源上线前必须外部确认许可、归属、再分发/缓存范围和删除流程；管理后台保留证据与版本。
<!-- ty-source-item:end -->

<a id="outcome.quality-release-observability"></a>

### OUT quality-release-observability：工程、发布、质量与可恢复运行

#### Observable Result

<!-- ty-source-item:start key=result-quality-release-observability kind=outcome_result -->
团队可在隔离的 development/staging/production 环境中构建、测试、灰度和发布 iOS/Android APP 与模块化后端，在不兼容原生变更时正确升级二进制/runtimeVersion；生产具备可观测、告警、数据质量、备份恢复和中国主场景合规边界，核心决策/地图/离线/传感器路径在模拟、实机和户外被验证，并以来源建议的 SLO 与产品闭环指标持续判断质量。
<!-- ty-source-item:end -->

#### Product Requirements

<a id="quality-release-observability.requirement.technology-baseline"></a>
<!-- ty-source-item:start key=req-quality-release-observability-technology-baseline kind=requirement -->
- **REQ technology-baseline** [direct: S-ARCH 1.1]：基线为 Expo + React Native + TypeScript、Development Build/自定义 Expo Native Module、高德原生地图、Expo Sensors + 必要 Core Motion/Android Sensor、Skia/GPU 天空、ARKit/ARCore 增强、TypeScript NestJS/Fastify 模块化单体、Python 气象/遥感/栅格/地形、PostgreSQL/PostGIS、Redis/BullMQ、S3 兼容对象存储/CDN、Next.js 管理后台、REST/OpenAPI + 协作 WebSocket、Astronomy Engine 封装和 Monorepo；精确版本由 DEC dependency-version-baseline 决定。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.official-source-production-gates"></a>
<!-- ty-source-item:start key=req-quality-release-observability-official-source-production-gates kind=requirement -->
- **REQ official-source-production-gates** [direct + repo evidence: S-USER, S-RESEARCH]：后续实现逐类消费 S-RESEARCH 的移动栈、天气、地图/路线、地点、VIIRS、DEM、天文/星表/卫星、专业工具、推送、对象存储/CDN、离线与成本结论，并保留 `source_baseline`、`recommended`、`contract_gate`、`poc_gate`、`external_confirmation`、`defer` 状态；推荐不得静默升级为已采购/已许可/已校准/已通过 POC。动态版本/价格/配额/条款在锁依赖、签合同、续费/扩容和 production gate 重取官方证据；每项生产源先通过真实性/可追溯、首发区质量/稳定性、合法可运营和安全降级硬门，再由 REQ qualified-lowest-tco-selection 在合格等价候选中选 12 个月 TCO 最低者。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.interaction-motion-contract"></a>
<!-- ty-source-item:start key=req-quality-release-observability-interaction-motion-contract kind=requirement -->
- **REQ interaction-motion-contract** [direct + repo evidence: S-USER, S-DESIGN, S-INTERACTION]：所有 RN 控件/转场实现即时 press-in、有效 press-out/可访问激活时单次 commit、取消不触发；直接操控保持抓取偏移和连续跟手，运行中可重抓/反向并从 live presentation value 衔接，释放速度只在合法边界/快照点内参与 settle；Bottom Sheet、地图/滚动、iOS 导航、Android system/predictive back 和辅助技术手势明确仲裁；触觉可关闭/不可用且非唯一反馈；reduced motion 移除大位移/景深/重复/弹性而非只加速；日/夜/红光的可控表面无蓝白闪，无法主题化的 OS/供应商表面不得在现场模式中静默打开，须先提示并提供取消/返回或非现场替代；双平台共享任务/状态但保留各自原生惯例，精确 token 由 DEC interaction-motion-token-baseline 与真机 POC 决定。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.modular-monolith-topology"></a>
<!-- ty-source-item:start key=req-quality-release-observability-modular-monolith-topology kind=requirement -->
- **REQ modular-monolith-topology** [direct: S-ARCH 1.3]：起步采用模块化单体 API + 独立数据任务进程 + 独立媒体/瓦片能力，不提前拆十几个微服务、Kafka 或 Kubernetes 全家桶；只有 CPU/内存/吞吐隔离明确且有指标证据时拆热点模块。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.monorepo-shape"></a>
<!-- ty-source-item:start key=req-quality-release-observability-monorepo-shape kind=requirement -->
- **REQ monorepo-shape** [direct: S-ARCH 二十]：工程概念结构覆盖 apps/mobile|admin-web|api，workers/weather|geospatial|media|notification，packages/contracts|domain|astronomy-core|scoring-engine|coordinate-system|weather-schema|ui-system|amap-native|telemetry|test-fixtures，data-pipelines/light-pollution|terrain|star-catalog|satellite，infrastructure/terraform|docker|monitoring，以及 docs/product|architecture|data-sources|adr|runbooks；真实路径由后续 Contract 绑定。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.environment-isolation"></a>
<!-- ty-source-item:start key=req-quality-release-observability-environment-isolation kind=requirement -->
- **REQ environment-isolation** [direct: S-ARCH 13.1]：development、staging、production 独立数据库、Redis、对象存储 Bucket、API Key、推送证书和 OAuth 配置；测试/预发密钥、数据和通知不得接入真实用户/生产通道。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.production-topology"></a>
<!-- ty-source-item:start key=req-quality-release-observability-production-topology kind=requirement -->
- **REQ production-topology** [direct: S-ARCH 13.2～13.3]：生产链路为 CDN/WAF → 负载均衡 → 多副本 API → PostgreSQL/PostGIS 主备、Redis 高可用、对象存储、Worker、调度器、日志/监控；容器角色包括 api、worker-general/weather/geospatial/media/notification、admin-web，地理栅格与普通 API 隔离资源。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.china-production-compliance"></a>
<!-- ty-source-item:start key=req-quality-release-observability-china-production-compliance kind=requirement -->
- **REQ china-production-compliance** [direct: S-ARCH 13.2]：以中国用户为主时，业务服务、数据库、媒体和日志采用符合确认结果的中国境内区域，并在生产前解决 ICP、地图授权、数据跨境、对象存储/CDN和个人信息合规；外部证明见 EXT china-production-legal-readiness。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.backup-recovery"></a>
<!-- ty-source-item:start key=req-quality-release-observability-backup-recovery kind=requirement -->
- **REQ backup-recovery** [direct: S-ARCH 13.4]：PostgreSQL 多可用区、每日全量、持续归档/PITR；Redis 不作唯一真值；对象存储版本控制；关键地点定期导出；定期恢复演练；来源建议目标 RPO ≤ 15 分钟、RTO ≤ 2 小时，生产承诺由 DEC recovery-objectives 决定。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.mobile-build-release"></a>
<!-- ty-source-item:start key=req-quality-release-observability-mobile-build-release kind=requirement -->
- **REQ mobile-build-release** [direct: S-ARCH 十四]：开发长期使用 Expo Development Build 而非 Expo Go；发布通道 development/internal/staging/production；EAS Build 产出双端二进制并允许在 Windows 发起 iOS 云构建，EAS Update 只下发与原生 runtime 兼容的 JS/样式/资源，原生模块新增/修改必须重建并升级 runtimeVersion。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.api-security-baseline"></a>
<!-- ty-source-item:start key=req-quality-release-observability-api-security-baseline kind=requirement -->
- **REQ api-security-baseline** [direct: S-ARCH 15.4]：生产要求 HTTPS、短令牌/refresh 轮换、请求签名（适用接口）、API 限流、WAF、短期上传凭证、病毒/内容扫描、后台 MFA/审计以及服务端/受限原生第三方 key；secret 不进入客户端 JS、日志、Context 或仓库。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.technical-observability"></a>
<!-- ty-source-item:start key=req-quality-release-observability-technical-observability kind=requirement -->
- **REQ technical-observability** [direct: S-ARCH 16.1]：采用 OpenTelemetry 关联 API 延迟/错误、数据库查询、Redis 命中、外部接口耗时、任务失败、地图瓦片/图片处理失败、移动端崩溃/页面启动、离线同步失败、电量和传感器性能异常，并可按版本/平台/地区/数据源追踪且不含精确位置。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.data-observability"></a>
<!-- ty-source-item:start key=req-quality-release-observability-data-observability kind=requirement -->
- **REQ data-observability** [direct: S-ARCH 16.2]：一级监控供应商按时到达、模型运行缺失、字段缺失比、坐标越界、天文异常、光污染版本、路线成功率、实况与预报偏差、模型差异和推荐频繁变化；异常关联受影响 NightReport/地区/版本并有 runbook。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.analytics-funnel-events"></a>
<!-- ty-source-item:start key=req-quality-release-observability-analytics-funnel-events kind=requirement -->
- **REQ analytics-funnel-events** [direct: S-PRODUCT 十三]：MVP 漏斗为打开 → 定位 → 今晚结论 → 推荐地点 → 地点详情 → 加入计划 → 导航 → 实况；事件至少覆盖定位成功/失败、改日期、选目标、出行偏好、查看评分、展开专业数据、切模型/图层、筛选、点推荐、看实景/天空、设主/备、创建行程、调整路线、外部导航、摄影参数、上传地点/实况、评论和行程完成，事件 schema/同意遵守隐私边界。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.product-metrics"></a>
<!-- ty-source-item:start key=req-quality-release-observability-product-metrics kind=requirement -->
- **REQ product-metrics** [direct: S-PRODUCT 十三]：北极星指标为每周完成“地点选择—发起导航—现场反馈”闭环的有效观星行程数；辅助指标为首次地点选择率、推荐点击率、详情到导航、主转备、行程完成、实况上传、推荐满意度、次周留存、地点数据有效率和天气/现场一致度，均定义口径/排除/版本。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.test-pyramid"></a>
<!-- ty-source-item:start key=req-quality-release-observability-test-pyramid kind=requirement -->
- **REQ test-pyramid** [direct: S-ARCH 十七]：单测重点覆盖天文时间、跨午夜观星夜、时区、坐标转换、评分、硬阻断、解释、缓存键和过期；供应商契约样本覆盖字段变化、空值、错误码、超时、时区、单位、模型批次和许可；移动端覆盖双端组件、模拟器、多实机/磁力计、弱网/无网、低电、低亮、后台、大量标记和长天空动画。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.astronomy-golden-tests"></a>
<!-- ty-source-item:start key=req-quality-release-observability-astronomy-golden-tests kind=requirement -->
- **REQ astronomy-golden-tests** [direct: S-ARCH 17.2]：天文黄金集覆盖不同纬度、南北半球、高海拔、跨日期、极区、日月升落、月相、行星和银河中心，并定期与 JPL Horizons 或其他确认的权威结果比对，记录容差/版本/差异。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.outdoor-validation"></a>
<!-- ty-source-item:start key=req-quality-release-observability-outdoor-validation kind=requirement -->
- **REQ outdoor-validation** [direct: S-ARCH 17.5]：户外验证覆盖山区 GPS、真实指南针、金属/汽车干扰、无网、冬夏温度、夜间亮度、相机上传、路线最后一公里和天气/现场一致性；完成证明依赖 EXT outdoor-device-field-validation。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.performance-slos"></a>
<!-- ty-source-item:start key=req-quality-release-observability-performance-slos kind=requirement -->
- **REQ performance-slos** [direct: S-ARCH 十八]：来源建议 SLO 为缓存首页 P75 ≤1.2s、非缓存 NightReport P95 ≤3s、地点列表 P95 ≤1s、API ≥99.9%、地图主流设备接近 60 FPS、天空最低 30/目标 60 FPS、崩溃会话率 <0.3%、离线包成功率 ≥99%、推送重复率 <0.1%、数据源新鲜度达标率 ≥99%；路线超时先回直线距离/缓存并异步补全。生产 SLO/测量窗口由 DEC production-slo-measurement 决定。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.dependency-ordered-delivery"></a>
<!-- ty-source-item:start key=req-quality-release-observability-dependency-ordered-delivery kind=requirement -->
- **REQ dependency-ordered-delivery** [direct: S-ARCH 二十一]：建设顺序先坐标/时区观星夜/领域模型/来源许可/Monorepo/API/移动构建/PostGIS，再天气/天文/光污染/地形/高德路线/地点，再小时条件/阻断/窗口/推荐/主备/NightReport，再行程/离线/现场/实况/摄影/通知，最后天空/AR/空间站天象/协作/贡献/校准学习；这是依赖顺序，不替代 MVP/V1/V2/V3 范围。
<!-- ty-source-item:end -->

<a id="quality-release-observability.requirement.platform-extension-boundary"></a>
<!-- ty-source-item:start key=req-quality-release-observability-platform-extension-boundary kind=requirement -->
- **REQ platform-extension-boundary** [direct: S-PRODUCT 十二, S-USER]：本 Source Plan 的最终完成形态是 APP；PWA 仅可用于早期数据/推荐/字段/界面验证，小程序仅后续承担分享、轻查询、邀请和拉新，不需全专业能力且不能作为 APP 完成证明。
<!-- ty-source-item:end -->

#### User Flow And States

- 发布：构建变更 → 判断 JS-only/原生 → 选择通道/runtime → 自动/人工测试证据 → internal/staging 验证 → 灰度 production → 观察 SLO/崩溃/数据 → 推进或回滚。
- 事故：告警 → 关联 trace/版本/ProviderRun/地区 → 降级/熔断/暂停规则或发布 → 恢复 → 对账/重放 → 复盘/runbook 更新。
- 恢复：选择时间点/对象版本 → 隔离环境恢复 → 完整性/引用/敏感权限校验 → 演练报告；不得第一次在生产事故中验证备份。
- 产品测量：同意后记录粗粒度事件 → 漏斗/指标按稳定口径聚合 → 与现场反馈/数据质量关联 → 不以增长指标压过安全/可信度。

#### Controls And Product Feedback

<a id="quality-release-observability.control.release-promotion-gate"></a>
- **CTRL release-promotion-gate**
  - Source class: direct channels/runtime boundary；control derived。
<!-- ty-source-item:start key=ctrl-quality-release-observability-release-promotion-gate-location kind=control -->
  - Location: CI/CD 或发布工作台。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-quality-release-observability-release-promotion-gate-user-task kind=requirement -->
  - User task: 将特定 APP/API/worker/admin 版本从 internal/staging 推向 production 或回滚。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-release-promotion-gate-trigger kind=control -->
  - Trigger: 选择构建/变更集并请求晋级。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-release-promotion-gate-input kind=control -->
  - Input: git/build ID、runtimeVersion、原生模块 diff、迁移、测试/安全/许可证据、SLO 基线和审批。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-release-promotion-gate-loading kind=control -->
  - Loading: 构建/检查/灰度状态持续可见且可安全停止。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-release-promotion-gate-empty kind=control -->
  - Empty: 缺任何必需证据时 disabled 并列明，不允许口头绕过。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-release-promotion-gate-success kind=control -->
  - Success: 版本、通道、作用域、时间和回滚点可追溯；原生不兼容不会 OTA。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-release-promotion-gate-failure kind=control -->
  - Failure: 保持上个稳定版本，失败阶段/日志/恢复动作明确。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-release-promotion-gate-feedback kind=control -->
  - Feedback: JS-only/原生、数据迁移、用户范围和 OTA/二进制类型在确认前突出。
<!-- ty-source-item:end -->

<a id="quality-release-observability.control.technical-observability-dashboard"></a>
- **CTRL technical-observability-dashboard**
  - Source class: direct metrics；dashboard derived。
<!-- ty-source-item:start key=ctrl-quality-release-observability-technical-observability-dashboard-location kind=control -->
  - Location: 运行监控。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-quality-release-observability-technical-observability-dashboard-user-task kind=requirement -->
  - User task: 按环境/版本/平台/地区追踪性能、错误和依赖。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-technical-observability-dashboard-trigger kind=control -->
  - Trigger: 告警深链、筛选或选择 trace/时间窗口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-technical-observability-dashboard-input kind=control -->
  - Input: REQ technical-observability 全量信号、release/runtime/provider/job correlation。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-technical-observability-dashboard-loading kind=control -->
  - Loading: 上次完整窗口保留并标 stale，查询可取消。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-technical-observability-dashboard-empty kind=control -->
  - Empty: 无数据被标成遥测缺口，不解释为 0 错误。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-technical-observability-dashboard-success kind=control -->
  - Success: 从 SLO/错误下钻到 trace/依赖/版本并保持脱敏。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-technical-observability-dashboard-failure kind=control -->
  - Failure: 监控管线故障有独立健康信号和备用查询。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-technical-observability-dashboard-feedback kind=control -->
  - Feedback: 分母/窗口/采样、阈值和数据延迟可见；精确位置/secret 不展示。
<!-- ty-source-item:end -->

<a id="quality-release-observability.control.data-quality-dashboard"></a>
- **CTRL data-quality-dashboard**
  - Source class: direct。
<!-- ty-source-item:start key=ctrl-quality-release-observability-data-quality-dashboard-location kind=control -->
  - Location: 运行监控与后台数据质量。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-quality-release-observability-data-quality-dashboard-user-task kind=requirement -->
  - User task: 发现并定位数据迟到、缺失、越界、偏差和推荐波动。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-data-quality-dashboard-trigger kind=control -->
  - Trigger: 告警、选择问题/来源/地区/版本。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-data-quality-dashboard-input kind=control -->
  - Input: REQ data-observability 全部检查、样本、阈值、受影响对象和 runbook。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-data-quality-dashboard-loading kind=control -->
  - Loading: 最后成功检查/覆盖保持并标时间。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-data-quality-dashboard-empty kind=control -->
  - Empty: 检查未运行或样本不足显示 unknown，不显示健康。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-data-quality-dashboard-success kind=control -->
  - Success: 问题有状态、严重度、范围、来源版本、负责人待绑定和恢复验证入口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-data-quality-dashboard-failure kind=control -->
  - Failure: 检查系统失败本身触发告警且不压掉已有问题。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-data-quality-dashboard-feedback kind=control -->
  - Feedback: 模型分歧与供应商缺失、预测偏差与现场样本量、频繁变化与真实更新分开。
<!-- ty-source-item:end -->

<a id="quality-release-observability.control.backup-restore-exercise"></a>
- **CTRL backup-restore-exercise**
  - Source class: direct recovery requirement；workflow derived。
<!-- ty-source-item:start key=ctrl-quality-release-observability-backup-restore-exercise-location kind=control -->
  - Location: 运维恢复工作台/runbook 入口。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-quality-release-observability-backup-restore-exercise-user-task kind=requirement -->
  - User task: 在隔离环境验证数据库/对象/关键地点备份可恢复。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-backup-restore-exercise-trigger kind=control -->
  - Trigger: 定期演练、变更后或事故恢复授权。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-backup-restore-exercise-input kind=control -->
  - Input: 备份点、目标时间、环境、数据集/对象版本、RPO/RTO 和验证清单。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-backup-restore-exercise-loading kind=control -->
  - Loading: 复制/恢复/校验阶段、耗时和取消边界可见。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-backup-restore-exercise-empty kind=control -->
  - Empty: 无符合目标备份时立即失败并告警，不创建假成功报告。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-backup-restore-exercise-success kind=control -->
  - Success: 完整性、引用、坐标权限、对象版本和实际 RPO/RTO 有证据。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-backup-restore-exercise-failure kind=control -->
  - Failure: 隔离失败不触碰生产，记录缺口/修复/复测计划。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-backup-restore-exercise-feedback kind=control -->
  - Feedback: 明确这是演练/真实恢复、目标环境和任何可能写入影响。
<!-- ty-source-item:end -->

<a id="quality-release-observability.control.product-metrics-dashboard"></a>
- **CTRL product-metrics-dashboard**
  - Source class: direct metrics；dashboard derived。
<!-- ty-source-item:start key=ctrl-quality-release-observability-product-metrics-dashboard-location kind=control -->
  - Location: 产品/数据后台。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=req-quality-release-observability-product-metrics-dashboard-user-task kind=requirement -->
  - User task: 查看闭环漏斗、北极星和辅助指标并理解质量/隐私边界。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-product-metrics-dashboard-trigger kind=control -->
  - Trigger: 选择日期/版本/粗地区/用户模式和指标。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-product-metrics-dashboard-input kind=control -->
  - Input: 同意后的稳定事件、口径版本、排除规则、数据质量和延迟。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-product-metrics-dashboard-loading kind=control -->
  - Loading: 上一口径结果保留并标数据截至时间。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-product-metrics-dashboard-empty kind=control -->
  - Empty: 样本不足/同意不足显示不可判断，不回推精确用户位置。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-product-metrics-dashboard-success kind=control -->
  - Success: 漏斗八步、北极星和十项辅助指标有分母、趋势、版本和质量标记。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-product-metrics-dashboard-failure kind=control -->
  - Failure: 事件 schema/管线异常显示影响区间并阻止错误决策。
<!-- ty-source-item:end -->
<!-- ty-source-item:start key=ctrl-quality-release-observability-product-metrics-dashboard-feedback kind=control -->
  - Feedback: 指标变化与发布/规则/数据源相关联，但相关性不被自动宣称因果。
<!-- ty-source-item:end -->

#### Technical Obligations And Boundaries

<a id="quality-release-observability.obligation.coordinate-time-types"></a>
<!-- ty-source-item:start key=obl-quality-release-observability-coordinate-time-types kind=technical_obligation -->
- **OBL coordinate-time-types** [direct: S-ARCH 19.3～19.4]：WGS84/GCJ-02 用 branded 类型而非普通 number tuple；服务统一 UTC、地点 IANA 时区、观星夜按当地日落日期，API 拒绝无时区时间字符串，并测试 DST/跨午夜/用户与地点异地。
<!-- ty-source-item:end -->

<a id="quality-release-observability.obligation.release-runtime-compatibility"></a>
<!-- ty-source-item:start key=obl-quality-release-observability-release-runtime-compatibility kind=technical_obligation -->
- **OBL release-runtime-compatibility** [direct: S-ARCH 十四]：每个构建记录 native runtime/JS bundle/schema/API 合约兼容范围；OTA 服务端阻止发给不兼容 runtime，回滚不跨越不可逆数据迁移。
<!-- ty-source-item:end -->

<a id="quality-release-observability.obligation.design-and-accessibility-qa"></a>
<!-- ty-source-item:start key=obl-quality-release-observability-design-and-accessibility-qa kind=technical_obligation -->
- **OBL design-and-accessibility-qa** [direct + repo evidence: S-DESIGN/S-CONTEXT/S-INTERACTION]：按 DESIGN.md 的日/夜/红光 token、结论→行动→证据层级、390×844 主视口、44px 目标、安全区、文本放大、屏幕阅读器、颜色非唯一、reduced motion、稳定 loading/empty/error/stale/disabled/saving/success 状态做视觉/交互验收；所有 UI/动效任务加载 S-INTERACTION 作为 RN 实现伴随指南，但 DESIGN.md/本计划/Context 是完整上位权威，Skill 对它们是单向依赖、冲突时无权覆盖；参考图/S-APPLE 不构成视觉复制或平台同质化权威。
<!-- ty-source-item:end -->

<a id="quality-release-observability.obligation.interaction-runtime-evidence"></a>
<!-- ty-source-item:start key=obl-quality-release-observability-interaction-runtime-evidence kind=technical_obligation -->
- **OBL interaction-runtime-evidence** [derived from S-DESIGN/S-INTERACTION/S-RESEARCH]：交互验收同时包含纯状态/快照点决策单测、组件语义/取消/reduced-motion 分支、地图/Sheet/滚动/系统 back 集成、慢放/逐帧跳变与速度接缝审查、VoiceOver/TalkBack、文本放大、触觉开关/不可用、代表性 iPhone 与低端/高刷新 Android、低电/相机传感器影响以及暗环境红光亮度；静态截图、Skill/文档 lint、模拟器或单一 FPS 数字不能证明物理交互完成。
<!-- ty-source-item:end -->

<a id="quality-release-observability.non-completing.lab-only-release"></a>
<!-- ty-source-item:start key=ncomp-quality-release-observability-lab-only-release kind=non_completing -->
- **NCOMP lab-only-release** [direct: S-ARCH 17.5]：只有模拟器/单元测试、没有真实双端设备/弱网/断网/传感器/低亮/户外验证，不能算生产 APP 质量完成。
<!-- ty-source-item:end -->

<a id="quality-release-observability.non-completing.overengineered-platform"></a>
<!-- ty-source-item:start key=ncomp-quality-release-observability-overengineered-platform kind=non_completing -->
- **NCOMP overengineered-platform** [direct: S-ARCH 1.3/19.9]：在没有规模/隔离证据时先上大量微服务、Kafka/Kubernetes，并因此推迟坐标/数据/决策闭环，不能算合理架构完成。
<!-- ty-source-item:end -->

#### Implementation Hints

- **HINT repository-layout**：S-ARCH 提供的 Monorepo 树是概念提示，不是本 Source Plan 绑定路径；后续 Contract 应先扫描现仓库再落位。
- **HINT slo-budgeting**：SLO 仪表盘同时保留版本、平台、网络、缓存命中与样本数，避免聚合平均掩盖尾延迟。

#### Acceptance Scenarios

<a id="quality-release-observability.acceptance.architecture-baseline"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-architecture-baseline kind=acceptance -->
- **AC architecture-baseline**
  - Accepts: REQ technology-baseline, REQ modular-monolith-topology, REQ monorepo-shape, OBL mobile-layering, NCOMP overengineered-platform
  - Given: 团队开始绑定真实工程结构和首个端到端切片。
  - When: 审查架构/依赖/模块边界。
  - Then: 双端 APP、原生适配、模块化单体、工作进程、共享契约/领域包和概念仓库范围均被保留，且未无证据引入微服务平台。
<!-- ty-source-item:end -->

<a id="quality-release-observability.acceptance.official-source-production-gates"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-official-source-production-gates kind=acceptance -->
- **AC official-source-production-gates**
  - Accepts: REQ official-source-production-gates, REQ provider-source-registry, REQ qualified-lowest-tco-selection, REQ astronomy-geo-pipelines, OBL source-data-immutability, OBL provider-cost-and-quota-ledger
  - Given: 后续 Contract 准备绑定天气、高德、VIIRS、DEM、星表/卫星、推送和对象存储/CDN 的生产实现。
  - When: 按 S-RESEARCH 和当前官方页面执行依赖锁定、采购/许可、数据下载加工与 production readiness 审查。
  - Then: 每项均保留实际 provider/version/条款/价格/quota/SLA/归属/cache/派生/再分发/region/checksum/lineage、真实性/首发区稳定性/许可/降级硬门、同能力 12 个月 TCO、预算与对应 DEC/EXT/POC 证据；`recommended` 未被写成已采购，动态事实已重取，未合格项只降级或保持 pending，合格项中未选择更贵方案而无批准的增量价值说明。
<!-- ty-source-item:end -->

<a id="quality-release-observability.acceptance.interaction-direct-manipulation"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-interaction-direct-manipulation kind=acceptance -->
- **AC interaction-direct-manipulation**
  - Accepts: REQ interaction-motion-contract, OBL interaction-runtime-evidence
  - Given: 一个地点 Marker 可打开带合法 snap points 的 Bottom Sheet，地点/路线尚未发生新的有效提交。
  - When: 用户 press 后拖动 Sheet，释放触发 settle，并在 settle 期间反向重抓或取消本次输入。
  - Then: press-in 立即反馈、有效 commit 只发生一次、取消不触发动作；Sheet 保持抓取偏移、从 live presentation value 无跳变地中断/反向，释放速度只选择合法边界，地点/路线提交状态不与画面分叉。
<!-- ty-source-item:end -->

<a id="quality-release-observability.acceptance.interaction-gesture-arbitration"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-interaction-gesture-arbitration kind=acceptance -->
- **AC interaction-gesture-arbitration**
  - Accepts: REQ interaction-motion-contract, OBL interaction-runtime-evidence
  - Given: 地图上方的 Bottom Sheet 同时包含可滚动内容，并运行于启用 iOS 导航手势或 Android system/predictive back 的目标设备。
  - When: 用户分别从地图、Sheet handle、Sheet 内容和系统 back 区域开始对应手势。
  - Then: map pan/pinch、sheet drag、nested scroll 与系统 back 各由预定 owner 接收，任何自定义手势都不静默抢占系统/辅助技术输入；关闭后焦点与可访问替代动作仍可恢复原任务。
<!-- ty-source-item:end -->

<a id="quality-release-observability.acceptance.interaction-accessibility-variants"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-interaction-accessibility-variants kind=acceptance -->
- **AC interaction-accessibility-variants**
  - Accepts: REQ interaction-motion-contract, OBL design-and-accessibility-qa, OBL interaction-runtime-evidence
  - Given: 用户开启 reduced motion、屏幕阅读器和 200% 文本，并关闭触觉或使用不支持触觉的设备。
  - When: 用户完成同一个地点选择、Sheet 展开和异步路线结果流程。
  - Then: 大位移/景深/弹性有静态或短淡变替代，关键内容/单位/动作不裁切，角色/值/焦点/完成或失败播报可用，视觉与语义反馈在无触觉时仍完整且不逐帧刷屏。
<!-- ty-source-item:end -->

<a id="quality-release-observability.acceptance.interaction-red-light-continuity"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-interaction-red-light-continuity kind=acceptance -->
- **AC interaction-red-light-continuity**
  - Accepts: REQ interaction-motion-contract, OBL design-and-accessibility-qa, OBL interaction-runtime-evidence
  - Given: APP 已在暗环境低亮度红光模式中保留一个选中地点和路线任务。
  - When: 用户打开/关闭 Sheet、调出键盘、看到 loading/error，并在原生地图或系统权限表面之间往返。
  - Then: 任务/选择状态与规划模式一致，Starward 可控表面无蓝或亮白闪、亮度变化受控；不可控系统/地图法务表面被识别并采用事前提示或安全降级，而不是伪装成可完全着色。
<!-- ty-source-item:end -->

<a id="quality-release-observability.acceptance.environment-production-isolation"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-environment-production-isolation kind=acceptance -->
- **AC environment-production-isolation**
  - Accepts: REQ environment-isolation, REQ production-topology
  - Given: staging 运行媒体/通知/地理任务并执行测试登录。
  - When: 检查其数据库、Redis、Bucket、key、证书和 OAuth。
  - Then: 与 production 完全隔离，测试通知/数据无法到达真实用户，生产拓扑各资源角色有健康与故障域。
<!-- ty-source-item:end -->

<a id="quality-release-observability.acceptance.china-compliance-readiness"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-china-compliance-readiness kind=acceptance -->
- **AC china-compliance-readiness**
  - Accepts: REQ china-production-compliance
  - Given: 当前候选只执行机器交付，尚未进入中国 production promotion，且 EXT china-production-legal-readiness 暂时无法取得。
  - When: 执行当前交付边界审查。
  - Then: ICP、地图、跨境、存储/CDN和个人信息覆盖项以 `pending`、`releaseBlocked=true` 和具体所需证据记录，产品与报告不得宣称 production-ready；后续 production promotion 仍须取得完整外部确认。
<!-- ty-source-item:end -->

<a id="quality-release-observability.acceptance.restore-objectives"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-restore-objectives kind=acceptance -->
- **AC restore-objectives**
  - Accepts: REQ backup-recovery, CTRL backup-restore-exercise
  - Given: 隔离演练选择一个接近目标 RPO 的时间点并包含数据库/对象/地点导出。
  - When: 完成恢复和完整性校验。
  - Then: 实测 RPO/RTO、引用/权限/对象版本和失败项有证据；Redis 缺失不造成真值丢失。
<!-- ty-source-item:end -->

<a id="quality-release-observability.acceptance.native-release-boundary"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-native-release-boundary kind=acceptance -->
- **AC native-release-boundary**
  - Accepts: REQ mobile-build-release, CTRL release-promotion-gate, OBL release-runtime-compatibility
  - Given: 变更新增一个高德原生模块接口。
  - When: 尝试通过 EAS Update 推送给旧 runtime。
  - Then: 晋级门阻止 OTA，要求新双端二进制/runtimeVersion；JS-only 兼容修复才可按通道灰度/回滚。
<!-- ty-source-item:end -->

<a id="quality-release-observability.acceptance.security-baseline"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-security-baseline kind=acceptance -->
- **AC security-baseline**
  - Accepts: REQ api-security-baseline
  - Given: 未授权客户端重放签名请求、滥用上传凭证并尝试读取日志中的 key。
  - When: 安全测试执行。
  - Then: HTTPS/签名或幂等/限流/WAF/短期凭证/扫描生效，secret 不在客户端 JS/日志/仓库，后台敏感修改受 MFA/审计。
<!-- ty-source-item:end -->

<a id="quality-release-observability.acceptance.observability-correlation"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-observability-correlation kind=acceptance -->
- **AC observability-correlation**
  - Accepts: REQ technical-observability, REQ data-observability, CTRL technical-observability-dashboard, CTRL data-quality-dashboard
  - Given: 某版本地图瓦片失败上升且一个天气模型字段缺失。
  - When: 告警触发并下钻。
  - Then: 技术问题关联版本/平台/trace，数据问题关联 ProviderRun/地区/受影响报告；无数据不显示健康且遥测不含精确位置。
<!-- ty-source-item:end -->

<a id="quality-release-observability.acceptance.analytics-funnel"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-analytics-funnel kind=acceptance -->
- **AC analytics-funnel**
  - Accepts: REQ analytics-funnel-events, REQ product-metrics, CTRL product-metrics-dashboard
  - Given: 同意分析的用户完成从打开到现场反馈，另一用户撤回同意。
  - When: 指标窗口聚合。
  - Then: 第一用户按稳定口径进入八步漏斗/北极星，撤回后的事件按策略停止；仪表盘展示分母/版本/数据质量且不含精确位置。
<!-- ty-source-item:end -->

<a id="quality-release-observability.acceptance.test-coverage"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-test-coverage kind=acceptance -->
- **AC test-coverage**
  - Accepts: REQ test-pyramid, REQ astronomy-golden-tests, REQ outdoor-validation, OBL coordinate-time-types, NCOMP lab-only-release
  - Given: 当前机器交付运行于可用的 Windows/Android 环境，iOS、代表性双端真机、弱无网、低电低亮和户外条件暂时无法取得。
  - When: 执行当前候选验证并审查完整 release matrix。
  - Then: 当前环境可执行的单元、结构化、UI 与 Android 模拟器证据通过；不可执行及需外部权威/供应商的行保持 `pending`、样本数为 0、写明所需证据并保持 production release blocked，模拟器不得冒充 EXT outdoor-device-field-validation。
<!-- ty-source-item:end -->

<a id="quality-release-observability.acceptance.slo-evaluation"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-slo-evaluation kind=acceptance -->
- **AC slo-evaluation**
  - Accepts: REQ performance-slos, OBL approved-production-slo-measurement
  - Given: 数据源/供应商调研、十项指标口径和遥测维度已完成，但尚无代表性预发/生产流量和连续 30 天真实基线。
  - When: 按 DEC production-slo-measurement 审查当前机器交付。
  - Then: 十项指标均有可执行测量契约、分层维度和明确取证入口，报告以 `pending-production-measurement`、样本数 0 和 `releaseBlocked=true` 如实记录；不得宣称 production SLO/SLA，部署后仍须按 28 天窗口和连续 30 天基线完成复验。
<!-- ty-source-item:end -->

<a id="quality-release-observability.acceptance.delivery-order-and-platform"></a>
<!-- ty-source-item:start key=ac-quality-release-observability-delivery-order-and-platform kind=acceptance -->
- **AC delivery-order-and-platform**
  - Accepts: REQ dependency-ordered-delivery, REQ platform-extension-boundary, OBL design-and-accessibility-qa
  - Given: 长程工作流拆解 APP、PWA 验证或小程序分享工作。
  - When: 排序并验收交付批次。
  - Then: 不可返工基础先于数据/决策/闭环/专业生态，APP 是最终完成形态，辅助平台不替代它，所有用户界面遵守项目 Design/a11y/状态规则。
<!-- ty-source-item:end -->

#### Risks And Recovery

<a id="quality-release-observability.risk.release-critical-path"></a>
<!-- ty-source-item:start key=risk-quality-release-observability-release-critical-path kind=risk_fact fact=critical_user_path outcome=quality-release-observability -->
- **RISK release-critical-path**
  - Fact: critical_user_path
  - Affected Outcome: quality-release-observability
  - Basis: 首页结论、路线、离线、方向和安全通知是户外夜间决策关键路径，错误发布可能直接影响行动。
  - Consequence: 必须分通道、灰度、可回滚、SLO/数据质量观测和真实场景证据，不可一次全量无保护发布。
<!-- ty-source-item:end -->

<a id="quality-release-observability.risk.runtime-migration"></a>
<!-- ty-source-item:start key=risk-quality-release-observability-runtime-migration kind=risk_fact fact=data_migration outcome=quality-release-observability -->
- **RISK runtime-migration**
  - Fact: data_migration
  - Affected Outcome: quality-release-observability
  - Basis: APP runtime、SQLite/离线包和服务端 schema 在 OTA/二进制/后端独立发布时可能不兼容。
  - Consequence: 兼容矩阵、前后向契约、迁移演练和回滚边界须在晋级门验证，OTA 不跨不可逆迁移。
<!-- ty-source-item:end -->

<a id="quality-release-observability.risk.observability-gap"></a>
<!-- ty-source-item:start key=risk-quality-release-observability-observability-gap kind=risk_fact fact=weak_observability outcome=quality-release-observability -->
- **RISK observability-gap**
  - Fact: weak_observability
  - Affected Outcome: quality-release-observability
  - Basis: 技术成功不等于天气/地点/推荐正确，且户外/设备/供应商条件难在实验室完全再现。
  - Consequence: 技术 trace、数据质量、推荐重放、现场反馈、黄金集和户外验证必须关联，单一监控绿灯不能证明产品可靠。
<!-- ty-source-item:end -->

## 6. Cross-Outcome Constraints

<a id="cross-outcome.obligation.shared-decision-context"></a>
<!-- ty-source-item:start key=global-obl-shared-decision-context kind=technical_obligation -->
- **OBL shared-decision-context** [direct + repo evidence: S-PRODUCT 闭环, S-CONTEXT]：当前位置/手动出发地、观星夜/时刻、当前偏好、观测目标、选中地点、主备角色、路线方案、行程 revision、数据新鲜度和风险是共享决策上下文；今晚、地图、详情、行程、天空、摄影和现场切换时必须原子更新或显式标 stale，不能各页维护互相矛盾副本。
<!-- ty-source-item:end -->

<a id="cross-outcome.obligation.conclusion-action-evidence-hierarchy"></a>
<!-- ty-source-item:start key=global-obl-conclusion-action-evidence-hierarchy kind=technical_obligation -->
- **OBL conclusion-action-evidence-hierarchy** [direct: S-PRODUCT 八, S-DESIGN]：用户面产品统一按第一层“今晚是否值得/何时何地”、第二层“出发/导航/主备/提醒”等可执行建议、第三层天气/天文/光污染/路线/来源专业证据组织；高级数据按需展开，安全阻断始终越级可见。
<!-- ty-source-item:end -->

<a id="cross-outcome.obligation.data-state-and-provenance"></a>
<!-- ty-source-item:start key=global-obl-data-state-and-provenance kind=technical_obligation -->
- **OBL data-state-and-provenance** [direct: S-ARCH 7.1/9.4, S-PRODUCT 风险]：所有影响决策的数据/结论能表示 loading、fresh、stale、partial、degraded、unknown、error，显示 generatedAt/expiresAt、来源/许可、版本、可信度、warnings 和缓存/缺失；预测/估算/用户实况/人工核验不能混成确定事实。
<!-- ty-source-item:end -->

<a id="cross-outcome.obligation.time-coordinate-unit-consistency"></a>
<!-- ty-source-item:start key=global-obl-time-coordinate-unit-consistency kind=technical_obligation -->
- **OBL time-coordinate-unit-consistency** [direct: S-ARCH 6.1/7.1/19.3～19.4]：存储与计算用 WGS84、UTC、地点 IANA 时区和国际单位，观星夜按当地日落日期；展示可本地化单位但 API/缓存/离线/分享保留原单位/时区/坐标语义，禁止无时区时间或无品牌坐标 tuple。
<!-- ty-source-item:end -->

<a id="cross-outcome.obligation.permission-and-privacy-minimization"></a>
<!-- ty-source-item:start key=global-obl-permission-and-privacy-minimization kind=technical_obligation -->
- **OBL permission-and-privacy-minimization** [direct: S-ARCH 3.5/15]：登录、精确/后台位置、相机/相册、通知、联系人、AR 和外部分享按任务最小化、即时说明、拒绝可降级/撤回；服务端执行坐标/对象/字段权限，精确位置/轨迹/EXIF/secret 不进分析、普通日志或公开产物。
<!-- ty-source-item:end -->

<a id="cross-outcome.obligation.offline-critical-continuity"></a>
<!-- ty-source-item:start key=global-obl-offline-critical-continuity kind=technical_obligation -->
- **OBL offline-critical-continuity** [direct: S-ARCH 3.3～3.4]：现场关键读取本地优先，网络刷新不清空可用缓存；离线写入本地事务与幂等队列，断网/杀进程/重启后可恢复；同步失败/冲突逐项可见，不能用在线专属页面壳声称离线完成。
<!-- ty-source-item:end -->

<a id="cross-outcome.obligation.accessible-responsive-themes"></a>
<!-- ty-source-item:start key=global-obl-accessible-responsive-themes kind=technical_obligation -->
- **OBL accessible-responsive-themes** [repo evidence + necessary derivation: S-DESIGN/S-CONTEXT]：所有 APP 页面以 390×844 为主要基线并适配更小/更大手机、安全区、横竖屏（仅适用沉浸工具）、文本放大和键盘；44px 目标、屏幕阅读器顺序/名称、颜色非唯一、reduced motion、日/夜/红光对比与稳定布局必须覆盖 loading/empty/no-results/error/disabled/saving/success。
<!-- ty-source-item:end -->

<a id="cross-outcome.obligation.versioned-recoverable-change"></a>
<!-- ty-source-item:start key=global-obl-versioned-recoverable-change kind=technical_obligation -->
- **OBL versioned-recoverable-change** [direct: S-ARCH 5.11/7.1/11.2]：外部数据、地点事实、推荐、行程、摄影、规则和审核变更保留来源/版本；写入有幂等键/revision，冲突显式，批量/危险变更先影响预览并有恢复/回滚边界；不得静默覆盖用户编辑或有效原始数据。
<!-- ty-source-item:end -->

<a id="cross-outcome.obligation.release-phase-integrity"></a>
<!-- ty-source-item:start key=global-obl-release-phase-integrity kind=technical_obligation -->
- **OBL release-phase-integrity** [direct: S-PRODUCT 十～十二]：MVP/V1/V2/V3 范围按 Section 3 保存；提前实现后续能力可以，但不得让 V2/V3 空壳成为 MVP 前置，也不得因后续目标尚未实现而把 MVP 的外部导航/简单行程/基础摄影/轻贡献降为静态占位；最终产品形态仍为 RN APP。
<!-- ty-source-item:end -->

### Cross-Outcome Acceptance Scenarios

<a id="cross-outcome.acceptance.context-atomicity"></a>
<!-- ty-source-item:start key=global-ac-context-atomicity kind=acceptance -->
- **AC context-atomicity**
  - Accepts: OBL shared-decision-context, OBL conclusion-action-evidence-hierarchy
  - Given: 用户在地图把备选 B 设为主地点并把时刻改到月落后。
  - When: 随后进入今晚、地点、行程、天空、摄影和现场。
  - Then: 各处共享 B/新时刻/路线与风险或明确标尚未重算，首层结论/行动和下钻证据不互相矛盾。
<!-- ty-source-item:end -->

<a id="cross-outcome.acceptance.partial-data-language"></a>
<!-- ty-source-item:start key=global-ac-partial-data-language kind=acceptance -->
- **AC partial-data-language**
  - Accepts: OBL data-state-and-provenance
  - Given: 天气最新、路线缓存、光污染为年度估算且临时实况缺失。
  - When: 任一用户面组合这些数据形成结论。
  - Then: 四类状态/时间/来源/版本/可信度分别可见，partial/degraded 结论不使用保证性语言且能查看缺失影响。
<!-- ty-source-item:end -->

<a id="cross-outcome.acceptance.time-coordinate-consistency"></a>
<!-- ty-source-item:start key=global-ac-time-coordinate-consistency kind=acceptance -->
- **AC time-coordinate-consistency**
  - Accepts: OBL time-coordinate-unit-consistency
  - Given: 用户与地点跨时区、观星夜跨午夜且高德地图显示 GCJ-02。
  - When: 生成报告、路线、天空、离线包和分享摘要。
  - Then: 天文/天气/存储均用同一 WGS84/UTC/IANA 语义，展示本地时间/单位明确，高德转换不反写权威坐标且无无时区时间串。
<!-- ty-source-item:end -->

<a id="cross-outcome.acceptance.permission-denial-and-privacy"></a>
<!-- ty-source-item:start key=global-ac-permission-denial-and-privacy kind=acceptance -->
- **AC permission-denial-and-privacy**
  - Accepts: OBL permission-and-privacy-minimization
  - Given: 游客拒绝精确/后台位置、相机和通知。
  - When: 使用今晚、地图、天空和行程并打开相关增强入口。
  - Then: 手动位置/静态天空/前台计时/本地设置等允许降级可用，系统不循环请求权限，服务/日志/分析/分享没有越权精确数据。
<!-- ty-source-item:end -->

<a id="cross-outcome.acceptance.offline-restart-recovery"></a>
<!-- ty-source-item:start key=global-ac-offline-restart-recovery kind=acceptance -->
- **AC offline-restart-recovery**
  - Accepts: OBL offline-critical-continuity
  - Given: 用户断网记录实况并上传图片时 APP 被系统终止。
  - When: 重启后仍离线，再恢复网络。
  - Then: 关键缓存和草稿/队列恢复，写入按幂等键续传且失败/冲突可见，不重复发布或丢用户数据。
<!-- ty-source-item:end -->

<a id="cross-outcome.acceptance.accessible-mode-state"></a>
<!-- ty-source-item:start key=global-ac-accessible-mode-state kind=acceptance -->
- **AC accessible-mode-state**
  - Accepts: OBL accessible-responsive-themes
  - Given: 用户使用大字体、屏幕阅读器、reduced motion 和红光模式在小屏手机打开含错误/disabled 状态的地图或现场页。
  - When: 读取状态并操作主要控件。
  - Then: 安全区/内容/底部动作不重叠，焦点与名称有序、44px 目标可触、状态不只靠颜色且无高亮闪烁。
<!-- ty-source-item:end -->

<a id="cross-outcome.acceptance.versioned-conflict-recovery"></a>
<!-- ty-source-item:start key=global-ac-versioned-conflict-recovery kind=acceptance -->
- **AC versioned-conflict-recovery**
  - Accepts: OBL versioned-recoverable-change
  - Given: 用户编辑、管理员事实更新和后台重试同时涉及同一计划/地点引用。
  - When: revision 或业务键冲突发生。
  - Then: 原始/已保存版本保留，冲突/影响可预览并由授权流程解决，重试不重复覆盖且恢复点可追溯。
<!-- ty-source-item:end -->

<a id="cross-outcome.acceptance.release-scope-boundary"></a>
<!-- ty-source-item:start key=global-ac-release-scope-boundary kind=acceptance -->
- **AC release-scope-boundary**
  - Accepts: OBL release-phase-integrity
  - Given: MVP 排期同时出现 V3 AR 和小程序分享提案。
  - When: 后续长程工作流拆分交付范围。
  - Then: MVP 必做闭环保持可运行，V3/小程序可延后且不会以空壳阻塞；PWA/小程序不能替代 RN APP 的最终完成证明。
<!-- ty-source-item:end -->

## 7. External Confirmations

<a id="external.commercial-provider-rights-and-quotas"></a>
<!-- ty-source-item:start key=ext-commercial-provider-rights-and-quotas kind=external_confirmation -->
- **EXT commercial-provider-rights-and-quotas**
  - Status: external_confirmation_required。
  - Result requiring confirmation: QWeather 常规/预警/AQI/GeoAPI、Open-Meteo 商业分层云/多模型、其他卫星云图/备用天气、高德原生地图/定位/搜索/路线/POI/双端离线、APNs/FCM/国内厂商/Expo 推送以及 OSS/COS/CDN 具备目标地区/渠道的生产商业使用、缓存/历史保留、派生、再展示/再分发、配额/加权计费单位、SLA、归属和退出/删除许可；最低必要 SKU 的当日报价、币种/税费/最低消费、超额/续费/退出成本和 12 个月 TCO 可与等价合格候选比较。
  - Why external: API 文档与技术可行不构成购买合同、配额或再分发授权，仓库无法证明。
  - Evidence needed: 生效合同/计划、许可条款版本、允许用途/地区/缓存/派生、quota/rate limit/SLA、归属要求、密钥环境、退出/删除义务、价格页面/正式报价/订单、税费/汇率日期、加权用量和实际账单；供应商宣传或免费页面不能代替合同与目标区 POC。
  - Affected REQ / AC: REQ weather-map-layers, REQ route-map-planning, REQ provider-source-registry, REQ qualified-lowest-tco-selection, REQ provider-failure-controls, AC source-pipelines, AC qualified-lowest-tco-provider-selection, DEC weather-provider-contracts, DEC provider-budget-and-paid-redundancy。
<!-- ty-source-item:end -->

<a id="external.geospatial-catalog-content-licenses"></a>
<!-- ty-source-item:start key=ext-geospatial-catalog-content-licenses kind=external_confirmation -->
- **EXT geospatial-catalog-content-licenses**
  - Status: external_confirmation_required。
  - Result requiring confirmation: NSMC FY-4B/后续业务星或其他卫星云图、EOG Annual VNL v2.2、Copernicus DEM GLO-30/90（含 2026-07-28 后 CCM 访问/许可接受）、Gaia/其他星表、Astronomy Engine、CelesTrak OMM、JPL/NOAA 数据、地图底图/瓦片、NASA APOD/天文机构媒体及其 raw/COG/瓦片/动画/地平线/星表分块/离线包/截图的账号资格、自动化、许可、notice/credit、版本、修改标识和商业再分发范围适合目标地区/渠道；Himawari 等备用源不得越过 NMHS/研究/购买资格。
  - Why external: 数据集许可和在线服务规则会变化，派生/离线/商业分发权不能从本 Source Plan 推断。
  - Evidence needed: 官方许可/服务条款快照、来源与版本、商业/派生/缓存/离线/截图条款、必需 attribution、更新/撤下流程及法务确认。
  - Affected REQ / AC: REQ light-pollution-evidence, REQ astronomy-geo-pipelines, REQ educational-content, AC light-and-horizon, AC calendar-and-station, RISK dataset-license。
<!-- ty-source-item:end -->

<a id="external.china-production-legal-readiness"></a>
<!-- ty-source-item:start key=ext-china-production-legal-readiness kind=external_confirmation -->
- **EXT china-production-legal-readiness**
  - Status: external_confirmation_required。
  - Result requiring confirmation: 面向中国用户生产发布所需 ICP/应用备案（如适用）、地图与测绘边界、个人信息/敏感行踪单独同意、数据跨境/境内存储、CDN/对象存储、第三方 SDK 清单、隐私政策/条款/注销、未成年人/社群与地点安全责任边界均完成专业审查和实际配置。
  - Why external: 法律适用、主体资质、云区域、SDK/商店申报和政策文本依赖运营主体与最终供应商，不能由产品/代码自证。
  - Evidence needed: 法律/合规评审记录、备案/许可编号或不适用依据、数据流/SDK 清单、同意与保留表、跨境评估、政策版本和生产域/存储/CDN配置核验。
  - Affected REQ / AC: REQ china-production-compliance, REQ location-privacy-controls, REQ data-export, REQ account-deletion, AC china-compliance-readiness, DEC data-retention-deletion, DEC analytics-consent-policy。
<!-- ty-source-item:end -->

<a id="external.app-store-native-capability-readiness"></a>
<!-- ty-source-item:start key=ext-app-store-native-capability-readiness kind=external_confirmation -->
- **EXT app-store-native-capability-readiness**
  - Status: external_confirmation_required。
  - Result requiring confirmation: iOS/Android 目标商店和国内安卓渠道接受地图 SDK、自定义原生模块、前台/限时后台定位、通知、相机/相册、AR、传感器和 OAuth/微信登录的声明、用途与审核材料，并在目标真机/系统版本可用。
  - Why external: 商店政策、设备支持、证书/entitlement、厂商推送和 OAuth 审核是外部控制面，模拟器与源码无法证明。
  - Evidence needed: 支持设备/OS矩阵、权限用途文案、entitlement/证书/隐私清单、后台位置核心用途材料、厂商通道和 OAuth 审批、iOS back gesture/Android predictive back 与自定义手势兼容、internal/staging 真机安装及商店审核结果。
  - Affected REQ / AC: REQ permission-minimization, REQ optional-ar, REQ safety-session, REQ event-driven-evaluation, REQ auth-methods, AC ar-degradation, AC bounded-safety-session, AC long-term-controls, DEC supported-os-device-matrix。
<!-- ty-source-item:end -->

<a id="external.outdoor-device-field-validation"></a>
<!-- ty-source-item:start key=ext-outdoor-device-field-validation kind=external_confirmation -->
- **EXT outdoor-device-field-validation**
  - Status: external_confirmation_required。
  - Result requiring confirmation: 代表性 iOS/Android 真机在真实山区/郊外、车辆/金属干扰、弱网/无网、冬夏温度、夜间低亮/红光、低电、前后台、最后一公里和长时天空条件下达到可用/降级/恢复行为；交互同时覆盖 press/cancel、地图/Sheet/滚动/back 仲裁、中断/反向/速度接缝、VoiceOver/TalkBack、文本放大、reduced motion、触觉关闭/不可用和红光无闪。
  - Why external: GPS、磁场、AR、亮度、电量、网络和道路/天气现场真实性无法由自动测试或室内设备完全模拟。
  - Evidence needed: 场地/日期/天气、设备/OS/传感器矩阵、已知方位/路线基准、断网/恢复步骤、截图/日志/误差/电量结果、失败与复测记录；样本不能冒充全设备总体。
  - Affected REQ / AC: REQ orientation-guidance, REQ outdoor-validation, REQ performance-slos, AC low-accuracy-guidance, AC offline-field-use, AC test-coverage, RISK sensor-observability。
<!-- ty-source-item:end -->

<a id="external.astronomy-authoritative-validation"></a>
<!-- ty-source-item:start key=ext-astronomy-authoritative-validation kind=external_confirmation -->
- **EXT astronomy-authoritative-validation**
  - Status: external_confirmation_required。
  - Result requiring confirmation: 日月/行星/银河/晨昏/升中落/坐标转换和空间站结果在已声明适用范围、时标、海拔和容差内与 JPL Horizons 或另一个经确认权威基准一致。
  - Why external: 自有算法测试能证明一致性，不能自行定义“权威正确”或可接受科学容差。
  - Evidence needed: 基准来源/版本、黄金地点/时刻、容差理由、对比结果、例外（极区/折射/轨道过期）和天文领域审阅。
  - Affected REQ / AC: REQ astronomy-domain, REQ astronomy-golden-tests, REQ station-transits, AC astronomy-provenance, AC test-coverage, DEC observation-window-resolution。
<!-- ty-source-item:end -->

<a id="external.photography-device-expert-validation"></a>
<!-- ty-source-item:start key=ext-photography-device-expert-validation kind=external_confirmation -->
- **EXT photography-device-expert-validation**
  - Status: external_confirmation_required。
  - Result requiring confirmation: 手机/相机/镜头预设、确定性曝光/拖线/堆栈/视场规则在代表性设备和目标上合理、安全、可操作，AI 解释未改变核心规则或制造虚假保证。
  - Why external: 规则单测不能证明真实设备可设置、成像取舍或用户经验分层合理。
  - Evidence needed: 设备/镜头/目标/条件样本、规则版本、专家审阅、实拍设置与结果、不可控因素、偏差/修改记录和 AI/规则差异审计。
  - Affected REQ / AC: REQ mobile-output, REQ camera-output, REQ deterministic-first-ai, AC mobile-plan, AC camera-plan-and-risk, RISK parameter-observability。
<!-- ty-source-item:end -->

<a id="external.site-access-safety-verification"></a>
<!-- ty-source-item:start key=ext-site-access-safety-verification kind=external_confirmation -->
- **EXT site-access-safety-verification**
  - Status: external_confirmation_required。
  - Result requiring confirmation: 首批/MVP 地点的坐标、土地/开放/收费/门禁、停车/徒步/最后一公里、设施、光源/遮挡、潮汐/山路/治安/生态风险和坐标公开级别有可追溯的人工/现场核验。
  - Why external: 公开 POI、遥感与用户单条上传不能证明夜间通行、安全、私人土地许可或设施开放。
  - Evidence needed: 地点级核验记录、日期/来源/证据、权利人或官方信息（适用时）、现场路线/照片/精度、季节性/过期计划和高风险复核。
  - Affected REQ / AC: REQ last-mile-access, REQ facilities-and-emergency, REQ spot-safety, REQ coordinate-visibility, AC last-mile-and-facilities, AC safety-overrides-score, RISK field-truth-observability。
<!-- ty-source-item:end -->

## 8. Derived Content And Sources

- Derived Item: REQ global-state-language、OBL data-state-and-provenance 以及所有 CTRL 的 Loading/Empty/Failure/Feedback 独立状态。
  - Derived From: S-ARCH 9.4 的 freshness/partial/warnings/缓存/缺失语义，S-DESIGN/S-CONTEXT 的稳定布局与状态要求，以及各直接任务。
  - Reason: 如果不展开，后续可以用只覆盖成功态的静态页面声称控件完成，无法满足源文档的降级/可信度边界。
  - Changes product meaning: no；只把直接数据状态义务投影到用户可观察行为。

- Derived Item: REQ mobile-accessibility、OBL accessible-responsive-themes 和各控件的安全区/44px/大字体/屏幕阅读器/reduced motion 反馈。
  - Derived From: 仓库 S-DESIGN、S-CONTEXT 已有 390×844/44px/日夜红光/可访问性事实与 React Native APP 载体。
  - Reason: 同一已决定视觉/交互标准必须作用于新增的全量 APP 页面，否则 Source Plan 会授权不一致界面。
  - Changes product meaning: no；不新增业务能力或默认值。

- Derived Item: Section 4 的 APP 根壳、五入口页面区块顺序、二级 stack/sheet、沉浸地图/天空/现场和管理/分享表面布局索引。
  - Derived From: S-PRODUCT 五/十六的 IA 与页面关系、S-DESIGN/S-CONTEXT 的移动布局、各功能章节已明确的内容先后，以及 S-IMG-01～10 的交互证据。
  - Reason: 用户明确要求 Source Plan 细到 APP 基本布局；索引只是把已声明页面/控件组合成可导航层级，防止后续自行猜壳层。
  - Changes product meaning: no；未新增一级入口，未用参考图覆盖产品逻辑或视觉权威。

- Derived Item: CTRL primary-tab-bar、permission-step、preference-wizard、profile-switcher 的具体页面位置和状态。
  - Derived From: S-PRODUCT 五/6.1 的五入口与初次偏好、S-ARCH 3.5/15 的按需权限、S-DESIGN 的 APP 壳。
  - Reason: 导航与权限控件的放置/拒绝恢复会改变用户是否能完成直接要求，必须明确。
  - Changes product meaning: no；权限种类、字段和五入口均为直接来源。

- Derived Item: 今晚首页 CTRL 的上下文条、决策 hero、证据展开、目标时间线、地点卡和主备选择布局。
  - Derived From: S-PRODUCT 6.2/八的结论→建议→数据层级，S-IMG-01/02/10 的控件证据，S-DESIGN 的视觉权威。
  - Reason: 把来源给出的内容顺序细化为控件级任务与状态，防止专业矩阵占据新手首屏。
  - Changes product meaning: no；参考图只影响布局模式，不复制品牌/文案/数值或更改产品逻辑。

- Derived Item: REQ map-selection-coordination，以及 CTRL map-search-context-bar、map-filter-sheet、map-marker-density-surface、selected-spot-sheet 和 route-plan-editor 的协调/恢复行为。
  - Derived From: S-PRODUCT 6.4/6.7、S-CONTEXT 的共享地点/时间/路线状态，S-IMG-02/05～07 的地图—卡片—路线交互。
  - Reason: 地图选择若不与卡片/主备/行程原子协调，会产生来源明确禁止的错误执行方案。
  - Changes product meaning: no；没有新增筛选、路线类型或业务默认。

- Derived Item: CTRL evidence-section-nav、spot-media-gallery、horizon-polar-view、access-facility-fact-list、safety-block、trust-panel 和 spot-action-dock 的分区/吸顶/全屏/固定动作模式。
  - Derived From: S-PRODUCT 6.5 的 A～J 长详情结构、S-IMG-02/08/09 和 S-DESIGN。
  - Reason: 在手机视口中保持全部直接字段可找到并让风险高于评分，需要可导航的控件分区。
  - Changes product meaning: no；不删减/新增地点事实。

- Derived Item: 行程 CTRL 的 library/form/tabs/overview/timeline/candidate/route/version-share/collaboration 控件状态。
  - Derived From: S-PRODUCT 6.7、S-ARCH 5.10～5.11 和 S-IMG-03～07。
  - Reason: 把直接定义的总览/阶段/待规划/地图/版本/协作任务拆成可独立验收控件，并保留 V2 边界。
  - Changes product meaning: no；未把图文导入或协作提前为 MVP。

- Derived Item: 天空/摄影/现场页面的 object panel、方向精度/校准、结果 hierarchy、sticky save、工具 grid、离线队列与安全分享确认。
  - Derived From: S-PRODUCT 6.8～6.10、S-ARCH 3.3～3.7/5.13/15，以及权限/不可逆外发风险。
  - Reason: 直接能力只有在传感器异常、AI 失败、无网和外发前确认下仍可观察/恢复才完整。
  - Changes product meaning: no；所有传感器、参数、工具和安全动作来自 Source，未选择未授权阈值。

- Derived Item: REQ notification-explainability 与通知深链过期/反转状态。
  - Derived From: S-PRODUCT 九的条件通知、S-ARCH 5.14 的事件评估，以及全局推荐可解释/数据新鲜度要求。
  - Reason: 通知在打开时可能已过期；如果不保存触发快照并对比当前状态，会把历史条件错误呈现为当前建议。
  - Changes product meaning: no；不新增通知类别或触发阈值。

- Derived Item: REQ guest-upgrade 的本地数据合并预览和 CTRL guest-data-merge。
  - Derived From: S-ARCH 15.2 的游客基础查询、5.1 的账号/会话，以及 3.3/3.4 已要求的本地偏好/行程/待上传持久化。
  - Reason: 从游客登录若无明确合并/冲突路径会静默丢失或覆盖已要求保存的数据。
  - Changes product meaning: no；哪些动作需登录仍由 DEC guest-auth-capability-matrix 决定。

- Derived Item: 社区/通知/个人中心的 status center、rule editor、content library、privacy/export flow 等管理控件。
  - Derived From: S-PRODUCT 6.11～6.13/九、S-ARCH 的审核/同步/账号/隐私状态。
  - Reason: 用户必须能观察异步上传、审核、订阅、导出和删除是否成功，不能把后台作业当即时完成。
  - Changes product meaning: no；没有决定审核阈值、删除保留或通知默认。

- Derived Item: 管理/运行侧的 job console、replay/release control、observability/data-quality/metrics dashboard、release gate 和 restore exercise 控件。
  - Derived From: S-ARCH 5.15/11/13～18 与 S-PRODUCT 十三/十四的直接运营、重放、发布、监控、恢复要求。
  - Reason: 这些高风险义务只有通过可观察、可暂停/重放/审计的操作面才能被后续 Contract 独立绑定与验收。
  - Changes product meaning: no；实际工具、owner、路径、runner、审批人和证明仍未绑定。

- Derived Item: OBL shared-decision-context 和跨 Outcome 原子/stale 协调。
  - Derived From: S-PRODUCT 的完整闭环、S-CONTEXT 已有 durable state relationship，以及所有页面共享地点/日期/主备的直接描述。
  - Reason: 这是防止各 Outcome 独立实现后产生相互矛盾决策的最小一致性约束。
  - Changes product meaning: no；不引入新的页面或业务规则。

- Derived Item: REQ interaction-motion-contract、OBL interaction-runtime-evidence 与项目 Skill 的单向权威声明。
  - Derived From: S-USER 明确要求 DESIGN.md/方案正式落地并询问循环依赖，S-DESIGN 的长期规则、S-INTERACTION 的 RN 映射、S-APPLE 的可迁移原则以及 S-CONTEXT 的 surface responsibility。
  - Reason: 仅安装 Skill 会让后续 Agent 可选择忽略，双向引用又可能被误解为循环规范；因此 DESIGN.md/Source Plan/Context 必须完整定义结果，Skill 只能单向消费并把它映射到 Gesture Handler/Reanimated/触觉/无障碍。
  - Changes product meaning: no；强化现有移动交互和质量标准，不新增业务入口或 Apple 品牌。

- Derived Item: REQ official-source-production-gates 及 S-RESEARCH 六态证据语言。
  - Derived From: S-USER 要求把供应商购买、免费数据持久化、加工优化等技术细节真正调研清楚，S-ARCH 的 provider/data pipeline 边界，以及本轮官方资料。
  - Reason: 如果不区分推荐、合同、POC 和外部确认，后续长程任务可能把文档可行性错误解释成已有账号/许可/校准并继续生产实现。
  - Changes product meaning: no；只约束证据与发布门，真实商业/阈值选择仍在现有和新增 DEC/EXT。

- Derived Item: REQ qualified-lowest-tco-selection、OBL provider-cost-and-quota-ledger、AC qualified-lowest-tco-provider-selection 与 FS lowest-sticker-price-provider。
  - Derived From: S-USER 明确要求数据真实、稳定的前提下尽可能选择性价比高、需要付费时选择便宜方案；S-RESEARCH 的官方价格/许可/配额、目标区 POC、缓存加工和成本变量。
  - Reason: “便宜”若不先建立不可被价格抵消的资格门和等价能力边界，会鼓励免费但不合法/不稳定的源；若只比较接口标价，又会漏掉加权调用、托管、工程、合规和退出成本。统一 12 个月 TCO 台账使该直接优先级可审计、可验收。
  - Changes product meaning: no；落实用户已经决定的选型顺序；具体预算、阈值和付费冗余风险偏好仍留给 DEC provider-budget-and-paid-redundancy。

## 9. Decisions Required

<a id="decision.dependency-version-baseline"></a>
- **DEC dependency-version-baseline**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 选择 Expo/React Native 新架构、Expo Router、Skia/渲染、TanStack Query、Zustand、React Hook Form/Zod、Reanimated/Gesture Handler、SQLite/FileSystem/SecureStore/Location/Sensors/Notifications、NestJS/Fastify、PostgreSQL/PostGIS、Redis/BullMQ、Next.js、Python/地理库和各原生 SDK 的兼容版本基线/升级政策。
  - Options: 以项目启动时最新稳定兼容矩阵冻结；以企业长期支持/供应商认证矩阵冻结；分平台采用不同受支持基线但共享业务契约。
<!-- ty-source-item:start key=approved-dependency-version-baseline kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 新项目锁定 2026-07-20 最新正式稳定的 Expo SDK 57 / React Native 0.86 / React 19.2.3 / Node.js 22 LTS（≥22.13），只用 New Architecture 和 Development Build；移动依赖先采用 SDK 57 官方矩阵（Reanimated 4.5.0、Worklets 0.10 系列、Gesture Handler 2.32 系列、Skia 2.6.2），其余通过 `expo install`、`expo-doctor`、双端原生构建和 lockfile 冻结精确版本。启用 Worklets bundle mode 并把官方已知的 Reanimated/Hermes 内存增长列为真机门；门失败则回退 SDK 56 兼容矩阵或关闭未达标复杂动画。安全/patch 每月评估，兼容 minor 每季度在 CI+双端回归后升级，Expo/RN/原生 SDK major、runtimeVersion、schema 或权限变化单独评审并重建二进制；OTA 只发布与既有 runtime 兼容的 JS/样式/资源。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: 两份附件提供技术选型和示例文档版本，不提供最终 lockfile、目标日期兼容矩阵或维护周期；版本信息会变化。
  - Affected REQ / AC: REQ react-native-app, REQ technology-baseline, REQ mobile-build-release, AC architecture-baseline, AC native-release-boundary。

<a id="decision.interaction-motion-token-baseline"></a>
- **DEC interaction-motion-token-baseline**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 按交互家族确定 press feedback、方向锁/滞后、grab hit/slop、速度平滑/投影、边界阻尼、sheet snap、spring/timing、触觉语义/节流、reduced-motion 替代和地图/滚动/back 仲裁 token，并定义设备分层调优与允许差异。
  - Options: 先以系统/维护良好组件默认值做双端 POC 后冻结；建立 Starward UI-system token 并按交互家族/平台分层；复杂物理手势延期、MVP 仅用系统转场/静态状态但仍满足取消和无障碍。
<!-- ty-source-item:start key=approved-interaction-motion-token-baseline kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 建立 Starward 自有、按 press/drag/scrub/sheet/navigation 分族且允许 iOS/Android 原生差异的 token；初始 POC 候选为按下反馈 ≤80ms、普通按钮 scale 0.98/opacity 0.88（地图标记与危险操作不缩放）、释放 120ms、drag 激活 6dp、方向锁 8dp 且主轴位移比 ≥1.25、grab hitSlop 12dp、sheet 25%/55%/90% 三档候选、提交/成功/警告/错误才触觉且同语义 120ms 内节流。连续手势保持 1:1、可中断/反向并继承释放速度，越界只视觉阻尼且取消不提交；系统 back、地图 pan/pinch、Sheet pan/scroll 采用显式 simultaneous/exclusive 关系。Reduced Motion 使用系统设置，禁用视差/速度投影/弹簧，改为 ≤120ms 淡变或立即切换；POC 可在不改变这些语义的前提下调参并把最终值写入 design token，而不是复制 web/Apple 常数。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: S-APPLE 的示例是 web/CSS/Pointer Events/Motion 常数，S-INTERACTION 明确不能直接复制；当前仓库无 RN 运行时、真实组件、目标设备性能或可用性测试，精确阈值/弹簧会影响手势冲突和无障碍。
  - Affected REQ / AC: REQ interaction-motion-contract, OBL interaction-runtime-evidence, AC interaction-direct-manipulation, AC interaction-gesture-arbitration, AC interaction-accessibility-variants, AC interaction-red-light-continuity, EXT outdoor-device-field-validation。

<a id="decision.supported-os-device-matrix"></a>
- **DEC supported-os-device-matrix**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 确定最低 iOS/Android、主流/最低性能档、内存/存储、传感器、ARKit/ARCore、国内厂商推送、屏幕尺寸和无 Google 服务设备的正式支持/降级矩阵。
  - Options: 较新 OS/较窄矩阵优先质量；覆盖更旧/更多安卓但扩大降级和测试；按 MVP/V1/V3 逐步扩展设备能力。
<!-- ty-source-item:start key=approved-supported-os-device-matrix kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 安装下限跟随 SDK 57：iOS 16.4+、Android 7/API 24+、compile/target API 36；正式全功能测试档为 iOS 16.4+ 支持机型与 Android 10+、≥4GB RAM、≥64GB 存储，兼容降级档为 Android 7～9、3GB RAM，2GB RAM/32-bit 不承诺。无 GMS 设备必须完成核心查询、地图、离线和本地提醒，远端推送按国内厂商通道能力显示；缺磁力计/陀螺仪/气压计时隐藏对应能力并允许手动方向，AR 仅对通过 ARKit/ARCore 认证设备开放。低端档关闭 AR、高密 Skia/粒子、昂贵模糊和复杂物理转场并降低天空帧率/图层密度，但不得降级安全、来源、状态与可访问性。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 只要求双端/真机/AR 可选，没有授权最低版本、机型占比或性能预算。
  - Affected REQ / AC: REQ react-native-app, REQ optional-ar, REQ sky-rendering-budget, REQ performance-slos, EXT app-store-native-capability-readiness。

<a id="decision.localization-scope"></a>
- **DEC localization-scope**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 首发语言/地区、简繁/英语、24/12 小时制、公里/英里、摄氏/华氏、天文术语/无障碍读法和时区展示范围。
  - Options: 中国大陆简体中文+公制首发；中英双语首发；先简中但所有 schema/UI 从首日可本地化。
<!-- ty-source-item:start key=approved-localization-scope kind=requirement -->
  - Approved resolution (owner, 2026-07-20): 首发只承诺中国大陆简体中文，默认 24 小时制、公制、摄氏度、米/公里、m/s、hPa 与角度；内部统一 UTC/ISO 8601、IANA 时区、WGS84 和标准单位，UI 总显示地点本地日期/时区并正确处理跨午夜观星夜。首日即使用可本地化 message key、复数/数字/日期格式和天文术语表，VoiceOver/TalkBack 文案不用符号替代读法；繁中、英语、英制和 12 小时制进入后续语言包，不计入首发完成声明。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: 产品和参考图为中文、中国主场景，但没有明确市场/语言承诺；单位存储义务不决定展示默认。
  - Affected REQ / AC: REQ auth-methods, OBL time-coordinate-unit-consistency, REQ platform-extension-boundary, AC time-coordinate-consistency。

<a id="decision.guest-auth-capability-matrix"></a>
- **DEC guest-auth-capability-matrix**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 逐项确定游客可查询/收藏/建本地行程/下载离线包/上传/评论/分享/通知/协作的边界，以及登录后的本地合并/匿名贡献归属。
  - Options: 游客仅查询；游客查询+本地收藏/计划；游客允许匿名排队贡献但发布前登录；不同能力分别决定。
<!-- ty-source-item:start key=approved-guest-auth-capability-matrix kind=requirement -->
  - Approved resolution (owner, 2026-07-20): 游客可完成基础查询、手动地点/时间、偏好预览、本地收藏、本地单人行程、本地离线包和仅设备内提醒；上传地点/实况/媒体、评论/评价、公开分享、跨设备同步、远端通知、协作与账号数据导出/注销必须登录。游客写入只保存在本地稳定 UUID，不形成匿名公开贡献；登录时逐类预览并幂等合并，服务器同 ID/同 revision 优先、冲突保留双副本供选择，取消登录不删除游客数据，退出账号可选择保留为设备本地副本。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 只明确“不登录可基础查询”，未定义“基础”之外的写入和跨设备权限。
  - Affected REQ / AC: REQ guest-basic-query, REQ guest-upgrade, CTRL auth-gate-sheet, AC guest-login-merge。

<a id="decision.preference-profile-defaults"></a>
- **DEC preference-profile-defaults**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 首次引导各出行/设施/目标/设备字段是否有默认、哪些是硬阻断/排序偏好、示例预设的具体值及跳过后的推荐行为。
  - Options: 无隐含默认、逐项 unknown；提供保守新手默认并可预览；先选语义预设再展开其明确值。
<!-- ty-source-item:start key=approved-preference-profile-defaults kind=requirement -->
  - Approved resolution (owner, 2026-07-20): 所有距离、时间、徒步、路况、露营、设施、目标和设备字段初始为 unknown/未选择，不把示例值静默变成硬条件；跳过后使用“中性基础模式”，只执行经批准的安全/关闭/法律硬阻断，其他因素等权或低置信排序并明确提示补全偏好。新手/亲子/摄影/目视预设仅在用户主动选择后展开全部具体值和硬/软含义，保存前可逐项修改并显示会排除多少候选；设备未知时不给特定镜头/望远镜结论。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: 产品给出字段与示例名称，没有授权距离、时间、徒步、设施或风险默认值。
  - Affected REQ / AC: REQ preference-profiles, REQ profile-examples, CTRL preference-wizard, AC preference-save-and-switch。

<a id="decision.mvp-launch-region-and-spot-seed"></a>
- **DEC mvp-launch-region-and-spot-seed**
  - Status: approved_by_owner (2026-07-20)
  - Decision: MVP 首发地理覆盖、人工初始地点数量/类型/核验深度、天气/路线/瓦片覆盖范围以及扩区准入标准。
  - Options: 单城市群深度核验；多个重点城市周边较小种子集；全国地图但只在核验区域提供推荐、其他区域明确数据不足。
<!-- ty-source-item:start key=approved-mvp-launch-region-and-spot-seed kind=requirement -->
  - Approved resolution (owner, 2026-07-20): 首发采用“全国可浏览、仅深圳及粤港澳大湾区已核验覆盖可生成地点推荐”的单城市群深耕模式；首批至少 30 个人工核验地点，覆盖城市边缘公园、海岸、山地、露营/郊野、天文场馆周边等类型，每点具备合法可达性、精确/模糊坐标级别、开放/门禁、停车与最后一公里、设施、风险、光环境、照片来源和最近核验时间。天气/路线/瓦片 POC 覆盖该区域，区域外允许手动查看有来源的天气/天文但显示“地点资料不足”且不伪造主备推荐。扩区需同时满足连续 30 天数据质量、地图/路线/许可、至少 20 个同标准核验点、现场抽检和成本/SLO 门。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 指向中国用户并要求人工初始地点，但未给具体地区、数量、预算或发布时间。
  - Affected REQ / AC: REQ map-content-and-status, REQ new-spot-submission, REQ spot-admin, EXT site-access-safety-verification。

<a id="decision.weather-provider-contracts"></a>
- **DEC weather-provider-contracts**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 选择常规天气/预警/空气质量、分层云/能见度/多模型/卫星云图的最小必需生产供应商、模型集合、预报时长、地区覆盖、许可/归属/cache/历史保留、SLA/QPM、按请求或加权调用成本和降级优先级；所有候选先过真实性/首发区稳定性/许可/降级硬门，再按 12 个月 TCO 选择。QWeather GeoAPI 不得批量缓存/索引且预警须保留 `refer.sources`，Open-Meteo 商业生产不得使用 non-commercial free endpoint，最终以逐 SKU 合同/当前能力为准。
  - Options: 低成本首选路径为先用 QWeather 按量候选验证中国常规/预警，并用 Open-Meteo 免费端点只做非商业分层云/多模型 POC；仅当增量能力、目标区质量和 12 个月 TCO 证明值得时购买最低满足的 Open-Meteo 商业档，不默认双付费；单一其他合格主源+合法缓存/unknown 降级后再扩多模型；NSMC FY-4B/后续业务星仅在自动化/再展示权和完整 TCO 通过后上线，否则延期云图而保留预报云量；ECMWF Open Data 只作服务端离线基准/后备研究，Himawari 仅在用户资格/许可成立后作为候选。
<!-- ty-source-item:start key=approved-weather-provider-contracts kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 实现时以服务端 Provider Adapter 和冻结 fixtures 为先；生产常规天气/小时/日预报/官方预警/AQI 首选 QWeather 最小 SKU 与 JWT，仅在合同、首发区 30+ 地点 POC、归属/cache/保留/QPM/SLA 和 12 个月 TCO 门通过后启用。Open-Meteo 免费端点只用于非商业 POC；只有低/中/高云、多模型或历史能力带来可量化增益且最低商业档总 TCO 合格时才购买，不默认与 QWeather 双付费；ECMWF Open Data 只做服务端离线基准。FY-4B/其他卫星实况在自动化、商业再展示/派生、30 天延迟/缺帧与成本全通过前保持 disabled，UI 退回有来源的预报云量。任何生产响应保存 provider/model/run/issuedAt/expiresAt/许可与归属，失败按 fresh→合法 stale→partial/unknown 降级，预警过期不继续冒充当前。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: 用户已决定先合格再取最低 TCO，但架构没有已签合同、首发区 POC、等价能力证明、实时价格或最终预算；不能从官网标价推断生产组合。
  - Affected REQ / AC: REQ model-comparison, OBL weather-provider-normalization, REQ provider-source-registry, REQ qualified-lowest-tco-selection, AC source-pipelines, AC qualified-lowest-tco-provider-selection, EXT commercial-provider-rights-and-quotas。

<a id="decision.provider-budget-and-paid-redundancy"></a>
- **DEC provider-budget-and-paid-redundancy**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 按 MVP/V1/V2/V3 和天气、地图/路线、卫星/栅格、推送、存储/CDN 等能力批准月度/年度预算包络、币种/税费/汇率基准、预算告警/硬上限、容量余量、套餐升降/续费审批，以及何种可用性/安全/业务损失证据足以购买第二付费源或热备。
  - Options: 推荐精益基线——每项能力一个合格最低 TCO 付费主源 + 合法缓存/本地计算/开放基准/诚实降级，测得的增量损失大于第二来源 TCO 才增加付费冗余；按领域设置不同预算与冗余门；对经专业审查认定的关键能力预先双源、其余保持单源；在预算未批准前只做非商业 POC/staging 且阻止生产采购。
<!-- ty-source-item:start key=approved-provider-budget-and-paid-redundancy kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 本决策不授权任何自动付款：未取得 owner 逐项批准前，production paid budget 为 CNY 0，开发只用本地 fixtures、允许的开放数据和非商业 POC；系统仍实现按能力/阶段/币种/税费/汇率的 12 个月 TCO 台账、70%/90% 告警和 100% 硬停/按功能降级，但具体金额由采购记录注入配置且升级/续费不得自动发生。每项能力最多一个合格最低 TCO 付费主源，保留合法缓存、本地算法、开放基准和诚实 unknown；第二付费源只在相同测试窗口内证明单源造成的已量化用户/安全/SLO 损失持续两个周期或发生一次批准的严重事件，且预期避免损失大于第二源完整 12 个月 TCO 后，由 owner 再批准。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: 用户决定了“质量合格后尽可能便宜”的排序，但未给可花金额、增长预测、风险价值、告警阈值、容量余量或双源触发线；Agent 不能替业务批准付款或风险偏好。
  - Affected REQ / AC: REQ qualified-lowest-tco-selection, REQ provider-source-registry, REQ provider-failure-controls, REQ data-source-admin, REQ official-source-production-gates, OBL provider-cost-and-quota-ledger, AC qualified-lowest-tco-provider-selection, AC official-source-production-gates, EXT commercial-provider-rights-and-quotas, DEC weather-provider-contracts, DEC route-provider-fallback-and-quotas, DEC object-storage-cdn-provider-and-region。

<a id="decision.seeing-data-source"></a>
- **DEC seeing-data-source**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 是否/何时引入正式视宁度供应商或现场校准、适用地区/设备/容差和在此之前实验性大气稳定度的计算/文案。
  - Options: 首期只显示通透度估计且不显示视宁度；显示明确实验性稳定度；取得专业源/校准后在限定区域显示正式视宁度。
<!-- ty-source-item:start key=approved-seeing-data-source kind=requirement -->
  - Approved resolution (owner, 2026-07-20): MVP/V1 只显示可解释的通透度估计及输入/置信度，正式“视宁度”字段为 disabled/数据未获验证，不用普通天气变量生成一个看似客观的 arcsec 数字；实验性大气稳定度仅可在明确“实验”开关内显示且不参与安全硬阻断。只有专业源许可、目标区域/设备范围、与现场或权威样本的容差、版本和 reviewer 全部通过后，才在通过区域启用正式视宁度并保留旧版重放。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 明确普通天气 API 不足，但没有提供合法专业源或校准数据。
  - Affected REQ / AC: REQ transparency-seeing-boundary, NCOMP experimental-seeing-as-fact, AC experimental-atmosphere-label。

<a id="decision.observation-window-resolution"></a>
- **DEC observation-window-resolution**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 小时评分/窗口的时间粒度、最短连续时长、允许间断、跨午夜/极区边界、天体高度/遮挡交集及窗口合并/并列规则。
  - Options: 固定 15 分钟；固定 30 分钟；在 15/30 分钟之间按数据分辨率或设备预算选择但统一解释；不同目标仍需另定最短连续窗口。
<!-- ty-source-item:start key=approved-observation-window-resolution kind=requirement -->
  - Approved resolution (owner, 2026-07-20): 统一用地点本地时区上的 15 分钟网格计算，底层保留原始 run 分辨率；中性/新手/目视窗口最短连续 60 分钟，摄影最短 120 分钟，未选择目标的首页以 90 分钟为默认执行窗口。硬阻断、天体高度/地平线遮挡和允许的暮光条件在整个窗口内不得断裂；软质量短降只拆成“条件较弱”子段，不把断裂窗口合并成连续窗口。相邻窗口间隔 <15 分钟且条件/来源版本一致才合并，同分优先更早到达、持续更长、返程更安全者；跨午夜仍属于同一观星夜，无天文夜或高纬边界时明确给出暮光模式/无可执行窗口。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 要求连续可执行窗口和多事件交集，但没有授权粒度或最短时长阈值。
  - Affected REQ / AC: REQ continuous-window, REQ twilight-timeline, REQ milky-way-visibility, AC continuous-window-selection, EXT astronomy-authoritative-validation。

<a id="decision.candidate-routing-limits"></a>
- **DEC candidate-routing-limits**
  - Status: approved_by_owner (2026-07-20)
  - Decision: PostGIS 预筛半径/数量、调用真实路线候选数、最终推荐数、并发/超时/成本上限和不同地区/用户的调节规则。
  - Options: 直接采用来源建议前 10～20/最终 3～5 并选具体值；按密度/配额动态；MVP 更小固定上限后用数据调整。
<!-- ty-source-item:start key=approved-candidate-routing-limits kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 先按用户明确最大距离/时间与数据覆盖做 PostGIS 预筛，单次最多 200 点；完整规则评分前 24 点，真实路线最多 8 点，最终展示 1 个主选+最多 4 个备选。路线并发 4、单候选超时 2.5 秒、整批软预算 6 秒且受 provider quota/cost circuit breaker 控制；超时先返回直线距离/合法缓存并异步补齐，不把直线当驾车时间。低密地区可扩大半径但不突破用户硬条件，高密/低端设备只收紧数量；所有动态调整保存原因、版本和实际调用成本。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: 附件给的是建议区间，不是已决定阈值、配额合同或预算。
  - Affected REQ / AC: REQ search-and-candidate-bounds, REQ route-timeout-degradation, AC coordinate-round-trip, EXT commercial-provider-rights-and-quotas。

<a id="decision.map-layer-composition-and-density"></a>
- **DEC map-layer-composition-and-density**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 确定气象/光污染/地形栅格和地点/天体/实况符号的互斥/叠加顺序、透明度/时间同步，以及高密度地点在不同缩放级别采用原始 Marker、服务端/客户端聚合、密度图或列表的规则和可访问等价物。
  - Options: 单一主栅格+多个符号层；允许有限多栅格混合；按设备性能动态限制；地点使用服务端聚合、客户端聚合或密度+列表组合。
<!-- ty-source-item:start key=approved-map-layer-composition-and-density kind=requirement -->
  - Approved resolution (owner, 2026-07-20): 任一时刻只启用一个主栅格（云量/降水/光污染/地形之一）叠加一个底图，预警边界、地点/聚合、路线、选中态、天体方向和用户位置作为有序矢量/符号层；所有时变层共享同一时间游标并显示 issuedAt/validAt/opacity/来源，切换失败保留旧层但标 stale。视口内 ≤80 点显示原始 marker，81～500 点聚合，>500 点显示密度/服务端网格且继续提供排序列表；缩放、设备性能和 reduced motion 只影响表现，不改变筛选语义。屏幕阅读器/键盘用户始终可用与地图选择同步的列表、筛选和详情，颜色不是唯一图层状态。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 完整列出图层并要求测试大量标记，但没有授权默认叠加组合、z-order、聚合算法或性能阈值；参考图只能证明存在图层面板。
  - Affected REQ / AC: REQ complete-map-layers, CTRL map-layer-selector, CTRL map-marker-density-surface, AC layer-version-and-failure, AC map-status-and-context。

<a id="decision.route-provider-fallback-and-quotas"></a>
- **DEC route-provider-fallback-and-quotas**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 高德原生 3D 地图/定位/搜索/离线与 Web Service 路线/距离矩阵/POI 的正式 SKU、技术服务许可、主备适配器、超时、配额/超额、SLA/价格、交通时效、缓存/存储、双端离线范围、外部地图应用优先级和无精确坐标时导航行为。
  - Options: 推荐购买满足首发闭环的高德最低必要 SKU，以唯一生产源+服务端合法 route snapshot+缓存/直线降级并保留 provider adapter；只有 DEC provider-budget-and-paid-redundancy 的实测增量价值触发时才购买另一商业路线备用；按地区选择外部应用但后端统一估算；无离线许可时离线包不含底图。
<!-- ty-source-item:start key=approved-route-provider-fallback-and-quotas kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 中国首发只实现高德一个生产 Provider Adapter，购买/启用满足原生地图+定位+搜索+服务端驾车/步行/骑行路线的最低合法 SKU，具体 key、配额、SLA、价格和缓存期限由 EXT 合同门注入；不预购第二商业地图/路线源。APP 内显示路线快照，实际导航优先调用用户设备上已安装且支持目标坐标的外部地图，高德优先、其他应用仅作用户选择；provider 超时遵守候选批预算并退到带时间戳的合法 snapshot 或明确标注的直线距离。无离线许可时离线包不抓取底图；坐标为 approximate/area/restricted 时只导航到获授权入口或模糊区域，不泄露/推算精确点。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source/官方资料明确中国高德主场景、法人公开/长期使用需购买技术服务许可和可外部导航，但仓库未签具体 SKU/配额/双端离线/应用优先级，技术可行不构成授权。
  - Affected REQ / AC: REQ route-variants-and-degradation, CTRL external-navigation-action, AC route-provider-degradation, EXT commercial-provider-rights-and-quotas。

<a id="decision.recommendation-weights-thresholds"></a>
- **DEC recommendation-weights-thresholds**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 按新手/摄影/目视等画像确定天空、目标、地点、出行、可信度权重，硬阻断阈值、等级/分数区间、主备差异、低可信降权和规则发布审批。
  - Options: 专家规则初始值+重放/现场校准；用户模式固定权重；基础规则+用户可调权重；后续在有足够反馈后引入学习排序。
<!-- ty-source-item:start key=approved-recommendation-weights-thresholds kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 所有官方关闭/法律/已确认安全阻断和用户明确硬条件先于加权评分；五维初始权重（天空/目标/地点/出行/可信度）为中性 35/20/15/15/15、新手/亲子 25/10/25/25/15、摄影 35/25/15/10/15、目视 40/20/20/5/15。总分 ≥75 为推荐、60～74 为有条件、<60 不推荐；综合可信度 <0.60 时不得给强肯定结论，缺失维度不按 0 惩罚而是降低置信并解释。主选与备选必须在天气/路线/设施等失败模式上有实质差异，不能只取相邻分数；权重/阈值全部版本化、可重放、双人审批和回滚，先用专家/现场样本校准，未经样本与偏差审查不引入学习排序。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 明确分层因素和先规则后学习，但没有授权具体权重、分界、阈值或安全责任。
  - Affected REQ / AC: REQ layered-scoring, REQ hard-blockers, REQ preference-profiles, REQ explainability-and-validity, CTRL rule-release-control, AC successful-night-report, AC no-score-only-completion。

<a id="decision.safety-thresholds"></a>
- **DEC safety-thresholds**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 风、降雨、雷暴/极端天气、潮汐/水位、山路/封路、能见度、到达/返程和设备安全的阻断/警告阈值、来源优先级与责任文案。
  - Options: 统一保守阈值；按地点/目标/设备/用户类型配置；只采用官方预警+地点规则，数值模型作为建议；分阶段逐类确认。
<!-- ty-source-item:start key=approved-safety-thresholds kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 在专业/法务/现场确认前，唯一自动硬阻断来源是有效期内的官方严重预警、官方/管理方封路封园/门禁、法律/土地访问限制、已核验地点危险和用户/设备制造商明确限制；普通数值预报的风、降雨、能见度、潮汐等只生成带来源/时效的分级警告，不自行发明通用“安全线”。规则按地点类型、出行方式、目标和设备配置，来源冲突时采用官方/现场核验优先并显示差异；任何正式数值阻断须由 named safety reviewer 批准、带适用范围/版本/回放证据，UI 明确这是辅助决策而非救援或安全保证。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 列出风险和“风速超过设备安全范围”，但没有给任何可安全推断的数值/法定标准。
  - Affected REQ / AC: REQ hard-blockers, REQ spot-safety, REQ intrip-notifications, REQ safety-session, AC safety-overrides-score。

<a id="decision.light-pollution-calibration"></a>
- **DEC light-pollution-calibration**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 以 EOG Annual VNL v2.2 的 radiance/coverage/年份为基线，确定城市距离/海拔/大气/临时光源/用户实测/SQM 到光污染指数、天空亮度和 Bortle 区间的模型、区域/地貌/季节校准、样本质量、误差/置信区间和更新频率。
  - Options: MVP 只展示 radiance 参考指数/年份/coverage；发布宽 Bortle 估算区间并明确方法/置信度；仅在足够 SQM/现场样本且独立验证区域显示校准区间。
<!-- ty-source-item:start key=approved-light-pollution-calibration kind=requirement -->
  - Approved resolution (owner, 2026-07-20): MVP/V1 只发布 EOG Annual VNL v2.2 的 radiance 参考值、数据年份、coverage/quality、空间分辨率、许可归属和“卫星夜光不等于现场天空亮度”的解释，不显示 Bortle、银河可见保证或伪造 SQM。系统预留版本化校准模型与置信区间，但只有 named astronomy reviewer 批准区域/季节/地貌分层的质量规则、足量独立 SQM/现场样本和 held-out 验证后，才在通过区域显示宽区间；未通过/样本外区域保持 radiance-only/unknown，模型更新可重放与回滚。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: EOG 官方资料说明云/太阳照明/杂散光/coverage/瞬态影响且零值不等于无灯，CC BY 允许派生不等于模型科学有效；当前没有区域 SQM/现场样本、阈值或验证结果。
  - Affected REQ / AC: REQ light-pollution-evidence, REQ weather-map-layers, AC light-and-horizon, EXT geospatial-catalog-content-licenses。

<a id="decision.spot-coordinate-default-visibility"></a>
- **DEC spot-coordinate-default-visibility**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 普通新地点的默认坐标级别、自动判定生态/私人/高风险敏感的规则、近似半径/形状、verified 条件、申请/邀请和降级分享/导航政策。
  - Options: 所有用户点默认 approximate 待审；低风险默认 exact、高风险人工改；按地点类型/土地/贡献等级选择；首批仅管理员可设 exact。
<!-- ty-source-item:start key=approved-spot-coordinate-default-visibility kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 所有用户新提交地点默认 `approximate`、中心抖动/区域半径 1km 且待审核；只有管理员核验低生态/私人/安全风险、合法公共可达入口和公开来源后可升为 `exact`。生态敏感、私人土地、未核验山野/海岸和高风险地点默认 `area`（2～10km 依风险）或 `restricted/invite_only`，精确坐标只在已授权详情、导航和加密离线包中按最小权限返回。公开分享、截图、分析、推送、日志、缓存/CDN 和错误信息都沿用同级或更模糊坐标，禁止从路线终点/图片 EXIF/相邻对象反推；申请精确位置需登录、用途说明、到期和审计。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 定义六级枚举并要求敏感点不默认精确，但没有给普通点默认、模糊精度或认证门槛。
  - Affected REQ / AC: REQ coordinate-visibility, REQ new-spot-submission, AC coordinate-policy-all-exits, EXT site-access-safety-verification。

<a id="decision.moderation-trust-policy"></a>
- **DEC moderation-trust-policy**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 贡献等级、自动发布/人工审核条件、确认数/争议/信誉权重、临时实况各字段 TTL、到访/评价资格、风险 SLA、申诉和过期设施降权。
  - Options: MVP 全人工审核；低风险结构化实况自动短期发布+事后审核；按贡献等级分层；不同内容类型独立策略。
<!-- ty-source-item:start key=approved-moderation-trust-policy kind=requirement -->
  - Approved resolution (owner, 2026-07-20): 新地点、坐标/门禁/停车/安全更改、媒体和永久设施在 MVP 全部人工审核；普通登录用户可发布带 `unverified` 的低风险结构化临时实况，云/天空 TTL 2h，拥挤/停车/道路 TTL 4h，设施临时不可用 TTL 24h，风险报告立即显示“待核实警告”且 6h 未确认即过期/降级。完成至少 5 次通过审核、争议率 ≤10% 的贡献者才可短期自动发布低风险实况；两个独立到访确认提高可信度，位置证明只保存必要派生事实。高风险报告 2h 内初审、其他 24h，争议冻结自动聚合并进入人工队列，申诉 7 天内响应；所有阈值/TTL 可配置、版本化并防刷，不把信誉替代来源与新鲜度。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 要求审核/可信度/TTL，但未提供阈值、等级、自动化和申诉时限。
  - Affected REQ / AC: REQ trust-and-conflict, REQ contribution-moderation, REQ contribution-trust-display, AC trust-and-moderation-status。

<a id="decision.collaboration-roles"></a>
- **DEC collaboration-roles**
  - Status: approved_by_owner (2026-07-20)
  - Decision: V2 邀请链接有效期、owner/editor/viewer 等角色、字段/受限坐标权限、成员移除/离开、车辆/装备分工确认、冲突最终权和行程删除/转移。
  - Options: owner+editor 两级；owner/editor/viewer 三级；按字段/任务细粒度；先只共同编辑候选再扩完整行程。
<!-- ty-source-item:start key=approved-collaboration-roles kind=requirement -->
  - Approved resolution (owner, 2026-07-20): V2 采用 owner/editor/viewer 三级、一次性或可撤销邀请默认 7 天有效；owner 管理成员/角色、受限坐标授权、删除/转移和最终冲突，editor 可编辑路线、日程、候选、清单与任务但不能暴露受限坐标、改角色或永久删除，viewer 只读并可评论/确认被分配任务。成员移除/离开立即撤销新访问和离线密钥，历史 revision 保留审计化身份；车辆/装备/联系人分工须被指派人确认。冲突保留双方 revision 与字段级差异，owner 解决但不能静默覆盖；唯一 owner 离开前必须转移，删除/转移需重新认证、影响预览和短期可撤销。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 描述共同编辑内容与技术冲突机制，没有授权角色和不可逆管理规则。
  - Affected REQ / AC: REQ collaborative-plan, REQ collaboration-conflicts, CTRL collaboration-panel, AC collaboration-conflict。

<a id="decision.offline-pack-policy"></a>
- **DEC offline-pack-policy**
  - Status: approved_by_owner (2026-07-20)
  - Decision: manifest/schema/runtime 下限、合法高德原生离线地图范围/缩放、路线快照、地点/VIIRS/地平线/星表/天气/媒体必需与可选组件、hash/断点/原子激活/回滚、包大小/并发/空间、Wi-Fi/蜂窝、动态/静态过期、自动更新、保留/清理、设备加密/锁屏后可用、账号登出/撤权和受限坐标处理。
  - Options: 用户逐包手动下载/更新；行程自动建议但需确认；只自动静态必需组件、动态/媒体可选；敏感包强制设备级加密与短保留；地图离线许可未确认时包中只含合法路线快照/自有派生数据而无底图。
<!-- ty-source-item:start key=approved-offline-pack-policy kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 离线包由行程建议但必须用户确认，默认仅 Wi‑Fi，蜂窝需逐次允许；下载前展示组件/许可/版本/动态过期/体积/剩余空间，500MB 提醒、单包 2GB 硬上限、全局 4GB 默认上限、最多 2 个并发且至少保留 `max(1GB, 10%设备空间)`。必需组件为 manifest、地点/坐标权限、合法路线 snapshot、精简天气/天文、规则与关键文本；VIIRS/DEM/地平线/星表/媒体/获许可底图按能力可选。每对象 hash、断点、临时区、全包校验后原子激活、上一版回滚；静态资产按版本，动态数据到期仍可读但显著 stale 且安全/预警不得离线冒充当前。受限坐标/联系人/安全会话设备加密并最短保留，登出、成员撤权、链接失效和许可终止触发密钥撤销/清理；没有地图离线许可就不抓底图。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 给出完整内容和技术存储，不给网络/空间/保留/加密/自动化默认。
  - Affected REQ / AC: REQ complete-observation-pack, REQ local-storage-boundaries, CTRL offline-pack-manager, AC pack-integrity。

<a id="decision.background-safety-policy"></a>
- **DEC background-safety-policy**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 安全会话默认/最大时长、定位频率/精度、自动停止、未返回提醒对象/次数/升级、离线/系统杀进程、联系人通知通道和“未送达”处理。
  - Options: 只做本地计时+用户主动分享；限时后台定位但不自动外发；明确联系人同意后按阶段提醒；首版不做自动升级。
<!-- ty-source-item:start key=approved-background-safety-policy kind=requirement -->
  - Approved resolution (owner, 2026-07-20): 首版采用本地计时+可选限时后台位置，不做自动报警、联系人外发或升级；用户主动创建会话并逐次选择分享对象/通道，默认 4h、最大 12h，在计划结束后 30min 自动停止并提示确认安全。前台导航可高精度，后台采用平衡精度且约 5min 或 250m 变化采样、低电/系统限制时自动降频并显示；系统杀进程、离线或权限撤回不能伪装为持续跟踪。未返回先设备本地提醒两次，外发只能由用户主动操作并显示发送/receipt/失败/未知，APP 明确不提供救援或必达保证；会话结束后按保留策略删除精确轨迹。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 要求限时后台和未返回提醒，但自动外发/升级、频率和时长属于权限/安全/不可逆产品规则。
  - Affected REQ / AC: REQ safety-session, REQ location-sharing-consent, CTRL safety-session-panel, AC bounded-safety-session, EXT app-store-native-capability-readiness。

<a id="decision.notification-defaults-cooldowns"></a>
- **DEC notification-defaults-cooldowns**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 哪些类别默认关闭/建议开启、阈值/提前量、免打扰、边沿触发、同事件/同网格冷却、紧急风险例外、本地/APNs/FCM/国内厂商/Expo 通道优先、receipt/失效 token/重复与历史保留。
  - Options: 全部用户显式订阅；行程风险默认开启其余显式；按画像提供可预览建议；推荐 MVP 先本地提醒+APP 内状态，远端通道矩阵/延迟/重复 POC 后启用；Expo Push 只作非关键早期通道并保留替换能力。
<!-- ty-source-item:start key=approved-notification-defaults-cooldowns kind=requirement -->
  - Approved resolution (owner, 2026-07-20): 所有通知类别默认关闭并显式 opt-in；创建行程时可预览建议的出发前 24h/3h 条件复核、窗口开始 60min 和用户自定提醒，但不自动勾选。默认免打扰为地点本地 22:00～08:00，用户可按类别覆盖；官方严重预警也只有在用户订阅该行程风险后可越过免打扰，且文案不称紧急救援。相同 provider event+区域 6h 冷却，实质条件跨阈变化 2h，长期天象/计划 24h；只在状态边沿产生幂等事件。MVP 以本地提醒+APP 内收件箱为权威，APNs/FCM/国内厂商按发行渠道 POC 后启用，Expo Push 只用于非关键 POC；保存 receipt/去重/失效 token，失败时打开 APP 重算而不沿用旧安全信息。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 要求用户可设并避免打扰，没有授权任何默认、提前分钟或冷却时长。
  - Affected REQ / AC: REQ notification-control, REQ event-driven-evaluation, CTRL notification-rule-editor, AC pretrip-rule。

<a id="decision.ai-provider-privacy"></a>
- **DEC ai-provider-privacy**
  - Status: approved_by_owner (2026-07-20)
  - Decision: AI 摄影解释供应商/模型、服务端或端侧、发送字段、精确地点/行程脱敏、用户同意、数据保留/训练、地区/跨境、内容安全、成本/限额和禁用降级。
  - Options: V1 在供应商获批前只显示规则解释、获批后启用 AI；服务端第三方模型且只发脱敏参数；批准的境内模型；端侧小模型；按地区配置并始终保留规则解释降级。
<!-- ty-source-item:start key=approved-ai-provider-privacy kind=requirement -->
  - Approved resolution (owner, 2026-07-20): V1/V2 默认只用确定性规则解释，AI provider、网络调用和预算均 disabled；完整摄影方案不依赖 AI 才可完成。未来仅在供应商、境内/跨境、处理者条款、零训练/最短保留、内容安全、成本和法务获批后由服务端按用户逐次 opt-in 调用，只发送经枚举的派生参数与粗粒度环境，不发送精确地点、路线、联系人、身份、原始媒体/EXIF 或自由文本秘密；结果标模型/版本/生成时间/不确定性，可举报并回退规则解释。无批准 provider、超预算、超时或撤回同意时静默禁用网络 AI 而不损坏核心流程。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 只决定 AI 角色，不决定供应商、法律基础、数据传输和保留。
  - Affected REQ / AC: REQ deterministic-first-ai, CTRL ai-explanation-panel, AC ai-is-explanation, RISK ai-security。

<a id="decision.data-retention-deletion"></a>
- **DEC data-retention-deletion**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 账号/位置/轨迹/行程/联系人/贡献/媒体/原始 EXIF/审核证据/日志/分析/备份/离线草稿的保留期、软删/匿名化/法定保留、注销冷静期、公共贡献处置和备份到期删除。
  - Options: 逐数据类型最小保留；公共事实匿名保留、个人内容删除；贡献允许用户选择撤回/匿名（安全证据例外）；无冷静期或可撤销冷静期。
<!-- ty-source-item:start key=approved-data-retention-deletion kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 采用最小保留基线并由中国法务门复核：未显式保存的精确位置/安全轨迹在会话结束 24h 内删除，联系人授权在会话/邀请结束 24h 内删除；上传原图/EXIF 处理成功 24h 后删除并只留去 EXIF 派生物；应用诊断日志 30d、原始产品分析 90d、聚合指标 13 个月、安全/权限/审核证据 180d，备份最长 90d。用户行程/收藏/媒体在主动删除或注销前保留；注销立即撤销会话与分享，提供 7d 可撤销冷静期，之后 30d 内从主系统清除、90d 内自然退出备份。公共事实贡献允许用户选择删除个人内容或匿名保留事实，涉及争议/安全/法定义务时只保留最小证据并标法律保留；离线草稿/包由用户可见清理且登出/撤权处理敏感内容。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 要求可删除/注销/清理任务，但未授权时长、法定例外或公共内容规则。
  - Affected REQ / AC: REQ account-deletion, REQ data-export, REQ background-job-catalog, AC account-deletion-completion, EXT china-production-legal-readiness。

<a id="decision.analytics-consent-policy"></a>
- **DEC analytics-consent-policy**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 产品分析的同意模式、首发地区法律基础、粗网格大小、事件用户标识、保留、第三方处理、撤回/历史删除、未成年人和 A/B/归因边界。
  - Options: 明示 opt-in；必要技术遥测与可选产品分析分离；按地区 opt-in/opt-out；全部首方自建或批准第三方。
<!-- ty-source-item:start key=approved-analytics-consent-policy kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 必要的崩溃/安全/服务健康遥测与可选产品分析分离，均数据最小化；产品分析在中国首发采用明示 opt-in、默认关闭、首方自建/自托管优先，拒绝不影响核心功能。禁止精确坐标/路线/联系人/受限地点进入事件，位置只在客户端转换为城市或约 20km 网格；用户标识为 30d 轮换的伪匿名 ID，原始事件 90d、聚合 13 个月。撤回后停止采集并在 30d 内删除可关联历史，未成年人不进入产品分析、A/B 或广告归因；任何第三方、跨境、精细归因或实验另走法务/同意门，样本不足明确不可判断。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 决定不记录精确位置和需要埋点，但不决定同意/网格/保留/供应商。
  - Affected REQ / AC: REQ privacy-compliant-analytics, REQ analytics-funnel-events, CTRL privacy-center, AC analytics-funnel, EXT china-production-legal-readiness。

<a id="decision.object-storage-cdn-provider-and-region"></a>
- **DEC object-storage-cdn-provider-and-region**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 在地域/备案、许可、安全、恢复和删除硬门合格后，按同区域同规格的容量/请求/失败请求/处理/取回/出网/CDN/工程/迁移 12 个月 TCO 选择首发对象存储/CDN 供应商；同时确定境内/境外 region、域名/ICP、S3 抽象边界、raw-restricted/derived-private/public-assets/user-media/audit bucket 分层、版本/加密/生命周期/恢复、公开签名/归属和跨境策略。
  - Options: 中国主场景在同规格报价后选阿里 OSS+CDN 或腾讯 COS+CDN 中最低合格 TCO 的一家；在法务/备案完成前只部署 staging 且 production gate 阻止公开；单主供应商起步并保留接口迁移，不在 MVP 同时经营双云；只有 DEC provider-budget-and-paid-redundancy 的触发器成立才增加第二付费云。
<!-- ty-source-item:start key=approved-object-storage-cdn-provider-and-region kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 开发/staging 使用本地 S3-compatible MinIO 和同一对象契约；中国 production 只允许华南境内单 region、单供应商，在运营主体/域名 ICP/安全/删除/恢复门和 OSS/COS 同规格 12 个月 TCO 报价完成后选最低合格的一家，未确认前 production public gate 保持关闭且不假定供应商。接口不使用最低公分母以外的不可迁移能力；bucket/权限固定分为 raw-restricted、derived-private、public-assets、user-media、audit，默认私有、服务端加密、版本/生命周期/签名 URL/归属/删除任务分层，禁止未批准跨境和双云复制。第二云只按付费冗余触发器另批，不作为 MVP 默认成本。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: S-ARCH 只要求 S3-compatible object storage/CDN；S-RESEARCH 证明两家均按容量/请求/流量/增值项计费且境内 CDN 依赖备案，但没有运营主体、采购报价、区域、域名、流量画像或跨境批准。
  - Affected REQ / AC: REQ production-topology, REQ china-production-compliance, REQ official-source-production-gates, AC official-source-production-gates, AC china-compliance-readiness, EXT commercial-provider-rights-and-quotas, EXT china-production-legal-readiness。

<a id="decision.cache-ttl-policy"></a>
- **DEC cache-ttl-policy**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 在来源建议区间内按数据类型/供应商/模型/交通/实况/当前与未来确定正式 TTL、stale-while-revalidate 上限、离线过期可读和紧急失效规则。
  - Options: 采用区间中保守固定值；按 ProviderRun/风险事件动态；当前决策短 TTL、规划数据长 TTL；不同地区/网络分层。
<!-- ty-source-item:start key=approved-cache-ttl-policy kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 初始生产策略为当前天气 TTL 10min/SWR 30min，小时天气 60min/SWR 3h，未来 NightReport 2h/SWR 6h，当前 NightReport 15min/SWR 60min，路线基础 12h/SWR 24h，含交通路线 10min/SWR 30min，地点静态资料 24h、开放/门禁/风险状态 15min，临时实况 2min 且不得超过自身字段 TTL；天文结果按算法/星表版本，VIIRS/DEM/图片按不可变数据版本。官方预警、关闭、撤权、敏感坐标和规则撤回不使用 SWR，事件到达立即失效；离线过期数据可读但显示年龄/来源/限制，安全/预警/导航不得把过期值称为当前。供应商更短合同 TTL 优先，较长 TTL 需新 POC/审批，所有键含 provider/model/run/grid/night/profile/rule/dataset 版本并加抖动/Single Flight。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: S-ARCH 10.2 明确为“缓存建议”区间，不是已确认生产阈值。
  - Affected REQ / AC: REQ cache-freshness-policy, REQ four-layer-cache, OBL cache-invalidation-events, AC cache-policy。

<a id="decision.recovery-objectives"></a>
- **DEC recovery-objectives**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 接受或调整来源建议 RPO≤15 分钟/RTO≤2 小时，并按用户数据、地点、媒体、缓存/瓦片、规则/审计划分恢复优先级、备份地区/加密/演练频率。
  - Options: 全业务统一建议目标；核心真值达到建议、可重建数据放宽；按 MVP 成本暂定较宽并明确不生产；多区域/同区域灾备。
<!-- ty-source-item:start key=approved-recovery-objectives kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 核心 PostgreSQL 真值（账号权限、行程/协作、地点审核、规则版本、provider/audit 元数据）目标 RPO ≤15min、RTO ≤2h；用户媒体和不可轻易重建对象 RPO ≤1h、RTO ≤8h；可从 immutable raw/官方源重建的派生瓦片/报告 RPO ≤24h、RTO ≤24h，Redis/本地缓存不备份且可清空重建。首发采用同一合规区域的加密 PITR+对象版本/生命周期，不默认昂贵跨云热备；每月抽样恢复、每季度完整隔离恢复演练，校验引用、权限、删除墓碑、受限坐标和实际 RPO/RTO。未通过演练的环境不得标 production-ready。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: 架构使用“建议目标”，没有业务承诺、成本、云配置或合规地区决定。
  - Affected REQ / AC: REQ backup-recovery, CTRL backup-restore-exercise, AC restore-objectives。

<a id="decision.production-slo-measurement"></a>
- **DEC production-slo-measurement**
  - Status: approved_by_owner (2026-07-20)
  - Decision: 接受/调整十项建议 SLO，并定义测量环境/窗口、主流设备/网络、冷/热缓存、样本门槛、可用性分母、崩溃会话、离线包/推送/新鲜度口径和错误预算。
  - Options: 直接作为正式 production SLO；先作 staging 目标再按真实基线批准；按设备/地区分层；MVP 只承诺关键子集但仍监控全量建议。
<!-- ty-source-item:start key=approved-production-slo-measurement kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): 十项来源建议先作为 staging/launch gate，不在无流量基线时对外宣称 production SLA；上线后按 28 天滚动窗口、版本/平台/设备档/网络/冷热缓存分层测量，连续 30 天真实基线和足够样本经 owner 批准后才升为正式 SLO。保留 API ≥99.9%、缓存首页 P75 ≤1.2s、非缓存 NightReport P95 ≤3s、地点列表 P95 ≤1s、主流地图接近 60FPS、天空最低 30/目标 60FPS、崩溃会话率 <0.3%、离线包成功 ≥99%、推送重复 <0.1%、数据新鲜度 ≥99%；每项同时报告分母、样本数、测量起止、版本和排除项，样本不足显示不可判断。计划维护单列但不抹掉用户影响，availability 错误预算 0.1%；推送不把 provider accepted 当设备送达，路线超时成功只在明确降级结果可用时计入。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 明确它们是“建议 SLO”，未定义测量方法和业务承诺。
  - Affected REQ / AC: REQ performance-slos, CTRL technical-observability-dashboard, AC slo-evaluation。

<a id="decision.content-import-policy"></a>
- **DEC content-import-policy**
  - Status: approved_by_owner (2026-07-20)
  - Decision: V2 小红书/图文攻略导入支持的平台、用户授权/粘贴/分享方式、版权/条款、抽取字段/置信度、原文保留、坐标敏感和人工确认流程。
  - Options: 用户手动粘贴并只抽候选；使用平台官方分享/API；不做平台定向自动抓取；先支持自有/公开许可内容。
<!-- ty-source-item:start key=approved-content-import-policy kind=requirement -->
  - Approved resolution (owner, 2026-07-20): V2 只支持用户主动粘贴文本/链接、系统 Share Sheet 和获批官方 API/用户自有或明确许可内容，不做小红书或任何平台的自动抓取、绕登录、批量索引或后台爬取。导入仅生成私有候选地点/日期/路线/设施/备注，逐字段显示来源片段、置信度和坐标敏感提示，用户确认后才写入行程，永不自动发布为地点事实。原文正文/截图只为解析在加密临时区保留最长 24h 后删除，最终保留用户确认的结构化字段、必要来源 URL/许可和修改记录；平台条款/版权不允许时禁用该入口而保留手工录入。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: 产品只把图文提取列为后续候选来源，没有授权抓取方式、平台条款或自动发布行为。
  - Affected REQ / AC: REQ itinerary-home, REQ unplanned-candidates, CTRL candidate-tray, NG mvp-general-social-network。

<a id="decision.professional-tool-data-sources"></a>
- **DEC professional-tool-data-sources**
  - Status: approved_by_owner (2026-07-20)
  - Decision: V3 极光、彗星、流星流量/可见数量、日月食、APOD/机构内容和空间站通行/凌日凌月各自的数据/算法源、覆盖、更新、许可/再分发、归属、API 公平使用、可信度与实验标签；确定 Astronomy Engine/JPL/NOAA/CelesTrak/Gaia 等仅验证、生产采集或离线资产的角色。
  - Options: 推荐先启 Astronomy Engine 可本地确定性计算工具；JPL 只作服务端低频黄金/小天体查询并遵守一次一请求/best-effort/version；NOAA SWPC 极光和其他远端工具逐项 POC；CelesTrak OMM 服务端集中缓存；NASA/APOD 逐媒体 credit/copyright，不自动再发布第三方版权；无权威/许可源工具保持 disabled/experimental。
<!-- ty-source-item:start key=approved-professional-tool-data-sources kind=technical_obligation -->
  - Approved resolution (owner, 2026-07-20): Astronomy Engine 固定版本承担本地日月行星、暮光和食相等确定性计算并用 JPL Horizons 低频黄金集验证；Gaia 只以官方版本/校验和制作经许可的区域/星等裁切离线资产。空间站/卫星采用服务端集中获取 CelesTrak OMM+SGP4，遵守更新节奏、六位 catalog ID、非 200 停止重试与过期隐藏；JPL API 只作低频验证/必要小天体查询，不当高可用批量源。NOAA SWPC 极光和彗星/流星数量等远端工具逐项通过覆盖、许可、更新与区域 POC 后启用，否则 disabled/experimental；APOD/机构内容只展示逐媒体确认可用的 credit/copyright 或外链，不因 NASA 名称自动再发布。所有工具显示来源/版本/更新时间/置信与实验标签，缺许可或过期不生成伪倒计时/确定数量。
<!-- ty-source-item:end -->
  - Why it cannot be reliably derived: Source 列出工具目标但未选择动态内容生产源；官方资料明确 JPL 无永久可用保证/一次一请求、CelesTrak 有更新/错误停取政策，NASA 名称也不等于每张 APOD 媒体可商业再分发。
  - Affected REQ / AC: REQ celestial-calendar, REQ station-transits, REQ other-astronomy-tools, REQ educational-content, AC professional-tool-boundaries, EXT geospatial-catalog-content-licenses。

## 10. Completeness Check

### Source Coverage

- S-PRODUCT 一～五：产品定位、本质、核心价值、四类核心用户/扩展人群、五个核心场景、决策闭环和五入口 IA 已进入 Goal、Outcome 总览、OUT mobile-shell-and-preferences、OUT tonight-decision 与跨 Outcome 一致性约束。
- S-PRODUCT 6.1～6.3：初次偏好、今晚 A～F、小时/多模型/15 日/蒙影/地图预报已逐字段进入前三个 Outcome 的 REQ、CTRL 和 AC。
- S-PRODUCT 6.4～6.6：地图基础内容、四组筛选、全部图层、地点卡、路线、地点详情 A～J、三层推荐/硬阻断/排序/画像/解释已进入 OUT map-route-discovery、spot-detail-and-trust、tonight-decision；VIIRS/Bortle 和公开 POI 边界未丢失。
- S-PRODUCT 6.7～6.10：行程首页/输入/自动生成/总览/真实阶段/待规划/五类路线/版本/分享/协作、360°天空/时间/方向/遮挡/轨迹/视场、手机/相机全参数/九类预设/AI/两组清单、现场全字段/工具/安全已分别形成独立 Outcome；MVP/V1/V2/V3 限定保留。
- S-PRODUCT 6.11～6.13 与九：新地点、实况全字段、长期/临时、七类纠错、可信度、轻社区边界、专业工具全目录、个人中心全分类、出发前/行程中/长期通知已逐项进入 community、notifications、identity Outcomes。
- S-PRODUCT 七～八：Spot、Forecast、Celestial Window、Itinerary、Field Report、Shooting Plan 语义和“结论→行动→专业数据”输出层级已进入实体覆盖、各领域 Requirement 和跨 Outcome OBL。
- S-PRODUCT 十～十二：MVP 必做/暂不做、V1/V2/V3、PWA 验证/最终 APP/小程序轻入口全部在 Section 3、release-phase-integrity 和平台验收中保留；参考图没有把装备替换为一级入口或把图文导入提前到 MVP。
- S-PRODUCT 十三～十六：漏斗、全部关键事件、北极星/辅助指标、地点/审核/数据源/推荐后台、数据来源/地点真实性/预测不确定/公开风险/专业分层及最终页面关系均进入 quality、admin、spot、cross constraints、EXT/DEC/RISK。
- S-ARCH 一～四：完整技术基线、模块化单体、总体拓扑、移动端分层/模块/本地库/离线包/三档定位/方向融合/天空 AR、高德适配、WGS84/GCJ-02、PostGIS 和候选限流全部有 REQ/OBL/AC 或 DEC。
- S-ARCH 五～八：15 个后端领域、长期/临时实况、摄影/通知/后台、天气/通透度/视宁度/天文/银河/卫星/VIIRS/DEM/路线数据源、通用数据原则/29 个核心实体、NightReport、分层评分/阻断/连续窗口/解释/机器学习边界已覆盖。
- S-ARCH 九～十二：REST/OpenAPI `/v1` 端点语义、数据状态、四层缓存/所有建议 TTL/击穿保护、14 类任务/可靠性/供应商故障、媒体/EXIF/全景管线已覆盖；建议阈值没有被静默固化，相关项进入 DEC。
- S-ARCH 十三～十九：环境/生产拓扑/容器/备份、Development Build/EAS/runtimeVersion、安全隐私/六级坐标/API 防护、技术/数据可观测、推荐重放、单元/黄金/契约/移动/户外测试、十项性能建议及九类技术风险全部进入 quality/admin/identity/相关 RISK 与 EXT。
- S-ARCH 二十～二十二：概念 Monorepo 树、五层工程依赖顺序、最终聚合架构和四项长期资产已保留为 Requirement/OBL/HINT；没有把概念路径误绑定为真实 Delivery Contract 文件。
- S-DESIGN/S-CONTEXT/S-INTERACTION/S-APPLE：品牌/视觉/日夜红光、390×844、44px、结论/行动/证据、共享地点/时间/路线状态和可访问性均已引用；新增即时 press、commit/cancel、直接操控、中断/速度、gesture arbitration、Bottom Sheet、触觉、reduced motion、平台原生差异和真机验收。DESIGN.md 是完整长期规范，项目 Skill 是单向下游 RN 伴随指南并保留上游 revision/MIT，web 玻璃/系统字体/iOS 同质化冲突未进入 Starward。
- S-RESEARCH：移动版本策略、QWeather/Open-Meteo/ECMWF、高德/OSM 边界、EOG VNL v2.2、Copernicus DEM 访问变化、Astronomy Engine/Gaia/CelesTrak/JPL/NOAA、Expo/APNs/FCM/国内推送、OSS/COS/CDN、离线/成本/POC/采购法务门均进入 REQ/OBL/AC/EXT/DEC；新增“真实性/目标区稳定性/许可/降级硬门先淘汰，再在等价合格候选中选择 12 个月 TCO 最低者”的跨域规则、成本台账、最低采购顺序和第二付费源触发器，推荐与已批准、技术可行与合同/校准/现场完成仍保持分离。
- S-IMG-01～10：每张图的尺寸、哈希、采纳的布局/交互证据和拒绝复制的品牌/装饰/假业务均在 Section 2 记录，并映射到首页/地图/地点/行程/极坐标/专业预报控件。

### Structural Coverage

- 当前文档含 14 个独立可判定 Outcome、164 个原始 REQ、95 个完整状态 CTRL、43 个原始强制 OBL、16 个 NCOMP、120 个单场景 AC、40 个精确 Runtime Fact RISK、8 个 EXT、32 个已由 owner 于 2026-07-20 批准并分别提升为 14 个 Requirement/18 个 Technical Obligation 的 DEC resolution、27 个非绑定 HINT、5 个 NG 和 9 个 FS；Contract 目标合计 178 个 Requirement 与 61 个 Technical Obligation。
- 每个 REQ、CTRL、OBL、NCOMP 至少被一个 AC 明确接受；每个 CTRL 均独立写出 Location、User task、Trigger、Input、Loading、Empty、Success、Failure、Feedback。
- 每个 AC 只含一组 Accepts/Given/When/Then；每个 RISK 只关联一个现有 Outcome，并使用允许的十种 Fact 之一。
- 所有 Accepts/DEC/EXT/Affected 引用指向已声明语义键；锚点和同类型键保持唯一。
- 直接来源、必要推导、仓库/Context 证据、外部确认、未决产品语义和 advisory hint 已分开；没有把图片参考、实现建议或实时依赖版本提升为无条件产品事实。

### Approved Product Semantics And External Gates

- 32 个 DEC 已由 owner 于 2026-07-20 全部批准，覆盖依赖与交互动效 token、OS/本地化、游客/默认偏好/首发区域、天气与跨域供应商预算/付费冗余、视宁度/窗口、地图图层/密度、路线/推荐/安全/光污染、坐标/审核/协作、离线/后台安全/通知/AI、删除/分析、对象存储/CDN、缓存/灾备/SLO，以及 V2 内容导入和 V3 专业数据源；每项 Approved resolution 都是独立 Material Item，并绑定到对应 Outcome 的 Requirement 或 Technical Obligation。
- Owner 批准的是产品/技术基线，不授权付款、签约、生产公开、越权获取数据或跳过 POC/真机/现场/法务；8 个 EXT 及各 resolution 内的 contract/poc/production gate 继续保持外部确认边界，未满足时必须采用已批准的 disabled、staging、规则解释、radiance-only、unknown 或其他诚实降级。

### Unbound Repository And Verification Facts

- 尚未绑定真实 owner、生产实现路径、runner/proof/Assertion、依赖 lock、交互 token、真机/户外 POC、云资源、商店/证书、密钥、供应商账号/合同/采购预算/正式报价、生产域名、后台角色、数据校准、真实用量/账单或迁移批次；这些属于后续 `/long-task-workflow` 的仓库扫描、Context/本调研读取与 Delivery Contract 编写职责。
- S-ARCH 的仓库树、Provider 类名、MapAdapter 签名和 package 结构仅为 HINT/概念义务，不证明当前仓库已有这些文件。
- EXT 的商业许可、法务/备案、商店能力、户外设备、天文基准、摄影实拍和地点现场核验必须由真实外部证据完成；示例、模拟器或一小组样本不能冒充全量/生产确认。

### Explicitly Out Of Scope For This Source Plan

- 不生成交付 Contract 文件或非渲染 Source 标记，不绑定 owner/path/runner/proof/Assertion，不启动 `/long-task-workflow`，不实施 APP/后端/基础设施，也不宣称产品或任一版本已交付。
- 本轮独立 UI/Context workflow 已把交互责任、Skill 单向权威和“调研推荐不等于生产事实”写入 `project_context/**`；Source Plan 不把供应商推荐、价格、阈值或 POC 状态冒充 durable 已决事实。后续确认 DEC/合同/校准时仍须按 Tiny Context 规则更新 owning Context。
- 不把 PWA、小程序、静态 Kit/截图、单平台 demo、假数据或后续 V3 工具壳作为 React Native APP 完成。
- 不创建额外 Source Plan、Schema、CLI、Preflight、Compile、Receipt、Coverage Cache、Authority 或状态文件；本 Markdown 仍是唯一 Source Plan。`docs/technical-data-source-decisions.md` 是有日期的研究证据包，项目 Skill 是实现伴随指南，二者都不是第二份 Source Plan。

Completeness status:
- Ready for further refinement: yes
- Decisions required: none；32 个 DEC 的 Approved resolution 已由 owner 于 2026-07-20 批准并成为可追踪 Material Item。
- Advisory implementation hints: HINT proposed-mobile-modules, HINT report-snapshot-shape, HINT candidate-route-bound, HINT astronomy-package-capsule, HINT map-adapter-contract, HINT map-request-cancellation, HINT route-snapshot, HINT spot-section-fetching, HINT horizon-composition, HINT itinerary-snapshot-diff, HINT share-rendering, HINT sky-catalog-chunks, HINT orientation-sampling, HINT user-adjustment-overlay, HINT device-capability-catalog, HINT offline-pack-manifest, HINT sync-dependency-order, HINT duplicate-spot-review, HINT ttl-by-fact-type, HINT notification-transition-trigger, HINT toolbox-domain-reuse, HINT account-job-status, HINT profile-reference-integrity, HINT modular-monolith-events, HINT dry-run-first, HINT repository-layout, HINT slo-budgeting
- Unbound project facts: real production owners/paths/runners/proof/Assertions,安装后的精确 dependency lock 与双端 compatibility/interaction POC 证据、provider contracts/credentials/quotas/pricing/逐项付费预算批准、raw production datasets/checksums 与校准、最终 OSS/COS provider/region、production infrastructure/app-store control planes、legal/licensing approvals、real-device/field POC 和 actual usage/billing；这些属于实现证据或 EXT，不把已批准的产品决策重新降级为未决。
