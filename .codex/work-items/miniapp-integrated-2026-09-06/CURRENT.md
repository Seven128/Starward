最新用户澄清（2026-09-07）：仅暂停大字模式测试与适配；普通字号开发、自动检查及实际界面验证继续。优先完成普通字号的布局、信息密度与层级。此前“暂停所有测试”是agent误解，已撤销。

# 当前恢复状态（2026-09-07）

先读INDEX.md、PLAN.md；完整输入及SOURCE-INDEX.md保留全部需求。完整范围未完成；goal此前因执行策略标记blocked，本轮用户重启后构建同步已恢复。此文件只原位更新，不追加流水账。旧全文保存在CURRENT-history-20260907-import-preview.md（复制时SHA256相同），更早在CURRENT-history-20260907-restored-api.md；详细证据按需查PROGRESS.md末尾/关键词。

## 用户方向与边界

仅标准字号，小巧精致、有效信息密度高且密而不挤。按信息关系、长度、数量编排，不统一套卡、不靠缩字。研究方法唯一owner：project_context/areas/main/screen-contracts/wechat-miniapp/information-design.md，已被DESIGN/Screen Contract索引，不再创建原型或展示研究包。
概览/天文为身份下方轻量文字短下划线横向吸顶，同一连续正文；无侧栏空列。星图仅云观星。保留真实风险、缺失、来源，清理内部说明。
直接main，保护无关改动；无子agent/worktree、工作流自举、上传发布推送。不要重启开发器制造信任/扫码。旧8设计目录删除曾被自动审批拒绝，勿绕过或重试；保留有效资产/测试/原文。

## 环境与当前包

- 用户重启Codex后再次要求继续构建同步：本轮两次构建均已正常执行，之前policy阻塞不再复现。restarted-standard-fixture-build.log exit0（12996ms），169个产物复制至既有snapshot，逐文件SHA256相同；restarted-standard-normal-build.log exit0（13516ms）。最近来源/设置/文章/链接/导入源码改动已包含在两包中。下文“未构建”均为历史状态，本条覆盖；实际界面尚未复验。

- Node24：C:/Users/777/AppData/Local/nvm/v24.16.0/node.exe；workspace TS5.9.3。
- 当前WEAPP项目：artifacts/miniapp/integrated-runtime-snapshot/miniprogram。最新已运行facility-shared-verification-fixture-build.log成功并同步（session53153 exit0）；正常facility-shared-verification-normal-build.log成功（session89606 exit0）。后续来源/设置/文章/主页链接/导入改动已于重启后构建同步，最新日志见上条。无活动构建。
- 最新客户端contribution-resume-current-regression.log：320/320；随后baseline补充断言2/2通过。类型检查contribution-resume-unsaved-typecheck.log通过。测试/构建不替代实际界面或设备。
- DevTools原生窗口465307420，node_repl的sky/reopenedWindow可用。IDE端口12238最近PID14344。不要用过时窗口60360878。官方open已恢复原项目，无信任/登录提示；9421自动化不可用，不反复重启恢复。
- 8879为新隔离MEMORY_TEST/LOCAL_TEST实例，最近PID9844、session69463，日志recovered-isolated-api.log；与原正常数据隔离，不能冒充旧内存恢复。
- 正常8787最近PID8136/session72398，日志restored-normal-api-cors.log；使用前查活性，plain tsx无watch。原PostgreSQL/Redis容器和卷恢复，AUTO_MIGRATE=0、无seed/迁移，worker未启动。勿跑整套启动脚本。
- 构建fixture用MINIAPP_ISOLATED_FIXTURE_BUILD=1、MINIAPP_DEVELOPMENT_FIXTURE_MODE=1、MINIAPP_API_BASE=http://127.0.0.1:8879；正常用MINIAPP_ISOLATED_CHECK_BUILD=1并去掉上述三项。dist/weapp-check与weapp-fixture勿混用，源码不要在构建中修改。
- 原生截图使用globalThis.importLiveState = await sky.get_window_state({window:reopenedWindow})，操作前读fresh截图；只转发image块，不打印截图URL/base64。最新同步会自动回Map，旧坐标状态不可直接继续点击。

本轮端口检查未返回8879/8787/12238监听；上述PID及数据为历史记录，不能声称服务当前在线，未重启服务或开发器、未重建测试数据。

