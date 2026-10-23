# R19 统一来源页：消费者与边界核对

2026-10-22。只读核对当前 checkout 的生产代码与相关 Context；本报告不认证目标运行时。按用户最新指令：来源入口统一打开真实只读页面，共享按钮、跳转逻辑及固定内容模板；本指令覆盖旧内联展开/来源 Sheet 要求。未改生产代码、PLAN、HANDOFF、设备、IDE、服务或 Git 状态。

## 共用责任与数据

- 保留 `SourceSummary` 为出处、许可、品牌声明、发布时间/实际获取时间/适用时段、状态、精度、限制的事实模型。继续用 `uniqueSourceRecords` 全记录去重、`isProductSource` 过滤测试来源；不能按 ID 合并不同获取时间/时段/声明的记录。
- 共用的页内入口应只有一个按钮实现（当前 `SkySourceLink` 的来源图标/44Px 命中区可作为复用起点），一个防连点、失败反馈与 `navigateTo` 实现。各消费者只提供当前文档/版本身份及其原生命周期的前后置适配。
- 一种 `Provenance` 阅读模板即可覆盖普通来源；说明内容用结构化段落/事实行/复制链接/可选下载表达。不要把当前 `SourceDisclosure.children: ReactNode` 或点击/查询闭包传入另一页。共享页面不可反向依赖 Map/Sky 大页面。
- `RepresentativeMedia` 没有 `SourceSummary` 的发布时间、实际获取时间及精度；拍摄时间不能填为获取时间。可采用独立媒体权利模板或窄适配（作者、拍摄、现场/代表媒体、原始出处、许可），不为每个供应商另造模板。
- 天空资产的特有内容是处理说明、复合权利、原包/当前派生图/manifest/许可数据下载，适合统一资产段落模板及领域适配。继续由原 publication/source owner 生成 URL、hash 与声明，页面不推断资格或制作权利。
- `SourceAttribution` 在**数据旁**的必要品牌及声明原文必须保留。统一来源入口不授权把必要署名全移至详情页；页面内的“复制官网/出处/许可/下载”是真实动作，仍应明确叫复制。跳来源页不是外部官网已打开，也不解决既有个人主体 WebView/供应商超链接缺口。

## 需迁移调用清单

以下路径均相对 `apps/wechat-miniapp/src/`。同一个组件可能有多个上层消费者，应在组件 owner 迁移，不在每页复制跳转。

| 当前调用 | 内容/身份 | 建议 |
|---|---|---|
| `pages/map/index.tsx`：`map-terrain-source` | 当前视口实际地形，preview、datasetVersion、coverageLabel | 共享来源按钮；保持视口来源与选点来源独立 |
| 同文件：`map-layer-sources` | `layerSources` 当前云量/夜光和启用地形的完整记录；临时地形说明 | 同模板的多记录文档，不能拉入未显示/未完成图层声明 |
| `pages/map/spot-panel.tsx`：`moon-data-source` | report 的 PRODUCT_CALCULATION | 共用来源页 |
| 同文件：`weather-data-source` / `sky-data-source` | report 的预报/全部来源、小时覆盖、过期、所选时刻语义 | 将 `ForecastCoverageNote` 的范围/说明转只读结构数据；保留小时与获取/发布区别 |
| 同文件：`night-light-source` | 当前点年度夜光记录 | 共用来源页；当前夜光短署名保留 |
| 同文件：`data-source-disclosure` 的自写 Button | `onEvidence("sources")` 打开原 `spot/data-source` 完整页 | 也用同一来源按钮样式与跳转适配；原聚合页请求/恢复边界保留 |
| `pages/map/spot-terrain-overview.tsx`：`terrain-data-source` | 点位地形+夜光、版本/分辨率/coverage | 共用模板，当前可见图层短署名仍按 `displayedSources` |
| `pages/map/spot-terrain-horizon.tsx`：`spot-horizon-source` | 独立 horizon publication、coverage/limitations | 共用模板，不与俯视图来源混成同一版次 |
| `components/air-quality.tsx`：`air-quality-source` | 同点 current 与 forecast 两条记录、各自有效性、小时覆盖 | 共用模板；current 不填未来、两个记录不按 ID 合并 |
| `components/recent-weather.tsx`：`recent-weather-source` | 地区前两自然日、缺失日期、额外天气事实、限制 | 来源页结构化说明；含 GeoAPI 地区资料，按下节实时寿命处理 |
| `features/spot/spot-detail-page.tsx`：`site-reading-source` 及“全部来源与更新时间” | 正式点/route/site/facilities，完整页使用 contextId | 共用入口；不要造第二设施核验模型 |
| `content/article/detail/index.tsx`：`article-facility-source-${index}` | 引用设施记录 | 共用来源页，设施本身与核验结果仍在正文 |
| `content/article/detail/article-media.tsx`：照片披露 | `RepresentativeMedia` 的原始 URL/许可/拍摄时间，sources 当前为空 | 媒体权利模板；空 SourceSummary 不应导致入口消失 |
| `content/share/public-share-card.tsx`：`public-share-sources` | share 来源及 `card.notes` 行程/资料说明 | 来源移公共页；业务行程说明保留在分享正文或明确业务详情，不应混成来源字段 |
| `features/sky/spot-sky-page.tsx`：目标/目录两处 `SkySourceLink` | `skyTargetSourcesRoute` / `celestialInformationSourceRoute` | 公共按钮/导航器；保留当前 Sky 前置资格及资源保留适配 |
| 同文件：天空说明中的星座、暗星、地景、银河、W3；`sky-body-image-source.tsx` | 当前已绘/已完成 publication、catalog hash、下载、权利、处理限制 | 将各 `SkySourceDisclosure` 真正迁移为页面入口；复用数据 owner，不只改按钮外形而保留内联展开 |
| `features/sky/sky-optical-image-credit.tsx` | 当前所绘影像短署名及 `credit.sourceRoute` | 署名保留，影像来源按钮迁移公共实现，仍核当前 painted frame |

