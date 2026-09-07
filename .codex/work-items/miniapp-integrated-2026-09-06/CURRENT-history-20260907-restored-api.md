# 当前恢复状态

本文件原位更新，不再追加“最新”段。完整范围读INDEX.md/PLAN.md及inputs两份原文。历史证据查PROGRESS.md标题；旧CURRENT全文已归档至CURRENT历史快照归档-20260907-exact-time-consolidation，不需重复加载。

## 范围与约束

- Goal active，I21完整业务、14路由/历史62控件及UIUX尚未完成。直接main，保护大量未提交改动。不建子agent/工作流，不推送/发布/部署，不重启DevTools触发信任扫码。
- 仅标准字号；小巧精致、密而不挤，保留有效风险/缺失/来源。身份下概览/天文为轻量文字吸顶导航，同一文档，星图只属云观星。规则owner为project_context/areas/main/screen-contracts/wechat-miniapp/information-design.md；旧侧轨冲突已消除。
- Context仅global默认加载，其他按需；shared-state旧Taroify强制映射已移除，44逻辑px不等同88rpx，200%明确暂停，context-owner-cleanup.log结构验证通过；不维护原型/handoff/hash。生产tokens/assets/tests保留。此前8旧资源目录删除遭自动审批拒绝，不绕过。
- 保留计划draft-recovery-0906（Sep6 22:00无地点、红光手电/离开前点器材备注）、私有反馈1355 rev18 DRAFT、10私有导入样本。不同调试通道可能不同用户，不重建或删库。

## 当前候选与运行状态

- **正常API已恢复（比下述停机观察新）**：8787当前PID 24100、exec session72398（CORS修复后重新启动持久API，原47092已结束），restored-normal-api.log；复用原postgres/redis及development cache/queue前缀，AUTO_MIGRATE=0、无fixture/acceptance，未启动worker。restored-normal-api-readiness.json status ready、database/cache ready。8879与DevTools仍未启动，不能把8787当旧fixture实例。保留服务用于后续真实持久读取；不要重复start或执行整套development-session。

- 正常持久库已恢复可读：启动已有Docker Desktop（Hidden），引擎就绪后仅docker start原starward-miniapp-demo-postgres-1/redis-1，原命名卷仍挂载。psql BEGIN READ ONLY确认spots26、external_post_import_drafts10、user_submissions3、observation_plans1。未迁移/seed/重建，只读进一步确认导入PREVIEW9（revision5–7）、EDIT_DRAFT1（revision2）；投稿有revision18/DRAFT一条、revision2与4另两条；计划revision1。已追溯PROGRESS1350：1355是名称不是ID；按原名称仅私有传输测试1355匹配唯一投稿，revision18/DRAFT确认。10份导入全部有external_post_imports外键归属、同一账户且与受保护投稿同owner，visibility.value PRIVATE、moderationState DRAFT，未输出账户ID或正文；API8787/8879及DevTools未启动。Docker自动启动了其他项目restart-policy容器，未修改它们。

- **最新环境已变化，覆盖下文旧运行描述**：新node_repl会话无sky绑定；按新版computer-use技能恢复后list_windows无DevTools。current-runtime-availability.json实查9421/8879/8787均无Listen，旧60360878窗口与PID25316不再可当活实例。未重启/扫码/恢复数据库；源码只读核对create-test-service默认InMemoryTestRepository，InMemoryLibraryStore/ContributionStore为私有Map且无磁盘读写/恢复逻辑；未找到artifacts中backup/dump/restore命名备份。旧内存服务数据是否有其他外部快照尚不明，不能声称服务端10样本/反馈仍在线，也不能重建覆盖。旧截图/运行结果仅历史证据。投稿底部滚动检查因此未完成，先推进源码与离线构建；需要运行验证时先检查恢复路径，避免制造信任步骤。

