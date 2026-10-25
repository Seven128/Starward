# 外部审查核验与方案采纳依据

> 2026-10-25范围更新：本文件保留历史事实，旧active/下一步/App事项不是当前指令。用户已要求当前及未来一段时间只做微信小程序，App成果保留不继续；已完成移出待办，两类性能后置。当前唯一入口为[INDEX](INDEX.md)、[PLAN](PLAN.md)和[NEXT](NEXT-CHAT-PROMPT.md)，最新状态见[HANDOFF](HANDOFF.md)。

2026-10-23。本文持有审查证据、采纳理由和限制；唯一实施方案仍是 [PLAN 的 R20](PLAN.md#verified-review-findings-and-responsibility-refactors-r20)，当前执行许可只见 [HANDOFF](HANDOFF.md)。用户已明确批准把已验证问题与三组重构纳入原方案，同时要求先完善方案、暂不改代码。本文不把外部意见或局部验证升级为产品修复。

## 输入与本机范围

- [GPT 全仓代码审查](chatgpt-conversation://6adb1c9b-2c58-83ea-b77e-eafe37de6e05)：通过 read_thread 取得完整文字回复，hasMore=false。报告的 HTML 附件及其中全部复现脚本未单独取得；报告声称的测试数字保留为外部结果。
- [Gemini 分享回复](https://share.gemini.google/6yhPtTb25QZc)：实际浏览器打开并读完正文。此链接展示“阶段一”，明确只读两份背景附件、未读目标 commit 源码；其假设和实现建议不是源码核验结果。网页中的导出/上传命令没有执行。
- 本机重点核查基线为 `4b5a610a1aaa76f8cf5a727dd5403af4b72d83e0`；所查产品源码未见相对 HEAD 的修改。范围包括管理鉴权/controller、头像服务/事务、outbox、媒体清理、账户删除/审核锁顺序、Map 原生协调/退出/重载、Sky 时间输入/Query/来源/渲染、App 定位/恢复/偏好、admin 命令及 CI 入口；不是第二次全仓逐文件审计。
- 上一轮观点核验没有修改源码、PLAN、运行配置或真实账户数据。三个新增局部对照通过 Node/tsx 在内存执行，使用实际生产模块和替代外部端口；未连接真实 PG、Redis、HTTP、对象存储或手机，不将这些边界当成已验收。此次方案整理仅写任务文档。

## 已由本聊天独立复现的三个问题

| 问题 | 实际入口与对照 | 本机结果 | 结论限制 |
| --- | --- | --- | --- |
| F01 管理操作授权 | 实际 `AdminController.patchSpot`、`admin-auth`；仓储使用 Postgres repository 原型及纯内存写方法，凭证与 RBAC 只存在该短命进程 | 无 token 返回 `admin_auth_required`；有效测试共享 token 配合 AUDITOR 或 OWNER actor 均到达写方法 | 证明当前 controller/auth 的角色及凭证绑定缺口；未走真实 HTTP/PG，触发以管理能力启用且持有效 token 为前提，不称匿名公网漏洞 |
| F02 头像提交后的错误补偿 | 实际 `MiniappService.saveAccountAvatar/getAccountAvatar`，读取仓库既有自生成测试 JPEG；对象 Map 和仓储提交点为内存端口，注入旧对象删除失败 | 顺序为 `new-object-stored → new-reference-committed → old-delete-failed → new-object-deleted`；引用仍在、引用对象不存在；读取返回 `account_avatar_object_missing` | 实际 service 分支已复现；PG 的 COMMIT-before-return 另由 repository `#transaction` 源码核对。真实跨系统提交/丢响应/恢复仍需集成验证 |
| F04 原生地图永不回调后的恢复阻断 | 实际 `createMapGroundOverlayCoordinator`；初次 add 成功，下一次 update 永不回调；使用原 10 秒 timeout，随后两次 suspend | 实测约 10,012ms，要求 Map recovery；两次均 `complete=false`、remainingIds=[101]，add=1/update=1/remove=0，两个文件 pin 各为1 | 证明协调器不能完成清理；页面 `retryNativeMap` 等待该 complete 后才 retry 的闭环由源码确认。没有执行真实 React 页面或 Native Map，不证明无限泄漏或原生释放时机 |

实现入口：[管理授权](../../../workers/miniapp-api/src/admin-auth.ts)、[管理 controller](../../../workers/miniapp-api/src/admin.controller.ts)、[头像服务](../../../workers/miniapp-api/src/miniapp-service.ts)、[事务与锁](../../../workers/miniapp-api/src/postgres-repository.ts)、[Map 原生协调器](../../../apps/wechat-miniapp/src/pages/map/map-ground-overlay.ts)、[栅格安装](../../../apps/wechat-miniapp/src/pages/map/use-map-raster-installation.ts)、[Map 页面](../../../apps/wechat-miniapp/src/pages/map/index.tsx)。没有把上表写成三个产品修复已完成。

## 全部报告问题的处理边界

F 编号仅用于映射 GPT 报告，不是与 R/H/A/N 竞争的任务编号。每项的未来实施责任和完成条件归 R20。

| 外部项 | 本机证据层级 | 方案归属与还需验证 |
| --- | --- | --- |
| F01 | 真实 controller/auth + 内存仓储复现 | 管理 principal/operation/审计身份统一；补真实 HTTP、有效角色和受影响 operator/admin 客户端 |
| F02 | 真实 service + 内存提交/对象存储复现 | 媒体重构：先修已提交新对象保护，再处理提交结果未知、旧对象退休与重放 |
| F03 | 源码确认普通 dispatch 只接 PENDING，DISPATCHED 缺失句柄恢复限于提醒，replay 限 DEAD_LETTER | 媒体/队列恢复；实测确认 job 缺失、查询失败、active 工作与 PG/Redis 恢复不一致的区别，不将普通重启说成必然丢任务 |
| F04 | 真实协调器故障对照 + 页面恢复调用链 | Map session 重构；补真实失败节点退休/替换、迟到回调和当前状态恢复 |
| F05 | 源码确认授权成功后 `setDeviceLocation` 写入 `(0,0)` | 原生 App 定位事实；真实定位、精度/年龄、失败与权限恢复仍需目标设备，不以禁用合法零坐标替代定位 |
| F06 | 源码确认 hydration 与保存共享 ready 状态，setDestination 可先置 ready | App 初始化/恢复；完整根入口和早期导航交错需本机实际消费者验证，未复跑外部 store 试验 |
| F07 | 已读外部精确定位与问题描述，未在本轮完整追完全部 App 页面请求 | 保留为 App Context 修复前的验证任务；沿真实日期/位置/时刻消费者确认差异，仅对成立分支修复，不先声明全链已复现 |
| F08 | 源码确认 records/idempotency 全历史累积，重放前未比对新 payload digest | App 偏好持久化；需当前投影、有界回执、兼容恢复及冲突重放验证；未复跑外部300次/字节统计 |
| F09 | 源码确认 hold 只暂停/重复 preview，未发布 ruler 的 scrubbing 状态；exact-time query 继承30分钟 gcTime；Sources同键且无局部GC策略 | Sky 连续编辑/settled target 共同策略；需实际请求、取消、最终内容及来源往返。外部120 Query是外部结果，不是本机/手机结果；不归因为正常Play OOM |
| F10 | 源码确认 cloudWork 先启动，地点决策批处理全部 await 后才 await cloudWork/组装返回 | 独立云量交付；需阻塞无关 decision 的对照、共享取消与实际Map所选小时结果，未复跑外部屏障实验 |
| F11 | 源码确认 runMutation 捕获session、await后直接回写，且每次调用生成新key | 管理命令尝试/会话；需切换或退出后的迟到结果、丢响应重试和实际读回验证 |
| F12 | 源码确认用户list先调用全局expire与整批Promise.all删除 | 媒体后台退休；验证有界并发、重试与用户读取互不污染 |
| F13 | 源码确认 deleteAccount 外层先锁submission，后调用内部先锁case的erasure；审核先锁case后锁submission | 完整写者锁顺序；需独立连接真实事务冲突验证。内部注释不能覆盖外层锁；未证明数据复活 |
| F14 | 已核命令路由先runtime.execute再service.command，仍需追具体业务持久化责任 | 独立API成熟化；先闭合代表真实业务，再按共同机制迁移受支持消费者，不将POC当已上线故障 |
| F15 | 已核product CI及release-code主要覆盖小程序工作区；当前H7失败另有原件 | 按实际共享依赖补消费者CI，修具体检查边界；外部mobile类型失败数未在本轮重跑，不把历史数字覆盖当前结果 |

## 三组重构为什么采纳

1. **Map session/故障恢复/退休**：已有正确的pin和迟到结果保护，但正常退出许可被复用于故障重建，导致出口依赖失败对象本身。重构该共同责任，保已有相机、导航和覆盖合同；不通过超时清pin伪造释放。
2. **媒体提交/持久退休/对账**：头像补偿、全局读取清理、队列丢句柄和删除/审核锁序属于跨系统提交与恢复责任。采用共享政策、现有队列和事务，不为每种媒体复制实现，也不混淆正式公开引用与私人上传。
3. **Sky具名帧输入/资源消费者**：当前 `drawSkyScene` 的长位置参数和资源家族多处接线是可维护性依据。采用明确帧身份和消费者生命周期的结构整理；减少分配、调度改变与OOM根因是另外的证据问题。

## 不直接采纳的结论与条件

- Gemini把R27中aggregate/callback共同存活延伸为已证强引用链，证据不足；R27停止边界和gen24暂停保留。`FinalizationRegistry`回调可能延迟或不执行，不能用它声称精确存活数、零扰动或单独证明引用根，见[API语义](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry)。
- 当前 `sky-gpu-renderer` 已复用buffer handle并有dispose；`new Float32Array`/`bufferData`的成本值得按实际证据判断，但不等于每帧createBuffer，更不直接证明Native泄漏或解释V8 OOM。样本星数不能定义16,384容量；双缓冲须先证明全部accepted/transition/picking/source读者的寿命。
- 原生超时不能授权释放仍可能被使用的pin；同ID更新和透明父/细图的单覆盖约束不能被通用A/B建议覆盖。1500ms、30次、3分钟、150ms、0.3ms及30%均不是本项目已采用预算或固定验收。
- 当前已有有效前台owner；`LatestRequestRegistry`明确管传输取消，Query管结果缓存。不能仅因存在Map/包装层而合并删除。来源页面的内存LRU也不能解决进程死亡，且会引入新的身份/有效期责任；需要真实要求和失败后再判断。
- F09须同时处理页面和Sources的查询选项；TanStack同query不同gcTime取最长，不能只改一个调用方，见[官方语义](https://tanstack.com/query/latest/docs/framework/react/reference/functions/useQuery)。该局部政策修复不能关闭R27的正常Play保留根问题。
- 不预设354项API失败有单一共同根因，不修改FRESH/PARTIAL含义来消除失败。UI文本检查和AppID历史误命中须核真正消费者/构建身份，保历史证据。
- Taroify/引擎/COG/共享schema建议保留为有条件能力评估。依赖名、技术栈流行程度和“不要大改/必须大改”都不能替代真实目标比较；允许较大职责改造，不默认购买、装依赖或替换引擎。

## 未完成义务与执行状态

原UI/来源/导航恢复、约4km、三层完整覆盖与连续操作/资源、Sky完整BSC/实际SAO及六字段/Play/Pause/drain/退出、山体/真实照片、真实分享/文件交接、数据/环境、CI/包体/CDN/授权交付均不因R20取消。已有EOG/LFS/Drive成果沿原证据复用，未验不改写通过。

原聊天Goal曾paused；本分叉方案整理时get_goal为null，未创建或恢复执行Goal。当前仅完善方案。局域网调试、gen18配置/字节差异、R28最终独审与gen34未激活状态继续归HANDOFF及各证据；本次不操作其运行环境。恢复实施必须由用户后续明确指令触发。

## 本轮方案独审与文档核验

独立审阅者完整读取当前PLAN/要求/Goal/HANDOFF/NEXT/INDEX/核验表/继承要求及AGENTS/global，并只读对照Git HEAD的原版本。最终PLAN SHA-256为 `c953cdb6ecd64107e2b1b541ff50d8f57607127ce7ebad8ae09ec2736e98f05f`，未发现必须修改的问题；确认旧义务和UI→叠层→Sky顺序保留、三组责任/消费者/恢复/完成证据明确、证据等级及条件分支未混淆、当前方案授权未被写成自动实施。其非阻断建议是把INDEX两处旧继续/paused口吻明确历史化，Root已修正文案；PLAN本身此后未改。审阅者只读，已结束，不复用。

Root文档检查：7份本轮文档的399个本地链接及13个锚点均存在；原Goal正文9段在两处明确时效/恢复入口更新后全部保留，新增R20正文没有替换旧义务；INHERITED-REQUIREMENTS字节未改（SHA `3a57dc5f42f2b8e34468017bc2ce0be9f51ffb089b9826ce271e9a7f83592ea7`）。HANDOFF/NEXT的PLAN哈希与实际文件一致，定向`git diff --check`通过。产品/工具/工作流没有本轮新增diff；此前`apps/wechat-miniapp/project.config.json`的一行变更仍原样保留，没有借本轮整理清除它。

这些仅证明方案文档范围、一致性及检查结果；没有重跑产品测试、启动采集或取得新的目标验收，CURRENT-VALIDATION中的已有失败继续有效。
