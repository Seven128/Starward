# 今晚去观星小程序：地形、B批图标、天文事件Modal及整体对齐补开发

2026-09-13用户确认本轮最终增量设计，并要求下一开发对话实施。本文是需求说明与导航；产品规则、设计取值和技术责任仍以链接的现行owner为准。此次前期工作只更新设计资源和Context，没有实施生产页面或真实地形接入。不得把浏览器原型当作已完成的小程序功能。

## 一、总体目标与范围

这是一个完整需求，包含下面四个部分。基于现有采用界面增量实现，保留已有有效布局、内容和交互。上一轮发生较多实现漂移，因此交付必须包括整个小程序的UI/UX校验、产品/架构/实现Context对齐，以及缺失功能的实际补开发，不能只提交检查报告。

范围是独立Taro/WEAPP小程序及为其履行当前契约所需的现有服务、契约包和数据处理责任；不自动包含Native App、运营后台改版、购买服务或生产发布。已有已采用但尚未正确实现的要求也在核对和补齐范围内，不以“旧需求”为由忽略。

## 二、三项功能与对应设计修订

### 1. 地形信息与地图叠加

- 观星点信息保持原连续文档，章节为“基本信息 → 地形 → 天文”，不删原基本信息/天文内容、照片查看器、三档拖动和底部动作。
- 地形为北朝上的方形地图，中心是当前观星点，标注东南西北、距离圈及比例尺。只保留半径拖动轴，默认5km，可调2–50km，采用近距离易操作的对数映射与2/5/10/20/50刻度。半径更新图面，非仅改文字。
- 地形、光污染是独立可多选的图标选项；至少44px触控目标，选中状态不能只靠颜色。不同图层有对应图例，缺测区域明确区分。
- 产品界面统一叫“光污染”。源说明解释为卫星年度估算的灯光分布，不能冒充实测天空亮度、当晚照度或确切摄影影响。
- 已明确删除方向/角度拖动轴、射线、方向控制点、遮挡角度分析和分析读数；不要按早期稿重新加回。
- 主地图增加独立地形叠加；原光污染/云量保持二选一，地形可与任一组合。图层与观星点面板继续由原Map呈现协调器互斥管理。
- 以实际能取得的数据为准。沿用Context中的GLO30 DEM、SRTM备选和既有VIIRS管道研究决策；在实际覆盖、坐标转换、缺测、许可、请求/缓存和试用预算内实现。无依据不得承诺“误差小于20%”。原型地形与格网是设计示例，不能直接上线。早期地平线/遮挡计算研究不是本轮被用户保留的角度分析需求。