- 前端snapshot：artifacts/miniapp/integrated-runtime-snapshot/miniprogram，最新contribution-topic-density-build.log（已同步，含导航取消/导出通知恢复/链接身份错误隔离）（含重认证/删除账户切换保护/确认阶段防重入）。包括导航恢复、跨日h23、天空尺18rpx曲率预留及去重复当前值、地图精确时间匹配/缺帧不借邻近数据、projectedFrame useMemo、地图与天空时间尺多指取消。
- API源码mapFrameTimes已加入区间内精确selectedAt，去重排序，最多49帧。8879尚未加载此变更：PID25316为plain tsx src/main.ts内存服务，不能重启丢状态。正常8787不动。使用前核实进程。
- 非fixture最新profile-recovery-normal-build.log已确认exit0，包含导出通知恢复、导航取消、链接身份及未知数量修复；profile-recovery-package-inspection.json确认14路由JS/JSON/WXML齐全。profile-recovery-client-regression.log当前305/305通过。此前guide-density-normal-build.log通过（包括来源时段/测试安全文案/详情返回/攻略卡片增量）；新增导航取消errMsg修复的navigation-cancel-normal-build.log已确认exit0。此前account-chrome-normal-build.log通过（含重认证/账户切换清理/确认锁/错误文案/TabBarItem切页竞争处理；尚未同步到运行snapshot）；此前search-notice-normal-build.log通过，输出dist/weapp-check，含精确时间、多指取消、搜索返回和恢复版本保护；当前search-notice-candidate-inspection.json：14路由JS/JSON/WXML和四tab图标无缺失，包内1549732字节；非运行验收。
- 原生可用窗口60360878，对应9421，最后NIGHT430 iPhone14 Pro Max计划编辑页；自动恢复原draft-recovery-0906，未保存/编辑/放弃，地图时间仍09/06 21:00。9963390为另一DAY375地图实例且曾无响应，勿混证据或反复点击。
- node_repl有sky、articleOtherWindow、articleOtherState。先重新读窗口state再输入；截图多窗口须看真实screenshots id/尺寸。逐content转发image，不输出base64。工具在mcp__node_repl__js，sky.list_windows/get_window_state；不用不存在的get_windows。
- automator连接ws://127.0.0.1:9421，finally disconnect，不能close/restart。导航回调/getCurrentPages有过暂留旧路由；原生画面可已跳转，需后续观测，别仅凭一次旧栈误判失败。page.$可能超时，用evaluate/wx selector。故障注入限8879指定读取，15秒兜底+finally恢复。
- 官方截图saveFile额度满：只读查过仅3个约3MB日志/savedFiles0，未删文件；不盲清存储，不重复无变化截图失败。
- Node24目录C:/Users/777/AppData/Local/nvm/v24.16.0。fixture构建显式MINIAPP_ISOLATED_FIXTURE_BUILD=1、MINIAPP_DEVELOPMENT_FIXTURE_MODE=1、MINIAPP_API_BASE=http://127.0.0.1:8879，清MINIAPP_ISOLATED_CHECK_BUILD。正常隔离构建反向设置，输出dist/weapp-check；不要混进snapshot。

## 当前优先：精确时间联动

- 原始失败sky-time-selection-runtime.json：天空21:20返回地图21:30错标。原因API半小时轴+前端nearest作选中/投影。
- 前端已修：非交互标题selectedAt、只精确相同tick选中；nearest仅滚动定位。mapTimeFrameAt唯一精确匹配，缺失/重复无信号，动态层清空，不借近时刻；静态光污染逻辑保留。
- 旧API运行证据sky-time-old-api-runtime.json：天空21:20，地图正文21:20、21:30未误选。新增sky-time-new-map-runtime.json及-retry.log：实际WEAPP天空21:20→新版地图接口→地图21:20已选择；只替换1次map读取，旧上下文只读透传，finally恢复原请求及21:00。证明此时间联动，非完整新版API业务验收。
- API证据：exact-time-api-regression.log 17/17；含新test的tsc通过。map-exact-time-http.test.ts独立随机loopback Nest实例真实fetch resolve21:20→map，再用实际响应执行生产MapTimeRuler JSX：唯一21:20选中、21:30可点击提交。exact-time-http-render.log 1/1通过，finally关闭，不碰现有服务。这是接口/组件集成，不是新API的WEAPP实测。
- 新地图组合探针serve-current-map-probe.mts：随机loopback Nest仅允许GET map/scene，新服务用只读cache获取8879上下文，不改旧服务数据。120秒自动关闭；运行需TSX_TSCONFIG_PATH=workers/miniapp-api/tsconfig.json、Node24 --import tsx。首次.ts顶层await及缺decorator配置失败已修，首次UI打开天空失败未计通过。下一步转回剩余真实手势/页面矩阵，勿重复已通过时间点击探针。

