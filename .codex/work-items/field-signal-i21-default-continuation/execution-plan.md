# 实际执行方案与续接位置

开始日期：2026-09-06。工作流：默认。Goal 已创建且 active。本文件是可更新任务笔记，完整要求按 README 与 source-index 回到原文；不是新规范或精确验收 ledger。

## 当前进度

- 已读取交接全文含附录、原 Goal、原 Source 开头与 marker 导航、旧 Contract 头部、核心 Context 与相关验证导航；大资源内容仍需按后续执行范围分段展开，不能声称已全部理解/核验。
- 已确认 main 相对 origin/main ahead 18，存在大量原有 dirty；保全基线见 baseline.json。原有dirty保持；本轮已修请求Promise拒绝、native chrome色值/返回同步，并在真实UI保存第一条私有导入两次至rev7。未运行Long-Task命令。
- 已确认 current binding 指向 R11 handoff；原 Source/Goal 内的旧设计路径和启动提示是历史，不可照执行。
- 恢复优先读本文件末尾最新进展。索引完整性与首批代码/数据库/真实UI复核已完成；下一批处理Settings观测模式白色开关、Import用户文案/控制流缺口、其余9条真实语料、正式点前置事实及全页面复核。所有当前证据及限制在下方逐批记录。

## 实施前 Architecture Deliberation

本轮准备交付仅新增本目录恢复资料，owner 为 `.codex/work-items`，现有产品/设计 truth 仍归 `project_context/**`、`DESIGN.md` 及已选资源；不改运行依赖、状态或生命周期。选择轻量 Markdown 执行笔记 + 原文路径/位置/摘要索引 + 外部附件逐字节副本；不新建 Contract、Fact ledger 或工作流引擎。未来新增需求用新增原文定位与就地计划更新恢复，不从摘要推导新规则。原有 dirty 和旧 Long-Task 绑定保留为历史状态，不在本轮擅自清理。禁止用索引代替 Source、将历史通过写作当前通过、泄露敏感资料。检查是索引路径存在、Source marker 完整成对、62 controls/10 cases 数量及身份、附件副本摘要相等、Git diff whitespace 与 Context recoverability。正确性以原文不损失/可定位保持，可维护性以单入口及沿既有 owner 保持；没有产品性能或安全改善主张。Context Delta: none。进入产品编辑前必须按实际 owner/风险补充新的 deliberation。

## 工作顺序与不可漏项

### A. 恢复与已修缺陷复核（进行中）

依据交接 §1–3、§6.2–6.3、§7、§9–11、附录 B；展开 Source 相应 marker、Context runtime/domain 与 workflow lanes。

- 审阅 service `updateImportDraft` 对 current.spotProposalId/review state 的复用，保留 formal/proposal 互斥、optimistic revision 和 idempotency。
- 审阅 corpus、infrastructure 重复 EDIT_DRAFT/ASSOCIATE_SPOT/PREVIEW/restart 测试和 test-fixtures/infrastructure-spot.ts；不重复修复、不拿 fixture 冒充正常目录。
- 检查真实运行 API 是否加载当前代码，既有服务健康则复用；不要启动第二 watcher/IDE/API，不伤及其他项目进程/容器。
- 只读重查第一条 import 和历史 proposal 引用；不得盲目新建、清库、清历史 orphan。旧 ID/阶段精确值见交接 §6.2。
- 只读重查正式目录及 publication completeness/provenance/owner review，列出真正缺失事实。旧 26 DATA_INSUFFICIENT、0 PUBLISHED 是历史观察。

### B. 全页面 UI 与状态（待执行）

依据交接 §4、§8、附录 A 全部 62 keys；读 DESIGN.md、owning screen/product Context、当前 selected constraint 及依赖；执行 UI skill。主路由：pages/map/index、spot/search/index、sky/detail/index、pages/my/index、content/plan/detail/index、content/settings/index、content/profile/links/index、content/import/index、content/contribution/index。auth/guides/field/data-source/article 支持真实路径按依赖纳入，不误扩展成独立新产品。

- 全局：精确 day/night/observation tokens、紧凑密度、无效图片零节点/空占位、暂无数据与各失败模型区分、删除无行动价值噪音；320/375/390/430、100/200% text、safe area、88rpx 语义热区、a11y/键盘、reduced motion/transparency、无横溢出、隐藏 scrollbar 但保留滚动。动画连续可打断/反向，不靠串 timeout 丢状态。
- Search：入口/输入锚点不动，leading Back 唯一因果变化，无 trailing x；IME/focus/outside blur、即时多选、分区 identity/anchor、整卡选择/合法 media；所有 Back 回原 Map、同 selected spot、新点 medium；定位拒绝仍可浏览。
- Panel：visibility/extent 分离，small/medium/large 同 document/identity，仅 large 唯一纵滚；104×40rpx handle 起拖和阈值、body 不抢、nav-safe、非手势返回；40rpx 无图 band/有图 overlay，媒体先展开 chrome 后退；概览/天文 rail 中点无 gap 不占文档宽，同 scroll section 同步；紧凑等宽想去/分享/云观星，以及完整 route/facility/source/guide/contribution。
- Map layer/time：唯一 bottomPresentation 互斥、点新 marker 无旧 panel 闪回；layer 固高仅三个受支持项、真实 unavailable，无多余 close/handle/重复条件卡；三处真实横向 ScrollView 时间尺统一 preview/snap/commit/cancel，跨轴 gesture owner 不换手。
- My/Plan/Settings/Profile：紧凑 account hub/utility/routine、唯一图标 owner、无假统计/第二 favorites；Plan 服务持久化/冲突/重启；三态显示模式直接可访问选择且 observation 原子黑红不闪；账号/提醒意图/平台授权区分、server export 与真实删除生命周期（删除仅隔离账号）；URL scheme 验证、save/delete/restart/copy fallback/cancel；子页面返回 scroll/focus/draft。
- Contribution：Spot/My 同 form，report/context/topics/time/narrative/conditional location/media+rights/唯一 submit；existing spot 不定位，新地点按许可且不泄露；MIME/size/count/EXIF、progress/retry/remove/cancel/background、首错焦点/IME/320+200%、double-submit/retry key、sink/readback/restart、pending/history identity scope；审核/合并/发布分离。

### C. 星图真实入口与科学/资源边界（待执行）

交接 §5 完整八步；既有 Gaia DR3 2048 星、最暗约 G=5.007534、45° 垂直 FOV 是当前实现事实，不能声称完整 5.5 等或肉眼 1:1。沿 astronomy-core/BFF/scene contracts/projection/platform adapter；不另造坐标、时间或随机星/图片/CDN。

从真实 formal spot 的云观星入口检查当前构建 canvas 测量/DPR/比例/清屏/labels、四方位/俯仰/滚转/地平线/天顶/背面裁剪。共享时间 preview/commit/cancel/快变/跨日/迟到请求、背景和目标同瞬间、回 Map 同状态。sensor 的北参考、轴/正负、精度/stale/同 heading recovery、permission/retry、hide/back/unmount/foreground 生命周期；无手动朝向或合成 pose 兜底，不记录轨迹。真实手机背向/FOV/误差范围和设备差异保留实机/必要阈值澄清；读屏对象与降级 disclosure 保留。