## 隔离实例真实测试数据（不要重建）

1. 原生建立的唯一计划：示例观星点/2026-09-06/22:00/空备注。My编码ID回读已修并实测；320 NIGHT两列摘要+备选跨行、路线缺失说明、单计划新建入口及新建→返回原计划已验。未保存第二条/未删除。
2. 原生建立的唯一导入：OTHER，https://example.com/starward-layout-test（占位），标题：示例：观测前的装备检查与到达准备。42字正文为自写装备检查说明，无媒体。来源备注已保存为：自写布局测试；链接仅为占位，不是真实文章来源。
   当前PRIVATE/PREVIEW，关联spot:test-published（示例观星点），未提交审核/发布。实际建立→编辑保存→正式示例关联→预览已验；不证明第四真实来源地理兼容。320 NIGHT非空历史标题/状态分层完整，保存按钮已保存→编辑→保存当前草稿→保存→已保存实测，无成功遮挡。
3. 新隔离反馈草稿1条：FIELD_REPORT/OTHER，示例点，2026-09-07 13:40，自写43字测试正文，无媒体，未审核。320 NIGHT保存及非空历史已验，当前feedbackState在反馈页底，勿误点提交。详见PROGRESS末尾。
4. 示例点为测试PUBLISHED，不是真实正式地点；隔离收藏/取消已实测并恢复。正常库未受这些测试影响。

## 最近代码与证据边界

- 导入完整预览正文仅PREVIEW/SUBMIT展示，编辑/关联阶段不重复整篇正文，保留编辑器/进入预览/解析警告和原门禁。import-preview-density-typecheck通过，未构建实测。

- 主页链接普通字号列表正文全宽，复制/移除底部横排可换行，取消右侧空列；保留完整URL、可见性、时间及target-min。仅CSS，未构建实测；大字规则未改。

- 文章标题去嵌套卡片内边距，与正文对齐；设施引用名称/状态同排，加载错误缺失仍保留名称。article-reading-layout-typecheck通过，末次仅条件扩展；未构建/实测，policy拒绝仍保留。

- 设置删除账户入口说明改为删除后不可恢复（含读屏），原确认/删除流程保持。settings-action-copy-typecheck通过，未构建；仍尊重前次构建同步policy拒绝。

- 最新Provenance来源时间组：发布/获取/适用对齐，北京时间说明一次；精度/限制type-secondary，长标题和状态独立。source-timing-layout-typecheck通过。构建+同步命令进程创建前被policy拒绝，未重试/绕过，最新源码未编译同步。上一有效fixture为facility-shared-verification。

- 最新共享日期：场地设施多个非空verifiedAt完全相同时合并到列表末，其余逐项保留；组件默认显示日期。facility-shared-verification typecheck及fixture构建通过(session53153 exit0并同步)，normal session89606结果见日志；最新日期合并未实际查看。

- 共享FacilityEvidenceDetails：开放时间/距离2:1排列，无距离时跨满，使用条件独立跨满自然换行。facility-facts-layout typecheck/fixture/normal通过；已恢复现有DevTools，从Map进入场地查看320 NIGHT标准字；发现短值独占行后改为同行，fixture编译并再次实测开放时间/待核验同排，使用条件与核验时间完整。当前页面场地资料。距离非空及长值仍待实际查看。

- 普通字号面板：开放/安全并列短事实，攻略标题旁阅读入口。panel-safety-density类型检查、fixture/normal构建通过。原生320 NIGHT展开并滚动，实际两列设施与安全事实可读、tabs吸顶。示例无攻略，非空攻略尚未实测。当前窗口在Map large中段。

- My openPage增加导航互斥，连续点击只发一个native跳转，失败后可重试。my-navigation-singleflight-test 1/1、typecheck、normal-build通过(session50487 exit0)。fixture构建my-navigation-singleflight-fixture-build成功(session91196 exit0)，尚未同步snapshot；不声称解决之前入口无响应。原生console确认栈pages/my/index，之后截图受其他窗口遮挡，暂停桌面操作。后续原生wx.navigateTo已成功打开反馈路由，滚动可见唯一DRAFT；点击继续编辑后又受其他窗口遮挡，结果未确认。