## 已验证入口与边界

- API重认证CORS衔接修复：main.ts allowedHeaders新增x-wechat-reauth-code，保持原origin/method约束。首次实际OPTIONS204但允许列表缺头，修改后类型检查通过，重启仅新恢复的8787持久API（AUTO_MIGRATE0）加载源码。reauth-cors-runtime.json实际OPTIONS204允许该头且health ready；未执行导出/删除/登录。当前session72398、日志restored-normal-api-cors.log；PID需按端口重新读，勿用旧记录。

- 投稿主题密度：实际NIGHT430原9短选项2列5行，改min-width375px为3列；320保持既有2列，标准字号/44px点击区不变。contribution-topic-density-build.log确认exit0同步，初次测量自动重编译后不在目标页得到0失败；重新进入contribution后runtime-retry.log确认9项3行minHeight44，原生截图文字完整，下方字段更早可见。未改输入/主题选择，窄屏此次未复验。当前NIGHT430投稿新地点空表单。

- 同类未知计数修复：导入已有草稿imports.data缺失显示—；投稿全部/待审核/需补充三个筛选在history.data缺失显示—，成功空数据仍0，已有缓存仍真实数量。history-unknown-count-typecheck.log通过，history-unknown-count-build.log确认exit0后同步。import-read-recovery-runtime.json/log实际初次失败2请求、未知数量/无假空态、恢复后重试通过。投稿首次探针count0失败，命中My共享10秒缓存，未算通过。检查发现ContributionHistory未展示refreshError/STALE_USABLE，已补旧记录提示及重新获取投稿，初始重试也catch避免未处理拒绝；contribution-history-stale-typecheck.log通过，contribution-history-stale-build.log确认exit0后同步。probe-contribution-read-recovery.mjs在My真实读取后等12秒过staleTime再进入，contribution-read-recovery-runtime.json/-retry.log通过：2次拒读，cached-list-refresh-failure提示可见，恢复原请求后点重新获取投稿提示消失；未清缓存/改数据。history-availability.test.ts新增实际生产ContributionHistory函数渲染回归，初次pending/error为—且无空结果、真实空结果0、缓存refreshError有恢复入口，重试拒绝被接住；contribution-history-availability-tests.log 2/2通过。初始无缓存计数仍仅组件证明，未实际WEAPP验证。当前投稿页；保护10导入样本及反馈1355，不创建数据或清缓存。

- 计划删除失败新增账户隔离：remove外层catch仅deletionOwner仍当前才提示失败/草稿保持不变，切换后不向新账户播报旧请求错误。plan-delete-late-error-tests.log 4/4（取消、双返回失败、成功切换、失败切换）、tsc通过；未删除实际计划。plan-current-regression.log计划目录26/26通过，plan-account-isolation-build.log确认exit0后同步既有snapshot；305全回归仍早于此行修复。未做实际账户切换或删除，当前原计划草稿不操作。

- 计划NIGHT430原生只读复看：既有draft-recovery-0906仍恢复，09/06 22:00、无地点及红光手电/离开前点器材备注与保护记录一致。日期时间同排，备注/恢复提示/保存与返回可见、无固定栏遮挡；没有修改、保存或放弃。当前停留该草稿编辑页，后续勿为测试覆盖它。此次不覆盖IME、picker或提交/冲突。

- 主页链接加载前/无数据失败状态的数量不再伪造0条：仅links.data存在显示activeLinks数量，否则—；既有空列表文案本来已按data保护。links-unknown-count-typecheck.log通过，fixture links-unknown-count-build.log确认exit0后同步。links-read-recovery-runtime.json/log实际编译验证初次读取失败：限定GET /me/profile-links两次403，错误可见、数量—且无空列表断言；恢复真实wx.request后点重试成功。未清缓存、未改账户/草稿，20秒恢复兜底+finally完成，当前主页链接页。