### D. 固定十条真实导入与正式点联动（待执行）

严格使用 tools/miniapp/fixtures/nightchina-import-cases.json 全部 10 keys/URL/地点/拍摄日期/输入/短释义/权利/关联预期，不能临时换样本或只跑服务测试。交接 §6.1 表逐行完整保留于原文及索引。先重验第一条，再其余九条，观察第二条未保存现场避免覆盖。

每条 Map→My→Import→source+rights→可编辑 draft→真实 parser 或 GATED/PARTIAL/FAILED→编辑保存→formal/proposal 二选一→preview→人工审核提交边界；持久化/失败/重试/返回/恢复均实际核查。不得复制全文或来源照片；带图仅明确合成本地测试图走媒体 owner。9 条 proposal 不因 formal 点阻塞而停做；gd-dapeng-summer-fireflies 的 formal 关联先取得真实兼容确认，不能硬套 spot:sz-astronomical-observatory 或 SQL 发布。合法 formal 点具备后完成 panel/section/route/access/facility/favorite+restore/share/sky+return/contribution 全联动及单一 selected spot/time truth。

### E. 当前候选验证与默认收束（待执行）

沿项目既有检查，先验证命令前置：check:miniapp:fast、WEAPP build、test:miniapp:infrastructure、test:miniapp:workflow、test:miniapp:design-bindings、design:system:verify、design:lint、make validate-harness；另跑 make validate-context 作 Context drift/recoverability。按改动影响重跑，避免无变化重复昂贵构建。test:miniapp:current 含 native 有环境前提，不能当普通单测盲跑。当前 handoff design-resource preflight 仅证明输入完整性。

正式 native collector 执行前读 candidate/paths/lifecycle，当前 cold-start 真入口、fixed fingerprint、互斥 writer、23977/9420 与清理全部约束保留。fixture/platform simulation/H5/静态图/历史 session 不能证明真实 native/device/provider。最终审阅精确归属 diff，默认 Contract/Engineering Quality/Architecture/selected-design Conformance，逐项说明未建立的 viewport/状态/设备/真实外部条件；独立 Context drift。无 Long-Task Final Gate/签名自举/机器 accepted 要求。外部人类事实仍不能代签或编造。

## 外部边界与当前未验证

真机正式验收暂放；formal directory/capabilities/运行代码状态尚未本轮复查；parser 历史 GATED 不能绕许可/SSRF gate；正式点位资料/开放/安全/媒体权利/审核无法虚构；真实平台分享、账号、GPS、传感器和网络等按实际观测报告。正式发布/运营写入、上传审核、AppID 迁移、远端部署、购买不在当前授权内。先完成独立可做工作，剩下真实外部动作才向用户提出最小缺口。

## 本轮验证记录

本轮实际检查与结果按下方批次记录。早期“正在执行/尚未完成”是当时观察，以后面的收取结果覆盖；不将交接历史pass视为本轮证据。

Context: no durable fact change

## 2026-09-06 本轮实际进展（中途恢复点）

- source-index.json 已生成：83 个文件、1759 个 Source marker（逐段起止行完整配对）、62 Controls、10 cases；旧 Goal 副本与附件字节摘要相等。baseline.json 在首次产品编辑前落盘。索引 helper 曾因 Source marker 的 aspect 属性匹配不全失败，已支持附加属性；未改变 Source。
- 已审阅 import service/corpus/infrastructure diff 与 helper：保留 current proposal ID 和 review state 的修复已存在，本轮未重复修改。
- 当前通过：API typecheck；nightchina-import-corpus 2 tests；infrastructure run verify_e9543b066dd9474f（Postgres/Redis/HTTP/backup-restore/restart，隔离库和 cache 已清理）；R11 design-resource preflight valid，**不证明生产一致性**。
- 只读实际数据库：26 DATA_INSUFFICIENT / 0 PUBLISHED；0 publication assessments；仍只有第一条 import，PREVIEW rev5/GATED/DRAFT/原 proposal ID，历史 proposals 共3条。本轮无数据库写入。
- 当前 capabilities：OWN_POST_IMPORT/PROFILE_LINKS enabled；WECHAT_AUTH/parser/externalOpen/routeProvider/placeSearch disabled，manual draft/copy/external-map fallback 有声明；weather enabled 不等于真实预测已验证。
- Native Computer Use 通过 @oai/sky 已定位唯一 DevTools 窗口，当前 Stable 2.01.2510280；project.private.config.json projectname 与窗口相符。不要覆盖/丢弃用户未保存的 settings.json。首次观察 Import 第二条固定来源 URL 和 rights 已填写但未创建，第一条在历史列表；本轮 api-client 保存触发既有 WEAPP 热编译，运行重载回 Map，第二条输入需按固定 corpus 恢复（没有新增未知用户文字）。未把热编译视为固定候选验收。
- 观察到 Import 原始 stage/revision/ID 和冗余实现文案，尚未修改；原日志 request:fail abort 与 tab_bar_theme_sync_failed。native-chrome.ts 确认仍是旧版色值；这是下一批实际修复目标。

### 请求层修复 Architecture Deliberation / 当前实现

owner 是 apps/wechat-miniapp/src/services/api-client.ts，复用既有 request/finish/LatestRequestRegistry 与 query hook，未改 API/domain/cache/state truth。安装的 @tarojs/shared/dist/native-apis.js:getNormalRequest 先回调 originFail 再 reject Promise；原实现漏观察 Promise。选择在现有 transportFailure 单结算函数汇合 callback 与 Promise rejection；替代方案仅消费拒绝也能消除日志但无法及时处理 promise-only rejection，故不选。无需库或新 wrapper；禁止改全局 unhandled handler、吞外层错误、将取消当缓存成功。未来 Taro request seam 改变由同 owner 与仿真 dual-channel tests 暴露。可靠性（计时器/abort cleanup）、并发（once-settle/迟到回调）、可观察性（无未处理拒绝/单一诊断）是触发属性；正确性与可维护性由复用统一 owner 保持；权限/缓存身份隔离不变，未作性能主张。Context Delta: none。

改动：api-client.ts 提取 transportFailure 并观察 task Promise；api-request-test-support.ts 增加真实 Promise+callback 注入；request-lifecycle.test.ts 增加取消/超时/network/promise-only/真实缓存 fallback 回归。当前 request-lifecycle + use-resource-query 共19项通过。check:miniapp:fast 正在执行，日志 artifacts/miniapp/default-continuation-fast.log，exec session 13295（句柄可能随会话失效，先看日志/进程，勿盲重启）。尚未声称原生取消错误在最新 candidate 复验消失。

下一步：收取 fast 结果；修正 native-chrome 当前 Design 色值及子路由 tabbar 生命周期（实施前补对应 deliberation/selected source 读取与 tests）；重验当前 warm WEAPP，恢复十条导入。扩展 source-index 纳入根 DESIGN 引用的 exact-value base/unified-flow-forms 与后续新资料。默认 Conformance/Context 检查尚未本轮收束，Goal 保持 active。