`SourceAttribution` 直接消费者（除 `Provenance` 内部）完整分布：Map root、spot-panel、spot-terrain-overview、Search 的 LESS_CLOUD 结果、`AirQuality`、`RecentWeather`、`WeatherAlerts`、`PlanReference`、`PublicShareCard`。已有 credit 模式不含页面跳转；若目标是“所有来源都能统一打开”，Search/Plan/时间区归因等仅有 SourceAttribution 的消费者也要接同一入口，不能遗漏。

另外发现直接 `Provenance` 消费者应随“统一来源”范围一并核对：`astronomical-event-modal.tsx` 的科学来源与 articleSource、`content/article/detail` 的 article.source、`content/share/index` 的事件/点/计划来源、`facility-evidence.tsx`、`pages/map/spot-additional-information.tsx`。它们当前没有 SourceDisclosure；保留需要就地展示的简短署名/科学精度，将长来源详情换共享入口。事件科学源与补充文章源、目录版本的归属仍须独立。

## 不能改成来源页的业务披露

- `WeatherAlerts` 的 compact `SourceDisclosure` 当前混合“完整预警与防御指引”与来源：首层 instruction 已完整，children 是真实 alert.description。应拆为独立预警业务展开（headline、sender、issued/effective/expires、完整 instruction 均保留原合同）和公共来源按钮，不能让用户为了读预警正文先去来源页。
- `SpotAdditionalInformation` 的“更多场地信息”、设施状态/最近核验、限制及现场指引，是点位业务内容；继续在原连续文档展开。只迁移其中出处详情。
- `ForecastCoverageNote` 是范围帮助而非纯来源；页面内已有的独立问号说明不应全局机械替换。只把原先来源披露 children 中对应范围渲染改为结构数据，沿原 `forecastCoverage` 算法合并实际小时且不补中断段。
- 天空说明中的实时/模拟/现场含义和必要短署名，若对当前事实必需仍须就地可见；“来源页统一”不授权删去太阳/地景/银河并非现场实测的含义。完整权利与科学长说明可以迁移。

## 身份、导航和生命周期

1. Map 来源：绑定账号 owner、Map reset/选择身份、正式点/context revision/fingerprint、当前内容/所绘 publication。现在 `useSourceReadingHost` 绑定 `[accountOwnerId,mapResetVersion,panelGeometryIdentity]`，会在 hide/身份变更/卸载 clear；改真实页面后旧 Sheet channel、`sourceReading.active/back/surface` 与 NativeBackBoundary 接线应退役。原 Map 面板档位/滚动/图层仍由 Map 保存，Back 回到相同上下文；不要保留一个在后台绘制来源的隐藏宿主。
2. 普通文档若走临时内存快照，只存小型可序列化来源/注释，需有不可猜测的单次 route token、账号/原路由身份与过期/卸载清理。不得把私有提案或 live 地区资料放 URL、持久 storage、日志、跨账号缓存，也不存原组件/查询函数/图像资源。无效 token 显示普通失效/返回提示，不以别的来源回填。
3. 近期天气更严格：原 `use-recent-weather-query` 在 hide/失败释放地区数据，不保历史或离线回退；公共来源页需要接收当前 visible 生命周期或自行沿原 hook 读取，不能为了来源页新建长寿命 snapshot/cache。原 `spot/data-source` 已是独立读取 overview/AQ/recent 的参考实现，独立失败保其余记录。
4. Sky 来源已经是独立 route，切勿直接从新按钮调用裸 `navigateTo` 绕过 `openSkySources`：它检查 `skyTimeIntentCurrent`、取消未确认 calibration、锁导航、设置 sourceReturn 保留资源并在失败恢复。`openOpticalSources` 还核同一 native generation、frame/data/mode/time 及当前所绘 credit；来源必须继续对应当前完成绘制的版本。
5. Sky 页面已有四种真实加载机制：目录+可选 imagery hash、prepared 固定 publication、HiPS hash+source IDs+独立 rights、report target 的 context/revision/fingerprint/dataRevision/at/target/source ID。共享**导航/阅读骨架**，不用一个无类型任意 query 取代它们。保留 `parseSkySourceSelection` 互斥验证、`skyTargetSourceContextMatches`、`useSkySourceRecovery` 对旧/隐藏 retry 的拒绝。
6. 返回使用真实页面 stack；保存已选对象、搜索进入返回路径、Canvas/相机/FOV/当前时间和菜单任务。不能用 `switchTab` 统一替代所有 Back；原 `spot/data-source` 底部“返回观星点”的特殊恢复入口与 CustomNav Back 应分别按原合同核对。

## 必要验证机制

普通记录模板（完整同 ID 异时记录、缺失字段、长网址/复制）一组；媒体/多权利下载模板一组；live recent-weather hide/失效清理一组；Sky 精确 publication→来源→Back/导航失败恢复一组。共享按钮按已有 SharedButton 的按下/取消/连点 owner；目标 WEAPP 需实看页面、系统 Back 与原页面状态，静态结构/单测不能认证。

引用 owner：`project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md` 的来源/署名/去重与 live recent weather；`spot-and-sky.md` 的当前已绘来源与 Sources Back；`DESIGN.md` 的本产品 token/44px 命中区；`.codex/skills/uiux_design/SKILL.md` 的共用职责与真实消费者核对。旧 inline/sheet 的 Context 文字由最新用户指令覆盖，durable 修改由主代理在最终 API/迁移后统一维护。