产品owner：[spot-and-sky](../../project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md#地形以可获得数据为边界)、[map-and-finder](../../project_context/areas/main/screen-contracts/wechat-miniapp/map-and-finder.md)。数据及实现owner：[runtime-and-domain](../../project_context/architecture/runtime-and-domain.md#mini-program-terrain-and-directional-light-evidence)。

### 2. 最新B批图标整体替换

- 采用最新B批磨砂拟物、圆润可爱、元素克制的整套资源：71份、256×256透明RGBA PNG，约2.11MiB，以资产manifest实际值为准。
- 从现有SemanticIcon/Asset责任迁移，核对小程序所有实际图标消费者，包含天文区、日期/时间、地图工具、计划、搜索、我的、设置等，不只替换当前演示页。
- 点位default/selected/draft/pending及其他明确状态使用采用资源，尺寸/位置对齐。保留已有切换与想去反馈，位图仍可做缩放、位移、旋转、透明度与分层合成动效。
- 真实月相、天文图、星空数据绘制及平台自身图标不是任意替换成装饰PNG的对象。未交付的night/observation主题图标不能宣称已具备；按现有主题owner适配和验证。

唯一采用入口：[icons/ADOPTED.md](../design-resources/wechat-miniapp/shared/icons/ADOPTED.md)。漏项与边界：[application-review.md](../design-resources/wechat-miniapp/shared/icons/application-review.md)。生产接入：[runtime-and-domain](../../project_context/architecture/runtime-and-domain.md#mini-program-b-matte-icon-integration-boundary)。

### 3. 共享天文事件Modal与公共交互修订

- 地图悬浮工具组新增小流星入口，打开较大Modal，竖排事件卡片；仅浏览，不显示radio、选中项、确认选择，不查询私人计划来制造关联状态。
- 卡片进入同一Modal内部详情：列表向左、详情从右进入，返回反向，保留列表滚动/焦点。外壳不变，不跳独立页面或重建整页。
- 计划编辑使用同一组件的单选模式。卡片主体看详情，独立radio选一项；清除和选择只修改临时态，确认回填计划草稿，计划保存才持久化。关闭取消本次临时选择，既有地点/日期/提醒等不得被改写。只读计划可浏览关联事件。
- 沿用现有事件目录、详情/当地条件查询和计划聚合。当前原型只演示部分流星雨，不意味着删除生产已支持日月食类型。新编辑至多一个关联；历史多关联记录按owner约定保留并显式替换，不能静默截断或丢弃。
- 外层进入240ms淡入并从0.97轻放大到1，退出180ms反向，遮罩同步；关闭完成前保持模态拦截，随后归还焦点。快速重开取消旧关闭，确认防重复，减少动态效果直接完成状态。
- 观星点大档全宽填满、顶部方角，所有身份及有图/无图一致；小中档保留对应圆角。图层面板单一方角外壳，不能“圆角面板再叠方块”。保留原拖动、媒体拉出和返回行为。
- **Tab激活反馈是公共组件规则**：全部同一基础字号，active文字轻微放大，失活缩回，切换有连续动画。采用源基础13px、active视觉15px、220ms，缩放不推挤相邻项与点击区域；快速反向接管、减少动态效果即时呈现。现有观星点章节和新增/反馈表单章节实际复用；继续核对其他真正Tab消费者。筛选chip、radio和主导航不因外观相似自动改为此规则。章节选择/滚动仍归各业务owner，不新增第二个selected状态。

共享语义：[shared-state-and-recovery](../../project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md)。共享技术：[runtime-and-domain](../../project_context/architecture/runtime-and-domain.md#shared-astronomical-event-modal-implementation-boundary)。共享设计源：[Modal](../design-resources/wechat-miniapp/shared/astronomical-event-modal/README.md)、[Tabs](../design-resources/wechat-miniapp/shared/tabs/README.md)。

## 三、整体校验、对齐与补开发

先从实际实现与现行Context确定差异，不预设所有旧功能已经正确。核对Map/观星点/图层、Search、My、计划列表/详情/编辑、创建/反馈/审核状态、Sky及天体信息、设置/账户/权限/错误恢复，以及跨页共享组件。保留按身份划分的正式点、私有草稿、审核中提案权限，真实数据未知不得填造。

开发须完成发现的缺失与漂移修复，并在现有责任边界补齐契约、数据接入、状态和交互；不为方便实现重新设计UI、裁掉内容或反改Context掩盖差异。检查公共组件所有受影响消费者，状态归属和跨子包加载；复用公共时间、SemanticAsset、Map呈现与Observation Context、计划/贡献/事件服务，不复制第二套真值。

验收结合实际当前候选的编译/类型/服务与契约回归、真实WEAPP运行、可比较的视觉和交互观察。包括代表性手机/平板尺寸，拖动与滚动冲突、返回与焦点恢复、打开关闭中断、加载/空/失败/重试、历史数据、身份切换/权限、前后台与减少动态效果。数据管道要验证真实样本/覆盖/缺测/坐标与缓存；原生地图叠加、传感器和设备动效按相关运行责任验证。不要把浏览器截图或测试中的mock当作上述验证。

对尚不能完成的外部条件，具体记录受影响功能、已做验证、缺失条件和后续动作；继续完成不依赖它的工作。最终报告说明实际修改、验证与剩余差异，不能只写“全部对齐”。

正式产品owner：[整体UIUX与Context对齐补开发](../../project_context/areas/main/screen-contracts/wechat-miniapp.md#整体uiux与context对齐补开发)。架构owner：[alignment boundary](../../project_context/architecture/runtime-and-domain.md#mini-program-alignment-and-completion-boundary)。

## 四、当前采用资源与Context导航

先读[AGENTS.md](../../AGENTS.md)、[global.md](../../project_context/global.md)、[DESIGN.md](../../DESIGN.md)、[架构](../../project_context/architecture.md)、[小程序Screen Contract](../../project_context/areas/main/screen-contracts/wechat-miniapp.md)及其相关子owner；生产实现与工具入口见[development-workflow](../../project_context/development-workflow.md)和[implementation-index](../../project_context/areas/main/implementation-index.md)。

| 范围 | 当前入口 |
| --- | --- |
| 本轮完整可交互采用资源 | [统一入口](../design-resources/wechat-miniapp/shared/astronomical-event-modal/README.md) / [review.html](../design-resources/wechat-miniapp/shared/astronomical-event-modal/review.html) |
| Map及完整观星点、图层、创建/反馈宿主 | [Map ADOPTED](../design-resources/wechat-miniapp/map/ADOPTED.md) / [本轮完整增量源](../design-resources/wechat-miniapp/map/revisions/three-requirements-2026-09-13/README.md) |
| 观星计划 | [Plan ADOPTED](../design-resources/wechat-miniapp/plan/ADOPTED.md) / [本轮完整增量源](../design-resources/wechat-miniapp/plan/revisions/three-requirements-2026-09-13/README.md) |
| 事件承载 | [Events ADOPTED](../design-resources/wechat-miniapp/events/ADOPTED.md) / [共享Modal](../design-resources/wechat-miniapp/shared/astronomical-event-modal/modal.mjs) |
| 图标与公共Tab | [Icons](../design-resources/wechat-miniapp/shared/icons/ADOPTED.md) / [Tabs](../design-resources/wechat-miniapp/shared/tabs/README.md) |
| 其他现行页面资源 | [Search](../design-resources/wechat-miniapp/search/ADOPTED.md)、[My](../design-resources/wechat-miniapp/my/ADOPTED.md)、[Sky](../design-resources/wechat-miniapp/sky/ADOPTED.md)、[反馈](../design-resources/wechat-miniapp/feedback/ADOPTED.md)及对应Screen Contract |
| Stitch同步与留存状态 | [sync.md](../design-resources/wechat-miniapp/shared/astronomical-event-modal/stitch-sync.md) |

资源精确取值/可编辑交互在本地HTML/CSS/JS及资产manifest，Stitch中的精确截图用于视觉索引，不宣称是可运行共享组件。旧资源仅在尚有效范围或作为当前必要依赖继续使用；目录含candidate/revision字样不单独决定是否采用，以ADOPTED声明范围为准。不要选择更顺手的旧截图作为本轮依据。

从仓库根目录运行 `node .codex/work-items/three-requirements-2026-09-13/serve.mjs`，若4178已有该服务则复用，打开 `http://127.0.0.1:4178/shared/astronomical-event-modal/review.html`。不要直接双击HTML导致绝对资源路径失效。原型验证入口为同任务目录中的 `check-repair.cjs`、`check-simple-terrain.cjs`、`check-tabs-icons.cjs`；它们只证明设计原型层，生产检查按当前workflow和真实改动选择。不要重跑历史生成/反馈修改脚本覆盖采用稿。

## 五、设计资源维护约束

用户要求资源持久化且每个范围只留当前采用版本。每次需求前期完成后，删除本地和Stitch的明确废案及完全被替代版本；不能用隐藏或归档冒充删除。保留有效共享源、必要状态变体和实际依赖，先修复依赖再删除。Windows默认回收站，用户原始Desktop图标不在本轮资源清理范围内。详见[生命周期](../../project_context/context-maintenance.md#design-resource-lifecycle)。

本轮采用只是开发起点；后续普通还原修复复用本稿，不重新生成整套设计。真正改变已确认产品/视觉规则时，把变更同步到现有owner与当前资源，并明确新旧范围。