### 原生外观修复与当前候选验证（续）

Architecture Deliberation：native-chrome.ts 是既有 platform chrome adapter，use-theme.ts 是页面主题生命周期入口，mode 仍由 app-store 持有，图标由现有 assets/icons 管线持有。当前 DESIGN day/night/observation 及 generate-mode-icons 的色值投射替换旧色；不建立 route registry/第二 palette authority。子路由仅精确匹配平台已观察的 setTabBarStyle:fail not TabBar page，停止后续 tab-item 调用，但背景继续同步，其他失败向上传播；页面 useDidShow 用当前 store mode 重新同步。选择平台的明确不适用结果而非复制 primary route 列表；未来 API 改错误语义会可见失败，不静默忽略。正确性、可维护性保持单 owner；触发兼容、资源/页面生命周期、observation safety 和可观察性。没有改变 durable semantics，未声称所有物理屏幕无闪烁。局部 debt 是旧 palette/缺少 return sync，本轮消除；不得全局吞异常或更改 design baseline。Context Delta: none。

当前改动还包括 theme/native-chrome.ts、hooks/use-theme.ts、新 theme/native-chrome.test.ts。4项 palette/child route/unexpected error/latest mode onShow 测试通过，小程序 typecheck 通过；全部小程序109 tests通过。check:miniapp:fast 已完成 passed（含请求层修复，发生于 native chrome 修改前，因此不冒称覆盖后者；native 修改后已补受影响 typecheck/all weapp tests/design-bindings）。最后 make validate-harness 通过，含既有waivers；本轮没有新增 waiver，api-client 修复沿旧 transport policy，不新增 endpoint/policy。make validate-context 与 git diff --check 通过。设计资源 R11 preflight 和 current bindings 均通过；未改 immutable 字节。

真实 warm WEAPP：Map→My→Import 自动回读第一条，连续两次点击保存当前草稿。DB分别读到rev6与rev7，PREVIEW、相同proposal ID、DRAFT，历史proposal总数仍3；这是开发数据库私有草稿的已授权测试写入，无审核提交/发布。随后原生返回My成功。正在进入Settings验证模式返回；未保存的用户settings.json保持原样。未声称十条真实导入完成。

source-index 已扩至107文件，加入当前exact-value base和unified-flow-forms selected-source；1759 markers/62 controls/10 cases不变。exec 13295/54254/93004 均已完成，不应再等待这些旧句柄。下一恢复动作：重新观察当前唯一DevTools窗口并完成Settings mode/返回验证（最后一次操作为从My点击设置）；然后继续Import文案/实际产品缺口、其余9语料和formal数据前置缺口，不能重复将两项已修问题作为新任务。

### 当前真实页面反馈与后续优先项

- 第一条Import第二次保存已读回PREVIEW revision 7，proposal ID仍为原值，review DRAFT，总proposals仍3。真实返回My成功，未提交人工审核。
- 当前warm WEAPP：My→Settings→点击观测红光→返回My成功，My和底部native tabbar保持黑红；可作为该返回路径的开发反馈，不能推广为全部模式/设备/像素通过。
- 新发现的明确剩余UI问题：Settings观测模式中的原生Switch白色thumb/关闭track仍亮白；页内Back图标亦需后续检查；平台微信胶囊白色属于平台边界须区别于可控组件。鼠标蓝色光圈是Computer Use工具指针反馈，不当产品像素缺陷。此次未修这些控件。下一批沿existing SemanticIcon、Switch/Settings owner和selected constraint处理，不靠遮罩或全局关闭告警伪造观测模式通过。
- 当前实际路由My，模式OBSERVATION；正在恢复原DAY模式，若中断，先重新观察再操作。原生返回后暂无新tab_bar_theme_sync_failed观察，但正式cold-start、夜间、rapid toggle和物理无闪仍未验证。
- 本批默认Engineering/Architecture Conformance：请求修复与chrome生命周期在既有owners收敛，无新增依赖、状态truth、全局异常屏蔽或新waiver；相应类型/单元/整个weapp测试及warm真实入口得到有限证据，selected输入/绑定保持有效。剩余UI/设备/provider/正式点/十语料完整journey不得纳入本批完成主张。Context drift/recoverability已独立通过，Context: no durable fact change。


最新停止位置：Settings已恢复DAY，屏幕显示“偏好已同步”，没有遗留OBSERVATION。该同步成功banner在页面顶部插入并推动下方布局，属于后续notification owner复核点（模式选择已有可见状态，不应再产生改变布局的成功反馈）。没有保存/关闭用户settings.json，没有启动第二IDE/API，没有任何外部发布。当前产品批次6个文件（含新native-chrome.test.ts），恢复文档单独位于本目录。Goal仍active，剩余范围按B–E继续，不把本批交付当整个Goal完成。

### 设置同步反馈与实际回调收敛（最新恢复点）

Architecture Deliberation：SettingsPage 持有手动动作反馈，usePreferencesSync 仍是偏好修订/冲突/重试 owner，notification store 仍是唯一通知 owner。按照已选 notification-feedback 约束，自动成功不插入 StatusPanel，手动同步成功由既有 floating 通知确认；失败/本地保存/冲突仍由现有 inline 状态与重试处理。没有新增状态、依赖或修改服务器协议；复用既有 owner 是本次 Build/Reuse 选择。正确性、可维护性保持原边界，触发异步失败可观察性与布局稳定性；不得吞失败或以自动成功 toast 替代旧 banner。Context Delta: none。

实现：hooks/use-preferences-sync.ts 清除自动开始/成功状态文本；content/settings/index.tsx 手动同步成功使用 settings owner 的 floating 通知，并修正冲突文字匹配。类型检查最初发现 NotificationIntent 必需 body，已补正文后通过。首次 validate-harness 暴露 SettingsPage statements 82 超过80；检查发现 chooseDisplayMode/toggleObservation 两个未渲染别名仅供测试引用。已删除别名及未用 exitObservation selector，notification.test.ts 改为直接执行实际 selectDisplayMode，并验证连续 OBSERVATION→NIGHT、DAY/NIGHT 与错误保留；不新增 waiver、不拆空壳绕检查。测试替换初次仍留下第二次 OBSERVATION 导致失败，已改成真实 NIGHT 选择后全部109测试通过。

原生开发反馈：当前热编译后实际 Map→My→Settings→NIGHT，等待同步后顶部没有旧“偏好已同步”banner、页面位置保持；已点击DAY恢复（此后代码热编译可能再次回Map，恢复时重新观察）。这一观察发生于删除未渲染别名前，不能代替最终冷启动。手动浮动确认和真实错误重试尚未 UI 验证。新增线索：夜间背景已变化但三态选择器边框仍画在日间；需复核 settings-sections.tsx data-selected-mode 与 index.scss thumb选择器在 WEAPP 的实际输出，不能声称三态全部正确。既有 Switch 亮白问题仍未修。IDE未保存settings.json未触碰。

