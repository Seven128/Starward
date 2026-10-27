# 当前交接：候选19与换机检查点

用户最新要求：提交全部仓库变更、推送远端，转到另一台电脑继续。完整目标归[GOAL-OBJECTIVE](GOAL-OBJECTIVE.md)，唯一计划归[PLAN](PLAN.md)；Goal未完成，状态以get_goal实读为准。仅微信小程序及实际依赖；App WIP随本次检查点保全，不恢复App开发或冒其验收。

换机先读[CROSS-MACHINE-HANDOFF](CROSS-MACHINE-HANDOFF-20261027.md)与[交接包身份](HANDOFF-TRANSFER-20261027.json)。代码/文档在Git，性能原件和私有恢复另包；本机路径/PID/IP/截图授权不是接收机事实。

## 当前结果与下一步

- 13–18已实施并检查/独审：Map自有文件删除/准入与Sky索引；地图手势接管/scale读回；Scene/marker稳定及加载提示；夜光显式对比色标；地形shader、冷格读取顺序和采样数字索引；Sky按住同向代次、跨窗口供给及真实native复制回执；顶点staging和星座临时数组减少。原r6数值/阈值/掩膜/旧URL、完整星数/时间精度、资源预算和失败语义保留。直接复用，不重新开发。
- 16/17普通手机窄视野已见分钟/跨日按住期间多次更新、松手稳定、正常Play/Pause、返回Map/My。关闭debug后的暂停进程PSS从1011598→837971KiB回落；两运行历史/重启不同，不能算严格A/B、JS泄漏或OOM解决。
- 18补证：正常My空态及计划列表往返、Sky系统Back；45°地景进入/淡灰背面/负高度对象点选/返回、网格关闭恢复。Merak实显地平线下11.1°。原PTS采样序列已判读，不冒物理FPS/同手势反向或全天视野通过；详[实际补证](CANDIDATE18-CONTINUATION-20261027.md)。当前账户无昵称/计划行，不能替正常有内容账户验收；当前管理session真实503/CAPABILITY_DISABLED。
- 19仅修Sky披露层被持久通知遮挡：四类SkyOverlayMotion共用既有z30，保通知、重试、透明材质与无通用标题结构。43项及独立聚焦审查通过，完整构建和官方推送已完成；**换机请求打断前，19的遮挡真机回归尚未完成**。推送不等于目标验证。
- 下一内存窄方案仍**未实施**：`displayDirection`缓存完成后释放已不再需要的`vectors[index]`引用。完整BSC/实际SAO原型宽视野退休6018个冗余三元组，保原构造、未知projector回调、旧输出身份及同帧相机复用。只使用包内`sky-transform-memory-analysis/results-v2.private.json`；v1受诊断getter干扰作废。结构工作集数不等于手机heap字节/峰值/OOM。
- 剩余优先：19目标回归、全天跨字段与持续Play/分配/暂停排空/退出、native/GPU退休及冷源到可见覆盖。一个隔离真实冷窗2944ms、16源/2活动格、100%有效、PNG与旧proof一致；与历史网络/缓存条件不同，不算手机提速比例。福建夜光仍在现有r6覆盖外，未扩供给。完整P1–P6、两个性能结果和OOM均未完成。

## 代码、候选与环境绑定

- 提交前main基线为`56ba8f62e06297bedb6c34eee4ce2c4208b503aa`；本次检查点commit及推送以Git和实际readback为准。全部源码/文档/既有App WIP纳入保存，原始采集、数据库/凭据、运行工具、构建和旧锁文件留在其私有owner。
- 当前IDE外部项目`performance-repair-20261026/project-19`（源机s5）；完整输出`apps/wechat-miniapp/dist/weapp-check-d1-20261026-g19`。compiled SHA `c9734b6f725f6f1bd042f81fe8874acb1eb14e89f722fde48acf4ca8b77afbb0`；prepared SHA `057bdb3dabcf92901e2a9bc3ee2fef060880ad3cd8483f0e3ccf7d3da2263f5b`，113输入/340文件。测试大包支持开启，普通官方包体资格未测。
- 源机19设备会话为`C:/Users/momoooo/AppData/Local/Temp/starward-device-test-8BvNKE`；只作历史绑定，换机重新创建。普通preview、debug/vConsole关闭；手机整包字节/runtime AppID未独立读回。旧候选与私有原件保留，18窗口在19完整同步后正常关闭。
- API仍为18后台（19只改前端），原可信配置、25后台输入、ready200，PG未重启，无迁移/worker/提醒投递或VPN变更。源机指针为`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/miniapp-entry-20261025/phone-current-api-selection.private.json`，含databaseOwnerPath；不能把其中PID/地址移植后执行。
- 16一次官方remote错选VPN虚拟地址后LAN失败/回退并通信错误，已正常结束。Computer Use原16与新17窗口均capture timeout，未重复同条件重连或走私有协议。换机按真实条件恢复主用Profiler；原四份Performance/后续Performance/三份Heap/Console及展开计数已齐，不能索要旧批。

## 提交前验证与保全

完整检查先通过contracts92项、API1006项/74skip及相关类型检查；小程序首次2854pass/39fail/1skip。已确认并修复11个test/helper的旧提取/上下文/计时夹具，未修改产品或削弱内容/身份断言。最终小程序2922pass/0fail/1skip及typecheck通过；未再重跑未变的API/contracts。该结果不是目标设备或完整产品验收。

原有同基线CI：Product40199397216与Context40199397226成功；staging40200094757容量检查失败、发布/promotion skipped，未部署。本次新检查点CI须按新SHA核，不能沿用旧绿；App功能不在本次新验证范围。

`Starward-performance-evidence-20261027.zip`约314MB，4101成员逐项hash读回；`Starward-private-recovery-20261027.zip`约693KB，含任务库dump和私有配置，归档可列举但接收机恢复未执行。两包当前为LOCAL_ONLY，精确身份见HANDOFF-TRANSFER。全球EOG原件复用现有锁定备份，未重打包。手机本地Storage/草稿不在数据库dump内；保原手机、N05、R6和gen34，不清缓存、不重发、不重建冻结基线。

主要证据在交接包`performance-repair-20261026/user-feedback-20261027/`的repair/review/phone目录；提交前夹具证据在`checkpoint-tests/`。迁移时按包内manifest校验，旧绝对路径只作定位。此前完整HANDOFF原件仍保存在源机私有检查点目录。不要把归档、提交或本交接完成标成整个Goal完成。
