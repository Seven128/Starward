# 当前恢复状态（2026-09-07）

先读 INDEX.md、PLAN.md；完整输入与 SOURCE-INDEX.md 保留全部需求。goal active，范围未缩小。旧 CURRENT 全文已原样保存为 [历史记录](CURRENT-history-20260907-restored-api.md)（复制时 SHA256 相同）；按需查它和 PROGRESS.md，不把旧运行状态当现在。本文件只原位维护当前事实。

## 用户方向与长期 Context

仅标准字号；小巧、精致、密而不挤。根据内容性质、长度、数量选择并排摘要、短状态、分组指标和长说明；不统一套卡，不靠缩字塞信息。研究已完成，长期方法在 project_context/areas/main/screen-contracts/wechat-miniapp/information-design.md，后续直接应用，不再造研究包或展示原型。

概览/天文在名称地点下方，轻量文字短下划线横向吸顶，连续正文无侧栏空列；星图仅云观星。去内部说明堆叠，保留真实风险、缺失和来源。Context 仅必要职责、决策及入口；旧设计目录删除曾被自动审批拒绝，不重试或绕过。保留有效资产、测试和原文。

main 直接开发，保护无关改动；不创建子 agent/worktree、不自举工作流、不上传发布推送；避免重启开发器制造信任/扫码步骤。

## 当前环境，覆盖旧记录

- 正常 API8787 已恢复，本次 PID8136、health/ready true，数据库和缓存 ready。exec session72398，artifacts/miniapp/restored-normal-api-cors.log；使用前核实活性，plain tsx 不自动重载。
- Docker 原有 PostgreSQL/Redis 容器及卷恢复，无迁移/seed/重建。API AUTO_MIGRATE=0，worker 未启动。不要用整套启动脚本触发迁移或开发器启动。其open入口已改用现有官方CLI解析器，修复旧安装路径；移除当前help未列出的trust-project参数。CLI帮助及10项解析器测试通过，已通过官方open恢复原snapshot项目，无信任/登录提示。
- 微信开发器已通过官方open恢复：窗口465307420/PID28284，IDE HTTP12238，reopen-existing-devtools.log成功；ComputerUse已实际运行DAY/NIGHT页面，无信任/登录阻塞。8879新内存隔离实例已启动session69463/PID9844，health ready且memory；9421需重查；旧窗口60360878/PID25316失效。旧内存 fixture 没有已确认恢复文件，不得重新 seed 冒充恢复。
- 最新前端磁盘候选 artifacts/miniapp/integrated-runtime-snapshot/miniprogram，import-late-warning-fixture-build通过并同步。当前已进行375 DAY与320 DAY地图、320 DAY投稿空表单及320 NIGHT首屏原生核查，详见PROGRESS最新记录。
- Node24：C:/Users/777/AppData/Local/nvm/v24.16.0/node.exe；workspace TS5.9.3。正常隔离构建 dist/weapp-check 与 fixture dist/weapp-fixture 不混用。

## 受保护数据

只读 SQL 确认26地点、10导入草稿、3投稿、1计划，未写入。名称含“仅私有传输测试1355”的唯一投稿 revision18/DRAFT；1355不是ID。10导入通过 external_post_imports 归属同一账户且与该投稿同owner，visibility.value PRIVATE、moderationState DRAFT；9 PREVIEW、1 EDIT_DRAFT。

客户端 draft-recovery-0906（09/06 22:00，无地点，红光手电/检查装备）仅历史原生确认，当前仅恢复开发器地图页，不能声称私有草稿重新恢复，不可替换重建。第四导入地理关联缺依据，不猜地点。不要发布私有测试数据。

## 最新实现和证据边界

- FormalSpotField缓存刷新失败新增STALE+重试并保留原关联，导入/投稿共用；formal-spot-refresh-tests5/5与typecheck通过。最新正常formal-spot-refresh-normal-build.log已构建通过，已同步fixture；共享选择器STALE尚无当前原生验收。第四导入真实正式关联仍缺依据，测试中PUBLISHED样本不作为真实证据。

