# 普通微信入口恢复与当前证据

2026-10-25。本线程先get_goal确认无目标，再按GOAL-OBJECTIVE的完整小程序正文创建无预算active目标。唯一PLAN继续使用；本记录不表示完整产品或Goal完成。

## Candidate identity

本轮为 **development_feedback**。main基线`1bef1a09819b563fe44d6437a200210ff30606f7`，保全部App/私有/dirty成果。接手时canonical WEAPP与HGyEOG/gen1 AKYc0l均为339件、5,037,760B、SHA `ef6eeee2bb44ef2af5c3ddde69961faa2650a7ce9c27ff6392a6ff39fd9c3cd1`，直接复用其入口，不重做已完成包体收口。

最终保留的Search局部实现仅删除重复通知effect，普通候选为 **4VEyDu/gen1 pCvBDO**，339件/5,036,803B，SHA `58dc304a2eca653a97b4725c887c06033704509d53be5f6f0522f096025d1f80`，源产物main仍2,025,876B。高度试验撤回后的最终重建再次逐字节匹配这份已保留普通候选；官方重新auto_preview业务结果success（官方main2,095,524B/总5,056,009B），Root重新capture实看手机已回Map。现用session为`%TEMP%/starward-device-feedback-4VEyDu/starward-device-test-GDWVeL`。不能把试验包当最终候选，仍不建立手机源字节或运行AppID的独立证明。gen34与全部冻结代未动。

## Invocation result

- 官方Skill同步为current、0.3.14、reloadRequired=false；版本equal、登录有效、CLI不要求token。
- 官方导入列表实读4项：canonical、旧公共旅程、旧location-evidence及Nz5Jrf历史入口；仅完成盘点，未声称已退休列表项。canonical本轮打开为s2。
- canonical截图仍为官方欢迎页；refresh/open-page回执成功没有使其成为已运行应用。一次条件性官方auto恢复取得9563真实监听，但官方currentPage与该端口公开SDK只读页查询仍超时。保留工具/页面通道缺口，没有宣称产品黑屏，也未继续重复该条件。
- 对**未改变的HGyEOG普通候选**调用一次官方auto_preview，业务结果success。官方编译后main为2,095,524B，总计5,056,966B；这与源产物预算属于不同阶段，均未据此声称产品验收。随后新鲜USB截图与前台元数据确认手机实际进入微信AppBrand Map，之后通过真实搜索入口打开系统选点器。

## Observed product behavior

手机已由保留的独立App切回微信小程序。实际看到Map左上My、右侧搜索/定位/事件/添加/层叠和无应用底栏；场景失败下显示刷新入口。搜索保留原查询，系统选点器可打开且有已选地点和右上“完成”。本轮不重做已有充分的R19按压、图层/来源或三档展开验证。

新增窄确认工具经独审后，Root重新capture/查看，只派发一次“完成”，实际返回Search；请求结束后显示网络失败并保原查询，最后正常Back回Map。见[本轮手机证据](R19-PICKER-CONFIRM-PHONE-20261025.md)。原生确认返回已取得，地点Context成功提交仍未取得，不能据此关闭H5。

## Verified

- 普通预览推送后实际微信页面、USB单目标与受保护新鲜capture可用；手机并非不可用。
- Stitch无缓存列表22项、不截断，当前增量3995519477980461148、完整源5205988829884632961和Sky源5385664345158066168均在。实际重新下载增量HTML，SHA仍为`eab0df69c64c9ed3639b4695ff10c115d6c048f00f417440b30a782233974712`，并从其ZIP取得并实看Map/My原图及相应源。未生成、重选或更改远端资源。
- 原API监听及进程仍在，本机`/health/ready`返回200。手机对相同host/8806的有界TCP探测退出1并明确timeout，无usage/refused错误；首个失败边界仍是手机到主机API。
- 只读现行防火墙表明：Public TCP Node Block端口`0-8791,8793-65535`覆盖8806；旧8792例外只适用于旧地址。现用host仍绑定选定interface、GUID未变且profile为Public；shell真实token非提升。VPN/TUN、PG、Redis及现用服务均未修改。
- P4管理输入最小HTTP判别、窄修、独审已完成，见[HTTP证据](R20-ADMIN-INPUT-HTTP-20261025.md)与[独审](R20-ADMIN-INPUT-REVIEW-20261025.md)。已完成责任从PLAN活跃待办移出。
- 本轮集成补查project-skills/workflow-conformance **27/27**、Context结构检查exit0、限定diff检查exit0；这些不建立目标产品正确性。