最新受影响类型检查通过（别名移除后）；全部小程序109 tests通过（最后test修改后）。validate-harness/design-bindings/git diff check 正在 exec session20803，下一步收取结果；旧失败会话86266/58902已结束勿再等待。单独make validate-context本批已通过，此后只有局部代码/test变更，没有Context修改。下一批继续三态indicator/观测Switch、手动通知验证与B–E完整范围，特别是其余9条真实导入，不把本次反馈修复当Goal完成。Context: no durable fact change。

结果收取：exec20803已完成exit0；validate-harness通过（无新增waiver）、design-bindings两handoff通过、git diff --check通过（仅既有行尾提示）。本批Engineering/Architecture Conformance：自动/手动反馈沿原owner收敛，旧测试专用回调删除，测试现在覆盖实际选择入口；没有新依赖、重复状态、协议或durable变化。当前仅有限warm观察，手动反馈/最终冷启动/三态indicator和Switch剩余问题均保持未验证，不扩大通过范围。索引刷新仍107文件/1759markers/62controls/10cases。Goal保持active。

### 三态模式指示器 WEAPP 投射修复

Architecture Deliberation：settings-sections.tsx 持有三态控件呈现，app-store.mode 仍唯一状态，index.scss 持有现有连续transform动画。实际夜间截图显示thumb停在DAY；当前编译JS含data-selected-mode，但dist/weapp/base.wxml未输出该attribute，而WXSS依赖其选择器。选择从同一mode派生modifier class，保留原data作为诊断元数据，不新增state/依赖/route或另造动画。正确性/可维护性复用现有owner，兼容性触发于Taro template边界；禁止通过修改生成dist或设计资源修哈希掩盖问题。未来mode扩展需同owner增加站位；暂无性能主张。Context Delta: none。

实施：settings-sections.tsx的track增加settings-display-mode-track--${mode.toLowerCase()}；index.scss改night/observation为class selector。当前typecheck/design-bindings通过，git diff check输出只有行尾提示；session46204收取最终exit后记录。尚未本次原生确认动画位置。

本次重新读取当前upstream时明确展开遗漏：unified-flow-forms/selected-source/DESIGN.md:86要求track visible72rpx/max560、tap当前站前进、8px水平意图后跟手、position+velocity相邻snap、方向键/Home/End/读屏等价；当前SettingsControls仅direct tap，track min-height88，thumb空View、SemanticIcon在每站Button内，尚无drag或keyboard。这些都仍是明确未完成，不能拿当前class修复声称整个control完成。selected-source与历史Context仍写Taroify，但根DESIGN 4.5当前实施绑定明确Taro primitives且禁止mandatory第二icon，遵循较新的current binding。下一步应把该控件完整交互收敛到独立existing-component owner并补有效gesture tests及真实WEAPP反馈，再处理native Switch observation白色（不得简单遮罩）。B–E/9个导入未完成范围继续保持。

三态class修复结果：session46204与77979均exit0，typecheck/design-bindings/git diff check/validate-harness及单独validate-context通过；当前dist JS/WXSS已包含新modifier。实际warm Map→My→Settings→NIGHT截图确认thumb在中站，自动同步未插入banner。第一次点击后仍DAY，重新观察并再次点击后NIGHT成功，不据此声明首击/时序可靠性。已点击DAY恢复，下一恢复仍先观察（不能假设点击必成功）。Engineering/Architecture Conformance局部通过：修改保持原mode owner/动画，不引入依赖、不更改immutable；仅建立该站位开发反馈，完整control的drag/keyboard/当前站前进/selected semantics仍未交付；全目标未完成，Goal active。Context: no durable fact change。

### 三态触摸控件实现（最新）

Architecture Deliberation：新增content/settings/display-mode-control.tsx作为原Settings三态控件的局部实现owner，页面selectDisplayMode与app-store.mode仍唯一提交/状态源；display-mode-gesture.ts只保存本次touch的axis/position/velocity，不拥有持久模式。复用Taro触摸、selector query测量、既有CSS transform和SemanticIcon；不加库、定时动画或第二主题store。8px水平意图后锁轴、纵向不提交、取消清理、测量generation拒绝迟到结果；相邻snap考虑最近速度，超过100ms停止不沿用旧fling。风险触发正确性、可维护性、触摸资源/异步测量生命周期、滚动竞争和可访问性；无性能或真机正确性主张。未来站位扩展由同一DISPLAY_MODES/gesture owner负责；禁止非测量猜位置或仅tests专用回调。Context Delta:none，既有三态产品语义未变。

实现：settings-sections.tsx调用DisplayModeControl；DISPLAY_MODES/labels移到gesture模块；当前站tap循环前进，其余站direct选择。触摸开始测量当前thumb与首站位置以复用正在过渡的呈现位置；水平move投射临时transform，end仅相邻提交，cancel不提交；测量未返回时已记录轴，禁止把快速drag当tap，未测量不猜提交；mode变更/unmount使晚测量失效。Button compileMode+ariaLabel在实际WEAPP UI树已显示当前选中与下一步说明；未把语音文字说明当所有读屏语义完成。notification.test.ts仍测试真实page callback，删除已不需要的label抽取。

测试：新增gesture5项（current tap/直接选择、8px前与纵轴不转移、反向/夹取/相邻范围、速度和停止、未测量不猜站）。最新typecheck、全部小程序114tests、design-bindings、validate-harness（无新waiver）、独立validate-context、gitdiffcheck都通过。session36280与71154均完成；36280是测量race补丁之前，71154是最新，勿混用。真实warm Map→My→Settings看见新按钮名称与当前DAY；已点击当前DAY验证前进，下一步重新观察结果。未碰未保存settings.json。

仍需实际drag/scroll/cancel/multitouch/快速反转/前后台验证，catchMove动态行为不可仅凭单测认定；keyboard Arrow/Home/End尚无已验证WEAPP入口且未实现；精确visible72rpx/88hit geometry及thumb内图标仍需闭合，原CSS仍88rpx track/各站icons。本批不是control完整完成。Observation白Switch、其余9导入与完整B–E保持未完成。Goal active。

真实结果收取：点击当前DAY后实际NIGHT背景、thumb中站、UI树夜间“当前已选”均一致，证明该真实入口当前站tap前进。已点击非当前DAY恢复，后续先观察。控制台出现平台[worker] reportRealtimeAction:fail not support警告，未出现本控件JS错误；不作为全部运行验证。工程/架构局部Conformance：原状态/提交owner保留，手势纯逻辑与组件适配分离，晚测量与取消不提交，当前检查通过；完整手势/platform/a11y仍需证据。Context: no durable fact change。

### 真实拖动失败后的修复（最新恢复点）

前一轮为有效进展（实现+114tests+真实当前站点击），不是等待或阻塞。本轮实际从Settings DAY在同一可见轨上x884→985/y230水平drag，释放后仍DAY；因此撤销任何“原生drag已可用”的推断，上一轮仅click与纯算法通过。Sky drag是瞬时工具轨迹，不提供中途速度配置/取消，不能覆盖全部手势条件。