- 最新正常构建 contribution-history-density-build.log exit0：投稿历史三状态共享分组，较宽三列、374px以下公开影响跨行；compiled CSS检查通过。已同步fixture；非空投稿历史实际视觉未验。调用核对：ContributionUploadRecovery 未挂载，不把它当现行页面问题。实际媒体缺失大小误显0KB已修为大小暂不可用，media-size-recovery-tests4/4与typecheck通过；最新正常 contribution-current-copy-build.log exit0 已包含此修正及三处结果文案精简；已同步fixture；媒体非空状态实际未验。

以下日志在 artifacts/miniapp；全部更早细节、脚本、失败及修复过程在历史记录和 PROGRESS。

- API CORS 放行客户端已有 X-Wechat-Reauth-Code。reauth-cors-typecheck.log通过；重载正常API后 reauth-cors-runtime.json 实际OPTIONS204允许该header、ready true。没有实际导出/删除/登录，不代表微信认证验收。
- 投稿主题 ≥375px三列、320两列；contribution-topic-density-build.log通过。runtime-retry历史实测430宽9项3行、最小命中44；320 DAY/NIGHT空表单及禁用媒体区域已实测；上传动作未验。
- 投稿/导入无缓存数量 —；投稿缓存刷新失败保留记录并重试。contribution-history-availability-tests.log 2/2及typecheck-retry通过；历史 contribution-read-recovery-runtime.json 缓存刷新恢复、import-read-recovery-runtime.json 初始错误恢复，注入已还原，无写入。
- 计划删除异步失败隔离旧账户：plan-current-regression.log 26/26，无实际删除。链接保存/删除/刷新owner隔离：link-identity-complete-tests.log5/5；历史 links-read-recovery 与 links-layout-runtime 读取恢复和430空态布局，已有链接打开未验。
- 导出成功清除本动作旧通知、导航识别原生errMsg取消：export-recovery-notice-tests2/2、导航10/10及历史实际故障恢复，无真实分享。
- 攻略72×72图与通栏页脚320/430实测、文章往返保地点；来源复制恢复和场地风险保留。精确21:20地图天空联动、缺帧不借邻值、时间尺取消、重认证/账户切换/确认锁等细节查历史，勿重复已过局部探针。

历史 contribution-plan-normal-build.log 和 contribution-plan-normal-typecheck.log 均 exit0；contribution-plan-normal-package.json 确认14路由产物完整、375px三列断点编译正确。最新客户端plan-import-client-regression.log 316/316通过，无skip，包含累计计划/投稿/共享地点选择器改动；不等于WEAPP或硬件验收。API旧106通过+1skip早于CORS。正常包与fixture均不等于当前运行验收。

## 下一步及未完成条件

1. 最新计划/投稿正常构建、类型与产物检查已补齐。继续未完成业务与页面核查，不重复已通过构建或历史探针。
2. 开发器当前可用；继续非空投稿/媒体、14路由/62控件矩阵。IME、物理手势/多指、读屏、三主题长内容、权限媒体分享及生命周期仍需真实证据。
3. current-device-readiness-recheck.log：官方工具/login ready，ADB设备0；未启动预览/扫码，iOS未验。无变化不重复doctor。
4. 正常26点仍0完整，182必需证据缺失/208设施无效；天文台官方两来源已追加10→12、rev2→3，仍DATA_INSUFFICIENT，不重复写入或编造核验。Gaia2048最暗约5.0075不是完整5.5。
5. 红光冷启动策略未获选择，保持现行为；夜间供应商亮底图仍缺样式依据。继续可执行工作，不能用局部检查关闭完整goal。