- 主页链接新增迟到错误隔离：save/remove的API失败catch及refetch失败catch先核对当前账户，避免旧账户错误进入新账户；finally仍释放操作锁。link-late-identity-tests.log 4/4（移除迟到失败/刷新切换+既有操作测试）、类型检查通过。保存迟到失败/成功/刷新切换测试已补，验证不清新账户输入、不展示旧错误、释放锁；link-identity-complete-tests.log 5/5及tsc通过，link-identity-fixture-build.log exit0后同步。此为生产函数隔离验证，尚未实际切换微信账户；下一步继续无写入页面/状态检查。当前NIGHT430主页链接页；links-layout-runtime.json/log实测4平台同排、2输入框和保存44px以上且全在430宽内，原生截图无操作遮挡。列表为空，不能声称已有链接复制回退已验；未创建测试链接或改草稿。

- 账户导出重试恢复新增：真实写文件并shareFileMessage成功后，仅清settings/account-export-failed旧通知，其他owner/动作保留。account-export-result.test.ts覆盖四阶段及通知归属，export-recovery-notice-tests.log 2/2（含账户锁）、tsc通过。普通构建export-recovery-notice-normal-build.log已确认exit0；fixture尚未同步，未进行真实分享。选图取消既有chooseImage正确识别errMsg，未重复改动。

- 最新导航取消修复：SpotDetailPage的isCancelledAction读取微信原生errMsg，用户主动取消不误报失败；spot-navigation.test.ts改用真实生产helper，覆盖errMsg取消、Error取消和非取消失败。navigation-cancel-tests.log 10/10、navigation-cancel-typecheck.log通过。guide-density-client-regression.log 301/301是此取消增量之前的全客户端回归。取消增量fixture构建exit0并同步；navigation-cancel-runtime.json/log实际编译WEAPP两次调用：errMsg取消无误报、非取消失败可见，停留field；临时showActionSheet方法15秒兜底和finally恢复，不打开外部地图。下一步继续其余未验状态；勿重启DevTools或8879。

- 当前下一步：SpotDetailPage反馈/攻略入口openDetailPage已补失败提示/同步ref防重入/隐藏后迟到错误抑制/恢复只清本owner本通知。detail-page-navigation-tests.log 1/1生产函数VM及tsc通过，detail-navigation-build已同步；detail-feedback-failure-runtime.json/log实际编译组件连续2tap仅1navigate调用，失败可见，停场地页且设施/安全内容保留；原生接口finally恢复。后续detail-feedback-return-runtime.json/log实际进入contribution且spotId一致，返回field旧错误消失；existingDrafts1内容不变、addedDrafts0、blockedWrites0，临时写保护已恢复。异常详情返回也已验证：短说明+returnToMap同步锁/失败重试，detail-page-navigation-tests.log 2/2、tsc通过，detail-invalid-return-build同步后invalid-detail-return-runtime.json/log实际无参数field→注入switchTab失败可见→恢复原生接口重试回Map。当前Map，无草稿操作。重认证已写入源码，需继续真实微信/编译WEAPP整合验证。accountReauthentication获取新code，导出与删除附X-Wechat-Reauth-Code并绑定原user；服务端两个端点先验证会话+code为同一身份。失败不清会话/不自动复用code。account-reauthentication-tests.log 9/9含随机loopback真实HTTP隔离账户导出/删除/撤销及缺失/错身份拒绝；WECHAT分支使用合成provider，非真实微信证明。前后端workspace tsc通过，普通构建通过，8879旧API/运行snapshot未更新，不重启内存服务。客户端删除回执遇账户切换已修：只清原账户草稿/响应缓存/query，不清新session、installation、页面状态、不强跳auth；返回本地localAccountReset给Settings区分。account-delete-scope-tests.log 4/4（生产函数VM），前端tsc通过；fixture account-action-current-build已同步，普通最新构建仍早于此修复。确认阶段新增共享useRef锁，取消/原生modal失败均finally解锁，文案处理中；account-action-pending-tests.log 3/3。account-confirmation-runtime.json/log编译WEAPP：重复触发仅1modal、注入modal失败可见未删除、重试取消，最终modals2/requests0；临时拦截已恢复，Settings停留错误提示。不代表真实身份/删除验收。NIGHT320原生设置页已滚至末尾，两列设施、可访问性及维护动作可达，无固定栏遮挡，未点击维护操作。settings账户删除结果及导出写失败已构建account-results。导出仅await写成功后标filePath，磁盘写失败不再误报文件已生成；export/delete隔离VM联合2/2、tsc通过，export-write-failure-runtime.json/log实际Settings：真实导出读取后拦截写失败writes1、shares0，正确导出失败，无文件写出/分享；方法已恢复，当前Settings。删除仍仅VM，不执行当前账户删除。API成功立即reset会话，后续结果modal/跳转失败提示已删除，不误报未删除/旧会话不变；API失败保留状态。account-delete-result.test.ts隔离VM 1/1及tsc通过，无真实账号操作。My NIGHT320原生复看无覆盖；原生点设置未见跳转，不算成功。

