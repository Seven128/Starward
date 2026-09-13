# 当前进展

## 2026-09-13 19:18 最终候选与 Android 普通预览

- UI 已继续按当前采用 HTML/CSS/JS 资源实修：共享事件 Modal 改为设计稿的 12px 侧边距、22px 全圆角固定壳、左对齐标题、年度目录、票券日期卡、详情主视觉/事实卡/时间轴/当地条件；Map 宿主打开期间隐藏原生 TabBar，关闭后恢复。Map 浏览与 Plan 单选仍共用同一组件，保留公开目录全类型、临时选择/确认/计划保存分层及历史深链。
- 原生成功 run `wechat-devtools-2026-09-13T10-48-27-241Z-2c9af741` 在候选 SHA256 `364254241faec1c65766a81b6cc513ebb2b29470b5069abcb0beba809e245c0c` 上 16/16 通过；含 Map 事件 list/detail/back/close、真实 Plan editor 事件选择、正确的点位“天文”第三章节，以及夜空中国四点完整生命周期。降级 run `wechat-devtools-2026-09-13T10-58-10-533Z-c5f514d4` 同哈希 4/4、fault injection/cleanup passed。
- 高效率治理已补齐真实分包预算：`inspect-production.mjs` 分别限制主包/每个分包 2 MiB、总包 20 MiB，并有超单包/超总包 mutation 回归。production 检查通过：total 4,025,939 bytes，main 1,999,389，content 932,479，spot 430,272，sky 663,799；workflow 141/141，通过前一轮最终 `check:miniapp:fast`（contracts 24、API 177+2 skip、frontend 445、设计/图标/语义资产/UI contracts）和 infrastructure `verify_70ee9a16a7f146a4`。
- Android 无线 ADB 重新验证为唯一可用 transport，手机到当前 LAN fixture `/health/live` 返回 HTTP 200。production WEAPP 以 generation 2、243 files、SHA256 `c4b333b2d29dd57c3cb1b40d2adedab4242f7a9f100404030515963c4bc4d11b` 生成官方普通预览二维码；二维码实际前台显示，并由已授权微信扫一扫进入。独立守卫截图确认新版 Modal list/detail/back/close、Map 隐藏 TabBar、图层 active 仅圆形、GLO30 地形真实叠加、My 和投稿空态。该证据是 `development_feedback / ordinary preview`，不升级为真机调试或固定候选验收；运行时 AppID/手机包 bytes 仍未由 SDK 证明。
- 夜空中国四点的用户侧创建均由真实 WEAPP 表单执行；服务端管理入口仅用于状态转换。覆盖草稿保存、退出重开、修改、取消删除、确认删除、提交、审核中只读、驳回原因、回填修改、显式重提、审核通过、正式合并发布、公开搜索/地图、下线、恢复，以及正式点反馈的提交/驳回/重提/通过合并与回读。手机普通预览使用新的匿名隔离身份，因此只验证投稿入口和空态，没有把桌面隔离记录伪装为手机数据。
- 明确未验证：iOS/iPhone、物理平板、真实 VIIRS grid 手机显示、读屏焦点、减少动态效果与快速反向/重开、完整前后台恢复、生产账号/审核后台/通知供应商、真实账户删除、运行时 SDK 身份、第三方独立执行者评审。当前 GLO30 仍仅覆盖大湾区中心 85km，SRTM 无自动 fallback。这些限制不推翻已验证的实现层，但不得扩大为对应平台/外部链路通过。
- 本次 feedback/device session、两代 prepared generation、二维码置顶窗口、LAN API 与本地设计预览均按 owner 清理；微信手机数据未改，无线 ADB 配对保留。

## 2026-09-13 15:54 当前续接状态