当前隔离8879已实际新存1条计划：示例观星点/09-06/22:00/空备注；正常库原计划没动，不是原私有草稿恢复。最后planSavedReady是旧布局保存后页，plan-saved-density-fixture-build通过同步后需fresh capture。共享导航已修胶囊横向避让，320 NIGHT反馈长标题实见完整且分离；nav-capsule-tests7/7、typecheck/fixture build通过同步。夜间空表单底部及来源页当前地点副标题已实测可读；nav-capsule-normal-build通过。right操作已实测可达并完成隔离收藏/取消恢复；移除成功toast后favorite-quiet-typecheck/build通过，新包无toast已实测。共享收藏并发/身份已修：按地点更新/回滚、同owner同点互斥、API身份绑定；favorite-isolation-tests3/3、typecheck/fixture build通过同步。新包原生收藏/取消已证无成功toast且恢复原状态；favorite-current-client-regression314/314、favorite-isolation-normal-build通过。计划320 NIGHT新建编辑已只读检查，发现滚动条和局部导航grid覆盖；已修，plan-scroll-nav-fixture-build通过同步；新包实际滚动与返回列表已验，无滚动条且底部可达。内容导入320 NIGHT空态首尾已实测，0条仅新隔离实例；导入保存后列表刷新警告补owner校验，import-late-warning-tests2/2和typecheck通过，import-late-warning-fixture-build通过同步。计划非空摘要320由3行改2列+备选跨行，新fixture已构建；实际My回读出现找不到计划，发现编码ID未decode；planIdFromRoute已接入，plan-route-decode-tests2/2/typecheck/fixture build通过同步。同条隔离计划已实际从My回读成功，320摘要2列+备选跨行已验。当前savedPlanLower路线区域，已去START/ARRIVE展示标签尚未build；正常plan-import-current-normal-build已通过；路线kind说明及单条计划新建入口已修，plan-management fixture构建通过，但最后newPlanRequested缺失提示保护在构建中修改，plan-return fixture最终构建/typecheck通过且真实单条新建→返回已验，路线不可用正确、英文标记移除。当前secondPlanReturnVerified/计划底部；没有保存第二条。正常包plan-return-normal-build.log已更新并编译通过；current-ui-contracts-check.log四项源码探针通过，仅源码检查，不替代运行验收。正常库未动。下一剩余矩阵，不重复空态。8879新隔离内存实例，禁止把它当原私有数据恢复。



最新导入历史：标题/状态父容器改为紧凑纵向分组，import-history-grouping-build.log普通包通过；尚未同步fixture，下一步非空实际视觉。保留8879那一条新隔离计划和原正常数据。

非空导入现已原生验：隔离8879新增1条自写示例PRIVATE/EDIT_DRAFT/NONE，标题为示例：观测前的装备检查与到达准备，详见最新PROGRESS。320 NIGHT历史标题/状态分层完整。当前importLiveState在页底；成功浮层持久遮挡按钮问题待修。没有提交/发布/原十条写入。
最新共享通知：无操作的可关闭成功浮层6秒退出，错误/警告/带操作保留。notification-expiry-tests3/3、typecheck通过，fixture build session98126 exit0并已同步。待实际保存同一隔离导入草稿观察6秒退出；不重新建样本。普通包未更新；显示期间主要动作避让仍待处理。
通知原生自动退出已验：同一导入草稿保存出现成功，15909ms后截图已自行消失，无手动关闭。普通notification-expiry-normal-build.log exit0。当前importLiveState在导入正文/私有/保存区；通知显示期间主要动作避让仍待处理。
最新import创建/普通保存改为原位反馈，不重复浮层；按钮按dirtyEdit显示已保存/保存当前草稿。8项定向测试和typecheck通过，import-local-save-feedback-build.log fixture成功（session46637 exit0）并同步。普通包此改动未更新；下一步同一隔离草稿实际编辑/保存验证，无需重建样本。全站其他通知避让不算完成。
最新原生验证：原位已保存→修改备注→保存当前草稿→保存→已保存，全程无成功遮挡；普通import-local-save-feedback-normal-build已通过。沿用唯一隔离草稿关联示例观星点，已走到PRIVATE/PREVIEW，未提交。当前importLiveState预览区，提交人工审核按钮可见，不点击。原十条样本不变；此测试不替代第四真实地点关联。
最新导入指定ID入口修复：decode且一次应用入口参数，避免切换/新建被route重设；import-route-selection-tests2/2、typecheck exit0。该修正尚未build/sync；下一步构建并继续指定入口/剩余业务。当前实际仍PRIVATE/PREVIEW隔离草稿，未提交。
最新318项客户端回归全通过(import-route-current-regression.log)，import-route-selection fixture/normal builds均通过并已同步fixture，无活动构建。指定ID真实入站路径未验，My正常路径已验。下一步回到其余业务矩阵，不重复这些构建。