- 搜索禁用chip已实际修复：首次color被原生覆盖，增加页面选择器优先级并透明背景。search-filter-colors-before-specificity.json对比新版json：由黑字/浅底→rgb190,194,184/透明，disabled true/opacity .55、高44；NIGHT320原生文字可辨。最新specificity构建已同步，普通构建早于这轮。新增native-chrome页面范围保护：style前及await后检查真实Map/My，子页/空栈不调用TabBar；5/5及tsc通过。native-chrome-scope-build已同步；runtime.json/log实测Search只有background、无TabBar，返回Map style及2item，原函数已恢复。新增TabBarItem在native dispatch后切页竞争：仅not TabBar page预期拒绝被接住，其他错误继续抛出。native-chrome-item-before.log 5/6→after.log 6/6，tsc通过，普通account-chrome构建通过；此增量尚未同步fixture/运行验。下一步其他未完业务/状态及需要的运行整合，不重复颜色旧检查。

- 搜索返回当前运行验证已通过：search-return-current-runtime.log完整button→field→page冒泡，两次失败提示、恢复原wx后Map；search-reopen-verified.log重入无旧返回错误且原搜索词保留（实际base.wxml input value绑定p25，旧value读取空是探针错误）。finally回Map。旧运行路由不一致不当当前失败；原生IME/触摸仍未完成，下一步推进其他未验页面。

- OrientationTimeRuler新修复：只单指开启交互，程序滚动/取消后scrollend不提交，多指/隐藏/卸载/输入变化取消，saving禁滚。sky-ruler-cancel-tests.log 11/11、tsc通过。sky-ruler-cancel-runtime.json/log编译WEAPP事件：程序scroll不预览，单指预览21:20，双指move/touchcancel后均回21:00且迟到scrollend无效；sky-ruler-cancel-click-regression.log点击21:20→Map仍正确，finally恢复Map21:00。非物理触摸。下一步转其余未验页面/状态，不重复此事件链。

- MapTimeRuler多指取消：源码touchstart/touchmove非单指取消，momentum不能提交，下一单指恢复；map-ruler-multitouch-before.log复现旧失败，after.log 7/7及tsc通过。map-ruler-cancel-runtime.json/log实际编译组件事件：21:00→scroll预览21:30→双指move取消回21:00→迟到scrollend未提交→新单指提交21:30→finally恢复21:00。不是物理双指触摸证据；下一步推进其余手势与页面未验项，勿重复此事件链。

