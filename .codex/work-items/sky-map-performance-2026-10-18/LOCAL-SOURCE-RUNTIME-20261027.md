# 新接收任务库的本机独立恢复

本轮使用已认证解密的私有恢复包，沿`tools/miniapp/backup-restore.mjs`的`restoreBackup`恢复到全新owned数据库`starward_restore_source_20261027`。原始dump和配置保持原样；未把源机路径、PID或服务身份照搬到本机。

## 已核结果

- 原dump SHA256 `9d4f0ea299b79393dfe316351a495442ac83140dd79ac0d1af27cb150ffb4aba`；完整dump身份、源manifest中的迁移列表/业务计数/spots摘要由现有restore owner核验通过。源归档有75个TABLE DATA，但没有全表逐行hash清单，不能声称75表全部与源机逐行比对。
- 当前schema已有26迁移，无需重跑；`checkBackendDatabase`确认与当前迁移列表一致，PUBLISHED r6及inventory `d91fd8f7fcdd68d63f9a219df11fdad13673fefa2e1a99e313a148e29676c5bd`匹配。
- 原R6的73表和先前UI副本的75表在恢复前后逐表行hash相同；原infra、R6配置、UI配置及新接收源机配置文件全部字节未变。
- 运行配置位于`E:/Dev/Starward-data/development/source-20261027/runtime.private.json`，仅当前用户/管理员/SYSTEM可访问。派生独立session secret和cache前缀，使用本机loopback PG/Redis及已核锁定数据根；源机配置原件保留。
- 可选Map静态源沿`discoverMapStaticBundle`完整准入，publication hash `89f3491ed136bb24c18a49ce8b92cd484dd2378bf889610153ab8f52cff514d0`，524个PNG/2,546,488B；没有复产或重新上传原数据。
- 来源配置本来就是LOCAL/POSTGRES/LOCAL_TEST、媒体DISABLED；包没有媒体文件，也未带真实天气/微信身份凭据。当前配置保此边界，不能把任务数据恢复冒正式身份、真实天气或云媒体资格。

恢复时的完整私有回执在同运行目录`restore-result.private.json`与`restore-summary.json`。后续用户再次明确授权由Root启动，现已按下节启动API；worker和提醒投递保持关闭，未修改原账号/手机Storage、N05、R6送达状态、VPN或冻结候选。

## 当前运行状态

2026-10-28交接只读复核：8787无监听、health不可达，本轮未启动服务。下文PID/ready是10-27成功启动及暂停时的历史；需要服务时沿既有授权和下列published入口，先核当前状态，不重复恢复数据库。

先前自动审批拒绝属于历史；用户明确答复“你来弄呗，授权给你了”后，Root沿同一隐藏进程启动方式成功运行既有backend-data start入口（与下方npm命令相同owner），未另走旁路。launcher PID39248；8787 listener PID7708已逐级核为其子进程；HTTP `/health/ready`实际返回ready=true。`release`自报local/development/unbuilt，不把它冒部署revision或正式发布。精确进程/配置身份与健康读回分别在私有运行目录api-process.json/api-ready.json。

下面是当前API使用的入口，供实际退出后的恢复；服务仍活着时不得再启动一个：

```powershell
npm run dev:miniapp:published -- --config E:/Dev/Starward-data/development/source-20261027/runtime.private.json
```

该入口只读核当前发布数据/schema并启动本机API，关闭自动迁移和提醒，不能换成会启动worker的普通dev:miniapp。API启动后无数据库恢复/迁移重复操作，旧副本未被启动。

微信工具首次login遇到CONNECT_ERROR/授权超时，官方`wechatide auth -c Codex`随后返回alreadyTrusted/success，再取得image登录任务。用户随后更新并重启IDE：已单向同步官方Skill0.3.11→0.3.14，6文件更新/旧包自动备份；fresh agent session真实目录已发现新增simulator及mcp__wechatide，完成发现重载。旧login_437bb333-c891-40d5-b4c0-69dd29d61e7a实读expired，当前0.3.14/equal/loginExpired=false/CLI token不要求，无需新二维码。原扫码问题已解决。

用户随后要求暂停；唯一模拟器操作者已停止。暂停前仅只读project_list/currentPage：只登记旧remote-main-20260908入口；旧入口和canonical都返回cant find runtimeid by projectpath。没有导入/打开canonical，没有截图或Storage备份，没有pending/在途动作，未改窗口/账号/Storage。API保留运行，暂停时launcher39248/listener7708仍在。恢复先核实际状态，不用旧二维码，不重发启动/恢复；当前普通WEAPP仍为0aacc构建，目标UI/交互和真机均未认证。