新证据：node_modules/@tarojs/runtime/dist/index.cjs.js:2279附近setAttribute(CATCHMOVE)明确修改节点nn为catch-view/view，dist/base.wxml分别使用catchtouchmove/bindtouchmove；动态catchMove存在中途换模板风险。同时原owner每次start才query，短drag可能在测量完成前end。Architecture Deliberation refresh：保持三态View节点稳定，把水平capture回传给SettingsPage现有ScrollView，以scrollY={!modeGestureCaptured}仲裁；这是临时滚动互斥，不是第二mode owner。结束/取消/hide恢复scroll，mode仍原提交路径。选择平台既有ScrollView/测量，禁止always catch拦掉纵向滚动或更换模板续拖。Context Delta:none；quality触发并发/生命周期/兼容与可靠性，单owner和无新依赖保持可维护性。

实现：display-mode-control.tsx在mount/show nextTick预先读取真实thumb.width作为短drag的已测step，start仍刷新呈现位置；generation屏蔽迟到测量；useDidHide取消。删除动态catchMove与horizontal state；onGestureCapture通知页面scrollY；SettingsControls只传递该回调。测量失败仍不猜站，不记录敏感数据。该修复尚未原生drag复验，不能说已解决。原生IDE因热编译可能回Map；此前页面DAY、未保存settings.json未触碰。

当前typecheck/tests/harness/context执行session43529需收取；63912是capture修改之前的批次，已结束通过，不作为最终全部证据。后续优先真实Map→My→Settings水平drag/纵向drag/反向复验，检查测量是否scope正确及event path；若仍失败用真实运行观察定位，不靠纯算法green收束。取消、hide、multi-touch与键盘/精确72rpx/图标/观测白Switch仍需验证或完善。全B–E/9条导入仍未完成，Goal active。

收取最新session43529：exit0，typecheck、114tests、validate-harness audited50/warning0/既有7waivers、独立validate-context通过。design-bindings和diffcheck随后通过。Engineering/Architecture局部检查未见新增state truth、依赖或waiver，回传仅控制原scroll owner；真实drag仍待候选复验，不把这些检查当手势通过。Context:no durable fact change。下一恢复先重读本最新段后进行原生drag，不重做已完成pure tests。

### 最新真实运行验证与共享通知缺陷

本轮没有新产品编辑；有效进展是实际运行证据改变下一动作。最新候选原生Map→My→Settings DAY水平drag x884→985/y230成功进入NIGHT，UI树夜间当前已选、背景和thumb中站一致；再x980→882反向成功DAY。随后从轨x975/y234→184纵向drag，页面正常向下滚到维护区、mode仍DAY，说明该工具轨迹下横/纵分流和scroll恢复成立。不能推广为所有速度、取消、中途reverse、multi-touch、hide或真机通过。本批代码没变，上一轮114tests/typecheck/harness/context证据未因代码改变失效。

本机维护可见后实际点击“同步账户偏好”两次，即时截图和UI树均无“偏好已同步”浮动确认。源码确认FloatingNotificationHost仅在app.tsx:108、没有任何页面挂载；Settings只有inline NotificationRegion。App包含QueryClientProvider+host+children，但WEAPP页面树没有该host。下一工作优先排查并修共享floating呈现位置：沿实际page根/主题容器挂载同一notification owner，不能仅修改设置页遗漏copy/save/export；保留single queue/dedupe/owner/expiry/safe-area/no-layout-shift，不能借CustomNav塞进高zindex固定父层而破坏map/no-nav路由。先展开所有主/支持route根、root设计/Context notification owner和测试，必要durable边界先更新Context，不能用H5 app包裹方式推断WEAPP。该缺陷解释之前手动成功通知代码已加入但用户不可见；不要再声明已完成手动反馈。

当前真实页面Settings DAY、已滚到“本机维护”，没有改偏好字段，未触碰用户settings.json。工具@oai/sky仍可用；句柄和元素必须重新观察。既有Switch白thumb/track在DAY/NIGHT/OBS待独立方案；DESIGN7.6 exact92×48/thumb40/inset4/travel44、全行88、aria-checked，原生Switch color仅轨填色，不能以overlay遮盖冒充可访问实现。完整B–E和其余9真实导入仍保留。Goal active。Context: no durable fact change。

### WEAPP浮动通知宿主修复（最新）

Architecture Deliberation：notification.tsx/app-store notifications仍唯一呈现与queue/arbitration/dedupe owner；App只持provider/launch，不能提供跨WEAPP页面树的visual overlay。选择每个真实页面theme root挂同一FloatingNotificationHost，隐藏时useDidHide不呈现，useDidShow恢复；不挂CustomNav/ScrollView内，不新增queue/业务状态或依赖。未来新增page或备用state root由page-root coverage test暴露缺host。风险触发compatibility/lifecycle/a11y announcement/theme inheritance；correctness与maintainability保持原owner，禁止H5式App overlay、第二通知系统或全局清queue掩盖问题。Context Delta:required；实施前在project_context/architecture/runtime-and-domain.md的Mini Program Product And Plan Flow首条补WEAPP页面边界。

实现：从app.tsx移除FloatingNotificationHost；13个page实现文件的16个theme root分支直接挂host（13owners覆盖app.config全部14routes，GUIDES/FIELD共享SpotDetailPage）。包括sky三种返回分支、spotdetail两种分支；原dirty保持，只插入import/host。notification.tsx新增page show/hide visible gating。新增notification-host.test.ts：执行实际host函数校验hide/show；显式13个owner校验每个theme root直接且唯一host、App无host，防只测Settings而漏分支。测试只证明结构/生命周期端口，非所有页面像素正确。

当前证据：typecheck通过（新增test前，测试源码仍需最终受影响类型检查）；先114tests/设计binding通过，新增host回归后116tests通过。最新harness/context正在session93086，需收取；之前session9316/9604均已结束，非本次新test完整证据。gitdiffcheck先前通过；新test后补最终diffcheck。

真实warm Map→My→Settings→滚维护区→手动同步：UI树显示“偏好已同步”“已保存到当前账户。”及关闭通知按钮，截图浮动在维护区上方，按钮/页面未移位；已点击关闭，待重新观察消失。本次证明之前App缺host修复确实进入WEAPP页面树。期间目标IDE最小化导致工具截图回退到其他前台窗口；未操作Codex，重新list_windows并activate精确DevTools后继续，未保存/关闭settings.json。

新发现独立运行错误：地图平台渲染层Cannot read property lat of undefined，堆栈pointsChanged→fitBounds→getNorthWest（不保存地图provider URL/key）。发生在Map切My附近；要检查includePoints空数组/迟到地图更新及hidden边界，不能归为通知pass或静默吞掉。已有scroll-view padding不支持与worker reportRealtimeAction警告保持待归属。当前SettingsDAY已滚底部，无外部发布。通知关闭/跨页hide/其他owner copy、observation配色/safe-area仍需真实验证；timeout/pause策略未由此次改写。全B–E、Switch白色、三态剩余、其余9导入和formal目录缺口继续保留，Goal active。

最终收取：session93086 exit0，116tests、最新typecheck、harness和单独validate-context均通过；新增test后diffcheck通过。当前UI树已无“偏好已同步”或关闭按钮，关闭操作生效。索引107files/1759markers/62controls/10cases更新了新Context摘要；没有改immutable Source。局部Engineering/Architecture Conformance：page host沿原queue与theme owner、hide lifecycle收敛，所有已列root结构回归；真实Settings显示/关闭已建立，其余route/runtime条件保持限定。Context: updated project_context/architecture/runtime-and-domain.md（WEAPP通知page-root边界）。Goal active。