## Search局部修复与实际结果

- 当前合同[DESIGN 5A.4](../../../DESIGN.md)规定局部查询状态不再额外弹floating通知。本轮手机失败画面已显示本页错误/重试，同时通用“搜索数据异常”浮层遮挡筛选。只删除该重复effect；具体选点未提交、原生选点失败与返回失败通知保留，原内容、颜色、图标、主题、查询和恢复owner不变。见[独审](R19-SEARCH-FAILURE-FEEDBACK-REVIEW-20261025.md)。
- Root曾把收键盘后的画面误读为空白，并据此做过一次`height:0`对照。独审重新查看修前原图指出：两张修前图的错误卡与重试本来就清楚可见。Root再次读原PNG和meta，SHA均为`cf0caa583540b789a982ef1659061e4790239863d1debd323569eb4ec24b7b54`，没有文件漂移证据，确认是Root初读错误。不能把这组材料当作高度缺陷或修复证据；对应用户进度表述和本记录均已更正，SCSS恢复HEAD，没有保留高度或其他布局改动。见[该项独审](R19-SEARCH-SCROLL-REVIEW-20261025.md)。
- 试验阶段实际点击本页“重试搜索”，出现“正在搜索观星点”，请求结束仍显示网络失败及重试、原查询保留，最后正常Back回Map。这证明所观察的本页恢复反馈，不支持高度改动的因果判断，也不证明业务API成功。正常数据、全部Search与H5仍未验完。
- Search/native/取消/迟到结果已有检查 **67/67**、Mini Program typecheck exit0；普通build及撤回试验后的最终build均exit0，均有既有10项CSS顺序/webpack建议警告。最终源产物main和分包预算通过。没有为这项可逆修复新增镜像实现的测试。
- 首次新候选58dc在DevTools打开后被工具增加25B的`pages/my/index.wxss`注释文件，指纹变383677…，设备guard正确拒绝旧session；没有删除文件凑hash或改写原候选。该窗口随后实际到达Map画面，但没有重试其结构化自动化。Root关闭该自有s3，改从canonical经现有owner准备普通候选。XJVQ8j仅为后来已撤回的高度试验，原件保留；撤回后canonical恢复58dc并与4VEyDu逐字节匹配，最终复用4VEyDu重新推送和capture，不把试验身份或漂移后身份冒当前。旧候选/SDK差异和原图均保留。

## 本机后台的有限真实资格

Root从现用小程序API owner选择配置，通过精确数据库名匹配后执行只读事务：`schema_migrations`有26条，023_account_avatar_write_intents、024_contribution_media_cleanup_attempts、025_avatar_cleanup_attempts、026_account_media_retirement_progress均已登记。查询后ROLLBACK，没有重跑迁移或读取账户业务行。登记存在不单独证明全部DDL/trigger或媒体实际效果。

该现用服务为POSTGRES、LOCAL_TEST、媒体DISABLED。故不再把本地迁移登记当缺文件重建，也不能据此关闭真实身份、对象存储或长期worker/Redis恢复；正式/拟部署环境资格仍归PLAN P4。

## API防火墙准备与提权结果

[窄修准备](R20-MINIAPP-API-FIREWALL-PREPARATION-20261025.md)及[独审](R20-MINIAPP-API-FIREWALL-REVIEW-20261025.md)已完成；独审发现的空InterfaceAlias参数已修复，新检查确实拒绝旧分支。10项注入检查通过，真实规则注册与手机HTTP仍未验。

Root核真实非提升token及审阅SHA后，仅调用一次PowerShell7 `Start-Process -Verb RunAs`。实际结果为launch_failed，未产生管理员进程、apply-attempt或执行receipt；之后再次经已审阅的Snapshot/Equivalent对真实COM读取，全部7条Node规则仍匹配修改前快照，没有新自有规则。没有重复提权或重放Apply；需要可交互桌面的系统授权后才能进入真实执行/读回。准备本身不等于连通、权限资格或部署完成。