- 已修复两项用户真机反例：B 位图语义资产在通用伪元素规则之后再次关闭旧 CSS 绘制；Map 图层 active 背景只落在圆形视觉表面，不再染色 44px 方形命中区。新增共享渲染回归曾在修复前稳定失败 2 项，修复后前端全量 445/445 通过。
- 新增完整草稿删除能力：`DRAFT -> WITHDRAWN` 契约、API、PostgreSQL/内存存储、审计/状态历史/幂等/版本、媒体过期清理、SDK、前端确认弹窗和记录隐藏均已落地。API 全量 177 passed + 2 skipped，相关前端与契约检查通过。
- 修复发布点下线后同一 WEAPP 会话搜索仍命中 5 分钟旧缓存的真实缺陷；搜索查询改为每次进入重新确认。修复前证据 run `wechat-devtools-2026-09-13T06-35-46-593Z-a0747c42`，修复后夜空中国专项通过。
- 夜空中国 4 个真实来源点已由原生 WEAPP 表单实际录入，未直接写库/API 创建用户提交、未复用来源照片：江英古道附近、欧家梯田、八界山、冰山梁。专项 run `wechat-devtools-2026-09-13T07-22-18-627Z-3a0c0706` 7/7 通过；覆盖草稿保存/退出重开/编辑/取消删除/确认删除，提交/审核中，退回/原因/修改重提，审核通过/正式合并/发布，公众搜索与地图，下线后搜索不可见及重新发布恢复。八界山、冰山梁保留待审核；江英草稿为 WITHDRAWN；欧家完成发布循环。
- 完整候选串联发现上传恢复草稿与新观星点草稿的自动化选择歧义。最终代码为贡献记录增加稳定的类型 class，并让运行器精确选择 `new-spot-proposal`；类型检查与 workflow 140/140 通过。最新完整 run `wechat-devtools-2026-09-13T07-44-25-833Z-a7bc9847` 在该最终修复前失败，故当前完整组合仍须重跑；失败环境均已清理。
- 最新源码尚未生成并扫描新的手机预览；早先普通预览/无线 ADB/手机服务可达只绑定旧候选。Android 当前源码、降级集、iOS、物理平板和独立执行者评审仍未验证，Goal 保持 active。

## 2026-09-13 续接执行（当前）

用户已恢复完整产品实施，新的 Goal 为 active，承接原需求及 CONTINUE/INDEX/coverage/本文件/治理续修；历史完成结论仍撤回。13:33 已告知用户可以离开电脑：本次官方 MCP 登录有效且技能 0.3.10 一致；无线 ADB 有界 shell、前台/焦点保护截图与点击成功；手机接电满电、未锁屏、保持唤醒原值15，无需修改。电脑前台显示本次官方普通预览二维码，代理通过微信 Launcher 的扫一扫实际进入小程序并点击打开事件目录；手机至本机 API 的 HTTP 请求返回200。没有要求用户代办的实际卡点。

本次证据为 **development_feedback / ordinary preview**，不等于真机调试、固定候选或产品验收。预检生成身份为 generation 1，WEAPP SHA256 `01bd8d036c6064cd0a3bef4c1c16de059d79d3b5cc30a4a47a476a930da4d9f1`，243文件。当前手机仍有旧绘制叠加的修复前反例，产品代码尚未在此次续接修改。API 为现有 MEMORY_TEST 开发 fixture，真实地形/VIIRS及其它产品义务继续核验。

本机恢复：feedback run `C:/Users/777/AppData/Local/Temp/starward-device-feedback-VkU1Sw`，prepared project `generation-000001-xSfZr2/project`，已完成可见扫描后 bind；device session `starward-device-test-wtgb9U`。API 为本次 exec session 45317（Node PID 28372，8787），手机操作与本次截图仅存 `output/miniapp-uiux-alignment-2026-09-13/resume/`；该目录的 `phone.mjs` 复用项目 AdbDevice 的身份/前台守卫，扫码 bootstrap 单独限制 Launcher/scanner。二维码 viewer PID 在该目录私有文件；后续清理只处理这些所属资源。

下一步：按当前采用资源实际修复共享图标绘制和 Map 工具状态，再按全量 coverage 继续内容/交互/数据/恢复义务；修复前截图已获取，但不可用其证明新构建。完整必要证据未齐前 Goal 不关闭。

## 历史撤回记录（已由顶部 19:18 结果取代）

更新时间：2026-09-13。原完整完成结论曾因真机反例撤回：新旧图标叠加、地图悬浮控件active时出现超出圆形表面的方块。此处保留当时判断以解释后续修复，不代表当前状态。

## 已落地代码（不等于验收完成）