### 地图空点集模板修复与第二条固定真实导入

Architecture Deliberation：MapPage是native Map props/viewpoint/event owner，未声明includePoints也未调用fitBounds；但Taro通用base.wxml自动输出include-points={{i.p13||[]}}，已观察渲染错误栈pointsChanged→fitBounds→getNorthWest/lat undefined。选择既有Taro compileMode仅输出显式props，保留原viewport/markers/polygons/event/state，禁止dummy coordinates、改SDK或吞错误。正确性/兼容/可观察性触发；未增依赖、第二位置源或性能承诺，未来fitBounds意图必须显式实点；Context Delta:none（局部模板适配）。Map加compileMode后当前index-templates.wxml确认无include-points而显式props完整；typecheck、design-bindings、validate-harness、独立validate-context、diffcheck通过。session50689已exit0。实际热编译Map→My→Map往返后未再观察lat错误（仅此路径，不声明供应商所有错误消失）。未重跑116tests因为单props编译修复已有实际模板/类型/原生反馈；没有新domain逻辑。

第二固定样本gd-oujia-terraces已从真实Map→My→Import→新建另一条导入推进。Source URL逐字来自fixture；确认仅元数据和自写短释义使用权，未复制正文/照片。创建新私有draft import:8892a3f1-3fb6-42e6-a99f-543c3226b964，GATED手工模式；标题“星映梯田月映云｜来源元数据导入测试”，body完全等于fixture.importText，sourceNote保留广东省清远市连山县欧家梯田/2022-07-10/照片权利未确认/待核验。初次textarea点击未实际focus，滚到可见区并点击正文区域后重新输入，47字回显；没有把失败输入当保存。

真实保存SOURCE rev1→EDIT_DRAFT rev2→选择独立地点提议→ASSOCIATE_SPOT rev3→打开预览PREVIEW rev4；界面现有2条草稿，第一条仍PREVIEW/DRAFT/rev7。只读Postgres回读第二条确认title/body/sourceNote值完整、editedByUser=true，proposal spot-proposal:ed691201-be60-4a1b-b126-5f10703e5ab5，review DRAFT，PREVIEW/rev4。界面“提交人工审核”可见但未点击，未发布/正式点关联。固定corpuspublication要求draft/preview，因此这条不是审核通过。还需要第二条重复保存identity/返回重载持久化验证；后面8个固定case（含formal兼容缺口）仍待实际journey，不能说十条全完成。

当前现场Import已滚到关联/预览附近、DAY；原生未保存settings.json保持原样。下一步可先重复保存第二条并回读proposal保持，再返回My重开Import验证；不要新建重复第二条。随后case3 gd-yangshan-watch-sky。全B–E与Switch/三态a11y等范围保留。Context: no durable fact change（本批；整个Goal之前已有通知Context更新）。Goal active。

第二条重复保存结果：真实点击保存当前草稿后UI与只读DB均PREVIEW/DRAFT/rev5，proposal仍spot-proposal:ed691201-be60-4a1b-b126-5f10703e5ab5。第二条重复保存身份检查已完成，不再重复当下一步；下一动作是返回My再重开回读，然后第三条。当前Import仍第二条预览。局部Engineering/Architecture Conformance：Map显式模板保留原owner且实际无空fitBounds属性；native往返证据有边界；import为既有service真实私有数据路径，无fixture发布或人工审批替代。Context: no durable fact change。

### 第三条固定导入与第二条返回恢复验证（默认 Goal 续接）

本次先从第二条 Import 返回 My，再通过内容导入真实入口重开；UI恢复 import:8892a3f1-3fb6-42e6-a99f-543c3226b964，PREVIEW/DRAFT/rev5，第二条返回恢复已验证。随后新建第三条，未重复创建第二条。

第三条 gd-yangshan-watch-sky：来源 URL https://nightchina.net/2024/12/06/%E5%AE%88%E6%9C%9B%E6%98%9F%E7%A9%BA-3/；标题“守望星空｜来源元数据导入测试”。正文逐字fixture.importText：“来源页面标注拍摄地为清远阳山；导入测试保留来源、地点和日期，并把其余信息标为待核验。”（UI42字）。sourceNote保留固定case key、广东省清远市阳山县、拍摄日期2024-12-01、仅自写短释义与来源元数据、原文照片权利未确认且不复制上传、地点现场待核验。全程PRIVATE，自动解析GATED明确可见；未上传媒体、未提交人工审核、未创建正式点。

真实UI建立 import:93f60ea1-5e3e-4094-8ee0-785fcc8a8fd3，SOURCE rev1→EDIT_DRAFT rev2→独立地点提议→ASSOCIATE_SPOT rev3→PREVIEW rev4。只读DB核对title/body/sourceNote全部完整，proposal spot-proposal:11b712bd-ae14-45d5-9eb6-af87f7bfe11e，review DRAFT。随后真实保存当前草稿，第二次只读DB确认PREVIEW/DRAFT/rev5且proposal未变。由此第三条预览和重复保存身份已验证；返回My再重开恢复仍待下一步。界面按钮无cached bounds时未推测点击，刷新截图后点击真实保存关联入口。DevTools未保存settings.json保持原状。

局部Engineering/Architecture Conformance：本批无产品代码或配置修改，使用既有Import页面/service/DB owner的实际私有草稿流程，仅只读SQL验证持久化；未以fixture正式点或绕审核替代真实数据。之前代码测试结果仍限原候选，本批无需重复构建。前三条到PREVIEW，余七条及全B–E其他实现/验证、formal目录兼容缺口、真机条件仍未完成，Goal active。下一步先第三条返回恢复，再fixture第四条；不要重复创建第三条。当前原生窗口仍内容导入，第三条PREVIEWrev5，DAY，页面滚到关联预览附近；下一轮先重新观察窗口/控件。

Context: no durable fact change

### 第四条正式点样本先保留编辑草稿，第三条恢复已验证

本轮为实际进展：重新list_windows并激活精确DevTools，首轮无坐标geometry失败后重新截图恢复，再从第三条返回My→内容导入。UI恢复同一import:93f60ea1-5e3e-4094-8ee0-785fcc8a8fd3，PREVIEW/DRAFT/rev5；第三条返回恢复完成。

第四条gd-dapeng-summer-fireflies已通过新建另一条实际创建import:b8659c4c-6f71-4201-a0a1-10d6bcf7e977。来源URL https://nightchina.net/2024/06/04/%E5%A4%8F%E5%A4%9C%E6%98%9F%E8%90%A4/，标题“夏夜星萤｜来源元数据导入测试”，正文逐字fixture.importText。sourceNote完整记录广东省深圳市大鹏半岛国家地质公园/2024-05-14/元数据与自写短释义/照片原文未确认不复制上传/深圳市天文台正式点及地理兼容尚待核验。PRIVATE，GATED，SOURCErev1→EDIT_DRAFTrev2。只读DB当前确认title/body/sourceNote完整，spotId=null、spotProposalId=null、proposalReviewState=NOT_APPLICABLE。没有将第四条替换成独立提议来规避formal要求，也未提交审核或发布。首次标题UIA点击未focus，截图发现空值后实际坐标输入并保存，DB已验证修正结果。