- 最新历史resumeDraft保护未保存或待恢复内容，成功后才滚回表单。320项全回归和2项baseline补充断言通过；fixture contribution-resume-unsaved-fixture-build成功同步(session51589 exit0)。普通contribution-resume-unsaved-normal-build.log已确认webpack成功15363ms（session19791 exit0）；原生干净与编辑两路径待验证。最新原生窗口可读取Map和My；My反馈入口两次点击后仍停留My，未进入表单，不能声称通过。未重启开发器、未改测试数据。

- 最新继续编辑滚动修正：原生证实点击历史继续编辑仍在页底；已加onResume回feedback-context。contribution-resume-scroll-typecheck通过，fixture build session43184 exit0且同步。实际点击继续编辑已返回表单开头并恢复地点/类型/13:40；普通contribution-resume-scroll-normal-build也通过(session83735 exit0)。当前feedbackState表单顶部，正式地点字段名称不可用持续，已修knownSpot带ID名称回退并接入反馈；6项测试/typecheck通过，formal-spot-known-name-fixture-build通过且同步(session99678 exit0)。同时移除routeSpotName对初始入口名的跨地点回退。普通formal-spot-known-name-normal-build通过(session73632 exit0)；原生恢复同一草稿已显示已选择：示例观星点，类型和13:40保持。关联仍保留。

- 最新投稿改动：历史去重复审核badge、媒体PENDING用中性待完成描述、去重复操作说明。contribution-state-copy-tests6/6与普通contribution-state-copy-normal-build通过(session11682 exit0)，fixture contribution-state-copy-fixture-build也已同步；320 NIGHT非空DRAFT历史已验，其他历史状态及媒体验证待进行。

- 导入创建/普通保存以阶段和按钮原位反馈，SUBMIT确认及错误恢复仍保留。指定importDraftId现在decode且只应用一次，用户换草稿/新建不再被入口强制拉回；2项实际effect回归通过，指定ID原生入站路径尚未验（My入口不带ID）。
- 共享通知：无action的可关闭floating success显示6秒后退出；错误/警告/inline/带动作保留，更新或卸载取消旧计时器。3项定向测试通过；真实保存浮层自动消失已验，两截图间15909ms，不能声称精确6秒实测。其他动作浮层显示期间避让不算全站完成。
- 共享CustomNav胶囊避让、右侧操作下移：320 NIGHT长标题/来源副标题/场地收藏真实可读可点；7项测试通过。共享收藏同点互斥、分点更新回滚及owner绑定3项通过。
- 投稿空表单320 DAY/NIGHT首尾与禁用媒体已验；非空历史/媒体仍未验。FormalSpotField STALE保留关联及重试5项通过，真实故障态未验。媒体缺size显示大小暂不可用4项通过，ContributionUploadRecovery是未挂载代码。
- 其他历史有效证据：地图375/320轻量吸顶与天文分组；攻略320/430往返；21:20准确地图/天空时间；导航取消恢复；账户/导出/计划/链接owner隔离。只按相关PROGRESS查证，不重复旧探针。

## 受保护正常数据与剩余范围

正常库最近只读26地点/10导入/3投稿/1计划。名称含仅私有传输测试1355的唯一投稿rev18/DRAFT（1355非ID）；十导入均PRIVATE/moderation DRAFT，同owner，9 PREVIEW+1 EDIT_DRAFT。不要用隔离草稿替代或重建。
客户端draft-recovery-0906（09-06 22:00、无地点、红光手电/装备）仅历史原生确认，不声称当前恢复。
第四夏夜星萤深圳大鹏地质公园正式关联仍缺地理兼容证据，不猜天文台、不改proposal绕过。
正常26点0完整，182必需证据缺失/208设施无效；天文台已追加2官方来源10→12、rev2→3，仍DATA_INSUFFICIENT，不重复写或编造。Gaia2048最暗约5.0075非完整5.5。
最新设备检查ADB0、官方login ready，iOS未验；无变化不重复doctor。红光冷启动选择尚未确认，保持行为；夜间供应商亮底图仍未解决。
下一步回到非空投稿/媒体与14路由62控件剩余矩阵，包括IME、权限恢复、真实分享/媒体、生命周期、物理手势多指、读屏、三主题长内容及可用硬件；正常数据与完整业务范围继续保留。全局goal不能因局部通过关闭。