- 地图DAY320/375/390：轻tabs定位、天文2指标+3云层、两列设施、来源及返回同地点时间。field/guides旧hub移除。更详细原生截图均在历史工具消息，不能称全尺寸全主题完成。
- 场地页NIGHT320：current-field-density.log/field-density-runtime.json确认8设施行300px宽、事实同排20.8px高、风险/反馈末尾可达。初次open-current-sources.mjs field返回Map旧栈，原生及后续读取已确认spot/field/index；不是入口失败。两条测试内部说明已从catalog的测试risk/guidance源字段移除，测试标识保留；场地页仅restrictions用!，guidance保持正文，真实限制不删除。fixture-safety-contracts/API回归和前端tsc通过。8879内存服务未重载，已通过新版隔离只读服务实际WEAPP验证，current-field-safety-runtime.json及-verified.log：requests2/fieldRequests1，测试标识/夜间谨慎/反馈保留，旧内部risk消失；原生末尾复看。临时服务120秒自停exit0确认，wx请求已恢复；8879仍旧数据，未来刷新可重新出现旧fixture，非整服务已升级。
- 来源页NIGHT320最新source-period构建：缺双端时段显示来源未提供；source-copy-runtime.json/log注入clipboard失败可见、恢复原生接口重试成功且旧失败消失，临时方法恢复；原生滚至末尾IMO许可/限制及使用资料前全文可达，不遮底。复制操作将公开来源链接写入剪贴板，无分享或外部浏览器。
- 攻略列表NIGHT320旧图被拉成满高窄条，已改72×72逻辑px缩略图+标题摘要、footer通栏作者/阅读，并去重复观星攻略分组标题。guide-card-density-build同步，tsc通过；原生图像方正。guide-card-reading-runtime-retry.log：320宽卡300×195.6、图72×72、按钮74×44，阅读article并返回guides，spot/context一致。430宽追加guide-card-430-runtime.log通过：卡394.4×152、图72×72、按钮80×44，同地点/context文章往返；原生截图确认无拉伸/遮挡，独立wx.getWindowInfo实读430×850。guide-card-reading-runtime.json已被这次430结果覆盖，320结果查retry.log。首次取旧栈失败日志保留，后续有界等待页面稳定通过。
- NIGHT文章390和320原生首尾可读/滚达；article-reading-geometry.json为390正文16px/26px、来源底部34px空间。article-site-failure-runtime.json：真实/field刷新失败保正文/设施、提示旧状态、重试恢复。无缓存设施失败未运行验。
- NIGHT320天空最新尺文字不裁切、当前值不重复，列表原生滚达末项，与按钮/尺分离；方向未授权、无假pose。早期DAY320/430及sky-details-scroll-end-runtime/sky-details-collapse-runtime有几何证据，勿当完整真机验证。
- 导航Map/My失败恢复及共享CustomNav双失败/重复点击：map-navigation-failure-runtime.json、my-navigation-failure-runtime.json、back-recovery-runtime.json。当前地图时间12项/天空canvas与time相关13项回归曾通过，具体范围见测试，非物理拖动。
- DAY320 My/Settings/链接/导入空态/计划picker/反馈表单原生检查；contribution-validation-copy-runtime.json空说明提示20字。未保存、上传、取位置或改变私有草稿。
- map/source/profile/my-refresh-failure-runtime.json及map-stale-envelope-runtime.json已有请求恢复证据；My无缓存反馈403已验my-initial-failure-runtime.json/log：2次注入拒读，未知数量+重试，恢复真实接口后重试正常，无缓存清理或数据写入，当前My；不涵盖全部账号权限。偏好旧revision/保存中再次编辑回归通过，实际网络乱序未验。
- current-integrated-fast-check.log+remainder.log为更早contracts12/API101+1skip/miniapp276/workflow76/icons33/semantic24/UI4源码检查，早于最近修改，不称最新完整验收。

## 其他未完成条件

- 全14路由/62控件的真实IME/读屏、手势中断多指、天空选时拖动取消、三主题/长内容、方向传感器、真实分享媒体网络、登录/账户完整业务仍待验。
- current-device-readiness-recheck.log最新doctor exit0：development_feedback readiness_only，官方工具/自动更新/普通预览available、login ready；ADB1.0.41 detected0、usbReadyfalse。未生成QR/启动会话/修改权限，iOS未因此验证。硬件触摸/方向/真实生命周期仍缺设备证据；不要重复无变化doctor。
- 正常库26点0完整：182必需证据缺失/208设施无效。天文台官方2来源已走临时本机admin HTTP追加10→12、rev2→3，其他字段未变，仍DATA_INSUFFICIENT；observatory-source-intake-result.json。临时实例已停，8787管理仍503。不要重复来源写入/编造现场核验/强发布。
- 隔离基础设施current-infrastructure.log及infrastructure/miniapp-infrastructure-session.json run verify_96c817fdfda14006已过PG/Redis/Outbox/HTTP媒体/RBAC/备份恢复，临时资源清理另核实；不代表完整产品。
- 第四导入地理关联仍缺依据；Gaia2048最暗约5.0075非完整5.5。红光冷启动未获选择：当前临时enterObservation冷启恢复此前日夜、普通返回保红光，不擅改持久偏好。provider夜间亮底图缺正式样式依据。