第四条正式点关联、PREVIEW以及8个postImportSpotComponentChecks仍未验证；此前正式目录缺口与manual_required未解决，不能宣称第四条完成或强关联测试fixture。下一步可从第四条返回恢复确认，然后新建fixture第五条gd-bajieshan-cloud-sea（银河与云海相遇，广东省清远市连州市八戒山，2024-03-12，new_place_proposal）；不要重复第四条。前三条已PREVIEW且返回恢复/重复保存验证；第四条EDIT_DRAFT；第五到第十未做。全B–E其他产品/科学/生命周期/真实条件仍保留，不因corpus局部进展缩减目标。

本轮无代码/配置改变，无新architecture边界，沿既有Import owner与真实私有service路径；局部Conformance仅为保存和未关联边界，SQL仅只读，未冒充审核/正式点/真机证据。当前DevTools content/import/index第四条编辑态rev2，DAY，滚到正文/关联附近；未保存/关闭原settings.json。Goal active，恢复索引仍由README/执行记录指向完整Source。

Context: no durable fact change

### Import ScrollView 警告定位：整容器 compileMode 不适用，已撤回并验证恢复

本轮先读恢复入口、当前Import源码/样式、全局样式、Context与当前设计绑定，执行有界Context搜索。页面实际padding位于内部.import-content/page-inset/safe-bottom，ScrollView自身没有padding。dist/weapp/base.wxml通用ScrollView模板自动输出padding={{i.p12||[0,0,0,0]}}，触发WebView不支持padding属性警告；不要误改现有CSS边距或清日志掩盖。

Architecture Deliberation尝试：沿当前Import owner，给ScrollView单个compileMode以仅输出显式props，保留内部View/状态/服务/布局，Context Delta:none。但实际Taro编译会递归编译整棵复杂条件子树；虽typecheck/design-bindings/diffcheck以及harness/单独Context检查通过，真正Map→My→Import出现content/import/index-templates.wxml无效语法，Import打不开。此方案被当前runtime反例否定，已立即撤回这一个属性，未保留失败实现。Map自身较简单的compileMode修复不在此撤回范围。

撤回热编译后重新实际Map→My→Import成功，UI恢复第四条import:b8659c4c-6f71-4201-a0a1-10d6bcf7e977，EDIT_DRAFT/DRAFT/rev2，标题正文完整；因此第四条启动后恢复已验证。通用模板padding警告仍在，未标修复。未保存原settings.json、未修改服务/数据/设计资源。session92487已exit0，但其检查发生在被撤回候选，不当作最终整Goal证据；最终恢复候选通过实际启动入口，产品源码本轮无净改动。

本轮为有证据的诊断进展，不是等待：排除了错误归因与破坏入口的修复，并完成第四条恢复证据。该警告后续若需要修复，应限制模板变换范围并验证真实条件树，不能仅凭TS/绑定通过使用整容器compileMode。当前建议继续第五条固定样本gd-bajieshan-cloud-sea真实导入，不让非阻断平台警告占据全部开发。前三条PREVIEW、第四条EDIT_DRAFT未关联；第五到第十及全B–E仍待，formal/manual及真机缺口保留。局部Engineering/Architecture Conformance：失败候选已撤回，原owner与页面入口恢复，无新依赖或第二状态源。Goal active。

Context: no durable fact change

### 第五条固定样本真实预览、重复保存、返回恢复完成

本轮重新读取README/当前进度及完整fixture.cases[4]，重新观察并激活DevTools精确窗口，从第四条新建第五条gd-bajieshan-cloud-sea。来源URL https://nightchina.net/2024/04/29/%E9%93%B6%E6%B2%B3%E4%B8%8E%E4%BA%91%E6%B5%B7%E7%9B%B8%E9%81%87/，标题“银河与云海相遇｜来源元数据导入测试”，正文逐字fixture.importText（UI44字）。备注保留case key/广东省清远市连州市八戒山/2024-03-12/仅元数据及自写短释义/原文照片未确认不复制上传/现场待核验。PRIVATE，parser GATED；无媒体、审核提交、发布或正式点创建。

实际UI创建import:40ba8154-8bc4-4a3b-b3ae-3b19d4b24d96，SOURCErev1→EDIT_DRAFTrev2→独立地点提议ASSOCIATE_SPOTrev3→PREVIEWrev4。只读DB回查title/body/sourceNote完整，proposal=spot-proposal:db6e1bd2-71e9-4e60-9ed0-8b385b92a171，review DRAFT。随后UI保存当前草稿，DB确认PREVIEWrev5且proposal不变；真实返回My→内容导入，UI恢复同一import ID及PREVIEW/DRAFT/rev5。第五条上述步骤均已完成，不再重复创建或重复验证作为下一步。

本轮无产品代码修改，沿既有Import/service owner；局部Conformance限真实私有草稿、持久化和关联身份，未宣称正式点/审核/真机验收。原DevTools settings.json未保存关闭。当前Import第五条恢复后在页首，DAY。下一步fixture第六条outside-anhui-shangcun（银河下的古村落），先读完整case再实际新建。第一二三五条PREVIEW、第四条EDIT_DRAFT待formal兼容，第六到第十仍未做；全B–E其他范围及正式目录/manual/device缺口保留。Goal active。

Context: no durable fact change

### 第六条真实导入与本地API中断恢复

读取完整fixture.cases[5]后真实新建outside-anhui-shangcun（银河下的古村落）。首次点击建立导入草稿后未创建；观察到POST /v2/me/imports ERR_CONNECTION_REFUSED，8787无LISTEN，仅TIME_WAIT；Postgres55432/Redis56379容器均healthy。没有把工具前台回退到其他应用的截图当项目证据，重新activate精确DevTools后诊断。原URL与rights输入保留。只读DB按fixture URL回查第六条为空，确认没有误重建后再恢复API。

以既有start-development-session.mjs的本地Postgres配置（内部读取，不落密钥）运行npm run dev:miniapp:api，Node24、postgres模式、原cache prefix/queue/8787；没有重启IDE/数据库或切换MEMORY_TEST。新exec session74830，应用进程启动日志PID28496，capabilities HTTP200；此session为服务长期运行，下一次先检查live，不盲目重复启动。原worker/watcher运行状态未证明，后续需要构建/队列时重新观察。服务为何停止尚未定位，不声称已根治。

实际重试创建import:ccc200a7-3ccd-474a-90f1-daeb2f81f6f1；来源URL https://nightchina.net/2023/04/24/%E9%93%B6%E6%B2%B3%E4%B8%8B%E7%9A%84%E5%8F%A4%E6%9D%91%E8%90%BD/；标题“银河下的古村落｜来源元数据导入测试”，正文逐字fixture.importText（UI37字），备注完整保留outside-anhui-shangcun/安徽省宣城市绩溪县上村/2023-04-17/元数据自写短释义/原文照片未授权不复用/现场待核验。PRIVATE，GATED。SOURCErev1→EDIT_DRAFTrev2→独立提议ASSOCIATE_SPOTrev3→PREVIEWrev4。只读DB确认title/body/sourceNote完整，proposal spot-proposal:9d02b556-742a-4c3c-b195-adfe2643b0be，review DRAFT。未提交审核/发布/正式点创建。