本轮还通过同版官方cloudbase-operator的`cloud_env_list`只读核当前小程序配置，返回服务端`ret=1000 / system error`，没有取得环境列表。环境数量是不可用，不是0；没有推定未开通或缺权限，也没有选择环境、开通服务或进行云写入。实际用户媒体目标和权益仍未建立。

## Unverified

正常账号/My真实资料、手机业务API、正式微信身份/运行AppID及手机源字节的独立证明仍欠。系统选点成功后的Context提交、定位精度/权限、真实H4、完整UI/生命周期、Map资源退休、Sky及全部既有剩余结果不因这次入口恢复关闭。两类性能与内存/OOM继续后置，OOM未解决。

基线CI已实时核对：Product40150406033成功但16个产品步骤skipped；Context40150406055成功；Backend40150435741只qualify成功，publish-and-deploy skipped。先前3d23 staging40141832516仍在host preflight失败，发布/部署跳过；没有容量恢复或当前变更已上线的证据。

## Invalidated

旧截图/输入许可均不复用；每次真实输入前重新capture并查看。canonical欢迎页/失效自动化通道不能提供正常页面证据。历史App画面、权限及测试未转作微信证据。

## Cleanup

设备、官方窗口和共享服务由Root独占。HGyEOG及本轮各普通候选/SDK差异/已撤回高度试验原件保留，最终只续用4VEyDu。私有画面/录像和meta已归档到既有private device-resume/miniapp-entry-20261025，未上传；未改账号/N05、未重发R6。s2 canonical和s3旧prepared均由官方精确关闭，关闭前后核source/产物及唯一SDK注释差异；9563后台listener仍由原DevTools utility持有，未全局kill。历史导入列表4项仍有退休缺口，未擅删未知/冻结入口。没有防火墙/VPN写、原服务重启、私有原件或冻结构建清理。

提交流程另外发现01:32:48Z创建的旧零字节index.lock。核出生/长度/末写、排除原始Git owner并独占打开后，在同D盘task tmp保全原字节；未杀Git/LFS进程，未删除锁或改索引内容。读回源锁已不存在、保全SHA/长度不变。

## 本轮代码交付与CI

第一批已在main提交并推送`33b9317b2e4b31b1b27246157339f8011b3981cc`，30份显式写集，origin/main实读一致、0/0、暂存区为空；没有App源码、媒体资产、生成产物或私有原件。原有App tracked/untracked和旧dirty回执仍保留。交付后只读批量核资产目录2077个tracked文件，其中2017个LFS文件均为实际材料化字节且大小/SHA与锁定pointer一致，无缺失/残留pointer；本轮没有提交或丢弃这些资产。

该head Context40156515772成功；Product40156515752在Check release code失败，后续消费者、backend/WEAPP/基础设施与OCI步骤跳过。该阶段Mini API为994 pass/74 skip/0 fail（1068），Mini Program为2817 pass/1 fail/1 skip（2819）；唯一失败是`resource-error-notification.test.ts`仍要求Search存在已取消的`search-resource-failed`浮层effect。它与当前本页反馈合同冲突，须迁移测试并保本页正值/恢复约束，不能恢复重复产品通知或删除门禁。Backend40157286835的qualify与publish-and-deploy均skipped，没有新部署或容量恢复。

后续测试修复及新head的实际执行/跳过据真实结果续记；第一次失败保留为失败，不能由本地检查或docs成功冒全绿。

唯一旧断言已按当前合同迁移，见[CI测试合同修复](R19-SEARCH-CI-CONTRACT-20261025.md)：保其它页面浮层正值，Search改为实际挂载effects不重复通知及本页STALE/真实重试/保查询的正值约束。受影响四文件28/28、Mini Program类型检查通过，新独审无must-fix；没有恢复产品effect、改样式或削弱现有消费者门禁。临时反查因Windows预载入口错误未形成有效证据，没有计入通过结果。该测试增量不改变当前58dc普通候选，不再重建或重复设备旅程。新head将使用既有全量CI入口补足前次未执行的消费者检查，实际结果后记。