- **真实地形**：Copernicus DEM GLO-30八幅COG经SHA256绑定，WGS84采样并转GCJ-02，生成1536² hillshade/高程色带；BFF提供安全资产端点，客户端含查询缓存、取消和原生`MapContext.addGroundOverlay/updateGroundOverlay/removeGroundOverlay`。当前发布覆盖大湾区中心85km，约110.7m派生分辨率，有效99.34%，海洋缺瓦明确为缺测。点位文档新增“基本信息→地形→天文”，地形/光污染独立开关；主地图地形叠加与LIGHT/TOTAL_CLOUD互不冒充。
- **B批图标**：71份256×256 RGBA母版、2,216,122 bytes精确保持；构建按主包/子包消费者生成224px页面派生和192px原生Tab派生。`SemanticIcon`、地图四态marker、原生Tab及Map/Search/My/Plan/Event/Contribution/Feedback/Sky/Settings消费者已迁移。NIGHT/OBSERVATION继续使用已有合法主题。
- **共享Tab**：`SelectionTabs`统一13px基线、active视觉15px、220ms、文字独立缩放、44px命中和减少动态效果即时切换；已迁移点位章节、贡献/反馈章节和贡献记录等真正Tab消费者。
- **共享天文事件Modal**：`AstronomicalEventModal`统一固定外壳、list/detail内部切换、browse/select-one、临时单选、加载/错误/空态、查询取消与NativeBack。Map、计划编辑/只读和旧深链兼容宿主共用；服务端允许历史多关联原样读取，显式替换只接受0/1。
- **UIUX与Context对齐**：保留原Map/Search、点位三档/照片、计划完整字段、贡献反馈、Sky、设置账户等内容和owner；修复large媒体与图层shell几何、Map事件返回边界及预览缓存造成的旧候选误测；更新DESIGN、产品/架构Context和采用资源。

## 历史检查结果及适用范围

这些检查实际运行过，但此前的截图观察不足，未形成可信的全产品视觉验收。尤其“无诊断标记”只排除临时字母，不排除图标/容器缺陷；“4个UI探针”只是源码模式检查。多视口截图存在不能直接证明各视口符合采用资源。

- `npm run check:miniapp:fast`的各阶段均通过：contracts 24/24、API 176 passed + 2 skipped、frontend 443/443、workflow 137/137、图标54、语义资产24、生产UI探针4；设计系统校验通过。
- 最终WEAPP构建成功；官方开发者工具以唯一`dist/weapp`副本路径打包，TOTAL 4,017,091 bytes，main 2,006,254 bytes，content 921,344，sky 660,960，spot 428,533。
- 模拟器覆盖320/375/390/430及820平板视口、共享Modal两模式、Tab、地形章节、图层与关键页面回归。
- Android微信真调试覆盖：最终干净Map与真实原生地形叠加；事件list/detail两级系统Back（详情→列表→Map）；图层sheet系统Back；干净候选再次验证列表→Map且无诊断标记。

## 明确未验证/受限

- **历史失败（现已修复）**：B图标与旧绘制叠加、地图工具active视觉越出圆形表面；当前证据见顶部最终记录。
- 未做iOS/iPhone和物理平板真机；820仅开发者工具平板模拟器。
- Plan select-one、共享Tab快速反向、减少动态效果、Modal快速重开/前后台/读屏焦点恢复主要由源码、自动化与模拟器覆盖，未逐项物理设备观察。
- 当前真机fixture没有生产Postgres VIIRS格网，故光污染真实图层未在该候选视觉展示；服务端仅接纳真实grid的边界与测试已通过。
- 地形发布只覆盖大湾区中心85km；SRTM仍为备选数据源，没有实现自动fallback；全球覆盖不在当前发布包。
- 微信通知供应商真实投递、外部鉴权/生产数据、账户真实删除均依赖外部条件或具有破坏性，本轮只验证契约、状态与安全边界。
- 已完成第二遍逐项证据审查；本任务禁止启动子代理且没有外部人员参与，故没有第三方/独立执行者评审。

## 环境收口

- 手机`stay_on_while_plugged_in`已恢复为原值15，Windows代理已恢复为`ProxyEnable=0`并保留原服务器字符串；本轮LAN fixture/API已停止，无线调试配对保留。
- 微信开发者工具已从唯一预览副本切回`apps/wechat-miniapp`源码项目并置前。最终干净候选二维码、包体信息和真机截图留在证据目录。