第六条重复保存identity及返回My重开恢复仍待下一步；不重复新建第六条。之后第七条outside-anhui-xucun。创建失败时未及时捕获到UI错误提示，不能称错误反馈已合格：保留输入与API恢复重试有证据，反馈显著性需单独验证。通用ScrollView padding/worker警告仍未修复。当前DevTools Import第六条PREVIEWrev4，DAY，滚到关联预览附近；settings.json未保存关闭。

本轮无产品源码变更，既有API/service/DB owner不变；局部Conformance为真实私有数据与失败后重试，非整体质量/正式目录/审核/真机结论。第一二三五六到PREVIEW，第四EDIT_DRAFT待formal兼容，第七到十未做；全B–E保持。Goal active。

Context: no durable fact change

### 第六条恢复收束，第七条真实私有预览

本轮API8787仍LISTEN PID28496，沿session74830继续，未重启。第六条真实点击保存当前草稿后只读DB确认PREVIEWrev5，proposal仍spot-proposal:9d02b556-742a-4c3c-b195-adfe2643b0be；返回My→内容导入恢复同一import:ccc200a7-3ccd-474a-90f1-daeb2f81f6f1及PREVIEW/DRAFT/rev5。第六条重复保存与返回恢复已经完成。

第七条outside-anhui-xucun完整fixture已读，真实新建import:0937bb68-9be9-4511-8306-b1981456af20。来源URL https://nightchina.net/2024/07/08/%E6%98%9F%E7%A9%BA%E4%B8%8B%E7%9A%84%E5%8E%86%E5%8F%B2/，标题“星空下的历史｜来源元数据导入测试”，正文逐字fixture.importText（UI40字），备注保留outside-anhui-xucun/安徽省黄山市歙县许村大观亭/2024-07-05/仅元数据和自写短释义/不复用未授权原文照片/现场待核验。PRIVATE，parser GATED。

实际SOURCErev1→EDIT_DRAFTrev2→独立提议ASSOCIATE_SPOTrev3→PREVIEWrev4；只读DB确认title/body/sourceNote完整，proposal spot-proposal:e09e92ec-e051-4071-99f7-ba55453440b9，review DRAFT。未审核提交/发布/正式点创建。第七条重复保存及返回恢复待下一步，随后第八条outside-yunnan-diqing；不要重新创建第七条。

本轮无源码/配置变更，局部Engineering/Architecture Conformance沿现有Import/service/DB owner真实私有数据与持久化验证，不外推真机、审核、formal联动或整体设计已完成。第一二三五六七到PREVIEW，第四EDIT_DRAFT待formal兼容，第八九十未做；全B–E仍保持。当前DevTools Import第七条PREVIEWrev4，DAY，关联预览附近，旧settings.json未保存。Goal active。

Context: no durable fact change

### 第七条恢复完成，第八条通天之河真实预览

本轮8787仍由PID28496监听，未重启API。第七条真实保存后只读DB确认PREVIEWrev5，proposal仍spot-proposal:e09e92ec-e051-4071-99f7-ba55453440b9；返回My→内容导入恢复同一import:0937bb68-9be9-4511-8306-b1981456af20及PREVIEW/DRAFT/rev5。第七条重复保存与返回恢复完成。

第八条完整fixture.cases[7]为outside-yunnan-diqing，标题“通天之河”；初始commentary误称其他标题，读取fixture后已立即纠正，实际数据没有错误标题。真实创建import:dc4f0baf-585d-4bd9-b2e0-f1b518b5f2cf，URL https://nightchina.net/2023/09/24/%E9%80%9A%E5%A4%A9%E4%B9%8B%E6%B2%B3/，标题“通天之河｜来源元数据导入测试”，正文逐字fixture.importText（39字）。来源备注保留outside-yunnan-diqing/云南省迪庆藏族自治州湖乡公路附近/2023-09-14/仅元数据与自写短释义/不复用未授权原文照片/精确位置通行安全待核验。

PRIVATE，parser GATED；真实SOURCErev1→EDIT_DRAFTrev2→独立提议ASSOCIATE_SPOTrev3→PREVIEWrev4。只读DBtitle/body/sourceNote完整，proposal spot-proposal:832cbe30-d736-4b0e-b7fa-5b1ec4218457，review DRAFT。未审核提交/发布/正式点创建。第八条重复保存identity及返回恢复待下一步，随后fixture第九条（需读取原值，勿猜标题/位置）；不重复新建第八条。

本轮无代码/配置修改，局部Conformance沿既有Import/service/DB owner，限私有数据真实保存与恢复，不称整体产品、formal联动、审核或真机验收完成。第一二三五六七八到PREVIEW，第四EDIT_DRAFT待formal兼容，第九十未做；全B–E保持。当前DevTools Import第八条PREVIEWrev4，DAY，关联预览附近，原settings.json未保存。Goal active。

Context: no durable fact change

### 用户要求的完整客观总结与中断位置核对

用户中断第九条操作，要求完整说明总需求、已做、未做，且说明不包含长程任务工作流内容。本轮停止产品操作，只读核对当前代码、测试记录、服务能力及十条数据库状态，新增独立客观说明：E:/Dev/Starward/.codex/work-items/field-signal-i21-current-requirements-and-progress-2026-09-06.md。此文档不是新的产品规范，不改变完整目标。

第八条在中断前已真实重复保存至PREVIEWrev5，proposal仍spot-proposal:832cbe30-d736-4b0e-b7fa-5b1ec4218457；返回My→Import恢复同一ID/rev5。第九条已真实创建import:bf786356-d32f-46ba-ae08-04e43087b97b，标题星河画卷｜来源元数据导入测试，正文33字逐fixture，备注保留outside-hebei-bingshanliang/河北省张家口市冰山梁/2023-09-09/权利与待核验说明。已到EDIT_DRAFTrev2；前端选择独立提议后仅滚动，用户中断前没有保存关联。总结时只读DB确认第九条proposal=null、spot=null，不能声称预览或提议已持久化。第十条无记录。

本次全量十样本只读回查：1 PREVIEWrev7；2/3/5/6/7/8 PREVIEWrev5；4/9 EDIT_DRAFTrev2；10尚未创建。已有九条全部PRIVATE/moderation DRAFT，正式spot关联全部为空。正式目录重新核对仍26 DATA_INSUFFICIENT，publication assessments=0。当前capabilities：Import/Profile开启；微信登录、自动解析、外部直开、路线、普通地点搜索未启用；天气/媒体等开启只作为能力声明，非实际效果验证。API仍可HTTP读取。无新测试或产品修改，没有续做第九条。原Goal保留，下一次获继续指令可从第九条已有编辑草稿继续，勿重复新建。
